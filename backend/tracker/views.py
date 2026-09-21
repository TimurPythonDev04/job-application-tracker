from django.db.models.functions import TruncWeek
from django.db.models import Count
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import JobApplicationFilter
from .models import JobApplication
from .permissions import IsOwner
from .serializers import JobApplicationSerializer


class JobApplicationViewSet(viewsets.ModelViewSet):
    """
    CRUD for the logged-in user's own job applications, plus a
    /applications/analytics/ read-only summary action.

    Ownership is enforced twice, deliberately:
      1. get_queryset() scopes every list/retrieve/update/delete query to
         request.user, so another user's row is invisible (404, not 403 -
         it never even reveals that the row exists).
      2. IsOwner is still attached as an object-level permission, so a
         future action that forgets to filter the queryset fails closed
         instead of leaking data.
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    filterset_class = JobApplicationFilter

    def get_queryset(self):
        return JobApplication.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        # owner always comes from the authenticated request, never from the
        # request body - this is what stops mass-assignment / IDOR on create.
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        queryset = self.get_queryset()

        counts_by_status = {choice.value: 0 for choice in JobApplication.Status}
        for row in queryset.values('status').annotate(count=Count('id')):
            counts_by_status[row['status']] = row['count']

        total = sum(counts_by_status.values())
        # Status doesn't record *which* stage a rejection happened at, so
        # "reached interview" is approximated as currently-interview + offer.
        interview_or_further = counts_by_status['interview'] + counts_by_status['offer']
        offers = counts_by_status['offer']

        conversion_rates = {
            'applied_to_interview': _pct(interview_or_further, total),
            'interview_to_offer': _pct(offers, interview_or_further),
        }

        weekly = (
            queryset
            .annotate(week=TruncWeek('applied_date'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        timeseries = [
            {'week': entry['week'].isoformat(), 'count': entry['count']}
            for entry in weekly if entry['week'] is not None
        ]

        return Response({
            'total': total,
            'counts_by_status': counts_by_status,
            'conversion_rates': conversion_rates,
            'applications_per_week': timeseries,
        })


def _pct(numerator, denominator):
    if not denominator:
        return 0.0
    return round(numerator / denominator * 100, 1)

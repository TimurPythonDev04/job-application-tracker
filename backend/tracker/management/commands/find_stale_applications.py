from django.core.management.base import BaseCommand
from django.utils import timezone

from tracker.models import JobApplication


class Command(BaseCommand):
    help = (
        'Lists job applications that have not been updated in more than N '
        'days and are still in an open state (applied/interview). Meant to '
        'be run by hand or from a scheduled job (e.g. a Render cron job or '
        'a system crontab) as a lightweight "you forgot to follow up" nudge.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--days', type=int, default=14,
            help='Staleness threshold in days (default: 14).',
        )
        parser.add_argument(
            '--user', type=str, default=None,
            help='Only check applications belonging to this username.',
        )

    def handle(self, *args, **options):
        days = options['days']
        cutoff = timezone.now() - timezone.timedelta(days=days)

        queryset = JobApplication.objects.filter(
            updated_at__lt=cutoff,
            status__in=[JobApplication.Status.APPLIED, JobApplication.Status.INTERVIEW],
        ).select_related('owner').order_by('updated_at')

        if options['user']:
            queryset = queryset.filter(owner__username=options['user'])

        if not queryset.exists():
            self.stdout.write(self.style.SUCCESS(
                f'No stale applications (threshold: {days} days).'
            ))
            return

        self.stdout.write(self.style.WARNING(
            f'{queryset.count()} stale application(s) (no update in {days}+ days):'
        ))
        for app in queryset:
            days_stale = (timezone.now() - app.updated_at).days
            self.stdout.write(
                f'  [{app.owner.username}] {app.position} @ {app.company} '
                f'- {app.get_status_display()} - stale {days_stale}d '
                f'(id={app.id})'
            )

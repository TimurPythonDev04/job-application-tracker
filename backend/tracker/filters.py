import django_filters

from .models import JobApplication


class JobApplicationFilter(django_filters.FilterSet):
    class Meta:
        model = JobApplication
        fields = ['status']

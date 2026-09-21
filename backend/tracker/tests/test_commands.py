from datetime import date, timedelta
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from tracker.models import JobApplication

User = get_user_model()


class FindStaleApplicationsCommandTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='pass12345')

    def _create(self, days_old, status=JobApplication.Status.APPLIED):
        app = JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1), status=status,
        )
        # updated_at has auto_now=True, so it must be forced via .update()
        # to backdate it, bypassing the model's save() override.
        JobApplication.objects.filter(id=app.id).update(
            updated_at=timezone.now() - timedelta(days=days_old)
        )
        return app

    def test_reports_applications_older_than_threshold(self):
        self._create(days_old=20)
        out = StringIO()
        call_command('find_stale_applications', '--days', '14', stdout=out)
        self.assertIn('1 stale application', out.getvalue())

    def test_does_not_report_recently_updated_applications(self):
        self._create(days_old=2)
        out = StringIO()
        call_command('find_stale_applications', '--days', '14', stdout=out)
        self.assertIn('No stale applications', out.getvalue())

    def test_ignores_closed_applications(self):
        self._create(days_old=30, status=JobApplication.Status.REJECTED)
        out = StringIO()
        call_command('find_stale_applications', '--days', '14', stdout=out)
        self.assertIn('No stale applications', out.getvalue())

    def test_filters_by_user(self):
        other = User.objects.create_user(username='bob', password='pass12345')
        stale = self._create(days_old=30)
        JobApplication.objects.filter(id=stale.id).update(owner=other)

        out = StringIO()
        call_command('find_stale_applications', '--days', '14', '--user', 'alice', stdout=out)
        self.assertIn('No stale applications', out.getvalue())

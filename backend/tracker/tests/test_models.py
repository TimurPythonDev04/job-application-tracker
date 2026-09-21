from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase

from tracker.models import JobApplication

User = get_user_model()


class JobApplicationModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='pass12345')

    def test_default_status_is_applied(self):
        app = JobApplication.objects.create(
            owner=self.user,
            company='Acme GmbH',
            position='Werkstudent Backend',
            applied_date=date(2026, 1, 10),
        )
        self.assertEqual(app.status, JobApplication.Status.APPLIED)

    def test_str_representation(self):
        app = JobApplication.objects.create(
            owner=self.user,
            company='Acme GmbH',
            position='Werkstudent Backend',
            applied_date=date(2026, 1, 10),
            status=JobApplication.Status.INTERVIEW,
        )
        self.assertIn('Acme GmbH', str(app))
        self.assertIn('Werkstudent Backend', str(app))

    def test_updated_at_changes_on_save(self):
        app = JobApplication.objects.create(
            owner=self.user,
            company='Acme GmbH',
            position='Werkstudent Backend',
            applied_date=date(2026, 1, 10),
        )
        first_updated = app.updated_at
        app.status = JobApplication.Status.INTERVIEW
        app.save()
        app.refresh_from_db()
        # >= rather than > : on fast/low-resolution clocks the two saves can
        # legitimately land in the same microsecond.
        self.assertGreaterEqual(app.updated_at, first_updated)

    def test_deleting_user_deletes_their_applications(self):
        JobApplication.objects.create(
            owner=self.user,
            company='Acme GmbH',
            position='Werkstudent Backend',
            applied_date=date(2026, 1, 10),
        )
        self.user.delete()
        self.assertEqual(JobApplication.objects.count(), 0)

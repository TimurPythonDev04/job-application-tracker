from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import JobApplication

User = get_user_model()


class JobApplicationAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='S3curePass!23')
        response = self.client.post('/api/auth/token/', {
            'username': 'alice', 'password': 'S3curePass!23',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_create_application(self):
        response = self.client.post('/api/applications/', {
            'company': 'Acme GmbH',
            'position': 'Werkstudent Backend',
            'applied_date': '2026-02-01',
            'job_url': 'https://example.com/jobs/1',
            'notes': 'Found via LinkedIn',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(JobApplication.objects.count(), 1)
        self.assertEqual(JobApplication.objects.get().owner, self.user)

    def test_create_application_requires_company_and_position(self):
        response = self.client.post('/api/applications/', {
            'applied_date': '2026-02-01',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('company', response.data)
        self.assertIn('position', response.data)

    def test_list_applications(self):
        JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1),
        )
        response = self.client.get('/api/applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)

    def test_filter_applications_by_status(self):
        JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1), status=JobApplication.Status.APPLIED,
        )
        JobApplication.objects.create(
            owner=self.user, company='Beta', position='Praktikum',
            applied_date=date(2026, 1, 2), status=JobApplication.Status.OFFER,
        )
        response = self.client.get('/api/applications/?status=offer')
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['company'], 'Beta')

    def test_update_application_status_moves_kanban_column(self):
        app = JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1),
        )
        response = self.client.patch(f'/api/applications/{app.id}/', {
            'status': 'interview',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        app.refresh_from_db()
        self.assertEqual(app.status, JobApplication.Status.INTERVIEW)

    def test_update_rejects_invalid_status(self):
        app = JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1),
        )
        response = self.client.patch(f'/api/applications/{app.id}/', {
            'status': 'not-a-real-status',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_delete_application(self):
        app = JobApplication.objects.create(
            owner=self.user, company='Acme', position='Werkstudent',
            applied_date=date(2026, 1, 1),
        )
        response = self.client.delete(f'/api/applications/{app.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(JobApplication.objects.filter(id=app.id).exists())


class AnalyticsAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='S3curePass!23')
        response = self.client.post('/api/auth/token/', {
            'username': 'alice', 'password': 'S3curePass!23',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_analytics_counts_and_conversion_rates(self):
        statuses = [
            JobApplication.Status.APPLIED,
            JobApplication.Status.APPLIED,
            JobApplication.Status.INTERVIEW,
            JobApplication.Status.OFFER,
        ]
        for i, s in enumerate(statuses):
            JobApplication.objects.create(
                owner=self.user, company=f'Company {i}', position='Werkstudent',
                applied_date=date(2026, 1, 1 + i), status=s,
            )

        response = self.client.get('/api/applications/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data
        self.assertEqual(data['total'], 4)
        self.assertEqual(data['counts_by_status']['applied'], 2)
        self.assertEqual(data['counts_by_status']['interview'], 1)
        self.assertEqual(data['counts_by_status']['offer'], 1)
        # 2 of 4 reached interview-or-further -> 50%
        self.assertEqual(data['conversion_rates']['applied_to_interview'], 50.0)
        # 1 of 2 (interview+offer) became an offer -> 50%
        self.assertEqual(data['conversion_rates']['interview_to_offer'], 50.0)

    def test_analytics_on_empty_data_does_not_divide_by_zero(self):
        response = self.client.get('/api/applications/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 0)
        self.assertEqual(response.data['conversion_rates']['applied_to_interview'], 0.0)

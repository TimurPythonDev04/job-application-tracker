"""
Ownership / IDOR tests.

These exist specifically to prove that one user can never read, list,
change, or delete another user's job applications through the API - even
when they know (or guess) the target object's id.
"""
from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from tracker.models import JobApplication

User = get_user_model()


class OwnershipTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username='alice', password='S3curePass!23')
        self.bob = User.objects.create_user(username='bob', password='S3curePass!23')

        self.alice_app = JobApplication.objects.create(
            owner=self.alice,
            company='Alice Corp',
            position='Werkstudent Data',
            applied_date=date(2026, 1, 5),
        )

    def _login_as(self, user, password='S3curePass!23'):
        response = self.client.post('/api/auth/token/', {
            'username': user.username,
            'password': password,
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")

    def test_list_only_returns_own_applications(self):
        JobApplication.objects.create(
            owner=self.bob, company='Bob Inc', position='Praktikum QA',
            applied_date=date(2026, 1, 6),
        )
        self._login_as(self.alice)
        response = self.client.get('/api/applications/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [row['id'] for row in response.data['results']]
        self.assertEqual(ids, [self.alice_app.id])

    def test_cannot_retrieve_other_users_application(self):
        self._login_as(self.bob)
        response = self.client.get(f'/api/applications/{self.alice_app.id}/')
        # 404, not 403: existence of another user's row is not revealed either.
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cannot_update_other_users_application(self):
        self._login_as(self.bob)
        response = self.client.patch(
            f'/api/applications/{self.alice_app.id}/',
            {'status': 'offer'},
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.alice_app.refresh_from_db()
        self.assertEqual(self.alice_app.status, JobApplication.Status.APPLIED)

    def test_cannot_delete_other_users_application(self):
        self._login_as(self.bob)
        response = self.client.delete(f'/api/applications/{self.alice_app.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(JobApplication.objects.filter(id=self.alice_app.id).exists())

    def test_cannot_create_application_owned_by_someone_else(self):
        """Mass-assignment guard: an `owner` field in the payload is ignored."""
        self._login_as(self.bob)
        response = self.client.post('/api/applications/', {
            'company': 'Sneaky Inc',
            'position': 'Werkstudent',
            'applied_date': '2026-01-06',
            'owner': self.alice.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = JobApplication.objects.get(id=response.data['id'])
        self.assertEqual(created.owner, self.bob)

    def test_analytics_only_counts_own_applications(self):
        JobApplication.objects.create(
            owner=self.bob, company='Bob Inc', position='Praktikum QA',
            applied_date=date(2026, 1, 6), status=JobApplication.Status.OFFER,
        )
        self._login_as(self.alice)
        response = self.client.get('/api/applications/analytics/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 1)
        self.assertEqual(response.data['counts_by_status']['offer'], 0)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get('/api/applications/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

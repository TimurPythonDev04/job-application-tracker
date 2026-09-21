from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class RegistrationTests(APITestCase):
    def test_register_creates_user_with_hashed_password(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'bob',
            'email': 'bob@example.com',
            'password': 'S3curePass!23',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='bob')
        self.assertNotEqual(user.password, 'S3curePass!23')
        self.assertTrue(user.check_password('S3curePass!23'))
        # password must never come back in the response
        self.assertNotIn('password', response.data)

    def test_register_rejects_weak_password(self):
        response = self.client.post('/api/auth/register/', {
            'username': 'weakpass',
            'password': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='weakpass').exists())

    def test_register_rejects_duplicate_username(self):
        User.objects.create_user(username='taken', password='S3curePass!23')
        response = self.client.post('/api/auth/register/', {
            'username': 'taken',
            'password': 'AnotherPass!23',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TokenAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='alice', password='S3curePass!23')

    def test_obtain_token_with_valid_credentials(self):
        response = self.client.post('/api/auth/token/', {
            'username': 'alice',
            'password': 'S3curePass!23',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_obtain_token_with_wrong_password_is_rejected(self):
        response = self.client.post('/api/auth/token/', {
            'username': 'alice',
            'password': 'wrong-password',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token_issues_new_access_token(self):
        obtain = self.client.post('/api/auth/token/', {
            'username': 'alice',
            'password': 'S3curePass!23',
        })
        refresh = self.client.post('/api/auth/token/refresh/', {
            'refresh': obtain.data['refresh'],
        })
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertIn('access', refresh.data)

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_endpoint_returns_current_user_only(self):
        obtain = self.client.post('/api/auth/token/', {
            'username': 'alice',
            'password': 'S3curePass!23',
        })
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {obtain.data['access']}")
        response = self.client.get('/api/auth/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'alice')

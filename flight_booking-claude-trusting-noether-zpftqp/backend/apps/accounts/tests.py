from django.test import TestCase
from rest_framework.test import APIClient

from common.testing import make_admin, make_customer


class AuthTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_creates_customer_and_returns_tokens(self):
        res = self.client.post(
            "/api/auth/register/",
            {"email": "new@test.local", "password": "StrongPass123!", "first_name": "New", "last_name": "User",
             "role": "ADMIN"},  # role must be ignored
            format="json",
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["user"]["role"], "CUSTOMER")
        self.assertIn("access", body["data"])

    def test_register_duplicate_email_rejected(self):
        make_customer("dup@test.local")
        res = self.client.post(
            "/api/auth/register/",
            {"email": "dup@test.local", "password": "StrongPass123!", "first_name": "A", "last_name": "B"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertFalse(res.json()["success"])

    def test_login_and_profile(self):
        make_customer("c@test.local", "Customer123!")
        res = self.client.post("/api/auth/login/", {"email": "c@test.local", "password": "Customer123!"}, format="json")
        self.assertEqual(res.status_code, 200)
        token = res.json()["data"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        profile = self.client.get("/api/auth/profile/")
        self.assertEqual(profile.json()["data"]["email"], "c@test.local")
        upd = self.client.put("/api/auth/profile/", {"first_name": "Changed", "phone": "123"}, format="json")
        self.assertEqual(upd.json()["data"]["first_name"], "Changed")

    def test_login_wrong_password(self):
        make_customer("c@test.local")
        res = self.client.post("/api/auth/login/", {"email": "c@test.local", "password": "nope"}, format="json")
        self.assertEqual(res.status_code, 401)
        self.assertFalse(res.json()["success"])

    def test_profile_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/profile/").status_code, 401)

    def test_customer_cannot_use_admin_apis(self):
        self.client.force_authenticate(make_customer())
        for url in ("/api/customers/", "/api/bookings/", "/api/passengers/", "/api/dashboard/stats/", "/api/aircraft/"):
            self.assertEqual(self.client.get(url).status_code, 403, url)
        res = self.client.post(
            "/api/airports/", {"code": "XXX", "name": "X", "city": "X", "country": "X"}, format="json"
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_can_use_admin_apis(self):
        self.client.force_authenticate(make_admin())
        for url in ("/api/customers/", "/api/bookings/", "/api/passengers/", "/api/dashboard/stats/", "/api/aircraft/"):
            self.assertEqual(self.client.get(url).status_code, 200, url)

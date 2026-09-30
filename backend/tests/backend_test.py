"""Backend integration tests for Nestavia Zirakpur booking API."""
import os
import io
import uuid
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nestavia-booking.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

HOST_EMAIL = "sweetguru88@gmail.com"
HOST_PASSWORD = "Nestavia@2026"


def _next_weekday(target_wd: int, min_days_ahead: int = 10) -> date:
    """Return the next date at least `min_days_ahead` days from today whose weekday==target_wd."""
    d = date.today() + timedelta(days=min_days_ahead)
    while d.weekday() != target_wd:
        d += timedelta(days=1)
    return d


# ---------------- Fixtures ----------------
# NOTE: Backend prefers cookie over Bearer in get_current_user. requests.Session
# shares cookies across calls, so we use plain requests (no session) to make sure
# Authorization: Bearer header is honoured for the intended role.
@pytest.fixture(scope="session")
def s():
    # Return the requests module itself (has .get/.post) so no cookie persistence.
    return requests


@pytest.fixture(scope="session")
def host_token():
    r = requests.post(f"{API}/auth/login", json={"email": HOST_EMAIL, "password": HOST_PASSWORD})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "host"
    return data["token"]


@pytest.fixture(scope="session")
def host_headers(host_token):
    return {"Authorization": f"Bearer {host_token}"}


@pytest.fixture(scope="session")
def guest():
    email = f"test_guest_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "Test Guest", "email": email, "password": "pass123", "phone": "9999999999"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["token"], "id": data["user"]["id"]}


@pytest.fixture(scope="session")
def guest_headers(guest):
    return {"Authorization": f"Bearer {guest['token']}"}


# ---------------- Auth tests ----------------
class TestAuth:
    def test_duplicate_email(self, s, guest):
        r = s.post(f"{API}/auth/register", json={"name": "Dup", "email": guest["email"], "password": "pass123"})
        assert r.status_code == 400

    def test_wrong_password(self, s, guest):
        r = s.post(f"{API}/auth/login", json={"email": guest["email"], "password": "wrongpw"})
        assert r.status_code == 401

    def test_me(self, s, guest_headers, guest):
        r = s.get(f"{API}/auth/me", headers=guest_headers)
        assert r.status_code == 200
        assert r.json()["user"]["email"] == guest["email"]

    def test_host_role(self, s, host_headers):
        r = s.get(f"{API}/auth/me", headers=host_headers)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "host"


# ---------------- Pricing quote tests ----------------
class TestPricing:
    def test_2_nights_weekday_2_guests(self, s):
        # find a Monday far in future -> Mon & Tue nights (both weekday)
        mon = _next_weekday(0, min_days_ahead=14)
        wed = mon + timedelta(days=2)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": mon.isoformat(), "check_out": wed.isoformat(),
            "guests": 2, "payment_option": "full",
        })
        assert r.status_code == 200, r.text
        q = r.json()
        # 2 nights * 2400 = 4800, no weekend, no extra guest
        assert q["subtotal"] == 4800
        assert q["total"] == 4800
        assert q["weekend_markup_total"] == 0
        assert q["extra_guest_total"] == 0

    def test_4_guests_adds_1000_per_night(self, s):
        mon = _next_weekday(0, min_days_ahead=14)
        wed = mon + timedelta(days=2)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": mon.isoformat(), "check_out": wed.isoformat(),
            "guests": 4, "payment_option": "full",
        })
        assert r.status_code == 200
        q = r.json()
        # extra guests: 2 * 500 = 1000/night; 2 nights = 2000
        assert q["extra_guest_fee_per_night"] == 1000
        assert q["extra_guest_total"] == 2000
        assert q["subtotal"] == 4800 + 2000

    def test_friday_saturday_weekend_markup(self, s):
        # Fri night only -> check_in Fri, check_out Sat
        fri = _next_weekday(4, min_days_ahead=14)
        sat = fri + timedelta(days=1)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": fri.isoformat(), "check_out": sat.isoformat(),
            "guests": 2, "payment_option": "full",
        })
        assert r.status_code == 200
        q = r.json()
        # 2400 base + 15% = 360
        assert q["weekend_markup_total"] == 360
        assert q["subtotal"] == 2760

    def test_last_minute_forces_full(self, s):
        # check-in tomorrow -> partial_allowed False
        tomorrow = date.today() + timedelta(days=1)
        day_after = tomorrow + timedelta(days=1)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": tomorrow.isoformat(), "check_out": day_after.isoformat(),
            "guests": 2, "payment_option": "partial",
        })
        assert r.status_code == 200
        q = r.json()
        assert q["partial_allowed"] is False
        assert q["payment_option"] == "full"

    def test_partial_70pct_when_eligible(self, s):
        # Check-in 10 days from now, Monday -> weekday
        mon = _next_weekday(0, min_days_ahead=10)
        wed = mon + timedelta(days=2)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": mon.isoformat(), "check_out": wed.isoformat(),
            "guests": 2, "payment_option": "partial",
        })
        assert r.status_code == 200
        q = r.json()
        assert q["partial_allowed"] is True
        assert q["payment_option"] == "partial"
        assert q["amount_due"] == round(q["total"] * 0.70)

    def test_guests_5_returns_400(self, s):
        mon = _next_weekday(0, min_days_ahead=14)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": mon.isoformat(), "check_out": (mon + timedelta(days=1)).isoformat(),
            "guests": 5,
        })
        assert r.status_code == 400

    def test_checkout_before_checkin(self, s):
        mon = _next_weekday(0, min_days_ahead=14)
        r = s.post(f"{API}/pricing/quote", json={
            "check_in": mon.isoformat(), "check_out": mon.isoformat(),
            "guests": 2,
        })
        assert r.status_code == 400


# ---------------- Booking + receipt + host approve + review ----------------
class TestBookingFlow:
    @pytest.fixture(scope="class")
    def dates(self):
        # Monday far in future (weekday, partial eligible)
        mon = _next_weekday(0, min_days_ahead=20)
        return {"check_in": mon.isoformat(), "check_out": (mon + timedelta(days=2)).isoformat()}

    @pytest.fixture(scope="class")
    def receipt_file_id(self, s, guest_headers):
        # tiny 1x1 PNG bytes
        png_bytes = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d494441"
            "5478da6300010000000500010d0a2db40000000049454e44ae426082"
        )
        files = {"file": ("receipt.png", io.BytesIO(png_bytes), "image/png")}
        r = s.post(f"{API}/uploads/receipt", headers=guest_headers, files=files)
        assert r.status_code == 200, r.text
        return r.json()["file_id"]

    @pytest.fixture(scope="class")
    def booking_id(self, s, guest_headers, dates, receipt_file_id):
        payload = {
            **dates, "guests": 2, "payment_option": "full",
            "guest_phone": "9999999999", "transaction_ref": "TXN12345",
            "receipt_file_id": receipt_file_id, "special_requests": "test",
        }
        r = s.post(f"{API}/bookings", headers=guest_headers, json=payload)
        assert r.status_code == 200, r.text
        return r.json()["id"]

    def test_booking_created_pending(self, s, guest_headers, booking_id):
        r = s.get(f"{API}/bookings/my", headers=guest_headers)
        assert r.status_code == 200
        bks = r.json()["bookings"]
        mine = [b for b in bks if b["id"] == booking_id]
        assert len(mine) == 1
        assert mine[0]["status"] == "pending"
        # address should be None while pending
        assert mine[0]["address"] is None

    def test_host_lists_booking(self, s, host_headers, booking_id):
        r = s.get(f"{API}/bookings", headers=host_headers)
        assert r.status_code == 200
        ids = [b["id"] for b in r.json()["bookings"]]
        assert booking_id in ids

    def test_double_booking_conflict(self, s, guest_headers, dates, receipt_file_id):
        payload = {
            **dates, "guests": 2, "payment_option": "full",
            "guest_phone": "9999999999", "transaction_ref": "TXN99",
            "receipt_file_id": receipt_file_id,
        }
        r = s.post(f"{API}/bookings", headers=guest_headers, json=payload)
        assert r.status_code == 409

    def test_review_before_completion_forbidden(self, s, guest_headers, booking_id):
        r = s.post(f"{API}/reviews", headers=guest_headers, json={
            "booking_id": booking_id, "rating": 5, "comment": "too early",
        })
        assert r.status_code == 403

    def test_host_approve_reveals_address(self, s, host_headers, guest_headers, booking_id):
        r = s.post(f"{API}/bookings/{booking_id}/approve", headers=host_headers)
        assert r.status_code == 200
        # Now guest sees address
        r2 = s.get(f"{API}/bookings/my", headers=guest_headers)
        b = [x for x in r2.json()["bookings"] if x["id"] == booking_id][0]
        assert b["status"] == "confirmed"
        assert b["address"] and "ZIRAKPUR" in b["address"].upper()
        assert b["maps_link"]

    def test_host_can_get_receipt_file(self, s, host_headers, receipt_file_id):
        r = s.get(f"{API}/files/{receipt_file_id}", headers=host_headers)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_complete_and_review(self, s, host_headers, guest_headers, booking_id):
        r = s.post(f"{API}/bookings/{booking_id}/complete", headers=host_headers)
        assert r.status_code == 200
        r2 = s.post(f"{API}/reviews", headers=guest_headers, json={
            "booking_id": booking_id, "rating": 5, "comment": "TEST review great stay",
        })
        assert r2.status_code == 200, r2.text
        r3 = s.get(f"{API}/reviews")
        assert r3.status_code == 200
        data = r3.json()
        assert data["count"] >= 1
        assert data["average"] >= 1


# ---------------- Host calendar controls ----------------
class TestHostCalendar:
    def test_block_unblock_and_rate_override(self, s, host_headers):
        # pick a very far future date to avoid conflict
        far = (date.today() + timedelta(days=180)).isoformat()
        # block
        r = s.post(f"{API}/host/block", headers=host_headers, json={"dates": [far]})
        assert r.status_code == 200
        r2 = s.get(f"{API}/availability")
        assert far in r2.json()["blocked"]
        # unblock
        r = s.post(f"{API}/host/unblock", headers=host_headers, json={"dates": [far]})
        assert r.status_code == 200
        assert far not in s.get(f"{API}/availability").json()["blocked"]

        # rate override reflects in quote
        override_date = _next_weekday(0, min_days_ahead=45).isoformat()
        r = s.post(f"{API}/host/rate-override", headers=host_headers, json={"date": override_date, "rate": 3000})
        assert r.status_code == 200
        avail = s.get(f"{API}/availability").json()
        assert any(o["date"] == override_date and o["rate"] == 3000 for o in avail["rate_overrides"])
        # quote uses it
        co = (date.fromisoformat(override_date) + timedelta(days=1)).isoformat()
        q = s.post(f"{API}/pricing/quote", json={"check_in": override_date, "check_out": co, "guests": 2}).json()
        # first night should have base=3000 (weekday assumed by _next_weekday(0)=Mon)
        assert q["nights"][0]["base"] == 3000
        # cleanup
        s.delete(f"{API}/host/rate-override/{override_date}", headers=host_headers)

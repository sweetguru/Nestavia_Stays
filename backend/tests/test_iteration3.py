"""Iteration 3: host_insights, receipt.pdf, instagram_posts sanitisation."""
import os
import uuid
import requests
from datetime import date, timedelta

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
HOST_EMAIL = "sweetguru88@gmail.com"
HOST_PASS = "Nestavia@2026"


def _login(email, password):
    r = requests.post(f"{BASE}/api/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _hdr(t):
    return {"Authorization": f"Bearer {t}"}


def _register_guest():
    email = f"TEST_iter3_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{BASE}/api/auth/register", json={"name": "T3 Guest", "email": email, "password": "pass123", "phone": "9999999999"}, timeout=30)
    assert r.status_code == 200, r.text
    return email, r.json()["token"]


# ---------- Insights ----------
def test_host_insights_shape():
    t = _login(HOST_EMAIL, HOST_PASS)
    r = requests.get(f"{BASE}/api/host/insights", headers=_hdr(t), timeout=30)
    assert r.status_code == 200
    months = r.json()["months"]
    assert len(months) == 9
    for m in months:
        for k in ("key", "month", "nights", "earnings", "occupancy"):
            assert k in m


def test_host_insights_guest_forbidden():
    _, tg = _register_guest()
    r = requests.get(f"{BASE}/api/host/insights", headers=_hdr(tg), timeout=30)
    assert r.status_code == 403


def test_insights_increment_after_confirmed_booking():
    host_t = _login(HOST_EMAIL, HOST_PASS)
    email, gt = _register_guest()

    # baseline
    before = {m["key"]: m for m in requests.get(f"{BASE}/api/host/insights", headers=_hdr(host_t)).json()["months"]}

    # future dates (30/32 days out - 2 nights)
    ci = date.today() + timedelta(days=30)
    co = ci + timedelta(days=2)
    key = ci.strftime("%Y-%m")

    # ensure not blocked - just try; if 409 pick different days
    for offset in range(30, 90):
        ci = date.today() + timedelta(days=offset)
        co = ci + timedelta(days=2)
        key = ci.strftime("%Y-%m")
        payload = {"check_in": ci.isoformat(), "check_out": co.isoformat(), "guests": 2,
                   "payment_option": "full", "guest_phone": "9999999999", "transaction_ref": f"TEST{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{BASE}/api/bookings", json=payload, headers=_hdr(gt), timeout=30)
        if r.status_code == 200:
            break
    assert r.status_code == 200, r.text
    bk = r.json()
    bid = bk["id"]
    amount_due = bk["booking"]["amount_due"]

    # host approves
    ar = requests.post(f"{BASE}/api/bookings/{bid}/approve", headers=_hdr(host_t), timeout=30)
    assert ar.status_code == 200

    after = {m["key"]: m for m in requests.get(f"{BASE}/api/host/insights", headers=_hdr(host_t)).json()["months"]}
    assert key in after, f"month {key} not present in insights window"
    assert after[key]["nights"] - before[key]["nights"] == 2
    # allow rounding of 1 rupee
    diff = after[key]["earnings"] - before[key]["earnings"]
    assert abs(diff - amount_due) <= 1, f"earnings diff {diff} vs amount_due {amount_due}"

    # cleanup: reject/cancel
    requests.post(f"{BASE}/api/bookings/{bid}/cancel", headers=_hdr(host_t), timeout=30)


# ---------- Receipt PDF ----------
def test_receipt_pdf_owner_and_host_and_other_guest():
    host_t = _login(HOST_EMAIL, HOST_PASS)
    _, gt = _register_guest()
    _, other = _register_guest()

    # create a booking as gt
    for offset in range(60, 150):
        ci = date.today() + timedelta(days=offset)
        co = ci + timedelta(days=1)
        payload = {"check_in": ci.isoformat(), "check_out": co.isoformat(), "guests": 2,
                   "payment_option": "full", "guest_phone": "9999999999", "transaction_ref": f"TEST{uuid.uuid4().hex[:6]}"}
        r = requests.post(f"{BASE}/api/bookings", json=payload, headers=_hdr(gt), timeout=30)
        if r.status_code == 200:
            break
    assert r.status_code == 200, r.text
    bid = r.json()["id"]

    # owner
    ro = requests.get(f"{BASE}/api/bookings/{bid}/receipt.pdf", headers=_hdr(gt), timeout=60)
    assert ro.status_code == 200
    assert ro.headers.get("content-type", "").startswith("application/pdf")
    assert ro.content[:4] == b"%PDF"

    # other guest -> 404
    rx = requests.get(f"{BASE}/api/bookings/{bid}/receipt.pdf", headers=_hdr(other), timeout=60)
    assert rx.status_code == 404

    # host -> 200
    rh = requests.get(f"{BASE}/api/bookings/{bid}/receipt.pdf", headers=_hdr(host_t), timeout=60)
    assert rh.status_code == 200
    assert rh.content[:4] == b"%PDF"

    # cleanup
    requests.post(f"{BASE}/api/bookings/{bid}/cancel", headers=_hdr(host_t), timeout=30)


# ---------- Instagram sanitisation ----------
def test_instagram_posts_sanitised_and_restored():
    host_t = _login(HOST_EMAIL, HOST_PASS)
    # fetch current listing to preserve
    prop = requests.get(f"{BASE}/api/property", timeout=30).json()
    orig = {"description": prop["description"], "amenities": prop["amenities"], "house_rules": prop["house_rules"],
            "instagram_posts": prop.get("instagram_posts", [])}

    payload = {**orig, "instagram_posts": ["https://www.instagram.com/p/ABC123/", "https://evil.com/x"]}
    r = requests.put(f"{BASE}/api/host/listing", json=payload, headers=_hdr(host_t), timeout=30)
    assert r.status_code == 200

    p2 = requests.get(f"{BASE}/api/property", timeout=30).json()
    assert p2["instagram_posts"] == ["https://www.instagram.com/p/ABC123/"]
    # sanity: description/amenities/rules unchanged
    assert p2["description"] == orig["description"]
    assert p2["amenities"] == orig["amenities"]
    assert p2["house_rules"] == orig["house_rules"]

    # restore
    r2 = requests.put(f"{BASE}/api/host/listing", json={**orig, "instagram_posts": []}, headers=_hdr(host_t), timeout=30)
    assert r2.status_code == 200
    p3 = requests.get(f"{BASE}/api/property", timeout=30).json()
    assert p3["instagram_posts"] == []

"""Iteration 2: listing editor endpoints (host_name, description, amenities, house_rules)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
API = f"{BASE_URL}/api"

HOST_EMAIL = "sweetguru88@gmail.com"
HOST_PASSWORD = "Nestavia@2026"

DEFAULT_DESC_PREFIX = "A private, tastefully-designed 1BHK"
DEFAULT_AMENITIES_COUNT = 8
DEFAULT_RULES_COUNT = 4


@pytest.fixture(scope="module")
def host_headers():
    r = requests.post(f"{API}/auth/login", json={"email": HOST_EMAIL, "password": HOST_PASSWORD})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def guest_headers():
    email = f"test_iter2_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register", json={"name": "It2", "email": email, "password": "pass123", "phone": "9998887777"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="module")
def original_listing():
    r = requests.get(f"{API}/property")
    assert r.status_code == 200
    p = r.json()
    return {"description": p["description"], "amenities": p["amenities"], "house_rules": p["house_rules"]}


def test_property_has_host_name_and_defaults(original_listing):
    r = requests.get(f"{API}/property")
    assert r.status_code == 200
    p = r.json()
    assert p["host_name"] == "Dr. Gurpreet Kaur"
    assert p["description"].startswith(DEFAULT_DESC_PREFIX), f"desc={p['description'][:80]}"
    assert isinstance(p["amenities"], list) and len(p["amenities"]) == DEFAULT_AMENITIES_COUNT
    assert isinstance(p["house_rules"], list) and len(p["house_rules"]) == DEFAULT_RULES_COUNT


def test_guest_cannot_update_listing(guest_headers):
    r = requests.put(f"{API}/host/listing", headers=guest_headers, json={
        "description": "hack", "amenities": ["x"], "house_rules": ["y"],
    })
    assert r.status_code == 403


def test_unauth_cannot_update_listing():
    r = requests.put(f"{API}/host/listing", json={"description": "x", "amenities": [], "house_rules": []})
    assert r.status_code == 401


def test_host_updates_listing_and_get_reflects(host_headers, original_listing):
    new_desc = original_listing["description"] + " [MARKER-IT2]"
    new_amen = original_listing["amenities"] + ["Test Amenity"]
    new_rules = original_listing["house_rules"] + ["Test Rule"]

    r = requests.put(f"{API}/host/listing", headers=host_headers,
                     json={"description": new_desc, "amenities": new_amen, "house_rules": new_rules})
    assert r.status_code == 200, r.text
    body = r.json()["listing"]
    assert body["description"].endswith("[MARKER-IT2]")
    assert "Test Amenity" in body["amenities"]
    assert "Test Rule" in body["house_rules"]

    # GET reflects
    p = requests.get(f"{API}/property").json()
    assert "[MARKER-IT2]" in p["description"]
    assert "Test Amenity" in p["amenities"]
    assert "Test Rule" in p["house_rules"]


def test_restore_original_listing(host_headers, original_listing):
    r = requests.put(f"{API}/host/listing", headers=host_headers, json=original_listing)
    assert r.status_code == 200
    p = requests.get(f"{API}/property").json()
    assert p["description"] == original_listing["description"]
    assert p["amenities"] == original_listing["amenities"]
    assert p["house_rules"] == original_listing["house_rules"]
    assert len(p["amenities"]) == DEFAULT_AMENITIES_COUNT
    assert len(p["house_rules"]) == DEFAULT_RULES_COUNT

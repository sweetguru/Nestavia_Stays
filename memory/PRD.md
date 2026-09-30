# Nestavia Zirakpur - The Himalayan Gateway — PRD

## Problem statement
Premium direct-booking web app (Airbnb-style, single property) for Nestavia Zirakpur. Deep emerald / white / gold luxury theme. Uses ONLY the owner's own media (logo, 5 property photos, walkthrough video, WhatsApp/Instagram/GPay QR codes) — no stock photos.

## Roles
- Guest: email/password (JWT). Books, pays manually via GPay/UPI, uploads receipt, sees address after approval, reviews after completed stay.
- Host: sweetguru88@gmail.com (seeded from backend/.env). Dashboard at /host.

## Business rules (implemented in backend/server.py compute_quote)
- ₹2400/night for 2 guests, +₹500/extra guest/night, max 4 guests
- +15% on Fri/Sat nights; 10% discount if check-in < 48h
- 70% down-payment allowed if check-in ≥ 7 days, else 100%
- Cancellation: ≥96h → 100% refund, else 40%
- Exact address + Google Maps pin only revealed when booking status = confirmed
- Reviews only for bookings with status = completed (one per booking)

## Architecture
- FastAPI (`/api/*`) + MongoDB (motor) + Emergent object storage for receipts
- React 19 + Tailwind + shadcn + sonner; routes: `/`, `/auth`, `/my-bookings`, `/host`
- WhatsApp via `wa.me` links only (host 918802757866), no paid API
- Assets served from customer-assets CDN URLs in `frontend/src/lib/assets.js`

## Key endpoints
auth/register|login|logout|me · property · pricing/quote · availability · uploads/receipt · files/{id} · bookings (POST, /my, GET host, /approve /reject /complete /cancel) · reviews · host/block|unblock|rate-override|stats|quick-replies

## Implemented (2026-06)
- Full backend + frontend; walkthrough video section on home
- Tested: /app/test_reports/iteration_1.json — 19/19 backend, full frontend e2e pass
- 2026-06 (iteration 2, all pass): host renamed 'Dr. Gurpreet Kaur'; footer 'Follow and review us on Instagram'; host WhatsApp review-request link on completed bookings; 'Arriving within 48 hours' reminder list with WhatsApp reminder buttons; host listing editor (description/amenities/house rules via PUT /host/listing, stored in listing_settings); guest 'Share on WhatsApp' button + OG meta tags for link preview

- 2026-06 (iteration 3, all pass): host occupancy & earnings chart (GET /host/insights, recharts); Instagram section on home (posts/reels links, QR, host-managed embed URLs via listing_settings.instagram_posts); guest PDF receipt (GET /bookings/{id}/receipt.pdf, reportlab); WhatsApp enquiry form on home

## Backlog
- P1: Email notifications on booking status change (needs provider)
- P2: Multi-photo receipt upload, booking search/filter by date
- P2: Guest can view PDF receipt from host dashboard too (endpoint already allows host)

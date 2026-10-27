# Tractor Together — Eket pilot

Implemented 27 October 2026. Shared tractor requests for ploughing, harrowing and ridging in Eket, Akwa Ibom. The app does not supply equipment, verify operators, collect payments or guarantee bookings.

## Workflow

The coordinator creates a request with community, task, preferred dates (at most 31 days), name, mobile number and hectares. Up to 20 farms can join. Joining is an expression of interest, not a booking.

The coordinator obtains an operator quote outside FarmPal and records the operator contact, date, total group price and terms. The terms should cover equipment/attachment, suitability, travel, fuel, minimum job size, work order, payment and cancellation. The date must be within the group's requested range. No prices or operators are preloaded.

Saving a quote closes joining. The price is allocated by hectares in integer kobo; rounding preserves the exact total. Each farmer accepts the displayed share. Only after everyone accepts can the coordinator confirm. Quote replacement resets all acceptances; a member leaving before confirmation removes the quote and reopens the group. Confirmed booking changes require coordinator contact or cancellation; they cannot silently change the agreed quote.

The coordinator records work started, completed or cancelled. Members can mark their own direct payment as reported, or undo that record before completion. These are self-reported status records, not proof of payment or an operator's independent confirmation. Cancellation does not settle or refund payments.

## Data and access

- Firebase authentication is required for all endpoints; token verification uses the existing backend verification dependency.
- Persistent data lives in the server-only `equipmentRequestsEket` Firestore collection. Existing client rules deny access to it. No rule deployment is needed.
- Public-to-signed-in-farmers listings expose community, task, dates, totals, status and membership flags for the viewer. Names, phone numbers, user IDs and quotes are excluded.
- Members see names and areas, the operator quote and coordinator contact. The coordinator sees member contacts for arranging the work. Each member sees their own payment report; group members also see the self-reported payment status. The form explains contact sharing; the coordinator must obtain permission to share the operator number.
- Mutations execute in a Firestore transaction with a version precondition. Stale updates return 409. UUID request IDs are reused on retries, preventing duplicate creation after an ambiguous response; IDs remain bound to the creator.
- Validated payloads, bounded dates, size limits, Nigerian mobile numbers, participant limits, no-store responses and rate limiting apply.
- Lists are capped at 100 records. This pilot has no notifications, operator accounts, in-app payments, dispute resolution, map routing, automated distance matching or labour hiring yet. Farmers must check proximity and access themselves. Requests and payment status are refreshed on opening, after saves or with Refresh; no background alerts are implied.

## Pilot launch needs

Recruit real tractor operators and farmers locally. Confirm service areas, attachments, minimum acreage, full pricing, travel conditions and payment/cancellation terms before arranging a job. Use real field measurements before accepting the quote. No operator has been contacted by FarmPal as part of implementation.

## Verification

Domain and HTTP tests cover invalid data, exact cost splitting, ownership, authentication, private views, stale versions, quote acceptance, membership locking, quote invalidation and terminal states. Store tests cover retry ownership and persisted changes. UI tests cover the empty pilot, retry-safe creation and acceptance controls. Existing crop scan tests remain required.

Production read-only checks can verify the bundle and unauthenticated endpoint rejection. A real multi-account booking and operator attendance still require a user-run pilot; no production test account or fictional job is created automatically.

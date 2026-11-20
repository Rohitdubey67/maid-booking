# Maid Booking Service

This is the backend for an app where customers book maids for home services like cleaning and cooking.

With it, you can:

- Add a maid with their skills, prices and working hours.
- Search for maids who are free at a certain time.
- Book a maid right now, for a later time, or on a repeating schedule.
- Pay for a booking.
- Cancel a booking and get a refund.

It uses Node.js, TypeScript and Express. All data is kept in memory, so it resets when the server restarts.

## How to run it

You need Node.js version 20 or newer.

```bash
npm install      # install packages
npm run dev      # start the server at http://localhost:3000
npm test         # run the tests
```

When the server starts, it adds 3 sample maids so you can try it right away. To start with no sample maids, run `SAMPLE_DATA=false npm run dev`.

## How to try it

Prices are in **paise**, so `20000` means ₹200.

**1. Check the server is running**

```bash
curl localhost:3000/health
```

**2. Find a maid**

This finds cleaners in Koramangala who are free for 1 hour at 10:00 AM IST on 8 December.

```bash
curl "localhost:3000/maids/search?locality=koramangala&serviceType=cleaning&startAt=2026-12-08T04:30:00Z&durationMinutes=60"
```

The time in the link is in UTC, so 04:30 UTC is 10:00 AM IST. Copy a maid's `id` from the reply.

**3. Book the maid**

```bash
curl -X POST localhost:3000/bookings -H 'Content-Type: application/json' -d '{
  "type": "SCHEDULED",
  "customerId": "c1",
  "maidId": "PASTE_MAID_ID",
  "serviceType": "cleaning",
  "durationMinutes": 60,
  "startAt": "2026-12-08T10:00:00+05:30"
}'
```

Copy the `id` inside `visits` from the reply. That is the visit you will pay for.

**4. Pay for the visit**

```bash
curl -X POST localhost:3000/visits/PASTE_VISIT_ID/payments \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: pay-1' \
  -d '{ "method": "UPI", "details": { "vpa": "asha@okbank" } }'
```

`Idempotency-Key` is any unique text you choose. If you send the same request twice with the same key, you are only charged once.

**5. Cancel the visit**

```bash
curl -X POST localhost:3000/visits/PASTE_VISIT_ID/cancel
```

The reply shows how much money was refunded.

## Booking types

| Type | What it means | Extra fields needed |
|---|---|---|
| `INSTANT` | Starts right now | None |
| `SCHEDULED` | One visit at a chosen time | `startAt` |
| `RECURRING` | Repeats on chosen days | `daysOfWeek`, `startTime`, `endDate` |

Example of a recurring booking, every Monday and Wednesday at 9 AM until 31 December:

```json
{
  "type": "RECURRING",
  "customerId": "c1",
  "maidId": "PASTE_MAID_ID",
  "serviceType": "cleaning",
  "durationMinutes": 60,
  "daysOfWeek": [1, 3],
  "startTime": "09:00",
  "endDate": "2026-12-31"
}
```

Days are numbers: 0 is Sunday, 1 is Monday, and so on up to 6 for Saturday.

## All endpoints

| Method | Path | What it does |
|---|---|---|
| `POST` | `/maids` | Add a maid |
| `GET` | `/maids/:id` | See one maid |
| `GET` | `/maids/search` | Find free maids |
| `POST` | `/bookings` | Make a booking |
| `GET` | `/bookings/:id` | See a booking and its visits |
| `POST` | `/bookings/:id/cancel` | Cancel all remaining visits in a booking |
| `POST` | `/visits/:id/payments` | Pay for one visit |
| `POST` | `/visits/:id/cancel` | Cancel one visit |

## Payment methods

| Method | What to send in `details` |
|---|---|
| `CARD` | `cardToken`, like `tok_visa` |
| `UPI` | `vpa`, like `name@bank` |
| `WALLET` | `walletId`, like `wallet-123` |

Payments are fake. To test a failed payment, use a value that contains the word `fail`, like `fail@upi`.

## Main rules

- **Bookings and visits:** every booking is made of one or more visits. A recurring booking has one visit per day. Each visit is paid and cancelled on its own.
- **No double-booking:** a maid can't be booked for two visits at the same time. If 50 people try to book the same slot at once, only 1 succeeds.
- **Working hours:** a maid can only be booked during their working hours. All times are in IST.
- **Price:** the maid's hourly rate × the number of hours.
- **Paying on time:** the first visit must be paid within 15 minutes of booking. Later visits in a repeating booking must be paid 24 hours before they start. Unpaid visits are cancelled automatically, and the slot opens up again.
- **Repeating bookings:** these can last up to 12 weeks. If any one visit can't be booked, none are booked.
- **Refunds when you cancel:**

| When you cancel | Refund |
|---|---|
| 24 hours or more before the visit | 100% |
| 2 to 24 hours before | 50% |
| Less than 2 hours before | Nothing |

- **Cancelling:** an unpaid visit can be cancelled any time. A paid visit can't be cancelled after it starts.

## Errors

When something goes wrong, the reply has a `code` and a `message` that explain why.

| Status | Meaning |
|---|---|
| 400 | Something in your request is missing or wrong |
| 402 | The payment was declined |
| 404 | That maid, booking or visit doesn't exist |
| 409 | It clashes with something, like a slot that's already booked |
| 422 | The maid doesn't offer that service or isn't working then |

## How the code is organised

```
src/
  domain/          Business rules, like what a maid, visit or payment is
  application/     The main actions: search, book, pay, cancel
    interfaces/    The shapes that storage and the payment gateway must follow
  infrastructure/  Where data is stored, plus the fake payment gateway
  api/             The web routes and input checks
  setup.ts         Creates all the parts and connects them
tests/             Automated tests
```

The code is built so new options can be added easily. Each of these is one new file plus one line in `setup.ts`:

- a new booking type, like monthly
- a new payment method, like net banking
- a new search filter, like language spoken
- a new refund rule
- a new pricing rule, like higher prices at weekends

A new booking type also needs its fields added to the input checks in `src/api/schemas.ts`.

## Not included yet

- A real database
- Login and user accounts
- Marking a visit as completed
- Retrying refunds that failed
- Maid leave days and travel time between visits

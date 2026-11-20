import type { Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/api/app.js";
import { createTestContext } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

const TUESDAY_10AM_IST = "2026-12-08T10:00:00+05:30";
const TUESDAY_10AM_UTC = "2026-12-08T04:30:00.000Z";

describe("REST API", () => {
  let ctx: TestContext;
  let app: Express;
  let maidId: string;

  const booking = (overrides: Record<string, unknown> = {}) => ({
    type: "SCHEDULED",
    customerId: "customer-1",
    maidId,
    serviceType: "cleaning",
    durationMinutes: 60,
    startAt: TUESDAY_10AM_IST,
    ...overrides,
  });

  const searchTuesday = () =>
    request(app)
      .get("/maids/search")
      .query({ locality: "koramangala", serviceType: "cleaning", startAt: TUESDAY_10AM_UTC, durationMinutes: 60 });

  const pay = (visitId: string, key = "key-1") =>
    request(app)
      .post(`/visits/${visitId}/payments`)
      .set("Idempotency-Key", key)
      .send({ method: "UPI", details: { vpa: "asha@okbank" } });

  beforeEach(async () => {
    ctx = createTestContext();
    app = createApp(ctx);
    const maid = await request(app)
      .post("/maids")
      .send({
        name: "Asha Kumari",
        gender: "FEMALE",
        locality: "Koramangala",
        services: [{ serviceType: "cleaning", hourlyRatePaise: 20_000 }],
        availability: [{ dayOfWeek: 2, startTime: "09:00", endTime: "18:00" }],
      });
    maidId = maid.body.id;
  });

  it("adds, finds, books, pays for and cancels, then the maid can be found again", async () => {
    expect((await searchTuesday()).body).toMatchObject([{ id: maidId, pricePaise: 20_000 }]);

    const booked = await request(app).post("/bookings").send(booking());
    expect(booked.status).toBe(201);
    const visitId = booked.body.visits[0].id;

    const paid = await pay(visitId);
    expect(paid.status).toBe(201);
    expect(paid.body.status).toBe("SUCCEEDED");

    const sentAgain = await pay(visitId);
    expect(sentAgain.status).toBe(200);
    expect(sentAgain.body.id).toBe(paid.body.id);

    expect((await searchTuesday()).body).toEqual([]);

    const cancelled = await request(app).post(`/visits/${visitId}/cancel`);
    expect(cancelled.body).toEqual({ visitId, refundAmountPaise: 20_000, refundStatus: "REFUNDED" });

    expect((await searchTuesday()).body).toHaveLength(1);
  });

  it("books and cancels a recurring series", async () => {
    const booked = await request(app)
      .post("/bookings")
      .send(booking({ type: "RECURRING", startAt: undefined, daysOfWeek: [2], startTime: "09:00", endDate: "2026-12-22" }));
    expect(booked.body.visits).toHaveLength(3);

    const cancelled = await request(app).post(`/bookings/${booked.body.id}/cancel`);
    expect(cancelled.body.cancelled).toHaveLength(3);
    expect((await request(app).get(`/bookings/${booked.body.id}`)).body.status).toBe("CANCELLED");
  });

  it.each([
    ["missing fields", "/maids", { name: "" }],
    ["a scheduled booking without startAt", "/bookings", { type: "SCHEDULED", customerId: "c", maidId: "m", serviceType: "cleaning", durationMinutes: 60 }],
  ])("returns 400 for %s", async (_case, path, body) => {
    const response = await request(app).post(path).send(body);

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 for a payment without an Idempotency-Key", async () => {
    const booked = await request(app).post("/bookings").send(booking());

    const response = await request(app)
      .post(`/visits/${booked.body.visits[0].id}/payments`)
      .send({ method: "UPI", details: { vpa: "asha@okbank" } });

    expect(response.status).toBe(400);
  });

  it("returns 409 with the taken slot for a double booking", async () => {
    await request(app).post("/bookings").send(booking());

    const response = await request(app).post("/bookings").send(booking());

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ code: "SLOT_TAKEN", takenSlots: [{ startAt: TUESDAY_10AM_UTC }] });
  });

  it("returns 422 outside working hours", async () => {
    const response = await request(app).post("/bookings").send(booking({ startAt: "2026-12-09T10:00:00+05:30" }));

    expect(response.status).toBe(422);
  });

  it("returns 402 for a declined payment", async () => {
    const booked = await request(app).post("/bookings").send(booking());
    ctx.gateway.declineCharges = true;

    expect((await pay(booked.body.visits[0].id)).status).toBe(402);
  });

  it("returns 404 for something that doesn't exist", async () => {
    expect((await request(app).get("/maids/missing")).status).toBe(404);
    expect((await request(app).get("/bookings/missing")).status).toBe(404);
  });
});

import express from "express";
import type { Router } from "express";
import type { BookingRequest } from "../../application/booking/BookingRequest.js";
import type { Services } from "../../setup.js";
import { validate, validated } from "../middleware/validate.js";
import { toBookingResponse, toSeriesCancellationResponse } from "../responses.js";
import { createBookingSchema } from "../schemas.js";

export function bookingRoutes({ bookingService, cancellationService }: Services): Router {
  const router = express.Router();

  router.post("/", validate(createBookingSchema), async (_req, res) => {
    const details = await bookingService.book(validated<BookingRequest>(res));
    res.status(201).json(toBookingResponse(details));
  });

  router.get("/:id", async (req, res) => {
    res.json(toBookingResponse(await bookingService.getBooking(req.params.id)));
  });

  router.post("/:id/cancel", async (req, res) => {
    res.json(toSeriesCancellationResponse(await cancellationService.cancelBooking(req.params.id)));
  });

  return router;
}

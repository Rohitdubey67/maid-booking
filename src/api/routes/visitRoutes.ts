import express from "express";
import type { Router } from "express";
import Joi from "joi";
import type { PaymentDetails } from "../../application/payment/PaymentMethod.js";
import type { Services } from "../../setup.js";
import type { PaymentStatus } from "../../domain/payment/PaymentStatus.js";
import { validate, validated } from "../middleware/validate.js";
import { toVisitCancellationResponse, toPaymentResponse } from "../responses.js";
import { requestKeySchema, paymentSchema } from "../schemas.js";

interface PaymentBody {
  method: string;
  details: PaymentDetails;
}

export function visitRoutes({ paymentService, cancellationService }: Services): Router {
  const router = express.Router();

  router.post("/:id/payments", validate<{ id: string }>(paymentSchema), async (req, res) => {
    const requestKey: string = Joi.attempt(req.get("Idempotency-Key"), requestKeySchema);
    const { method, details } = validated<PaymentBody>(res);
    const { payment, repeated } = await paymentService.pay({
      visitId: req.params.id,
      method,
      details,
      requestKey,
    });

    res.status(paymentStatusCode(payment.status, repeated)).json(toPaymentResponse(payment));
  });

  router.post("/:id/cancel", async (req, res) => {
    res.json(toVisitCancellationResponse(await cancellationService.cancelVisit(req.params.id)));
  });

  return router;
}

/** 402 for a declined payment, 200 for a repeated request, 201 for a new payment. */
function paymentStatusCode(status: PaymentStatus, repeated: boolean): number {
  if (status === "FAILED") {
    return 402;
  }
  return repeated ? 200 : 201;
}

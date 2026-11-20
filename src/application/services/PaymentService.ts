import { Payment } from "../../domain/payment/Payment.js";
import { AppError } from "../../domain/shared/AppError.js";
import type { PaymentDetails, PaymentMethod } from "../payment/PaymentMethod.js";
import type { Clock } from "../interfaces/Clock.js";
import type { IdGenerator } from "../interfaces/IdGenerator.js";
import type { ChargeResult, PaymentGateway, PaymentInfo } from "../interfaces/PaymentGateway.js";
import type { VisitRepository, PaymentRepository } from "../interfaces/Repositories.js";
import type { Lookup } from "../Lookup.js";
import { findOrThrow } from "./findOrThrow.js";

export interface PayCommand {
  visitId: string;
  method: string;
  details: PaymentDetails;
  /** Repeating a request with the same key returns the first result instead of charging again. */
  requestKey: string;
}

export interface PaymentOutcome {
  payment: Payment;
  repeated: boolean;
}

interface PaymentServiceDeps {
  payments: PaymentRepository;
  visits: VisitRepository;
  methods: Lookup<PaymentMethod>;
  gateway: PaymentGateway;
  clock: Clock;
  ids: IdGenerator;
}

/** Each visit is paid separately, so a recurring booking is paid one visit at a time. */
export class PaymentService {
  private readonly deps: PaymentServiceDeps;

  constructor(deps: PaymentServiceDeps) {
    this.deps = deps;
  }

  async pay(command: PayCommand): Promise<PaymentOutcome> {
    const previous = await this.deps.payments.findByRequestKey(command.requestKey);
    if (previous) {
      return repeatedResult(previous, command);
    }

    const paymentMethod = this.deps.methods.get(command.method);
    const paymentInfo = paymentMethod.toPaymentInfo(command.details);
    const visit = await findOrThrow(
      this.deps.visits.findById(command.visitId),
      "Visit",
      command.visitId,
    );
    const now = this.deps.clock.now();

    // Moving to PAYMENT_IN_PROGRESS before calling the gateway stops a second
    // payment, a cancellation or an expiry from running at the same time.
    visit.startPayment(now);
    const payment = Payment.initiate({
      id: this.deps.ids.next(),
      visitId: visit.id,
      amount: visit.price,
      method: paymentMethod.method,
      requestKey: command.requestKey,
      createdAt: now,
    });
    await this.deps.payments.save(payment);
    await this.deps.visits.saveAll([visit]);

    const result = await this.charge(payment, paymentInfo);
    if (result.status === "SUCCEEDED") {
      payment.markSucceeded(result.transactionId);
      visit.confirmPayment();
    } else {
      payment.markFailed(result.reason);
      visit.failPayment();
    }
    await this.deps.payments.save(payment);
    await this.deps.visits.saveAll([visit]);

    return { payment, repeated: false };
  }

  /** An unreachable gateway is treated as a decline, so the customer can retry. */
  private async charge(payment: Payment, paymentInfo: PaymentInfo): Promise<ChargeResult> {
    try {
      return await this.deps.gateway.charge({ reference: payment.id, amount: payment.amount, paymentInfo });
    } catch {
      return { status: "FAILED", reason: "Payment gateway unavailable" };
    }
  }
}

function repeatedResult(previous: Payment, command: PayCommand): PaymentOutcome {
  if (previous.visitId !== command.visitId) {
    throw new AppError("KEY_ALREADY_USED", "This Idempotency-Key was already used for another visit");
  }
  return { payment: previous, repeated: true };
}

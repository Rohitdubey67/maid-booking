import type { PaymentRepository } from "../application/interfaces/Repositories.js";
import type { Payment } from "../domain/payment/Payment.js";
import { InMemoryStore } from "./InMemoryStore.js";

export class InMemoryPaymentRepository implements PaymentRepository {
  private readonly store = new InMemoryStore<Payment>();

  async save(payment: Payment): Promise<void> {
    this.store.save(payment);
  }

  async findByRequestKey(key: string): Promise<Payment | undefined> {
    return this.store.find((payment) => payment.requestKey === key);
  }

  async findSucceededByVisitId(visitId: string): Promise<Payment | undefined> {
    return this.store.find((payment) => payment.visitId === visitId && payment.status === "SUCCEEDED");
  }
}

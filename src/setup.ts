import { InstantBooking } from "./application/booking/InstantBooking.js";
import { RecurringBooking } from "./application/booking/RecurringBooking.js";
import { ScheduledBooking } from "./application/booking/ScheduledBooking.js";
import type { BookingType } from "./application/booking/BookingType.js";
import type { RefundPolicy } from "./application/cancellation/RefundPolicy.js";
import { NoticeRefundPolicy } from "./application/cancellation/NoticeRefundPolicy.js";
import { CardPayment } from "./application/payment/CardPayment.js";
import type { PaymentMethod } from "./application/payment/PaymentMethod.js";
import { UpiPayment } from "./application/payment/UpiPayment.js";
import { WalletPayment } from "./application/payment/WalletPayment.js";
import type { Clock } from "./application/interfaces/Clock.js";
import type { IdGenerator } from "./application/interfaces/IdGenerator.js";
import type { PaymentGateway } from "./application/interfaces/PaymentGateway.js";
import { HourlyPricing } from "./application/pricing/HourlyPricing.js";
import type { PriceCalculator } from "./application/pricing/PriceCalculator.js";
import { Lookup } from "./application/Lookup.js";
import { GenderFilter, MaxHourlyRateFilter, MinRatingFilter, SkillsFilter } from "./application/search/filters.js";
import type { SearchFilter } from "./application/search/SearchFilter.js";
import { BookingService } from "./application/services/BookingService.js";
import { CancellationService } from "./application/services/CancellationService.js";
import { ExpiryService } from "./application/services/ExpiryService.js";
import { MaidService } from "./application/services/MaidService.js";
import { PaymentService } from "./application/services/PaymentService.js";
import { SearchService } from "./application/services/SearchService.js";
import { InMemoryBookingRepository } from "./infrastructure/InMemoryBookingRepository.js";
import { InMemoryMaidRepository } from "./infrastructure/InMemoryMaidRepository.js";
import { InMemoryVisitRepository } from "./infrastructure/InMemoryVisitRepository.js";
import { InMemoryPaymentRepository } from "./infrastructure/InMemoryPaymentRepository.js";
import { InMemorySlotCalendar } from "./infrastructure/InMemorySlotCalendar.js";
import { MockPaymentGateway } from "./infrastructure/MockPaymentGateway.js";
import { RandomIdGenerator } from "./infrastructure/RandomIdGenerator.js";
import { SystemClock } from "./infrastructure/SystemClock.js";

export interface ServiceOptions {
  clock?: Clock;
  ids?: IdGenerator;
  gateway?: PaymentGateway;
  pricing?: PriceCalculator;
  refundPolicy?: RefundPolicy;
}

/**
 * Creates every service and connects it to the parts it uses. To add a booking
 * type, payment method or search filter, add one entry to a list below.
 */
export function createServices(options: ServiceOptions = {}) {
  const clock = options.clock ?? new SystemClock();
  const ids = options.ids ?? new RandomIdGenerator();
  const gateway = options.gateway ?? new MockPaymentGateway();
  const pricing = options.pricing ?? new HourlyPricing();
  const policy = options.refundPolicy ?? new NoticeRefundPolicy();

  const maids = new InMemoryMaidRepository();
  const bookings = new InMemoryBookingRepository();
  const visits = new InMemoryVisitRepository();
  const payments = new InMemoryPaymentRepository();
  const calendar = new InMemorySlotCalendar();

  const bookingTypes = new Lookup<BookingType>(
    [new InstantBooking(), new ScheduledBooking(), new RecurringBooking()],
    (bookingType) => bookingType.type,
    "UNSUPPORTED_BOOKING_TYPE",
    "booking type",
  );
  const paymentMethods = new Lookup<PaymentMethod>(
    [new CardPayment(), new UpiPayment(), new WalletPayment()],
    (paymentMethod) => paymentMethod.method,
    "UNSUPPORTED_PAYMENT_METHOD",
    "payment method",
  );
  const searchFilters: SearchFilter[] = [
    new MinRatingFilter(),
    new MaxHourlyRateFilter(),
    new SkillsFilter(),
    new GenderFilter(),
  ];

  return {
    maidService: new MaidService({ maids, ids }),
    searchService: new SearchService({ maids, calendar, filters: searchFilters, pricing, clock }),
    bookingService: new BookingService({ maids, bookings, visits, calendar, bookingTypes, pricing, clock, ids }),
    paymentService: new PaymentService({ payments, visits, methods: paymentMethods, gateway, clock, ids }),
    cancellationService: new CancellationService({ bookings, visits, payments, calendar, gateway, policy, clock }),
    expiryService: new ExpiryService({ visits, calendar, clock }),
  };
}

export type Services = ReturnType<typeof createServices>;

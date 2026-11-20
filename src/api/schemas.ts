import Joi from "joi";

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;
const END_TIME_OF_DAY = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const GENDERS = ["FEMALE", "MALE", "OTHER"];
const BOOKING_TYPES = ["INSTANT", "SCHEDULED", "RECURRING"];

const id = Joi.string().trim().min(1).max(100);
const label = Joi.string().trim().min(1).max(100);
const dayOfWeek = Joi.number().integer().min(0).max(6);
const durationMinutes = Joi.number().integer().min(30).max(480);
const rating = Joi.number().min(0).max(5);

export const onboardMaidSchema = Joi.object({
  name: label.required(),
  gender: Joi.string().valid(...GENDERS).required(),
  locality: label.required(),
  services: Joi.array()
    .items(
      Joi.object({
        serviceType: label.required(),
        hourlyRatePaise: Joi.number().integer().positive().required(),
      }),
    )
    .min(1)
    .required(),
  availability: Joi.array()
    .items(
      Joi.object({
        dayOfWeek: dayOfWeek.required(),
        startTime: Joi.string().pattern(TIME_OF_DAY).required(),
        endTime: Joi.string().pattern(END_TIME_OF_DAY).required(),
      }),
    )
    .min(1)
    .required(),
  skills: Joi.array().items(label).default([]),
  rating: rating.allow(null).default(null),
});

export const searchMaidsSchema = Joi.object({
  locality: label.required(),
  serviceType: label.required(),
  startAt: Joi.date().iso(),
  durationMinutes: durationMinutes.default(60),
  minRating: rating,
  maxHourlyRatePaise: Joi.number().integer().positive(),
  skills: Joi.array().items(label).single(),
  gender: Joi.string().valid(...GENDERS),
});

const onlyFor = (type: string) => ({ is: type, then: Joi.required(), otherwise: Joi.forbidden() });

/** Must stay in step with BookingRequest in src/application/booking/BookingRequest.ts. */
export const createBookingSchema = Joi.object({
  type: Joi.string().valid(...BOOKING_TYPES).required(),
  customerId: id.required(),
  maidId: id.required(),
  serviceType: label.required(),
  durationMinutes: durationMinutes.required(),
  startAt: Joi.date().iso().when("type", onlyFor("SCHEDULED")),
  daysOfWeek: Joi.array().items(dayOfWeek).min(1).unique().when("type", onlyFor("RECURRING")),
  startTime: Joi.string().pattern(TIME_OF_DAY).when("type", onlyFor("RECURRING")),
  startDate: Joi.string()
    .pattern(ISO_DATE)
    .when("type", { is: "RECURRING", then: Joi.optional(), otherwise: Joi.forbidden() }),
  endDate: Joi.string().pattern(ISO_DATE).when("type", onlyFor("RECURRING")),
});

export const paymentSchema = Joi.object({
  method: Joi.string().trim().min(1).max(30).required(),
  details: Joi.object().unknown(true).default({}),
});

export const requestKeySchema = Joi.string().trim().min(1).max(100).required().label("Idempotency-Key");

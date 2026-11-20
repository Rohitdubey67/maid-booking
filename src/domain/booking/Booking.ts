import { AppError } from "../shared/AppError.js";
import { requireNonBlank } from "../shared/requireNonBlank.js";

export interface BookingProps {
  id: string;
  customerId: string;
  maidId: string;
  serviceType: string;
  /** The booking type key, such as INSTANT, SCHEDULED or RECURRING. */
  type: string;
  createdAt: Date;
}

/** A customer's request for a maid. Its visits are stored separately as Visit objects. */
export class Booking {
  readonly id: string;
  readonly customerId: string;
  readonly maidId: string;
  readonly serviceType: string;
  readonly type: string;

  private readonly createdAtMs: number;

  private constructor(props: BookingProps) {
    this.id = requireNonBlank(props.id, "Booking id", "INVALID_BOOKING");
    this.customerId = requireNonBlank(props.customerId, "Customer id", "INVALID_BOOKING");
    this.maidId = requireNonBlank(props.maidId, "Maid id", "INVALID_BOOKING");
    this.serviceType = requireNonBlank(props.serviceType, "Service type", "INVALID_BOOKING").toLowerCase();
    this.type = requireNonBlank(props.type, "Booking type", "INVALID_BOOKING");
    this.createdAtMs = props.createdAt.getTime();

    if (Number.isNaN(this.createdAtMs)) {
      throw new AppError("INVALID_BOOKING", "Booking creation time must be valid");
    }
  }

  static create(props: BookingProps): Booking {
    return new Booking(props);
  }

  get createdAt(): Date {
    return new Date(this.createdAtMs);
  }
}

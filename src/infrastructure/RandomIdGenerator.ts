import { randomUUID } from "node:crypto";
import type { IdGenerator } from "../application/interfaces/IdGenerator.js";

export class RandomIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

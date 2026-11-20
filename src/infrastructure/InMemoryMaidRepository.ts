import type { MaidRepository } from "../application/interfaces/Repositories.js";
import type { Maid } from "../domain/maid/Maid.js";
import { InMemoryStore } from "./InMemoryStore.js";

export class InMemoryMaidRepository implements MaidRepository {
  private readonly store = new InMemoryStore<Maid>();

  async save(maid: Maid): Promise<void> {
    this.store.save(maid);
  }

  async findById(id: string): Promise<Maid | undefined> {
    return this.store.findById(id);
  }

  async findByLocalityAndService(locality: string, serviceType: string): Promise<Maid[]> {
    const cleanLocality = locality.trim().toLowerCase();
    return this.store.filter((maid) => maid.locality === cleanLocality && maid.offers(serviceType));
  }
}

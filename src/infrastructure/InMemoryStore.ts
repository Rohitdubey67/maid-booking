/**
 * Shared storage for the in-memory repositories. Objects are stored as they are,
 * so changes show up straight away. A real database would also need a way to
 * catch two updates to the same record at once, such as a version number.
 */
export class InMemoryStore<T extends { readonly id: string }> {
  private readonly items = new Map<string, T>();

  save(item: T): void {
    this.items.set(item.id, item);
  }

  findById(id: string): T | undefined {
    return this.items.get(id);
  }

  find(predicate: (item: T) => boolean): T | undefined {
    return [...this.items.values()].find(predicate);
  }

  filter(predicate: (item: T) => boolean): T[] {
    return [...this.items.values()].filter(predicate);
  }
}

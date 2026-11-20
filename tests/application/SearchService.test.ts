import { beforeEach, describe, expect, it } from "vitest";
import type { SearchQuery, SearchResult } from "../../src/application/services/SearchService.js";
import { expectRejection } from "../support/expectAppError.js";
import { createTestContext, ist, maidCommand, scheduledRequest } from "../support/testContext.js";
import type { TestContext } from "../support/testContext.js";

const TUESDAY_10AM = ist("2026-12-08T10:00");
const names = (results: SearchResult[]) => results.map((result) => result.maid.name);

describe("Finding maids", () => {
  let ctx: TestContext;

  const search = (overrides: Partial<SearchQuery> = {}) =>
    ctx.searchService.search({
      locality: "koramangala",
      serviceType: "cleaning",
      startAt: TUESDAY_10AM,
      durationMinutes: 120,
      ...overrides,
    });

  beforeEach(() => {
    ctx = createTestContext();
  });

  describe("only free maids are shown", () => {
    beforeEach(async () => {
      await ctx.maidService.onboard(maidCommand());
    });

    it("finds a free maid and shows the price for the slot", async () => {
      const [result] = await search();

      expect(result?.maid.name).toBe("Asha Kumari");
      expect(result?.price.paise).toBe(40_000);
    });

    it("leaves out other localities and services", async () => {
      expect(await search({ locality: "indiranagar" })).toHaveLength(0);
      expect(await search({ serviceType: "gardening" })).toHaveLength(0);
    });

    it("leaves out a maid who isn't working then", async () => {
      expect(await search({ startAt: ist("2026-12-13T10:00") })).toHaveLength(0);
    });

    it("leaves out a maid already booked for an overlapping time", async () => {
      const [found] = await search();
      await ctx.bookingService.book(scheduledRequest(found!.maid.id, ist("2026-12-08T11:00")));

      expect(await search()).toHaveLength(0);
    });

    it("refuses a search in the past", async () => {
      await expectRejection("INVALID_SEARCH", search({ startAt: ist("2026-12-07T07:00") }));
    });
  });

  describe("filters", () => {
    beforeEach(async () => {
      await ctx.maidService.onboard(
        maidCommand({
          name: "Top Rated",
          rating: 4.8,
          skills: ["deep cleaning", "ironing"],
          services: [{ serviceType: "cleaning", hourlyRatePaise: 25_000 }],
        }),
      );
      await ctx.maidService.onboard(
        maidCommand({
          name: "Budget",
          gender: "MALE",
          rating: 3.9,
          skills: ["ironing"],
          services: [{ serviceType: "cleaning", hourlyRatePaise: 15_000 }],
        }),
      );
      await ctx.maidService.onboard(
        maidCommand({ name: "New", rating: null, skills: [], services: [{ serviceType: "cleaning", hourlyRatePaise: 20_000 }] }),
      );
    });

    it("lists the best rated first, with new maids last", async () => {
      expect(names(await search())).toEqual(["Top Rated", "Budget", "New"]);
    });

    it("filters by rating", async () => {
      expect(names(await search({ minRating: 4 }))).toEqual(["Top Rated"]);
    });

    it("filters by price", async () => {
      expect(names(await search({ maxHourlyRatePaise: 20_000 }))).toEqual(["Budget", "New"]);
    });

    it("filters by skills, requiring all of them", async () => {
      expect(names(await search({ skills: ["ironing", "deep cleaning"] }))).toEqual(["Top Rated"]);
    });

    it("filters by gender", async () => {
      expect(names(await search({ gender: "MALE" }))).toEqual(["Budget"]);
    });
  });
});

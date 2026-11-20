import express from "express";
import type { Router } from "express";
import type { OnboardMaidCommand } from "../../application/services/MaidService.js";
import type { SearchQuery } from "../../application/services/SearchService.js";
import type { Services } from "../../setup.js";
import { validate, validated } from "../middleware/validate.js";
import { toMaidResponse, toSearchResultResponse } from "../responses.js";
import { onboardMaidSchema, searchMaidsSchema } from "../schemas.js";

export function maidRoutes({ maidService, searchService }: Services): Router {
  const router = express.Router();

  router.post("/", validate(onboardMaidSchema), async (_req, res) => {
    const maid = await maidService.onboard(validated<OnboardMaidCommand>(res));
    res.status(201).json(toMaidResponse(maid));
  });

  // Registered before /:id so "search" is not treated as an id.
  router.get("/search", validate(searchMaidsSchema, "query"), async (_req, res) => {
    const results = await searchService.search(validated<SearchQuery>(res, "query"));
    res.json(results.map(toSearchResultResponse));
  });

  router.get("/:id", async (req, res) => {
    res.json(toMaidResponse(await maidService.get(req.params.id)));
  });

  return router;
}

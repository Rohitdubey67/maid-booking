import express from "express";
import type { Express } from "express";
import type { Services } from "../setup.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { bookingRoutes } from "./routes/bookingRoutes.js";
import { maidRoutes } from "./routes/maidRoutes.js";
import { visitRoutes } from "./routes/visitRoutes.js";

export function createApp(services: Services): Express {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/maids", maidRoutes(services));
  app.use("/bookings", bookingRoutes(services));
  app.use("/visits", visitRoutes(services));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

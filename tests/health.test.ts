import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/api/app.js";

describe("GET /health", () => {
  it("reports the service as healthy", async () => {
    const response = await request(createApp()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

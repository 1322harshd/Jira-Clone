import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { loginAs } from "./helpers.js";

describe("GET /projects", () => {
  it("returns 401 without a login", async () => {
    const res = await request(app).get("/projects");

    expect(res.status).toBe(401);
  });

  it("returns 200 for a logged-in user", async () => {
    const agent = await loginAs("a@test.com");
    const res = await agent.get("/projects");

    expect(res.status).toBe(200);
  });
});

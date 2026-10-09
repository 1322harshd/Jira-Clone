import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

const user = { name: "Test", email: "a@test.com", password: "Passw0rd!" };

describe("POST /users", () => {
  it("creates a user", async () => {
    const res = await request(app).post("/users").send(user);

    expect(res.status).toBe(201);
  });

  it("rejects a request without a password", async () => {
    const res = await request(app).post("/users").send({ name: "Test", email: "a@test.com" });

    expect(res.status).toBe(400);
  });

  it("rejects an email that is already registered", async () => {
    await request(app).post("/users").send(user);
    const res = await request(app).post("/users").send(user);

    expect(res.status).toBe(409);
  });
});

describe("POST /login", () => {
  it("logs in and sets the auth cookies", async () => {
    await request(app).post("/users").send(user);
    const res = await request(app).post("/login").send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    const cookies = res.headers["set-cookie"].join(";");
    expect(cookies).toContain("accessToken=");
    expect(cookies).toContain("refreshToken=");
  });

  it("rejects a wrong password", async () => {
    await request(app).post("/users").send(user);
    const res = await request(app).post("/login").send({ email: user.email, password: "wrong" });

    expect(res.status).toBe(401);
  });
});

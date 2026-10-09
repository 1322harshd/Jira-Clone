import request from "supertest";
import app from "../app.js";

export async function loginAs(email) {
  const agent = request.agent(app); // an agent remembers cookies between requests
  await agent.post("/users").send({ name: "Test", email, password: "Passw0rd!" });
  await agent.post("/login").send({ email, password: "Passw0rd!" });
  return agent;
}

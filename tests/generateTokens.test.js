import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { generateTokens } from "../utils/generateTokens.js";

describe("generateTokens", () => {
  it("returns an access token and a refresh token", () => {
    const { accessToken, refreshToken } = generateTokens("user-1", "a@test.com");

    expect(accessToken).toBeTypeOf("string");
    expect(refreshToken).toBeTypeOf("string");
    expect(accessToken).not.toBe(refreshToken);
  });

  it("puts the user id and email in the access token", () => {
    const { accessToken } = generateTokens("user-1", "a@test.com");
    const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);

    expect(decoded.userId).toBe("user-1");
    expect(decoded.email).toBe("a@test.com");
  });

  it("signs the refresh token with a different secret", () => {
    const { refreshToken } = generateTokens("user-1", "a@test.com");

    expect(() => jwt.verify(refreshToken, process.env.JWT_SECRET)).toThrow();
    expect(() => jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)).not.toThrow();
  });
});

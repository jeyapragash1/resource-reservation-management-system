import { afterEach, describe, expect, it, vi } from "vitest";
import { checkOrigin } from "../../src/backend/lib/http";

afterEach(() => vi.unstubAllEnvs());

describe("mutation origins", () => {
  it.each([
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://[::1]:3000",
  ])(
    "accepts the configured local address and its loopback aliases: %s",
    (origin) => {
      vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
      expect(() =>
        checkOrigin(
          new Request("http://127.0.0.1:3000/api/auth/login", {
            headers: { origin },
          }),
        ),
      ).not.toThrow();
    },
  );

  it.each([
    "http://localhost:3001",
    "https://localhost:3000",
    "http://example.com:3000",
    "null",
    "invalid",
    "http://localhost:3000/path",
  ])("rejects an unrelated or malformed origin: %s", (origin) => {
    vi.stubEnv("APP_URL", "http://127.0.0.1:3000");
    expect(() =>
      checkOrigin(
        new Request("http://127.0.0.1:3000/api/auth/login", {
          headers: { origin },
        }),
      ),
    ).toThrow("Request origin is not allowed.");
  });

  it("requires an origin and keeps deployed origins exact", () => {
    vi.stubEnv("APP_URL", "https://reservations.example.com");
    expect(() =>
      checkOrigin(
        new Request("https://reservations.example.com/api/auth/login"),
      ),
    ).toThrow("Request origin is not allowed.");
    expect(() =>
      checkOrigin(
        new Request("https://reservations.example.com/api/auth/login", {
          headers: { origin: "https://localhost" },
        }),
      ),
    ).toThrow("Request origin is not allowed.");
    expect(() =>
      checkOrigin(
        new Request("https://reservations.example.com/api/auth/login", {
          headers: { origin: "https://reservations.example.com" },
        }),
      ),
    ).not.toThrow();
  });
});

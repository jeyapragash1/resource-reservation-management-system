import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/lib/password";
it("salts passwords and verifies only the correct password", async () => {
  const a = await hashPassword("a-private-password"),
    b = await hashPassword("a-private-password");
  expect(a).not.toBe(b);
  expect(await verifyPassword("a-private-password", a)).toBe(true);
  expect(await verifyPassword("wrong-password", a)).toBe(false);
  expect(await verifyPassword("a-private-password", "bad")).toBe(false);
});

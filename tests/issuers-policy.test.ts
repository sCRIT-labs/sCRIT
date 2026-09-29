import { describe, expect, it } from "vitest";
import { POST as postIssuer } from "../app/api/issuers/route";

describe("issuer intake policy", () => {
  it("rejects empty names instead of inventing placeholder identity", async () => {
    const response = await postIssuer(new Request("http://localhost/api/issuers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: "0x1111111111111111111111111111111111111111", name: "   " }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "name_required" });
  });

  it("still rejects explicit approval flags without admin key", async () => {
    delete process.env.ADMIN_KEY;
    const response = await postIssuer(new Request("http://localhost/api/issuers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ wallet: "0x1111111111111111111111111111111111111111", name: "Nope", approved: true }),
    }));
    expect(response.status).toBe(401);
  });
});

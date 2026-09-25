import { afterEach, describe, expect, it } from "vitest";
import { GET as getAp } from "../app/api/ap/route";
import { POST as postAttestation } from "../app/api/attestations/route";
import { POST as postCustodian } from "../app/api/custodians/route";
import { POST as postIssuer } from "../app/api/issuers/route";
import { POST as postTreasury } from "../app/api/treasury/route";
import { POST as postCopilot } from "../app/api/copilot/route";
import { databaseHealth } from "../lib/db";

const priorAdminKey = process.env.ADMIN_KEY;
const priorLlmUrl = process.env.LLM_API_URL;
const priorLlmKey = process.env.LLM_API_KEY;
const priorDatabaseUrl = process.env.DATABASE_URL;
afterEach(() => {
  if (priorAdminKey === undefined) delete process.env.ADMIN_KEY;
  else process.env.ADMIN_KEY = priorAdminKey;
  if (priorLlmUrl === undefined) delete process.env.LLM_API_URL;
  else process.env.LLM_API_URL = priorLlmUrl;
  if (priorLlmKey === undefined) delete process.env.LLM_API_KEY;
  else process.env.LLM_API_KEY = priorLlmKey;
  if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = priorDatabaseUrl;
});

describe("administrative API gates", () => {
  it("rejects AP applicant listing without an admin key", async () => {
    delete process.env.ADMIN_KEY;
    const response = await getAp(new Request("http://localhost/api/ap"));
    expect(response.status).toBe(401);
  });

  it("rejects attestation, issuer, and treasury mutations without an admin key", async () => {
    delete process.env.ADMIN_KEY;
    const request = () => new Request("http://localhost/api/", { method: "POST", body: "{}" });
    expect((await postAttestation(request())).status).toBe(401);
    expect((await postIssuer(request())).status).toBe(401);
    expect((await postTreasury(request())).status).toBe(401);
  });

  it("does not allow the admin API to self-certify a contracted custodian", async () => {
    process.env.ADMIN_KEY = "x".repeat(40);
    const response = await postCustodian(new Request("http://localhost/api/custodians", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-key": process.env.ADMIN_KEY },
      body: JSON.stringify({ address: "0x1111111111111111111111111111111111111111", name: "Vault", scope: ["Au"], status: "contracted" }),
    }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "contract_evidence_required" });
  });

  it("fails closed when the Copilot provider is not configured", async () => {
    delete process.env.LLM_API_URL;
    delete process.env.LLM_API_KEY;
    const response = await postCopilot(new Request("http://localhost/api/copilot", { method: "POST", body: "{}" }));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: "copilot_unavailable" });
  });

  it("fails closed instead of falling back to process memory without PostgreSQL", async () => {
    delete process.env.DATABASE_URL;
    await expect(databaseHealth()).rejects.toThrow("database_not_configured");
  });
});

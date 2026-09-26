import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ listChainEvents: vi.fn(async (limit: number) => [{ event_name: "ReserveMinted", limit }]) }));

describe("GET /api/events", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("returns bounded public event data", async () => {
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events?limit=3&chainId=46630"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events: [{ event_name: "ReserveMinted", limit: 3 }], chainId: 46630 });
  });

  it("rejects invalid event limits", async () => {
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events?limit=501"));
    expect(response.status).toBe(400);
  });

  it("defaults to the chain selected for the deployment", async () => {
    vi.stubEnv("NEXT_PUBLIC_SCRIT_CHAIN_ID", "4663");
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events"));
    await expect(response.json()).resolves.toMatchObject({ chainId: 4663 });
  });

  it("fails clearly when no chain is selected", async () => {
    vi.stubEnv("NEXT_PUBLIC_SCRIT_CHAIN_ID", "");
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events"));
    expect(response.status).toBe(503);
  });
});

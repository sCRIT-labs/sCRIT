import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ listChainEvents: vi.fn(async (limit: number) => [{ event_name: "ReserveMinted", limit }]) }));

describe("GET /api/events", () => {
  afterEach(() => vi.resetModules());

  it("returns bounded public event data", async () => {
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events?limit=3"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events: [{ event_name: "ReserveMinted", limit: 3 }], chainId: 46630 });
  });

  it("rejects invalid event limits", async () => {
    const { GET } = await import("../app/api/events/route");
    const response = await GET(new Request("http://local/api/events?limit=501"));
    expect(response.status).toBe(400);
  });
});

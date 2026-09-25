export type CustodianStatus = "demo" | "contracted";

export type Custodian = {
  address: string;
  name: string;
  /** Commodity symbols this key may attest for, e.g. ["Au","Ag","Pt"]. */
  scope: string[];
  status: CustodianStatus;
  created_at?: string;
};

export function isValidAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a);
}

/** Pure: may this custodian attest for this commodity? Case-insensitive. */
export function isScopedFor(c: Custodian, commodity: string): boolean {
  return c.scope.some((s) => s.toLowerCase() === commodity.toLowerCase());
}

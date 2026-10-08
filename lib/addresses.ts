import addressesData from "@/public/addresses.json";

export interface ContractAddressInfo {
  address: `0x${string}`;
  name: string;
  description: string;
  flags?: string;
  codeHash?: string;
}

export interface DeprecatedAddressInfo {
  address: `0x${string}`;
  reason: string;
}

export interface AddressesConfig {
  chainId: number;
  canonical: Record<string, ContractAddressInfo>;
  deprecated: Record<string, DeprecatedAddressInfo>;
}

export const ADDRESSES = addressesData as unknown as AddressesConfig;

export function getCanonicalAddress(key: keyof typeof addressesData.canonical): `0x${string}` {
  const item = addressesData.canonical[key as keyof typeof addressesData.canonical];
  return (item?.address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
}

export function lookupAddress(addr: string): {
  type: "canonical" | "deprecated" | "unknown";
  key?: string;
  info?: ContractAddressInfo | DeprecatedAddressInfo;
} {
  const normalized = addr.toLowerCase();

  for (const [key, item] of Object.entries(ADDRESSES.canonical)) {
    if (item.address.toLowerCase() === normalized) {
      return { type: "canonical", key, info: item };
    }
  }

  for (const [key, item] of Object.entries(ADDRESSES.deprecated)) {
    if (item.address.toLowerCase() === normalized) {
      return { type: "deprecated", key, info: item };
    }
  }

  return { type: "unknown" };
}

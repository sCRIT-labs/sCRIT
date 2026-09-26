type Env = Record<string, string | undefined>;

const ZERO_ADDRESS = /^0x0{40}$/i;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

export function selectedChainIdFor(env: Env): 4663 | 46630 | null {
  if (env.NEXT_PUBLIC_SCRIT_CHAIN_ID === "4663") return 4663;
  if (env.NEXT_PUBLIC_SCRIT_CHAIN_ID === "46630") return 46630;
  return null;
}

function configuredAddress(value: string | undefined): value is string {
  return Boolean(value && ADDRESS.test(value) && !ZERO_ADDRESS.test(value));
}

export function attestationConfigFor(env: Env) {
  const chainId = selectedChainIdFor(env);
  if (!chainId) return null;
  const verifying = env[`NEXT_PUBLIC_SCRIT_LAUNCHER_${chainId === 4663 ? "MAINNET" : "TESTNET"}`];
  if (!configuredAddress(verifying)) return null;
  return { chainId, verifying };
}

export function treasuryConfigFor(env: Env) {
  const chainId = selectedChainIdFor(env);
  if (!chainId) return null;

  const mainnet = chainId === 4663;
  const token = mainnet ? env.NEXT_PUBLIC_SCRIT_MAINNET : env.NEXT_PUBLIC_SCRIT_TESTNET ?? env.NEXT_PUBLIC_SCRIT;
  const recipient = mainnet
    ? env.MAINNET_RESERVE_TREASURY_ADDRESS
    : env.RESERVE_TREASURY_ADDRESS ?? env.NEXT_PUBLIC_TREASURY;
  const rpcUrl = mainnet
    ? env.ROBINHOOD_MAINNET_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com"
    : env.SCRIT_INDEXER_RPC_URL ?? "https://rpc.testnet.chain.robinhood.com";

  if (!configuredAddress(token) || !configuredAddress(recipient)) return null;
  try {
    const url = new URL(rpcUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  } catch {
    return null;
  }
  return { chainId, token, recipient, rpcUrl };
}

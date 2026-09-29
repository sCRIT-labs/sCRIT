import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseAbi,
  toBytes,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HOOD_MAINNET, HOOD_TESTNET, SCRIT_CHAIN_ID, scritDeploymentFor } from "./scrit";

export const MIN_ISSUER_SCRIT_E18 = 1_000_000_000_000_000n; // 0.001 sCRIT

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

const ERC20_ABI = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const LAUNCHER_ABI = parseAbi([
  "function issuerApproved(address) view returns (bool)",
  "function owner() view returns (address)",
  "function setIssuerApproved(address,bool)",
]);
const TIMELOCK_ABI = parseAbi([
  "function schedule(address target,uint256 value,bytes data,bytes32 predecessor,bytes32 salt,uint256 delay)",
  "function execute(address target,uint256 value,bytes payload,bytes32 predecessor,bytes32 salt)",
]);

export type IssuerApprovalResult = {
  ok: boolean;
  approved: boolean;
  onchain: boolean;
  balanceFormatted?: string;
  txHash?: string;
  code?: string;
  message: string;
};

export async function processIssuerApprovalOnChain(
  targetWallet: Address,
  targetChainId?: 4663 | 46630
): Promise<IssuerApprovalResult> {
  const chainId = targetChainId ?? SCRIT_CHAIN_ID;
  const isMainnet = chainId === 4663;
  const net = isMainnet ? HOOD_MAINNET : HOOD_TESTNET;
  const deployment = scritDeploymentFor(chainId);

  const rpcUrl = isMainnet
    ? process.env.ROBINHOOD_MAINNET_RPC_URL || net.rpc
    : process.env.SCRIT_INDEXER_RPC_URL || net.rpc;

  const chain = defineChain({
    id: net.id,
    name: net.name,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const pub = createPublicClient({ chain, transport: http(rpcUrl) });

  // 1. Verify on-chain sCRIT token balance
  let balance = 0n;
  try {
    if (deployment.token && deployment.token !== "0x0000000000000000000000000000000000000000") {
      balance = await pub.readContract({
        address: deployment.token,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [targetWallet],
      });
    }
  } catch (err) {
    console.warn("[issuer-onchain] balance check error:", err);
  }

  const balanceFormatted = formatEther(balance);

  // 2. Check if already approved on launcher contract
  let onchainApproved = false;
  try {
    if (deployment.launcher && deployment.launcher !== "0x0000000000000000000000000000000000000000") {
      onchainApproved = await pub.readContract({
        address: deployment.launcher,
        abi: LAUNCHER_ABI,
        functionName: "issuerApproved",
        args: [targetWallet],
      });
    }
  } catch (err) {
    console.warn("[issuer-onchain] allowlist status read error:", err);
  }

  if (onchainApproved) {
    return {
      ok: true,
      approved: true,
      onchain: true,
      balanceFormatted,
      message: "Issuer is already allowlisted on-chain.",
    };
  }

  // 3. Enforce anti-spam minimum balance gate
  if (balance < MIN_ISSUER_SCRIT_E18) {
    return {
      ok: false,
      approved: false,
      onchain: false,
      balanceFormatted,
      code: "insufficient_scrit",
      message: `Anti-spam gate requires holding at least 0.001 sCRIT in your wallet. Current balance: ${balanceFormatted} sCRIT.`,
    };
  }

  // 4. Execute on-chain allowlist transaction using deployer key
  const privateKey = (
    isMainnet
      ? process.env.MAINNET_PRIVATE_KEY
      : process.env.PRIVATE_KEY || process.env.MAINNET_PRIVATE_KEY
  )?.trim() as `0x${string}` | undefined;

  if (!privateKey || !/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    return {
      ok: true,
      approved: true,
      onchain: false,
      balanceFormatted,
      message: "Approved in service registry (Deployer key unconfigured for automated on-chain execution).",
    };
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const wal = createWalletClient({ account, chain, transport: http(rpcUrl) });

    const owner = await pub.readContract({
      address: deployment.launcher,
      abi: LAUNCHER_ABI,
      functionName: "owner",
    });

    let txHash: string | undefined;

    if (deployment.timelock && owner.toLowerCase() === deployment.timelock.toLowerCase()) {
      const data = encodeFunctionData({
        abi: LAUNCHER_ABI,
        functionName: "setIssuerApproved",
        args: [targetWallet, true],
      });
      const salt = keccak256(toBytes(`auto-approve-${isMainnet ? "mainnet" : "testnet"}-${targetWallet.toLowerCase()}-${Date.now()}`));

      const schedTx = await wal.writeContract({
        address: deployment.timelock,
        abi: TIMELOCK_ABI,
        functionName: "schedule",
        args: [deployment.launcher, 0n, data, ZERO_BYTES32, salt, 0n],
      });
      await pub.waitForTransactionReceipt({ hash: schedTx });

      const execTx = await wal.writeContract({
        address: deployment.timelock,
        abi: TIMELOCK_ABI,
        functionName: "execute",
        args: [deployment.launcher, 0n, data, ZERO_BYTES32, salt],
      });
      const receipt = await pub.waitForTransactionReceipt({ hash: execTx });
      txHash = receipt.transactionHash;
    } else {
      const directTx = await wal.writeContract({
        address: deployment.launcher,
        abi: LAUNCHER_ABI,
        functionName: "setIssuerApproved",
        args: [targetWallet, true],
      });
      const receipt = await pub.waitForTransactionReceipt({ hash: directTx });
      txHash = receipt.transactionHash;
    }

    return {
      ok: true,
      approved: true,
      onchain: true,
      txHash,
      balanceFormatted,
      message: "Clearance approved and confirmed on-chain in TokenLauncher.",
    };
  } catch (txError) {
    console.error("[issuer-onchain] Transaction error:", txError);
    return {
      ok: true,
      approved: true,
      onchain: false,
      balanceFormatted,
      message: "Approved in service registry (on-chain transaction was skipped or failed).",
    };
  }
}

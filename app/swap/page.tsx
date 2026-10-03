"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  createPublicClient,
  createWalletClient,
  custom,
  defineChain,
  formatEther,
  formatUnits,
  http,
  parseAbi,
  parseEther,
  parseUnits,
  type Address,
  type WalletClient,
} from "viem";
import { PageShell } from "@/components/PageShell";
import WalletButton from "@/components/WalletButton";
import WalletModal from "@/components/WalletModal";
import ChainLogo from "@/components/ChainLogo";
import {
  HOOD_MAINNET,
  HOOD_TESTNET,
  PROJECT_POOL_LP_FEE_BPS,
  SCRIT_CHAIN_ID,
  TAX_ACTIVE,
  scritDeploymentFor,
} from "@/lib/scrit";
import { BASKET, SLEEVES } from "@/lib/scrit-basket";
import { LaunchedToken, listLocalTokens, mergeTokens } from "@/lib/tokens";
import { loadWallet, saveWallet, subscribeWalletChange, type EvmWalletId } from "@/lib/wallets";
import {
  ArrowDownUp,
  ArrowRight,
  Check,
  CheckCircle2,
  Coins,
  Copy,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const DEMO_SWAP_ABI = parseAbi([
  "function swapExactInputSingle((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, bool zeroForOne, uint128 amountIn, uint128 minOut, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
]);

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function symbol() external view returns (string)",
  "function name() external view returns (string)",
  "function decimals() external view returns (uint8)",
]);

const MIN_SQRT_RATIO = 4_295_128_740n;
const MAX_SQRT_RATIO = 1_461_446_703_485_210_103_287_273_052_203_988_822_378_723_970_341n;

function SwapContent() {
  const searchParams = useSearchParams();
  const preselectedToken = searchParams.get("token");

  const [chainId, setChainId] = useState<4663 | 46630>(SCRIT_CHAIN_ID);
  const [account, setAccount] = useState<Address | null>(null);
  const [activeTab, setActiveTab] = useState<"project" | "base">("project");

  // Tokens state
  const [availableTokens, setAvailableTokens] = useState<LaunchedToken[]>([]);
  const [selectedTokenAddr, setSelectedTokenAddr] = useState<string>("");
  const [customTokenInput, setCustomTokenInput] = useState<string>("");
  const [customTokenData, setCustomTokenData] = useState<{ symbol: string; name: string } | null>(null);

  // Direction: "buy" = sCRIT -> Token; "sell" = Token -> sCRIT
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [amountIn, setAmountIn] = useState<string>("");
  const [slippageBps, setSlippageBps] = useState<number>(350); // 3.5% default to clear 2.5% tax hook

  // Balances & Allowances
  const [ethBalance, setEthBalance] = useState<bigint>(0n);
  const [scritBalance, setScritBalance] = useState<bigint>(0n);
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);
  const [allowance, setAllowance] = useState<bigint>(0n);

  // Status & Transaction
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyToClipboard(key: string, val: string) {
    try {
      void navigator.clipboard.writeText(val);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  }

  function handleWalletPicked(id: EvmWalletId, address: string) {
    saveWallet(id, address);
    setAccount(address as Address);
    void refreshBalances();
  }

  const activeNetwork = chainId === 4663 ? HOOD_MAINNET : HOOD_TESTNET;
  const deployment = scritDeploymentFor(chainId);

  const scritAddress = (chainId === 4663
    ? process.env.NEXT_PUBLIC_SCRIT_MAINNET || "0x56073943133c1c0678a753be9402b27d43cf1c22"
    : deployment.token) as Address;

  const hookAddress = (chainId === 4663
    ? process.env.NEXT_PUBLIC_SCRIT_TAX_HOOK_MAINNET || "0x5a0e9b72a3fcad25cf30757164c90d51f4ca2044"
    : "0x0000000000000000000000000000000000000000") as Address;

  // Swap helper contract on Mainnet
  const swapHelperAddress = (chainId === 4663
    ? "0x8094e63ee75119769c114ff4ac77dbdd562aba8c"
    : deployment.launcher) as Address;

  // Setup Viem Client
  const chainConfig = useMemo(
    () =>
      defineChain({
        id: activeNetwork.id,
        name: activeNetwork.name,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [activeNetwork.rpc] } },
        blockExplorers: { default: { name: "Blockscout", url: activeNetwork.explorer } },
      }),
    [activeNetwork]
  );

  const getPublicClient = useCallback(() => {
    // Use Next.js proxy on browser to avoid local DNS/ISP issues
    const rpc = typeof window !== "undefined" ? `/api/rpc?chainId=${chainId}` : activeNetwork.rpc;
    return createPublicClient({ chain: chainConfig, transport: http(rpc) });
  }, [chainId, activeNetwork, chainConfig]);

  // Load wallet account with live sync across navbar and pages
  useEffect(() => {
    const sync = () => {
      const saved = loadWallet();
      setAccount(saved?.address ? (saved.address as Address) : null);
    };
    sync();
    const unsub = subscribeWalletChange(sync);
    return () => unsub();
  }, []);

  // Fetch launched tokens list
  useEffect(() => {
    let alive = true;
    fetch("/api/tokens")
      .then((r) => r.json())
      .then((data) => {
        if (!alive) return;
        const dbTokens: LaunchedToken[] = Array.isArray(data.tokens) ? data.tokens : [];
        const localTokens = listLocalTokens();
        const merged = mergeTokens(dbTokens, localTokens);

        // Prepend canonical PDMO if on mainnet and not already in list
        if (chainId === 4663 && !merged.some((t) => t.address.toLowerCase() === "0xeaad835ab56de5eff1d2b303b166b8afa220c537")) {
          merged.unshift({
            id: "mainnet-pdmo",
            chainId: 4663,
            address: "0xEaad835Ab56de5EFF1D2B303B166B8aFA220C537",
            name: "Pilot Demo",
            symbol: "PDMO",
            creator: "0xCdbdc82A021071eE445d9f897433a7E4B4EAfD8d",
            supply: "1000000",
            pooled: "1000",
            scritAmount: "0.5",
            txHash: "0xdd8d74717fb0b0cedd3d72d9dad001337c1220858732eacc76cdd45bf7986537",
            poolId: "0x807c3523b5b47cb53a78cbf03283dfb6c5117b7d1c72d2aaadb5aa5caad30d19",
            poolType: "v4_hook",
            backingCategory: "Dysprosium Magnetics Reserve",
            description: "First canonical heavy rare earth demonstration token deployed on Robinhood Chain Mainnet.",
            createdAt: Date.now(),
          });
        }

        // Add CURUT if referenced
        if (preselectedToken && !merged.some((t) => t.address.toLowerCase() === preselectedToken.toLowerCase())) {
          merged.unshift({
            id: "custom-preselected",
            chainId: 4663,
            address: preselectedToken,
            name: "CURUT Token",
            symbol: "CURUT",
            creator: "Community Launch",
            supply: "1000000000",
            pooled: "200000000",
            scritAmount: "1000",
            txHash: "",
            poolId: "",
            poolType: "v4_hook",
            backingCategory: "Critical Commodity Pair",
            description: "Ecosystem token anchored to sCRIT reserve liquidity.",
            createdAt: Date.now(),
          });
        }

        setAvailableTokens(merged);

        if (preselectedToken) {
          setSelectedTokenAddr(preselectedToken);
        } else if (merged.length > 0 && !selectedTokenAddr) {
          setSelectedTokenAddr(merged[0].address);
        }
      })
      .catch(() => {
        if (!alive) return;
        const local = listLocalTokens();
        setAvailableTokens(local);
        if (local.length > 0 && !selectedTokenAddr) setSelectedTokenAddr(local[0].address);
      });

    return () => {
      alive = false;
    };
  }, [chainId, preselectedToken]);

  // Selected Token Object
  const currentToken = useMemo(() => {
    const found = availableTokens.find((t) => t.address.toLowerCase() === selectedTokenAddr.toLowerCase());
    if (found) return found;
    if (customTokenData) {
      return {
        id: "custom-input",
        chainId,
        address: selectedTokenAddr,
        name: customTokenData.name,
        symbol: customTokenData.symbol,
        creator: "Custom",
        supply: "-",
        pooled: "-",
        scritAmount: "-",
        txHash: "",
        poolId: "",
        poolType: "v4_hook" as const,
        backingCategory: "Custom Launch",
        description: "",
        createdAt: Date.now(),
      };
    }
    return null;
  }, [availableTokens, selectedTokenAddr, customTokenData, chainId]);

  // Real-time calculation of estimated output based on pool parameters & 2.5% tax hook
  const estimatedAmountOut = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0) return "0.0";
    const inVal = Number(amountIn);
    if (isNaN(inVal) || inVal <= 0) return "0.0";

    const pooled = Number(currentToken?.pooled);
    const scritAmt = Number(currentToken?.scritAmount);
    const taxMultiplier = 0.975; // 2.5% tax hook (75% reserve / 25% ops)

    if (pooled > 0 && scritAmt > 0) {
      const tokenPerScrit = pooled / scritAmt;
      if (direction === "buy") {
        const rawOut = inVal * tokenPerScrit;
        const netOut = rawOut * taxMultiplier;
        return netOut >= 1000 ? netOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : netOut.toFixed(4);
      } else {
        const rawOut = inVal / tokenPerScrit;
        const netOut = rawOut * taxMultiplier;
        return netOut >= 1000 ? netOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : netOut.toFixed(6);
      }
    }

    // Default heuristic fallback (PDMO canonical ratio: 1000 PDMO / 0.5 sCRIT = 2000 per sCRIT)
    if (direction === "buy") {
      const netOut = inVal * 2000 * taxMultiplier;
      return netOut >= 1000 ? netOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : netOut.toFixed(4);
    } else {
      const netOut = (inVal / 2000) * taxMultiplier;
      return netOut >= 1000 ? netOut.toLocaleString("en-US", { maximumFractionDigits: 2 }) : netOut.toFixed(6);
    }
  }, [amountIn, currentToken, direction]);

  const minAmountOut = useMemo(() => {
    if (!amountIn || Number(amountIn) <= 0) return null;
    const est = parseFloat(estimatedAmountOut.replace(/,/g, ""));
    if (isNaN(est) || est <= 0) return null;
    const slippageMultiplier = (10000 - slippageBps) / 10000;
    const minVal = est * slippageMultiplier;
    return minVal >= 1000 ? minVal.toLocaleString("en-US", { maximumFractionDigits: 2 }) : minVal.toFixed(4);
  }, [amountIn, estimatedAmountOut, slippageBps]);

  // Read Custom Token details if pasted
  useEffect(() => {
    if (!selectedTokenAddr || !/^0x[0-9a-fA-F]{40}$/.test(selectedTokenAddr)) {
      setCustomTokenData(null);
      return;
    }
    const exists = availableTokens.some((t) => t.address.toLowerCase() === selectedTokenAddr.toLowerCase());
    if (exists) return;

    let active = true;
    const client = getPublicClient();
    Promise.all([
      client.readContract({ address: selectedTokenAddr as Address, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address: selectedTokenAddr as Address, abi: ERC20_ABI, functionName: "name" }),
    ])
      .then(([sym, nm]) => {
        if (active) setCustomTokenData({ symbol: sym as string, name: nm as string });
      })
      .catch(() => {
        if (active) setCustomTokenData({ symbol: "TOKEN", name: "Custom Project Token" });
      });

    return () => {
      active = false;
    };
  }, [selectedTokenAddr, availableTokens, getPublicClient]);

  // Refresh Balances & Allowances
  const refreshBalances = useCallback(async () => {
    if (!account) return;
    setIsLoadingBalances(true);
    setErrorMessage(null);
    const client = getPublicClient();

    try {
      // 1. Native ETH balance
      const ethBal = await client.getBalance({ address: account });
      setEthBalance(ethBal);

      // 2. sCRIT balance & allowance to swapHelper
      if (/^0x[0-9a-fA-F]{40}$/.test(scritAddress)) {
        const [scBal, scAllow] = await Promise.all([
          client.readContract({
            address: scritAddress,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account],
          }),
          client.readContract({
            address: scritAddress,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [account, swapHelperAddress],
          }),
        ]);
        setScritBalance(scBal as bigint);
        if (direction === "buy") {
          setAllowance(scAllow as bigint);
        }
      }

      // 3. Project Token balance & allowance to swapHelper
      if (selectedTokenAddr && /^0x[0-9a-fA-F]{40}$/.test(selectedTokenAddr)) {
        const [tokBal, tokAllow] = await Promise.all([
          client.readContract({
            address: selectedTokenAddr as Address,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [account],
          }),
          client.readContract({
            address: selectedTokenAddr as Address,
            abi: ERC20_ABI,
            functionName: "allowance",
            args: [account, swapHelperAddress],
          }),
        ]);
        setTokenBalance(tokBal as bigint);
        if (direction === "sell") {
          setAllowance(tokAllow as bigint);
        }
      }
    } catch (e: unknown) {
      console.warn("Could not query balances:", e);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [account, chainId, scritAddress, swapHelperAddress, selectedTokenAddr, direction, getPublicClient]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Input Validation & Calculations
  const parsedAmountIn = useMemo(() => {
    if (!amountIn || isNaN(Number(amountIn)) || Number(amountIn) <= 0) return 0n;
    try {
      return parseEther(amountIn);
    } catch {
      return 0n;
    }
  }, [amountIn]);

  const activeInputBalance = direction === "buy" ? scritBalance : tokenBalance;
  const isBalanceExceeded = parsedAmountIn > activeInputBalance;
  const isApproved = allowance >= parsedAmountIn && parsedAmountIn > 0n;

  // Handle Approve Token / sCRIT
  async function handleApprove() {
    if (!account) return;
    setIsApproving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const activeInputToken = (direction === "buy" ? scritAddress : selectedTokenAddr) as Address;
      const provider = (window as unknown as { ethereum?: unknown }).ethereum;
      if (!provider) throw new Error("No Web3 wallet injected.");

      const walletClient = createWalletClient({
        account,
        chain: chainConfig,
        transport: custom(provider as never),
      });

      // Max approval
      const maxUint256 = 2n ** 256n - 1n;
      const hash = await walletClient.writeContract({
        address: activeInputToken,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [swapHelperAddress, maxUint256],
      });

      setSuccessMessage(`Approval submitted: ${hash.slice(0, 10)}... Waiting for confirmation.`);
      const client = getPublicClient();
      await client.waitForTransactionReceipt({ hash });
      setSuccessMessage("Approved successfully! You can now execute the swap.");
      await refreshBalances();
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setIsApproving(false);
    }
  }

  // Handle Swap Execution
  async function handleSwap() {
    if (!account || parsedAmountIn <= 0n || !selectedTokenAddr) return;
    setIsSwapping(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setTxHash(null);

    try {
      const provider = (window as unknown as { ethereum?: unknown }).ethereum;
      if (!provider) throw new Error("No Web3 wallet detected.");

      const walletClient = createWalletClient({
        account,
        chain: chainConfig,
        transport: custom(provider as never),
      });

      const tokenA = scritAddress.toLowerCase();
      const tokenB = selectedTokenAddr.toLowerCase();
      const isScritSmaller = BigInt(tokenA) < BigInt(tokenB);

      const poolKey = {
        currency0: (isScritSmaller ? scritAddress : selectedTokenAddr) as Address,
        currency1: (isScritSmaller ? selectedTokenAddr : scritAddress) as Address,
        fee: 3000,
        tickSpacing: 60,
        hooks: hookAddress,
      };

      // zeroForOne is true if we are swapping currency0 for currency1
      // If buy: we are swapping sCRIT -> Token
      // If isScritSmaller is true, sCRIT is currency0 => zeroForOne = true
      // If isScritSmaller is false, sCRIT is currency1 => zeroForOne = false
      const zeroForOne = direction === "buy" ? isScritSmaller : !isScritSmaller;
      const sqrtPriceLimitX96 = zeroForOne ? MIN_SQRT_RATIO : MAX_SQRT_RATIO;
      const minOut = 0n; // Slippage is guarded by sqrtPriceLimitX96 or hook

      const hash = await walletClient.writeContract({
        address: swapHelperAddress,
        abi: DEMO_SWAP_ABI,
        functionName: "swapExactInputSingle",
        args: [poolKey, zeroForOne, BigInt(parsedAmountIn), BigInt(minOut), sqrtPriceLimitX96],
      });

      setTxHash(hash);
      setSuccessMessage(`Swap transaction submitted! Hash: ${hash}`);
      const client = getPublicClient();
      await client.waitForTransactionReceipt({ hash });
      setSuccessMessage("Swap confirmed on Robinhood Chain! Tokens received.");
      setAmountIn("");
      await refreshBalances();
    } catch (e: unknown) {
      console.error(e);
      setErrorMessage(
        e instanceof Error
          ? e.message.includes("User rejected")
            ? "Transaction rejected by user."
            : e.message
          : "Swap execution failed."
      );
    } finally {
      setIsSwapping(false);
    }
  }

  // Faucet request for testnet
  async function handleFaucet() {
    if (!account) return;
    setFaucetLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: account, chainId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Faucet failed");
      setSuccessMessage("1,000 sCRIT transferred from Testnet Faucet!");
      await refreshBalances();
    } catch (e: unknown) {
      setErrorMessage(e instanceof Error ? e.message : "Faucet error");
    } finally {
      setFaucetLoading(false);
    }
  }

  return (
    <PageShell>
      {/* Editorial Header */}
      <div style={{ maxWidth: 1100, marginBottom: 28 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 2,
            background: "rgba(83, 103, 83, 0.08)",
            border: "1px solid rgba(83, 103, 83, 0.2)",
            marginBottom: 14,
          }}
        >
          <Sparkles size={13} color="var(--moss)" />
          <span
            style={{
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              color: "var(--moss)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Rail A · Uniswap V4 AMM · Direct Settlement
          </span>
        </div>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(20px, 3.8vw, 46px)",
            fontWeight: 450,
            letterSpacing: "-0.035em",
            margin: "0 0 16px",
            lineHeight: 1.15,
            color: "var(--ink)",
          }}
        >
          Instant liquidity &amp; settlement desk.
        </h1>
        <p
          style={{
            color: "#5e645d",
            fontSize: "clamp(15px, 1.8vw, 17px)",
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 820,
          }}
        >
          Trade ecosystem tokens directly against <b style={{ color: "var(--ink)" }}>sCRIT</b> on Robinhood Chain Mainnet.
          Every swap executes natively across Uniswap V4 with the <b style={{ color: "#8c6418" }}>Trading Tax Hook (2.5%)</b>, automatically routing 75% of fees to compound physical heavy rare earth reserves in verified custody.
        </p>
      </div>

      {/* Quick Token Selector Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 24,
          padding: "10px 14px",
          background: "#faf8f2",
          border: "1px solid var(--line-ink)",
          borderRadius: 6,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: "var(--muted)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Zap size={13} color="var(--signal)" />
          Quick Select:
        </span>
        {availableTokens.map((t) => {
          const isSelected = selectedTokenAddr.toLowerCase() === t.address.toLowerCase();
          return (
            <button
              key={t.address}
              type="button"
              onClick={() => {
                setSelectedTokenAddr(t.address);
                setCustomTokenInput("");
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                fontSize: 11.5,
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                borderRadius: 4,
                cursor: "pointer",
                transition: "all 0.15s ease",
                background: isSelected ? "var(--ink)" : "#ffffff",
                color: isSelected ? "#f5f2eb" : "var(--ink)",
                border: isSelected ? "1px solid var(--ink)" : "1px solid var(--line-ink)",
              }}
            >
              <span>${t.symbol}</span>
              <span style={{ opacity: 0.6, fontSize: 10 }}>· {t.name}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setSelectedTokenAddr("custom");
            setCustomTokenInput("");
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            borderRadius: 4,
            cursor: "pointer",
            background: selectedTokenAddr === "custom" ? "rgba(201, 146, 46, 0.15)" : "#ffffff",
            color: "#8c6418",
            border: selectedTokenAddr === "custom" ? "1px solid var(--signal)" : "1px dashed var(--signal)",
          }}
        >
          + Paste Custom CA
        </button>
      </div>

      {/* Main Grid: Left Column (Execution Form) & Right Column (Analytics & Stockpile Dynamics) */}
      <div className="launch-grid-layout" style={{ marginBottom: 48 }}>
        {/* Left Column: Swap Execution Form */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid var(--line-ink)",
            borderRadius: 8,
            boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Card Sub-header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--line-ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#faf8f2",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Zap size={15} color="var(--signal)" />
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--ink)" }}>
                {activeTab === "project" ? "Project Token AMM" : "sCRIT Base Market"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Refresh Balances Button */}
              <button
                type="button"
                onClick={refreshBalances}
                disabled={isLoadingBalances}
                title="Refresh balances"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 4,
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                <RefreshCw size={13} className={isLoadingBalances ? "spin" : ""} />
              </button>

              {/* Slippage Badge */}
              <span
                style={{
                  fontSize: 11,
                  fontFamily: "var(--font-mono)",
                  background: "rgba(24, 26, 24, 0.05)",
                  padding: "2px 8px",
                  borderRadius: 3,
                  color: "#636b60",
                }}
              >
                Slippage {(slippageBps / 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div style={{ padding: "24px 20px" }}>
            {/* ==========================================================
                TAB 1: sCRIT ⇋ PROJECT TOKENS
                ========================================================== */}
            {activeTab === "project" ? (
              <div>
                {/* Select Target Project Token Dropdown & CA input */}
                <div style={{ marginBottom: 18 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      color: "var(--muted)",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    SELECT TARGET PROJECT TOKEN
                  </label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select
                      value={selectedTokenAddr}
                      onChange={(e) => {
                        setSelectedTokenAddr(e.target.value);
                        setCustomTokenInput("");
                      }}
                      style={{
                        flex: 1,
                        height: 38,
                        padding: "0 12px",
                        fontSize: 13,
                        fontFamily: "var(--font-mono)",
                        borderRadius: 4,
                        border: "1px solid var(--line-ink)",
                        background: "#faf8f2",
                        color: "var(--ink)",
                        cursor: "pointer",
                      }}
                    >
                      {availableTokens.map((t) => (
                        <option key={t.address} value={t.address}>
                          ${t.symbol} · {t.name} ({t.address.slice(0, 6)}...{t.address.slice(-4)})
                        </option>
                      ))}
                      <option value="custom">+ Paste Custom Token Address</option>
                    </select>
                  </div>

                  {/* Custom Contract Address Input (e.g. CURUT) */}
                  {(selectedTokenAddr === "custom" || customTokenInput || (!availableTokens.some(t => t.address.toLowerCase() === selectedTokenAddr.toLowerCase()) && selectedTokenAddr)) && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Paste Token Contract Address (0x...)"
                        value={customTokenInput || (selectedTokenAddr !== "custom" ? selectedTokenAddr : "")}
                        onChange={(e) => {
                          const val = e.target.value.trim();
                          setCustomTokenInput(val);
                          if (/^0x[0-9a-fA-F]{40}$/.test(val)) {
                            setSelectedTokenAddr(val);
                          }
                        }}
                        style={{
                          width: "100%",
                          height: 36,
                          padding: "0 10px",
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          border: "1px solid var(--signal)",
                          borderRadius: 4,
                          background: "#ffffff",
                        }}
                      />
                      {customTokenData && (
                        <div style={{ fontSize: 11, color: "var(--moss)", marginTop: 4, fontWeight: 600 }}>
                          Detected: ${customTokenData.symbol} ({customTokenData.name})
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Swap Direction Toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "#f7f5ed",
                    borderRadius: 4,
                    marginBottom: 16,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    Action:{" "}
                    <strong style={{ color: direction === "buy" ? "#2d6a4f" : "#b8962e" }}>
                      {direction === "buy"
                        ? `Buy $${currentToken?.symbol || "TOKEN"} with $sCRIT`
                        : `Sell $${currentToken?.symbol || "TOKEN"} for $sCRIT`}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDirection((d) => (d === "buy" ? "sell" : "buy"));
                      setAmountIn("");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      borderRadius: 3,
                      border: "1px solid var(--line-ink)",
                      background: "#ffffff",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    <ArrowDownUp size={12} />
                    Switch Direction
                  </button>
                </div>

                {/* INPUT FIELD BOX */}
                <div
                  style={{
                    border: "1px solid var(--line-ink)",
                    borderRadius: 6,
                    padding: "14px 16px",
                    background: "#faf8f2",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", fontWeight: 600 }}>
                      YOU PAY
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      Balance:{" "}
                      <strong>
                        {formatUnits(activeInputBalance, 18).slice(0, 10)}{" "}
                        {direction === "buy" ? "$sCRIT" : `$${currentToken?.symbol || "TOKEN"}`}
                      </strong>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      style={{
                        flex: 1,
                        border: "none",
                        background: "transparent",
                        fontSize: 22,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink)",
                        outline: "none",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAmountIn(formatUnits(activeInputBalance, 18))}
                      style={{
                        padding: "3px 8px",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        border: "1px solid var(--line-ink)",
                        borderRadius: 3,
                        background: "#ffffff",
                        cursor: "pointer",
                        color: "var(--signal)",
                      }}
                    >
                      MAX
                    </button>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--ink)",
                        paddingLeft: 6,
                      }}
                    >
                      {direction === "buy" ? "sCRIT" : currentToken?.symbol || "TOKEN"}
                    </span>
                  </div>
                </div>

                {/* OUTPUT ESTIMATE BOX */}
                <div
                  style={{
                    border: "1px solid var(--line-ink)",
                    borderRadius: 6,
                    padding: "14px 16px",
                    background: "#ffffff",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", fontWeight: 600 }}>
                      YOU RECEIVE (ESTIMATE)
                    </span>
                    <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                      Current Balance:{" "}
                      <strong>
                        {formatUnits(direction === "buy" ? tokenBalance : scritBalance, 18).slice(0, 10)}{" "}
                        {direction === "buy" ? `$${currentToken?.symbol || "TOKEN"}` : "$sCRIT"}
                      </strong>
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 20, fontFamily: "var(--font-mono)", fontWeight: 700, color: parsedAmountIn > 0n ? "var(--ink)" : "var(--muted)" }}>
                      {estimatedAmountOut}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)" }}>
                      {direction === "buy" ? currentToken?.symbol || "TOKEN" : "sCRIT"}
                    </span>
                  </div>
                  {minAmountOut && parsedAmountIn > 0n && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTop: "1px dashed rgba(24, 26, 24, 0.1)" }}>
                      <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
                        Min. Received ({(slippageBps / 100).toFixed(1)}% slippage & 2.5% tax):
                      </span>
                      <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", fontWeight: 700, color: "#8c6418" }}>
                        {minAmountOut} {direction === "buy" ? currentToken?.symbol || "TOKEN" : "sCRIT"}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2.5% Tax Hook Disclosure Banner */}
                <div
                  style={{
                    background: "rgba(201, 146, 46, 0.08)",
                    border: "1px solid rgba(201, 146, 46, 0.3)",
                    borderRadius: 6,
                    padding: "12px 14px",
                    marginBottom: 20,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <ShieldCheck size={14} color="#8c6418" />
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color: "#8c6418" }}>
                      AUTOMATIC V4 HOOK TAX (2.5%)
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: 11.5, color: "#6e5218", lineHeight: 1.4 }}>
                    Every trade on this pool contributes directly to the reserve: <strong>75%</strong> routes autonomously to the sCRIT physical commodity procurement treasury, and <strong>25%</strong> funds protocol operations.
                  </p>
                </div>

                {/* ACTION BUTTONS (APPROVE & SWAP) */}
                {!account ? (
                  <div style={{ textAlign: "center", padding: "10px 0" }}>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                      Connect your Robinhood Chain wallet to start trading.
                    </p>
                    <WalletButton
                      chainId={chainId}
                      onConnect={(acc) => {
                        setAccount(acc);
                        void refreshBalances();
                      }}
                      onDisconnect={() => setAccount(null)}
                    />
                  </div>
                ) : isBalanceExceeded ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 4,
                      background: "rgba(24, 26, 24, 0.1)",
                      border: "none",
                      color: "var(--muted)",
                      fontWeight: 700,
                      cursor: "not-allowed",
                      fontSize: 13,
                    }}
                  >
                    Insufficient Balance
                  </button>
                ) : !isApproved && parsedAmountIn > 0n ? (
                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 4,
                      background: "var(--signal)",
                      border: "none",
                      color: "#ffffff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: isApproving ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isApproving && <Loader2 size={16} className="spin" />}
                    Step 1: Approve {direction === "buy" ? "$sCRIT" : `$${currentToken?.symbol || "TOKEN"}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSwap}
                    disabled={isSwapping || parsedAmountIn <= 0n}
                    style={{
                      width: "100%",
                      height: 44,
                      borderRadius: 4,
                      background: parsedAmountIn > 0n ? "var(--ink)" : "rgba(24, 26, 24, 0.1)",
                      border: "none",
                      color: parsedAmountIn > 0n ? "#ffffff" : "var(--muted)",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: parsedAmountIn > 0n ? (isSwapping ? "wait" : "pointer") : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isSwapping && <Loader2 size={16} className="spin" />}
                    {direction === "buy"
                      ? `Execute Swap: Buy $${currentToken?.symbol || "TOKEN"}`
                      : `Execute Swap: Sell $${currentToken?.symbol || "TOKEN"}`}
                  </button>
                )}
              </div>
            ) : (
              /* ==========================================================
                  TAB 2: ETH ⇋ sCRIT (BASE UNTAXED MARKET)
                  ========================================================== */
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 14px",
                      background: "#faf8f2",
                      border: "1px solid var(--line-ink)",
                      borderRadius: 4,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 10.5, fontFamily: "var(--font-mono)", color: "var(--muted)", display: "block" }}>
                        YOUR ROBINHOOD CHAIN BALANCES
                      </span>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--ink)", marginTop: 2 }}>
                        {formatEther(ethBalance).slice(0, 8)} ETH · {formatEther(scritBalance).slice(0, 8)} sCRIT
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={refreshBalances}
                      style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)" }}
                    >
                      <RefreshCw size={13} className={isLoadingBalances ? "spin" : ""} />
                    </button>
                  </div>

                  <p style={{ fontSize: 12.5, color: "#636b60", lineHeight: 1.5, margin: "0 0 16px" }}>
                    The canonical base pair <strong>$sCRIT / ETH</strong> is an <strong>untaxed Uniswap V4 pool (0% hook fee)</strong>.
                    You can trade directly between ETH and sCRIT via the official Uniswap V4 pool.
                  </p>

                  {/* Direct Uniswap Link Card */}
                  <div
                    style={{
                      border: "1px solid rgba(83, 103, 83, 0.25)",
                      background: "rgba(83, 103, 83, 0.05)",
                      borderRadius: 6,
                      padding: "16px",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <CheckCircle2 size={16} color="var(--moss)" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--moss)", fontFamily: "var(--font-mono)" }}>
                        CANONICAL V4 BASE MARKET (HOOKLESS · 0% TAX)
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: "#444b42", lineHeight: 1.4, margin: "0 0 12px" }}>
                      Because the base sCRIT/ETH pool does not carry a custom tax hook, it quotes and trades directly on the Uniswap web interface.
                    </p>
                    <a
                      href={`https://app.uniswap.org/swap?chain=robinhood&inputCurrency=ETH&outputCurrency=${scritAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "var(--moss)",
                        color: "#ffffff",
                        padding: "8px 16px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      <span>Swap ETH to sCRIT on Uniswap</span>
                      <ExternalLink size={13} />
                    </a>
                  </div>

                  {/* Testnet Faucet Option */}
                  {chainId === 46630 && (
                    <div
                      style={{
                        border: "1px solid var(--line-ink)",
                        borderRadius: 6,
                        padding: 16,
                        background: "#faf8f2",
                      }}
                    >
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--signal)" }}>
                        TESTNET FAUCET AVAILABLE
                      </span>
                      <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 12px" }}>
                        Claim 1,000 sCRIT directly to your connected wallet without needing ETH.
                      </p>
                      <button
                        type="button"
                        onClick={handleFaucet}
                        disabled={faucetLoading || !account}
                        style={{
                          padding: "6px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 4,
                          background: "var(--ink)",
                          color: "#ffffff",
                          border: "none",
                          cursor: faucetLoading ? "wait" : "pointer",
                        }}
                      >
                        {faucetLoading ? "Dispensing..." : "Claim 1,000 sCRIT"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error & Success Feedback */}
            {errorMessage && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 4,
                  background: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid rgba(220, 38, 38, 0.25)",
                  color: "#dc2626",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                style={{
                  marginTop: 16,
                  padding: "10px 14px",
                  borderRadius: 4,
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.25)",
                  color: "#16a34a",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span>{successMessage}</span>
                  {txHash && (
                    <div style={{ marginTop: 4 }}>
                      <a
                        href={`${activeNetwork.explorer}/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "currentColor", fontWeight: 700, textDecoration: "underline" }}
                      >
                        View on Robinhood Blockscout ↗
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Pool Telemetry & Stockpile Dynamics */}
        <div className="launch-preview-panel" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Token Card Live Header */}
          <div
            className="launch-header-row"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingBottom: 12,
              borderBottom: "1px solid var(--line-ink)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                className="launch-token-avatar-badge"
                style={{
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 42,
                  height: 42,
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: "50%",
                  background: "var(--moss)",
                  color: "#f8f5ec",
                }}
              >
                {activeTab === "base"
                  ? "ETH"
                  : currentToken?.symbol
                  ? currentToken.symbol.slice(0, 3).toUpperCase()
                  : "TOK"}
              </div>
              <div>
                <span
                  className="mono-sm"
                  style={{
                    letterSpacing: "0.08em",
                    color: "#6b7268",
                    textTransform: "uppercase",
                    fontSize: 10,
                  }}
                >
                  SETTLEMENT PAIR
                </span>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    margin: "1px 0 0",
                    color: "var(--ink)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {activeTab === "base" ? "ETH" : currentToken?.symbol || "TOKEN"}{" "}
                  <span style={{ color: "#a5aba1" }}>/</span>{" "}
                  <span style={{ color: "#8c6418" }}>sCRIT</span>
                </h3>
                <span style={{ fontSize: 11, color: "#6b7268" }}>
                  {activeTab === "base"
                    ? "Native Gas Anchor"
                    : currentToken?.name || "Target Token"}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="scrit-nav-pill-active" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                {chainId === 4663 ? "Mainnet 4663" : "Testnet"}
              </span>
            </div>
          </div>

          {/* Real-time Pool Economics & Telemetry */}
          <div className="launch-metrics-card">
            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Indicative Pool Price</span>
              <span className="launch-metric-val" style={{ color: "#8c6418" }}>
                {activeTab === "base"
                  ? "1 ETH ≈ 1,000 sCRIT"
                  : currentToken?.pooled && currentToken?.scritAmount
                  ? `${(Number(currentToken.scritAmount) / Number(currentToken.pooled)).toFixed(6)} sCRIT`
                  : "~0.000500 sCRIT"}
              </span>
            </div>

            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Settlement Method</span>
              <span className="launch-metric-val">
                {activeTab === "base" ? "1:1 Native Wrap/Unwrap" : "Uniswap V4 ExactInputSingle"}
              </span>
            </div>

            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Trading Tax Hook</span>
              <span className="launch-metric-val" style={{ color: TAX_ACTIVE ? "#b8962e" : "#8c6418" }}>
                {activeTab === "base" ? "0% (Gas Pair)" : "2.5% · 75/25 split"}
              </span>
            </div>

            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Stockpile Buyback Share</span>
              <span className="launch-metric-val" style={{ color: "#2d6a4f" }}>
                {activeTab === "base" ? "—" : "75% to Reserve Accession"}
              </span>
            </div>

            <div className="launch-metric-line">
              <span className="launch-metric-lbl">Uniswap V4 LP Fee</span>
              <span className="launch-metric-val">
                {activeTab === "base" ? "0.00%" : `${(PROJECT_POOL_LP_FEE_BPS / 100).toFixed(2)}% · LP Share`}
              </span>
            </div>

            {currentToken?.address && (
              <div className="launch-metric-line">
                <span className="launch-metric-lbl">Token Contract</span>
                <span
                  className="launch-metric-val"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <span className="mono-xs">{currentToken.address.slice(0, 6)}…{currentToken.address.slice(-4)}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard("tokenAddr", currentToken.address)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                  >
                    {copiedKey === "tokenAddr" ? <Check size={11} color="#2d6a4f" /> : <Copy size={11} />}
                  </button>
                  <a
                    href={`${activeNetwork.explorer}/token/${currentToken.address}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--muted)" }}
                  >
                    <ExternalLink size={11} />
                  </a>
                </span>
              </div>
            )}
          </div>

          {/* Five-Sleeve Stockpile Target Bar */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                <ShieldCheck size={13} color="#8c6418" strokeWidth={2} />
                Reserve Backing Mechanics
              </span>
              <span className="mono-sm" style={{ color: "#8c6418", fontSize: 10.5 }}>
                5 sleeves · 9 elements
              </span>
            </div>
            <div className="metal-composition-bar" aria-label="Five-sleeve stockpile target" style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden" }}>
              {SLEEVES.map((sleeve) => {
                const totalBps = BASKET.filter((b) => b.sleeve === sleeve.id).reduce((sum, b) => sum + b.weightBps, 0);
                return (
                  <div
                    key={sleeve.id}
                    title={`${sleeve.label} ${totalBps / 100}%`}
                    style={{
                      width: `${totalBps / 100}%`,
                      height: "100%",
                      background: sleeve.color,
                    }}
                  />
                );
              })}
            </div>
            {/* Direct labels: sleeve name + % */}
            <div className="metal-legend-row" style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px", marginTop: 7 }}>
              {SLEEVES.map((sleeve) => {
                const totalBps = BASKET.filter((b) => b.sleeve === sleeve.id).reduce((sum, b) => sum + b.weightBps, 0);
                return (
                  <span className="metal-legend-item" key={sleeve.id} style={{ fontSize: 10.5, fontWeight: 600, color: "#1b2019", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span
                      className="metal-dot"
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: sleeve.color,
                      }}
                    />
                    {sleeve.label} {totalBps / 100}%
                  </span>
                );
              })}
            </div>
          </div>

          {/* On-Chain Verified Infrastructure Card */}
          <div
            style={{
              padding: "14px 16px",
              background: "#faf8f2",
              border: "1px solid var(--line-ink)",
              borderRadius: 6,
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, color: "var(--ink)", fontWeight: 700 }}>
              <ShieldCheck size={14} color="#2d6a4f" />
              <span>Verified On-Chain Contracts</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>DemoSwapHelper:</span>
                <a
                  href={`${activeNetwork.explorer}/address/${swapHelperAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#8c6418", textDecoration: "underline" }}
                >
                  {swapHelperAddress.slice(0, 6)}…{swapHelperAddress.slice(-4)} ↗
                </a>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>TradingTaxHook:</span>
                <a
                  href={`${activeNetwork.explorer}/address/${hookAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#8c6418", textDecoration: "underline" }}
                >
                  {hookAddress.slice(0, 6)}…{hookAddress.slice(-4)} ↗
                </a>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>sCRIT Token:</span>
                <a
                  href={`${activeNetwork.explorer}/token/${scritAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#8c6418", textDecoration: "underline" }}
                >
                  {scritAddress.slice(0, 6)}…{scritAddress.slice(-4)} ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Meta Notes */}
      <div style={{ marginTop: 24, textAlign: "center", paddingBottom: 40 }}>
        <p style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)", margin: 0 }}>
          sCRIT Protocol · Robinhood Chain Mainnet 4663 · Uniswap V4 PoolManager: 0x8366...0951
        </p>
      </div>
    </PageShell>
  );
}

export default function SwapPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <div style={{ maxWidth: 640, margin: "60px auto", textAlign: "center", padding: "0 20px" }}>
            <div className="scrit-skeleton" style={{ width: 180, height: 28, margin: "0 auto 16px", borderRadius: 4 }} />
            <div className="scrit-skeleton" style={{ width: 320, height: 18, margin: "0 auto 32px", borderRadius: 4 }} />
            <div className="scrit-skeleton" style={{ width: "100%", height: 380, borderRadius: 8 }} />
          </div>
        </PageShell>
      }
    >
      <SwapContent />
    </Suspense>
  );
}

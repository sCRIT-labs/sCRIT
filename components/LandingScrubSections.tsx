"use client";

import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ShieldCheck, Activity, CheckCircle2, Terminal as TerminalIcon } from "lucide-react";

type Dispatch = { tag: string; title: string; body: string; image: string; href: string; link: string };
type Narrative = { index: string; title: string; copy: string; image: string; metric: string; metricLabel: string };

function useStaticMotion() {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    setReady(true);
    return () => query.removeEventListener("change", update);
  }, []);
  return !ready || Boolean(reduced) || compact;
}

const DISPATCH_METADATA = [
  {
    pillarCode: "RAIL A ENGINE",
    shortTitle: "Rail A Liquidity",
    shortDesc: "Uniswap V4 Hooks & Reserve Tax",
    pillBadge: "LIQUIDITY RAIL",
    chips: ["Uniswap V4 Hooks", "2.5% Reserve Sink", "Direct Arbitrage", "Singleton Hook"],
    telemetryKey: "ROUTING PROTOCOL",
    telemetryVal: "sCRIT/TOKEN Single-Hop Pool",
    statusText: "V4 HOOK ACTIVE",
    actionNote: "Inspect Rail A launchpad & liquidity pools",
    hudStatus: "HOOK ENGAGED",
    hudCert: "UNISWAP_V4 // SINGLETON",
    watermark: "HOOK ARCHITECTURE: UNISWAP V4 · ROUTING: SINGLE-HOP",
    metrics: [
      { val: "2.50%", label: "Reserve Fee", note: "Treasury Tax" },
      { val: "V4 Hook", label: "Architecture", note: "Singleton Pool" },
      { val: "Attested", label: "Reserve Recognised", note: "Not Pegged" },
    ],
    specs: [
      { key: "EXECUTION RAIL", val: "Ecosystem Pairs Directly Against sCRIT in V4 Pools" },
      { key: "TREASURY SINK", val: "Continuous Flow to Treasury Accessions" },
    ],
  },
  {
    pillarCode: "STRATEGIC BASKET",
    shortTitle: "Strategic Basket",
    shortDesc: "9 Elements Across 5 Sleeves",
    pillBadge: "STOCKPILE",
    chips: ["HREE-Led", "9 Elements", "5 Sleeves", "Signed Attestations"],
    telemetryKey: "ASSET ALLOCATION",
    telemetryVal: "HREE, Magnet, PGM, Battery & Ballast",
    statusText: "ALLOCATION DEFINED",
    actionNote: "Inspect sleeve targets & stockpile evidence",
    hudStatus: "RESERVE TARGETS",
    hudCert: "5 SLEEVES // 9 ELEMENTS",
    watermark: "DESIGN TARGETS · NOT PHYSICAL INVENTORY CLAIMS",
    metrics: [
      { val: "9 Elements", label: "Stockpile", note: "TCEs & Ballast" },
      { val: "5 Sleeves", label: "Architecture", note: "HREE-Led" },
      { val: "Attested", label: "Recognition", note: "Not Pegged" },
    ],
    specs: [
      { key: "ALLOCATION PROFILE", val: "Dy, Tb, Nd, Sc, Pt, Pd, Li, Au, Ag" },
      { key: "INTAKE STANDARD", val: "EIP-712 Signed Custodian Attestation Required" },
    ],
  },
  {
    pillarCode: "CUSTODIAN GATE",
    shortTitle: "Custodian Gate",
    shortDesc: "EIP-712 Attestation Proofs",
    pillBadge: "CRYPTOGRAPHIC GATE",
    chips: ["EIP-712 Signatures", "Assay Certified", "Verifiable On-Chain", "Zero Trust"],
    telemetryKey: "VERIFICATION GATE",
    telemetryVal: "Signed Custodian Ledger Records",
    statusText: "ATTESTATION VERIFIED",
    actionNote: "Read evidence model & signed custodian proofs",
    hudStatus: "PROOF VERIFIED",
    hudCert: "ECDSA // SECP256K1",
    watermark: "STANDARD: EIP-712 TYPED DATA · ASSAY ATTESTED",
    metrics: [
      { val: "EIP-712", label: "Cryptographic", note: "Typed Signature" },
      { val: "99.9%+", label: "Purity Attested", note: "Grade Specs" },
      { val: "On-Chain", label: "Public Ledger", note: "Real-Time Proof" },
    ],
    specs: [
      { key: "ATTESTATION MODEL", val: "Signatures Required Before Reserve Recognition" },
      { key: "VERIFICATION TRANSPARENCY", val: "Every Batch Hash-Linked to Assayer Certificate" },
    ],
  },
];

export function PinnedDispatch({ items }: { items: Dispatch[] }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });

  const [activeIndex, setActiveIndex] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.35) {
      setActiveIndex(0);
    } else if (latest < 0.68) {
      setActiveIndex(1);
    } else {
      setActiveIndex(2);
    }
  });

  const handleTabClick = (index: number) => {
    if (!section.current) return;
    const rect = section.current.getBoundingClientRect();
    const scrollTop = window.scrollY || window.pageYOffset;
    const sectionTop = rect.top + scrollTop;
    const sectionHeight = section.current.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollDistance = Math.max(0, sectionHeight - viewportHeight);
    const targetProgress = index === 0 ? 0.05 : index === 1 ? 0.48 : 0.88;
    window.scrollTo({
      top: sectionTop + scrollDistance * targetProgress,
      behavior: "smooth",
    });
  };

  const activeMeta = DISPATCH_METADATA[activeIndex] || DISPATCH_METADATA[0];
  const activeItem = items[activeIndex] || items[0];

  return (
    <section
      ref={section}
      id="dispatches"
      className={`scrit-scrub scrit-dispatch-scrub${staticMotion ? " is-static" : ""}`}
      aria-label="sCRIT pilot architectural dispatches"
    >
      <div className="scrit-dispatch-container">
        {/* Left Column: Command Console & Interactive Tabs */}
        <div className="scrit-dispatch-console">
          <div className="scrit-dispatch-header-block">
            <div className="scrit-dispatch-kicker-row">
              <span className="scrit-kicker">THE PILOT, CLEARLY STATED</span>
              <span className="scrit-dispatch-live-beacon">
                PILOT ARCHITECTURE
              </span>
            </div>
            <h2>
              Designed around evidence. <em>Honest about the limits.</em>
            </h2>
            <p className="scrit-dispatch-deck-desc">
              sCRIT pairs liquid project tokens directly to an on-chain stockpile of technology-critical elements and monetary ballast.
              Scroll to scrub through each foundational pillar, or click a chapter below.
            </p>
          </div>

          {/* Interactive 3-Pillar Chapter Rail */}
          <div className="scrit-dispatch-tabs" role="tablist" aria-label="Architecture chapters">
            {items.map((item, index) => {
              const meta = DISPATCH_METADATA[index] || DISPATCH_METADATA[0];
              const isActive = activeIndex === index;
              return (
                <button
                  key={item.tag}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`scrit-dispatch-tab${isActive ? " is-active" : ""}`}
                  onClick={() => handleTabClick(index)}
                >
                  <div className="scrit-dispatch-tab-left">
                    <div className="scrit-dispatch-tab-titles">
                      <span className="scrit-dispatch-tab-heading">{meta.shortTitle}</span>
                      <span className="scrit-dispatch-tab-sub">{meta.shortDesc}</span>
                    </div>
                  </div>
                  <div className="scrit-dispatch-tab-right">
                    <span className="scrit-dispatch-tab-badge mono-sm">{meta.pillBadge}</span>
                  </div>
                  {/* Micro Progress Bar inside Tab */}
                  <TabProgressBar
                    index={index}
                    progress={scrollYProgress}
                    disabled={staticMotion}
                    isActive={isActive}
                  />
                </button>
              );
            })}
          </div>

          {/* Real-time Telemetry HUD */}
          <div className="scrit-dispatch-telemetry-hud">
            <div className="scrit-telemetry-header">
              <span className="mono-sm scrit-telemetry-title">COMMAND TELEMETRY</span>
              <span className="mono-sm scrit-telemetry-status">{activeMeta.statusText}</span>
            </div>
            <div className="scrit-telemetry-body">
              <div className="scrit-telemetry-row">
                <span className="scrit-telemetry-label">{activeMeta.telemetryKey}</span>
                <span className="scrit-telemetry-value mono-sm">{activeMeta.telemetryVal}</span>
              </div>
              <p className="scrit-telemetry-note">{activeMeta.actionNote}</p>
            </div>
            <a href={activeItem.href} className="scrit-dispatch-action-cta">
              <span>{activeItem.link}</span>
              <ArrowUpRight size={14} />
            </a>
          </div>

          {/* Section Scrub Meter */}
          <ScrubMeter
            progress={scrollYProgress}
            disabled={staticMotion}
            labels={["RAIL A", "CRITICAL BASKET", "CUSTODIAN GATE"]}
          />
        </div>

        {/* Right Column: 3D Kinetic Vault Stage */}
        <div className="scrit-dispatch-vault-stage">
          <div className="scrit-dispatch-vault-frame">
            <div className="scrit-dispatch-vault-hud-top">
              <div className="scrit-vault-hud-left">
                <span className="scrit-vault-reticle">◈</span>
                <span className="mono-sm scrit-vault-label">EVIDENCE CHAMBER // 3D FOCAL STACK</span>
              </div>
              <div className="mono-sm scrit-vault-hud-right">
                {activeMeta.pillBadge}
              </div>
            </div>

            <div className="scrit-dispatch-card-stack">
              {items.map((item, index) => (
                <DispatchKineticCard
                  key={item.tag}
                  item={item}
                  index={index}
                  meta={DISPATCH_METADATA[index] || DISPATCH_METADATA[0]}
                  progress={scrollYProgress}
                  disabled={staticMotion}
                  isActive={activeIndex === index}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TabProgressBar({
  index,
  progress,
  disabled,
  isActive,
}: {
  index: number;
  progress: MotionValue<number>;
  disabled: boolean;
  isActive: boolean;
}) {
  const start = index === 0 ? 0.0 : index === 1 ? 0.33 : 0.66;
  const end = index === 0 ? 0.33 : index === 1 ? 0.66 : 1.0;
  const scaleX = useTransform(progress, [start, end], [0, 1], { clamp: true });

  if (disabled) {
    return <span className={`scrit-tab-progress-static${isActive ? " is-active" : ""}`} />;
  }

  return (
    <motion.span
      className="scrit-tab-progress-bar"
      style={{ scaleX, transformOrigin: "left" }}
    />
  );
}

function DispatchKineticCard({
  item,
  index,
  meta,
  progress,
  disabled,
  isActive,
}: {
  item: Dispatch;
  index: number;
  meta: (typeof DISPATCH_METADATA)[number];
  progress: MotionValue<number>;
  disabled: boolean;
  isActive: boolean;
}) {
  // Card 0: starts at center, recedes when progress reaches 0.28 - 0.44
  const card0_y = useTransform(progress, [0, 0.28, 0.44, 0.70, 1.0], [0, 0, -32, -56, -56]);
  const card0_scale = useTransform(progress, [0, 0.28, 0.44, 0.70, 1.0], [1, 1, 0.94, 0.88, 0.88]);
  const card0_opacity = useTransform(progress, [0, 0.28, 0.44, 0.70, 1.0], [1, 1, 0.26, 0.08, 0.08]);
  const card0_rotateX = useTransform(progress, [0, 0.28, 0.44, 1.0], [0, 0, 4, 7]);
  const card0_scan = useTransform(progress, [0.0, 0.32], ["0%", "100%"]);

  // Card 1: waits below, rises at 0.20 - 0.36, sits active until 0.62, recedes at 0.62 - 0.76
  const card1_y = useTransform(progress, [0, 0.20, 0.36, 0.62, 0.76, 1.0], [54, 54, 0, 0, -32, -32]);
  const card1_scale = useTransform(progress, [0, 0.20, 0.36, 0.62, 0.76, 1.0], [0.94, 0.94, 1, 1, 0.94, 0.94]);
  const card1_opacity = useTransform(progress, [0, 0.20, 0.36, 0.62, 0.76, 1.0], [0, 0, 1, 1, 0.26, 0.26]);
  const card1_rotateX = useTransform(progress, [0, 0.20, 0.36, 0.62, 0.76, 1.0], [-5, -5, 0, 0, 4, 4]);
  const card1_scan = useTransform(progress, [0.34, 0.64], ["0%", "100%"]);

  // Card 2: waits below, rises at 0.52 - 0.68, sits active until 1.0
  const card2_y = useTransform(progress, [0, 0.52, 0.68, 1.0], [54, 54, 0, 0]);
  const card2_scale = useTransform(progress, [0, 0.52, 0.68, 1.0], [0.94, 0.94, 1, 1]);
  const card2_opacity = useTransform(progress, [0, 0.52, 0.68, 1.0], [0, 0, 1, 1]);
  const card2_rotateX = useTransform(progress, [0, 0.52, 0.68, 1.0], [-5, -5, 0, 0]);
  const card2_scan = useTransform(progress, [0.68, 0.98], ["0%", "100%"]);

  const y = index === 0 ? card0_y : index === 1 ? card1_y : card2_y;
  const scale = index === 0 ? card0_scale : index === 1 ? card1_scale : card2_scale;
  const opacity = index === 0 ? card0_opacity : index === 1 ? card1_opacity : card2_opacity;
  const rotateX = index === 0 ? card0_rotateX : index === 1 ? card1_rotateX : card2_rotateX;
  const scanTop = index === 0 ? card0_scan : index === 1 ? card1_scan : card2_scan;

  const pointerEvents = useTransform(progress, (val) => {
    if (index === 0) return val < 0.35 ? "auto" : "none";
    if (index === 1) return val >= 0.35 && val < 0.68 ? "auto" : "none";
    return val >= 0.68 ? "auto" : "none";
  });

  const zIndex = useTransform(progress, (val) => {
    if (index === 0) return val < 0.35 ? 30 : 10;
    if (index === 1) return val >= 0.35 && val < 0.68 ? 30 : val < 0.35 ? 20 : 15;
    return val >= 0.68 ? 30 : 10;
  });

  return (
    <motion.article
      className={`scrit-dispatch-focal-card card-index-${index}${isActive ? " is-focal-active" : ""}`}
      style={
        disabled
          ? undefined
          : {
              y,
              scale,
              opacity,
              rotateX,
              zIndex,
              pointerEvents,
              transformPerspective: 1200,
            }
      }
    >
      {/* Top Header Strip */}
      <div className="scrit-focal-card-topbar">
        <div className="scrit-focal-card-topbar-left">
          <span className="mono-sm scrit-focal-card-cat">{meta.pillarCode}</span>
        </div>
        <div className="scrit-focal-card-topbar-right">
          <span className="scrit-focal-badge mono-sm">{meta.pillBadge}</span>
        </div>
      </div>

      {/* Visual Header / Image Frame with Holographic Scanner */}
      <div className="scrit-focal-card-visual">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          decoding="async"
          className="scrit-focal-card-img"
        />
        <div className="scrit-focal-card-overlay" />
        <motion.span
          className="scrit-focal-scanner-beam"
          style={disabled ? undefined : { top: scanTop }}
          aria-hidden="true"
        />
        {/* Holographic Top Status & Certificate Pills */}
        <div className="scrit-focal-image-top-tags">
          <span className="mono-sm scrit-focal-status-tag">
            {meta.hudStatus}
          </span>
          <span className="mono-sm scrit-focal-cert-tag">{meta.hudCert}</span>
        </div>
        {/* Holographic Bottom HUD */}
        <div className="scrit-focal-optic-hud">
          <span className="mono-sm scrit-focal-ref">{meta.watermark}</span>
          <span className="mono-sm scrit-focal-target-cross">◈ ATTESTED</span>
        </div>
      </div>

      {/* Main Copy Content */}
      <div className="scrit-focal-card-body">
        <div className="scrit-focal-intro">
          <span className="scrit-kicker">{item.tag}</span>
          <h3>{item.title}</h3>
          <p>{item.body}</p>
        </div>

        {/* 3-Column Metric Matrix Display */}
        <div className="scrit-focal-metrics-matrix">
          {meta.metrics.map((m) => (
            <div key={m.label} className="scrit-focal-metric-cell">
              <span className="scrit-focal-m-val mono-sm">{m.val}</span>
              <span className="scrit-focal-m-label">{m.label}</span>
              <small className="scrit-focal-m-note mono-sm">{m.note}</small>
            </div>
          ))}
        </div>

        {/* Technical Architecture Parameter Ledger */}
        <div className="scrit-focal-specs-ledger">
          {meta.specs.map((s) => (
            <div key={s.key} className="scrit-focal-spec-row">
              <span className="mono-sm scrit-focal-spec-k">{s.key}</span>
              <span className="scrit-focal-spec-v">{s.val}</span>
            </div>
          ))}
        </div>

        {/* Feature Spec Chips */}
        <div className="scrit-focal-chips">
          {meta.chips.map((chip) => (
            <span key={chip} className="scrit-focal-chip mono-sm">
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* Footer Link & Action */}
      <div className="scrit-focal-card-footer">
        <div className="scrit-focal-footer-telemetry">
          <span className="mono-sm scrit-focal-foot-key">{meta.telemetryKey}</span>
          <span className="mono-sm scrit-focal-foot-val">{meta.telemetryVal}</span>
        </div>
        <a href={item.href} className="scrit-focal-link">
          <span>{item.link}</span>
          <ArrowUpRight size={14} />
        </a>
      </div>
    </motion.article>
  );
}

export function PinnedIndexStory({ metrics }: { metrics: { label: string; value: string; detail: string }[] }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const divider = useTransform(scrollYProgress, [0, 1], ["12%", "88%"]);
  const revealOpacity = useTransform(scrollYProgress, [0, .4, 1], [0, .88, .88]);
  const details = useTransform(scrollYProgress, [0, .28, .7, 1], [0, 0, 1, 1]);
  return <section ref={section} className={`scrit-scrub scrit-index-scrub${staticMotion ? " is-static" : ""}`} id="products" aria-label="From reserve records to indicative NAV">
    <div className="scrit-scrub-stage scrit-index-scrub-stage">
      <div className="scrit-index-scrub-copy"><span className="scrit-kicker">THE sCRIT INDEX · RAIL A</span><h2>From evidence <em>to an estimate.</em></h2><p>sCRIT is building an on-chain stockpile of technology-critical elements - led by heavy rare earths, ballasted by gold. Every ecosystem token launched on Rail A pairs directly against sCRIT in Uniswap V4 pools.</p><a className="scrit-button scrit-button-dark" href="/proof">Open reserve ledger <ArrowUpRight size={16} /></a>
        <motion.div className="scrit-index-scrub-metrics" style={staticMotion ? undefined : { opacity: details }}>{metrics.map((metric) => <div key={metric.label}><span className="scrit-kicker">{metric.label}</span><b>{metric.value}</b><small>{metric.detail}</small></div>)}</motion.div>
      </div>
      <div className="scrit-index-scrub-visual">
        <img className="scrit-index-scrub-base" src="/images/scrit_critical_vault.jpg" alt="Digital 3D custody attestation recorded inputs" loading="lazy" decoding="async" />
        <motion.img className="scrit-index-scrub-reveal" src="/images/scrit_nav_telemetry.jpg" alt="Digital 3D indicative NAV valuation telemetry" loading="lazy" decoding="async" style={staticMotion ? undefined : { opacity: revealOpacity }} />
        <motion.span className="scrit-index-scrub-caliper" style={staticMotion ? undefined : { left: divider }} />
        <span className="scrit-index-scrub-tag tag-input">RECORDED INPUTS</span><span className="scrit-index-scrub-tag tag-output">INDICATIVE NAV</span>
      </div>
      <ScrubMeter progress={scrollYProgress} disabled={staticMotion} labels={["RECORDS", "VALUATION", "DISCLOSURE"]} />
    </div>
  </section>;
}

export function PinnedReserveStory({ scenes }: { scenes: Narrative[] }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  return <section ref={section} className={`scrit-chapter scrit-reserve-scrub${staticMotion ? " is-static" : ""}`} aria-label="How the pilot reserve story works">
    <div className="scrit-chapter-stage">
      <div className="scrit-chapter-heading"><span className="scrit-kicker">A RESERVE, STEP BY STEP</span><p>Scroll to move through the model.<br />Scroll back to retrace it.</p></div>
      <div className="scrit-chapter-scenes">{scenes.map((scene, i) => <article className={`scrit-chapter-scene scrit-chapter-scene-${i + 1}`} key={scene.index}><div className="scrit-chapter-copy"><span className="scrit-kicker">{scene.index}</span><h2>{scene.title}</h2><p>{scene.copy}</p></div><div className="scrit-chapter-art"><img src={scene.image} alt="" loading="lazy" decoding="async" /><div className="scrit-chapter-metric"><strong>{scene.metric}</strong><span>{scene.metricLabel}</span></div><span className="scrit-chapter-stamp"><ShieldCheck size={15} /> PILOT MODEL</span></div></article>)}</div>
      <div className="scrit-chapter-progress" aria-hidden="true"><span /></div><a className="scrit-scroll-cue" href="#ledger">Continue <ArrowUpRight size={14} /></a>
    </div>
  </section>;
}

export function PinnedLedgerStory({ copy, lines, session }: { copy: { title: string; text: string }; lines: { key: string; value: string }[]; session: string }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const beamTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return (
    <section ref={section} className={`scrit-scrub scrit-ledger-scrub${staticMotion ? " is-static" : ""}`} id="ledger" aria-label="Pilot record status">
      <div className="scrit-scrub-stage scrit-ledger-scrub-stage">
        {/* Left Column: Editorial Summary */}
        <div className="scrit-ledger-copy">
          <span className="scrit-kicker">PILOT RECORD STATUS</span>
          <h2>{copy.title}</h2>
          <p>{copy.text}</p>
          <a className="scrit-text-link" href="/proof">View all proof data <ArrowUpRight size={15} /></a>
        </div>

        {/* Right Column: Unified Telemetry Terminal */}
        <div className="scrit-ledger-terminal-wrap">
          <div className="scrit-terminal-enhanced">
            <div className="scrit-terminal-crt-scanlines" aria-hidden="true" />
            <div className="scrit-terminal-bar">
              <div className="scrit-terminal-bar-left">
                <TerminalIcon size={13} />
                <span className="scrit-terminal-title">SYSTEM OBSERVER</span>
                <span className="scrit-terminal-session-badge">sCRIT-PILOT</span>
              </div>
              <div className="scrit-terminal-bar-right">
                <Activity size={12} className="scrit-telemetry-pulse-icon" />
                <span className="scrit-status-pass">READ ONLY</span>
                <span className="scrit-intro-status">SYNCED</span>
              </div>
            </div>

            <div className="scrit-terminal-body">
              <div className="scrit-terminal-intro">
                <span className="scrit-intro-tag">
                  <span className="scrit-intro-label">FEED STATUS:</span>
                  <b>{session}</b>
                </span>
                <span className="scrit-terminal-scroll-hint">FOLLOW SCROLL TO VERIFY</span>
              </div>

              <motion.span className="scrit-terminal-laser-beam" style={staticMotion ? undefined : { top: beamTop }} aria-hidden="true" />

              <div className="scrit-terminal-lines-stack">
                {lines.map((line, i) => (
                  <LedgerLine key={line.key} line={line} index={i} progress={scrollYProgress} disabled={staticMotion} />
                ))}
              </div>

              <div className="scrit-terminal-bottom-console">
                <div className="scrit-terminal-cmd-stream">
                  <span className="scrit-prompt-symbol">$</span>
                  <span className="scrit-prompt-cmd">pilot.reserve.observe --chain 4663</span>
                  <span className="scrit-prompt-tag">OBSERVED</span>
                  <i className="scrit-terminal-blinker">▌</i>
                </div>
                <div className="scrit-terminal-status-footer">
                  <span>INDEXER · 5 CONFIRMATIONS</span>
                  <span>NO WRITE ACCESS</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Spanning Bottom Row */}
        <ScrubMeter progress={scrollYProgress} disabled={staticMotion} labels={["CONFIG", "POOL FEE", "FEE ROUTING", "REDEMPTION", "ATTESTATION"]} />
      </div>
    </section>
  );
}

function isRecordLive(value: string): boolean {
  return !/AWAITING|UNAVAILABLE|NOT AVAILABLE|WAITING|MISSING/i.test(value);
}

function LedgerLine({
  line,
  index,
  progress,
  disabled,
}: {
  line: { key: string; value: string };
  index: number;
  progress: MotionValue<number>;
  disabled: boolean;
}) {
  const start = 0.04 + index * 0.10;
  const end = start + 0.10;

  const opacity = useTransform(progress, [start, end], [0, 1]);
  const x = useTransform(progress, [start, end], [24, 0]);
  const live = isRecordLive(line.value);
  return (
    <motion.div
      className={`scrit-terminal-line${live ? " is-verified" : " is-pending"}`}
      style={disabled ? undefined : { opacity, x }}
    >
      <span className="scrit-terminal-line-head">
        <span className="scrit-terminal-key">{line.key}</span>
      </span>
      <span className="scrit-terminal-line-val-group">
        <span className="scrit-terminal-value">{line.value}</span>
        <span className="scrit-terminal-ack-tag">{live ? "ACK" : "PENDING"}</span>
      </span>
    </motion.div>
  );
}

export function PinnedAssuranceStory({ items }: { items: { title: string; body: string; href: string; link: string; mark: string; image: string }[] }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  return <section ref={section} className={`scrit-scrub scrit-assurance-scrub${staticMotion ? " is-static" : ""}`} id="trust" aria-label="Pilot assurances and limitations">
      <div className="scrit-scrub-stage"><header className="scrit-assurance-header-bar">
        <div className="scrit-assurance-title-block"><span className="scrit-kicker">TRUST, WITHOUT THE GLOSS</span><h2>What the pilot can show. <em>And what it cannot promise.</em></h2></div>
        <div className="scrit-assurance-meta-block"><p>Three principles, scrubbed into view. Nothing here claims custody, audit, or redemption.</p><span className="scrit-assurance-pill"><ShieldCheck size={13} className="scrit-assurance-shield-icon" /><span>{items.length} PILOT PRINCIPLES</span></span></div>
      </header>
      <div className="scrit-assurance-deck">{items.map((item, index) => <AssuranceLayer key={item.title} item={item} index={index} progress={scrollYProgress} disabled={staticMotion} />)}</div>
      <ScrubMeter progress={scrollYProgress} disabled={staticMotion} labels={["SIGNATURES", "BASKET", "MARKET"]} />
    </div>
  </section>;
}

function AssuranceLayer({ item, index, progress, disabled }: { item: { title: string; body: string; href: string; link: string; mark: string; image: string }; index: number; progress: MotionValue<number>; disabled: boolean }) {
  const entryStart = 0.05 + index * 0.24;
  const entryEnd = entryStart + 0.18;

  const rotateX = useTransform(progress, [entryStart, entryEnd], [12, 0]);
  const y = useTransform(progress, [entryStart, entryEnd], [40, 0]);
  const opacity = useTransform(progress, [entryStart, entryEnd], [0, 1]);
  const pointerEvents = useTransform(progress, (value) => (value >= entryStart + 0.04 ? "auto" : "none"));

  const ringRotate = useTransform(progress, [0, 1], [0, 240]);
  const ringScale = useTransform(progress, [entryStart, entryEnd], [0.85, 1]);

  // Active laser sweep window for holographic sheen
  const activeStart = 0.05 + index * 0.26;
  const activeEnd = activeStart + 0.22;
  const sweepX = useTransform(progress, [activeStart, activeEnd], ["-100%", "200%"]);

  const boundaryNotes = [
    "PILOT SCOPE: OFF-CHAIN VERIFIED RECORDS ONLY",
    "BASKET TARGETS: NOT PHYSICAL INVENTORY",
    "MARKET REALITY: NO REDEMPTION ARBITRAGE",
  ];
  const boundaryText = boundaryNotes[index] || "PILOT PROTOCOL BOUNDARY";

  return (
    <motion.article
      className="scrit-assurance-card scrit-assurance-scrub-card"
      style={disabled ? undefined : { y, rotateX, opacity, pointerEvents, transformPerspective: 1200 }}
    >
      <div className="scrit-assurance-art" aria-hidden="true">
        <motion.img src={item.image} alt="" loading="lazy" decoding="async" style={disabled ? undefined : { scale: ringScale }} />
        <div className="scrit-assurance-reticle">
          <motion.span className="scrit-reticle-ring-outer" style={disabled ? undefined : { rotate: ringRotate, scale: ringScale }} />
          <span className="scrit-reticle-ring-inner" />
          <span className="scrit-assurance-glyph">{item.mark}</span>
        </div>
        <div className="scrit-assurance-art-footer">
          <span className="scrit-assurance-status-chip">PILOT ACTIVE</span>
          <small>FIELD RECORD / sCRIT</small>
        </div>
        <motion.span className="scrit-assurance-hologram-sweep" style={disabled ? undefined : { left: sweepX }} />
      </div>
      <div className="scrit-assurance-copy">
        <div className="scrit-assurance-facet-top">
          <span className="scrit-assurance-label">PILOT PRINCIPLE</span>
          <CheckCircle2 size={14} className="scrit-assurance-check" />
        </div>
        <h3>{item.title}</h3>
        <p>{item.body}</p>
        <div className="scrit-assurance-boundary-box">
          <span className="scrit-boundary-tag">PROTOCOL BOUNDARY</span>
          <span className="scrit-boundary-text">{boundaryText}</span>
        </div>
        <a href={item.href}>{item.link} <ArrowUpRight size={14} /></a>
      </div>
    </motion.article>
  );
}

export function PinnedLaunchStory({ image, children }: { image: string; children: ReactNode }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const reveal = useTransform(scrollYProgress, [0, .7, 1], [0, 1, 1]);
  const marker = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  return <section ref={section} className={`scrit-scrub scrit-launch-scrub${staticMotion ? " is-static" : ""}`} id="launch-model" aria-label="Token launch rail">
    <div className="scrit-scrub-stage scrit-launch-scrub-stage"><div className="scrit-launch-art"><img src={image} alt="Silver-toned vault interior" /><div className="scrit-launch-art-caption"><span>RAIL A / PILOT</span><strong>One pair.<br />Two assets.</strong></div></div>
      <motion.div className="scrit-launch-scrub-wipe" style={staticMotion ? undefined : { scaleX: reveal }} aria-hidden="true" />
      <div className="scrit-launch-copy"><span className="scrit-kicker">THE TOKEN LAUNCH RAIL</span>{children}<div className="scrit-launch-scrub-steps"><span>ISSUE</span><i><motion.b style={staticMotion ? undefined : { left: marker }} /></i><span>PAIR</span><span>POOL</span></div></div>
      <ScrubMeter progress={scrollYProgress} disabled={staticMotion} labels={["ISSUE", "PAIR", "POOL"]} />
    </div>
  </section>;
}

const SLEEVE_GROUPS = [
  {
    id: "hree",
    label: "Heavy Rare Earths",
    code: "01 · HREE",
    weight: 40,
    color: "#e2b65a",
    detail: "Dy 25% · Tb 15% · Primary choke-point target",
    elements: [
      { sym: "Dy", name: "Dysprosium", weight: "25%", grade: "99.5%" },
      { sym: "Tb", name: "Terbium", weight: "15%", grade: "99.9%" },
    ],
  },
  {
    id: "magnet",
    label: "Magnet & Minor REE",
    code: "02 · MAGNET",
    weight: 15,
    color: "#8db4d8",
    detail: "Nd 10% · Sc 5% · Permanent magnets & alloys",
    elements: [
      { sym: "Nd", name: "Neodymium", weight: "10%", grade: "99.5%" },
      { sym: "Sc", name: "Scandium", weight: "5%", grade: "99.9%" },
    ],
  },
  {
    id: "pgm",
    label: "Platinum-Group Metals",
    code: "03 · PGM",
    weight: 15,
    color: "#b8b8c0",
    detail: "Pt 10% · Pd 5% · Catalyst & hydrogen economy",
    elements: [
      { sym: "Pt", name: "Platinum", weight: "10%", grade: "99.95%" },
      { sym: "Pd", name: "Palladium", weight: "5%", grade: "99.95%" },
    ],
  },
  {
    id: "battery",
    label: "Battery Sleeve",
    code: "04 · BATTERY",
    weight: 5,
    color: "#50e3c2",
    detail: "Li 5% · Battery-grade carbonate",
    elements: [
      { sym: "Li", name: "Lithium (Li₂CO₃)", weight: "5%", grade: "99.5%" },
    ],
  },
  {
    id: "ballast",
    label: "Monetary Ballast",
    code: "05 · BALLAST",
    weight: 25,
    color: "#d9a92e",
    detail: "Au 20% · Ag 5% · Volatility absorption",
    elements: [
      { sym: "Au", name: "Gold", weight: "20%", grade: "99.99%" },
      { sym: "Ag", name: "Silver", weight: "5%", grade: "99.9%" },
    ],
  },
];

function SleeveLine({
  sleeve,
  index,
  progress,
  disabled,
}: {
  sleeve: (typeof SLEEVE_GROUPS)[number];
  index: number;
  progress: MotionValue<number>;
  disabled: boolean;
}) {
  const from = 0.05 + index * 0.18;
  const fill = useTransform(progress, [from, Math.min(1, from + 0.35)], [0, sleeve.weight / 100]);
  return (
    <div className="scrit-basket-row">
      <span className="scrit-basket-symbol">{sleeve.code.split(" · ")[0]}</span>
      <span className="scrit-basket-name">
        {sleeve.label}
        <small>{sleeve.detail}</small>
      </span>
      <div className="scrit-basket-track">
        <motion.span
          style={{
            scaleX: disabled ? sleeve.weight / 100 : fill,
            backgroundColor: sleeve.color,
          }}
        />
      </div>
      <strong style={{ color: "var(--ink, #141714)" }}>{sleeve.weight}%</strong>
    </div>
  );
}

export function PinnedBasketStory({ items, excluded }: { items?: { symbol: string; name: string; detail: string; weight: number }[]; excluded?: string }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  return (
    <section ref={section} className={`scrit-scrub scrit-basket-scrub${staticMotion ? " is-static" : ""}`} id="basket" aria-label="Pilot basket target weights">
      <div className="scrit-scrub-stage scrit-basket-scrub-stage">
        <header className="scrit-basket-heading">
          <span className="scrit-kicker">FIVE SLEEVES · ONE STOCKPILE</span>
          <h2>Heavy rare earths, with <em>monetary ballast.</em></h2>
          <p>
            Target allocation across five sleeves. Detailed per-element specifications are tracked in the{" "}
            <a className="scrit-text-link" href="/proof#holdings" style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}>
              Reserve Ledger <ArrowUpRight size={13} />
            </a>
            .
          </p>
        </header>
        <div className="scrit-basket-rows">
          {SLEEVE_GROUPS.map((sleeve, index) => (
            <SleeveLine
              key={sleeve.id}
              sleeve={sleeve}
              index={index}
              progress={scrollYProgress}
              disabled={staticMotion}
            />
          ))}

          <div
            className="scrit-basket-note"
            style={{
              fontSize: "11px",
              color: "var(--muted, #636b60)",
              marginTop: "14px",
              borderTop: "1px dashed var(--line, rgba(20,23,20,0.1))",
              paddingTop: "8px",
            }}
          >
            <small>HREE has no on-chain price feed. Dy and Tb prices are manual pilot inputs from market reports. Diamonds are Rail B only; Uranium is unavailable.</small>
          </div>
        </div>
        <div className="scrit-basket-total">
          <span>ALLOCATION SHOWN</span>
          <strong>100%</strong>
          <small>5 sleeves · 9 elements target weights</small>
        </div>
        <ScrubMeter progress={scrollYProgress} disabled={staticMotion} labels={["HREE / Dy · Tb", "PGMs & MAGNETS", "BALLAST / Au · Ag"]} />
      </div>
    </section>
  );
}

export function PinnedEditorialStory({ items }: { items: { label: string; title: string; action: string; href: string; image: string }[] }) {
  const section = useRef<HTMLElement>(null);
  const staticMotion = useStaticMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  return <section ref={section} className={`scrit-scrub scrit-editorial-scrub${staticMotion ? " is-static" : ""}`} id="perspective" aria-label="Notes from the pilot">
    <div className="scrit-scrub-stage"><header className="scrit-editorial-head"><div><span className="scrit-kicker">NOTES FROM THE PILOT</span><h2>Understand the mechanism.</h2></div><a className="scrit-text-link" href="/proof">Explore proof of reserve <ArrowUpRight size={15} /></a></header>
      <div className="scrit-editorial-deck">{items.map((item, index) => <EditorialLayer key={item.label} item={item} index={index} progress={scrollYProgress} disabled={staticMotion} />)}</div>
    </div>
  </section>;
}

function EditorialLayer({ item, index, progress, disabled }: { item: { label: string; title: string; action: string; href: string; image: string }; index: number; progress: MotionValue<number>; disabled: boolean }) {
  const starts = [.02, .36, .70][index];
  const ends = [.37, .72, 1][index];
  const x = useTransform(progress, [0, starts, Math.min(1, starts + .12), ends], ["64vw", "64vw", "0vw", index === 2 ? "0vw" : "-64vw"]);
  const opacity = useTransform(progress, [starts, Math.min(1, starts + .12), ends], [0, 1, index === 2 ? 1 : .15]);
  const pointerEvents = useTransform(progress, (value) => index === 0 ? (value < .36 ? "auto" : "none") : index === 1 ? (value >= .36 && value < .7 ? "auto" : "none") : (value >= .7 ? "auto" : "none"));
  return <motion.a href={item.href} className="scrit-editorial-scrub-card" style={disabled ? undefined : { x, opacity, zIndex: index + 1, pointerEvents }}><div className="scrit-editorial-scrub-image"><img src={item.image} alt="" loading="lazy" decoding="async" /></div><span>{item.label}</span><h3>{item.title}</h3><b>{item.action} <ArrowUpRight size={14} /></b></motion.a>;
}

function ScrubMeter({ progress, disabled, labels }: { progress: MotionValue<number>; disabled: boolean; labels: string[] }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return <div className="scrit-scrub-meter"><div className="scrit-scrub-meter-labels">{labels.map((label) => <span key={label}>{label}</span>)}</div><div className="scrit-scrub-meter-track"><motion.span style={{ scaleX: disabled ? 1 : scaleX }} /></div><span className="scrit-scrub-meter-cue">SCROLL · SCRUB BACK TO REVERSE</span></div>;
}

"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { id: "01", label: "NAV INPUTS", title: "An estimate starts with inputs.", body: "Indicative NAV combines accepted custodian records across nine elements in five sleeves (heavy rare earths, magnet REEs, PGMs, battery, monetary ballast) with commodity prices. A verifiable estimate, not an algorithmic peg.", signal: "INPUTS", detail: "RECORDED MASS + COMMODITY PRICES", image: "/images/scrit_nav_inputs_matrix.jpg" },
  { id: "02", label: "FRESHNESS", title: "Every price carries an age.", body: "Prices are updated from institutional sources. The interface flags records older than 24 hours so data freshness stays fully transparent beside the NAV estimate.", signal: "24H", detail: "STALE PRICE THRESHOLD", image: "/images/scrit_clock_feed.jpg" },
  { id: "03", label: "PROJECT POOL FEES", title: "Show the fee before the swap.", body: "Mainnet TOKEN/sCRIT pools charge a 2.5% trading tax through the Uniswap V4 hook. 75% routes directly to the treasury to fund stockpile accessions, 25% to operations.", signal: "2.5%", detail: "MAINNET V4 PROJECT POOLS", image: "/images/scrit_treasury_fee_split.jpg" },
  { id: "04", label: "MARKET DYNAMICS", title: "Market price can diverge.", body: "sCRIT is an asset-indexed token, not a synthetic peg. Every Rail A token pair trades freely against sCRIT, with liquidity paired with the sCRIT stockpile index.", signal: "RAIL A", detail: "FREE FLOATING AMM POOLS", image: "/images/scrit_market_dynamics_depth.jpg" },
];

export function PinnedFlowRail() {
  const section = useRef<HTMLElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(0);
  const [compact, setCompact] = useState(false);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -travel]);
  const progress = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const active = useTransform(scrollYProgress, (value) => STEPS[Math.min(STEPS.length - 1, Math.floor(value * STEPS.length))].label);

  useEffect(() => {
    const measure = () => {
      if (!viewport.current || !track.current) return;
      setCompact(window.matchMedia("(max-width: 760px)").matches);
      setTravel(Math.max(0, track.current.scrollWidth - viewport.current.clientWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (viewport.current) observer.observe(viewport.current);
    if (track.current) observer.observe(track.current);
    window.addEventListener("resize", measure);
    const query = window.matchMedia("(max-width: 760px)");
    query.addEventListener("change", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); query.removeEventListener("change", measure); };
  }, []);

  return (
    <section ref={section} className={`scrit-rail-chapter${reduceMotion || compact ? " is-static" : ""}`} aria-label="How to read the sCRIT pilot">
      <div className="scrit-rail-stage">
        <header className="scrit-rail-heading">
          <div><span className="scrit-kicker">THE PILOT, IN FOUR SIGNALS</span><h2>Follow the inputs. <em>Keep the limits in view.</em></h2></div>
          <div className="scrit-rail-readout"><span>SCROLL POSITION</span><motion.b>{active}</motion.b><span>FOLLOW THE RAIL WITH SCROLL</span></div>
        </header>
        <div className="scrit-rail-viewport" ref={viewport}>
          <motion.div className="scrit-rail-track" ref={track} style={{ x: reduceMotion || compact ? 0 : x }}>
            {STEPS.map((step) => (
              <article className="scrit-rail-card" key={step.id}>
                <div className="scrit-rail-card-copy"><span className="scrit-kicker">{step.label}</span><h3>{step.title}</h3><p>{step.body}</p><span className="scrit-rail-card-index">PILOT FIELD GUIDE</span></div>
                <div className="scrit-rail-visual">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={step.image} alt="" loading="lazy" decoding="async" />
                  <span className="scrit-rail-signal">{step.signal}</span>
                  <span className="scrit-rail-detail">{step.detail}</span>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
        <div className="scrit-rail-footer"><span>SCROLL TO MOVE / REVERSE TO REVISIT</span><div className="scrit-rail-progress"><motion.span style={{ scaleX: reduceMotion || compact ? 1 : progress }} /></div><span>NO PEG · NO PILOT REDEMPTION</span></div>
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { id: "01", label: "NAV INPUTS", title: "An estimate starts with inputs.", body: "Indicative NAV combines accepted off-chain batch records with manual commodity prices, then divides by configured pilot supply. It is not a market quote or redemption value.", signal: "INPUTS", detail: "RECORDED MASS + MANUAL PRICES", image: "/images/scrit_assay_lab.jpg" },
  { id: "02", label: "FRESHNESS", title: "Every price carries an age.", body: "Prices are entered manually. The interface marks records older than 24 hours as stale so data age stays visible beside the estimate.", signal: "24H", detail: "STALE PRICE THRESHOLD", image: "/images/scrit_clock_feed.jpg" },
  { id: "03", label: "PROJECT POOL FEES", title: "Show the fee before the swap.", body: "Mainnet TOKEN/sCRIT pools charge 2.5% through the V4 hook. The split is 75% reserve treasury and 25% operations. Testnet V3 rehearsal pools remain untaxed.", signal: "2.5%", detail: "MAINNET PROJECT POOLS", image: "/images/scrit_treasury_safe.jpg" },
  { id: "04", label: "MARKET", title: "Market price can diverge.", body: "sCRIT is not pegged and has no pilot redemption. Without a redemption path, market price can move independently from indicative NAV.", signal: "NO PEG", detail: "NO PILOT REDEMPTION", image: "/images/scrit_trading_floor.jpg" },
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
          <div><span className="scrit-kicker">THE PILOT, IN FOUR SIGNALS</span><h2>Follow the inputs.<br /><em>Keep the limits in view.</em></h2></div>
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

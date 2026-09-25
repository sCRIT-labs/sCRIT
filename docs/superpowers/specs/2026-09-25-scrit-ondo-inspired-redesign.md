# sCRIT Ondo-Inspired Frontend Redesign

## Goal

Redesign the sCRIT landing page and all customer-facing/operations frontend routes around the editorial hierarchy and scroll-led storytelling of ondo.finance, while preserving sCRIT's actual pilot scope and leaving the existing hero section intact.

## Reference Translation

- Keep the familiar sequence of announcement, navigation, hero, latest updates, product showcase, long-form metrics, trust, technology, ecosystem, editorial content, and footer.
- Translate Ondo's clean institutional presentation into sCRIT's material vocabulary: warm assay paper, graphite ink, bullion gold, precise grid lines, and large editorial typography.
- Retain the current sCRIT image assets and use responsive crops and overlays instead of adding new image dependencies.
- Use automatic scroll progress and passive looping details for storytelling. Avoid requiring clicks through product tabs or testimonial carousels to understand the page.

## Page Architecture

1. Preserve `HeroScroll` markup, behavior, and image unchanged. The existing announcement and navigation may be visually redesigned around it.
2. Rebuild the post-hero landing content as an editorial product story: dispatches, pilot product overview, a pinned reserve journey, a live-data ledger/terminal, trust and disclosure, the two-pool model, research cards, and a useful footer.
3. Redesign `/launch`, `/proof`, `/admin`, and `/legal/[doc]` so navigation, typography, surface styles, responsive behavior, and forms feel like the same product.
4. Keep existing API calls and wallet/form behavior where already implemented. Do not expand backend or contract behavior as part of a frontend redesign.

## Motion System

- Use long sticky chapters with scroll progress driving stage transitions. Progress must naturally scrub in both directions when the user reverses scrolling.
- Use Framer Motion `useScroll`/`useTransform` for per-section parallax, scroll-linked progress, and reversible pinned choreography, with existing IntersectionObserver entrance reveals, with CSS and IntersectionObserver fallbacks.
- Honor `prefers-reduced-motion` by disabling or flattening continuous and scroll-driven motion while keeping all content visible.
- Keep content readable if JavaScript or scroll-timeline support is unavailable.
- Use automatic active states for narratives. Manual controls remain only where they perform a real task, such as form inputs, navigation, and launch confirmations.

## Copy and Data Integrity

- Use `devbriefsCRIT.md` and `docs/decisions.md` as the authority for product statements.
- State that the pilot basket target is Au 60%, Ag 25%, Pt 15%; lithium and Rail B are unavailable; sCRIT is not pegged and has no pilot redemption.
- State that project-pool swap tax is 0% in the pilot. The 2.5% target and 75/25 split may only appear as clearly labeled future/simulation material.
- Do not present illustrative TVL, holder counts, fabricated partner quotes, vault agreements, automatic metal purchases, or on-chain reserve state as live facts.
- Preserve dynamic API data where available and clearly label demo/manual/simulated values.

## Quality Bar

- Responsive across narrow mobile, tablet, and desktop widths; no horizontal overflow from pinned scenes.
- Strong semantic headings, keyboard-operable controls, visible focus states, useful image alternative text, and reduced-motion support.
- Preserve existing functionality in launch, proof, admin, and legal routes while improving hierarchy and empty/loading/error presentation.
- Preserve the current hero section and all existing image assets.

## Follow-up: Scroll Depth and Route Width

- Increase the landing page's scroll-driven storytelling with at least two distinct pinned chapters, reversible scene scrubbing, image parallax, and scroll-linked composition/progress details. Avoid making every section animate the same way.
- Make the second pinned chapter a measured horizontal rail/conveyor, distinct from the reserve chapter's scene transitions. Keep its cards in document order on small screens and for reduced motion.
- Make every post-hero content section a pinned scroll-scrub story, using varied compositions: stacked cards, image wipe, scene sequence, horizontal rail, telemetry reveal, disclosure stack, launch wipe, allocation bars, and editorial deck.
- Keep ordinary section content in document order on small screens and for reduced motion; use static layouts when JavaScript or scroll-linked motion is unavailable.
- Use Framer Motion for the measured rail and reusable scroll-linked section components; do not add GSAP.
- Give all sub-routes one shared outer content measure aligned to the landing page grid. Keep narrower text measure only for readable copy blocks, not route-level containers.
- Retain existing page functionality and do not modify `HeroScroll`.

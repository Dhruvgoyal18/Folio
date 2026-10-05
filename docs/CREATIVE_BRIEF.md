# Creative brief: Mission Log DG-01

The full, approved brief lives in the shared doc **"Mission Log DG-01 — Creative Brief"** on claude.ai. It covers the concept options, art direction, storyboard, motion language, architecture, resume flags and milestones. This file records the decisions as built.

- **Concept:** Mission control printed on warm drafting paper (light-first, with a "night ops" dark theme).
- **Chapters:** 00 Boot · 01 Launch (hero + constellation collapse) · 02 Telemetry · 03 Trajectory · 04 Payload · 05 Missions · 06 Ground training & honors · 07 Comms · ∞ CAPCOM.
- **Palette:** paper #F3EEE4 / ink #1A1712 / signal #D9481A (large type and graphics) / signal-ink #B23A12 (small text, fills) / teal #1F5F5B. Dark mode uses #13110E / #EFE8DA / #FF6B3D / #5FB8AE.
- **Type:** Bricolage Grotesque (display), Instrument Sans (text), JetBrains Mono (data), on a fluid scale from 1.2 to 1.333.
- **Motion tokens:** see `src/design/motion.ts` and the `/design-system` page.

## Owner decisions (2026-10-03)

- Approved the recommended concept and asked for the full build without per-milestone stops.
- The Reddit persona-accounts bullet is shown with softened wording; the original is kept in `resume.json` under `original`.
- The phone number is shown in Comms.
- The NUS (Jun–Jul 2026) and Zolve (Sep 2025–Present) dates are correct as overlapping.
- Hosting is Cloudflare (free tier).

## Changes from the brief during the build

- **GSAP → `position: sticky` ScrollScene.** Pinned scenes behave the same, but the bundle is 44 KB smaller with no DOM re-parenting. This was needed to meet the mobile performance budget.
- **WebGL is a progressive upgrade.** The SVG constellation performs the same collapse and is the default on touch and low-power devices. WebGL loads on intent on desktop and steps down automatically if frames drop.
- **shadcn/ui → Radix primitives directly.** These are the same primitives shadcn is built on, styled with this design system's tokens.

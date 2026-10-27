---
name: premium-ui
description: Designs and audits premium responsive developer-tool interfaces for RepoMedic, including incident timelines, code diffs, proof-of-fix evidence, and visual accessibility.
---

# Premium UI — RepoMedic

Apply when implementing or reviewing frontend designs. Refer to PRD section 6.

1. Start with visual system: Graphite `#0B1017`, surface `#111923`, elevated `#182331`, text `#F2F7FB`, muted `#9EB0C1`, accent cyan `#28C8DB`/teal `#21BD9D`, warning amber, failure coral. Check accessible text contrast rather than copying colors blindly.
2. Typography: Geist Sans headings/body and Geist Mono for commands, SHAs, paths and stack traces. Distinct 12-column grid, 8px spacing rhythm, 12–16px radii, restrained borders.
3. Make original interfaces (not visual copies): navigation, purposeful hero, layered incident event rail, code diff with line numbers, before/after verification cards, filterable activity log, review drawer.
4. Every action is functional and truthfully labeled. Never animate fabricated execution. Explain live vs recorded sample.
5. All components have hover/focus/disabled/loading/error/success states. Responsiveness at 390, 768, 1440px. Test keyboard navigation, icons with labels, semantic headings and reduced motion.
6. Avoid huge gradient blobs, forced glassmorphism, random charts, arbitrary KPI numbers, excess neon, or fake testimonials.
7. Capture actual screenshots after the page runs and fix clipping, spacing, contrast, and empty states before claiming polish.

**Done when:** UI makes the engineering evidence immediately understandable, without sacrificing accessibility or correctness.

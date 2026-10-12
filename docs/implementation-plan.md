# B-Bad 2026 Implementation Plan

> **For agentic workers:** Implement inline using superpowers:executing-plans and test-driven-development. Preserve the unrelated parent checkout.

**Goal:** Deliver a usable single-computer badminton tournament desk on GitHub Pages.

**Architecture:** A pure tournament model controls a static UI. All data stays in the browser with validated JSON backups. Publish this independent project only.

**Tech Stack:** Native HTML, CSS, JavaScript ES modules; Node built-in test runner; Playwright for browser verification.

**Spec:** docs/design.md

## Global Constraints

- Fixed nine-player Vietnamese roster and eight-match graph from the reference.
- No random allocation; the bye is a manual slot.
- One-set integer scores, no ties, no hard-coded winning threshold.
- One MacBook, local persistence, GitHub Pages static hosting.
- Do not change the parent PES project or its outstanding changes.

## Review Focus

- Changing an early winner invalidates only dependent results.
- Invalid/imported data cannot introduce duplicate or unknown players or impossible winners.
- Refresh and undo preserve locked draw and scores.
- Safari-compatible click placement, dialogs and animation, including reduced motion.
- Unavailable localStorage does not claim a successful save.

### Task 1: Tournament model

**Files:** core.js, tests/core.test.mjs, package.json.

**Interfaces:** newTournament(), placePlayer(state, playerId, slot), lockDraw(state), reopenDraw(state), getMatch(state, matchId), recordScore(state, matchId, a, b), clearScore(state, matchId), dependentResults(state, matchId), validateTournament(data); pure functions returning new state.

- [x] Write behavioral tests for allocation, duplicate/swap handling, all eight matches, corrections and imports.
- [x] Run tests and observe missing implementation.
- [x] Implement pure model; run full model suite until green.

### Task 2: Operating UI

**Files:** index.html, styles.css, app.js, favicon.svg.

**Interfaces:** consumes core model only; renders roster, SVG links and match cards; sends manual placement/scoring actions.

- [x] Build roster, bracket, scoring dialog and draw locking.
- [x] Add animations, undo, backup import/export, persistence status and projection controls.
- [x] Verify browser flow from nine manual placements through eight matches and refresh; test import, correction, reduced motion and narrow viewport.

### Task 3: Delivery

**Files:** scripts/serve.cjs, scripts/github-pages.py, README.md, .gitignore, .nojekyll.

- [x] Run model tests and browser verification, inspect desktop screenshot.
- [x] Review complete project; fix observed defects.
- [x] Initialize isolated repository, commit reviewed project, create/push dedicated GitHub repo and enable Pages.
- [x] Check deployed assets/site; provide MacBook link and backup instructions.

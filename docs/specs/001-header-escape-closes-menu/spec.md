# 001 — Escape closes the mobile menu

| Field | Value |
| --- | --- |
| Status | Draft — awaiting review |
| Origin | `docs/tasks/tasks.md` #34 (verified still open: `header.ts` only listens to `window:resize`) |
| App | `ui` |
| Scope | Public header, mobile layout (≤ 768 px) |

## 1. Problem

On a narrow viewport the header nav is a slide-in panel opened by the burger button
(`aria-expanded` already reflects its state). A keyboard or screen-reader user who opens it has
no conventional way to dismiss it: the only exits are the burger button, the backdrop (pointer),
or following a link. WAI-ARIA authoring practice expects `Escape` to close a disclosure
that overlays the page, and returns focus to its trigger.

## 2. Goals

- G1. Pressing `Escape` while the menu is open closes it.
- G2. After closing via `Escape`, keyboard focus lands on the burger button, so the user does
  not lose their place in the tab order.

## 3. Non-goals

- Focus trapping inside the open menu.
- Changing the menu's visuals, animation, breakpoint or markup structure.
- Any behaviour on desktop (> 768 px), where the nav is always visible.
- Closing on outside click or swipe (the backdrop already covers pointer users).

## 4. Acceptance criteria

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC1 | Mobile viewport, menu open | User presses `Escape` | Menu closes (nav leaves the viewport) and burger `aria-expanded` is `false` |
| AC2 | Mobile viewport, menu open | User presses `Escape` | Focus is on the burger button |
| AC3 | Menu closed | User presses `Escape` | Nothing changes; focus is not moved |
| AC4 | Menu open, focus anywhere on the page | User presses `Escape` | Same result as AC1 (the handler is document-level, not tied to the focused element) |
| AC5 | Desktop viewport | User presses `Escape` | No visible change, no errors |
| AC6 | Server-side render | Page is rendered on the server | No reference to `document`/`window` is evaluated; SSR output is unchanged |

## 5. Constraints (from repo rules)

- Zoneless app: state change must go through the existing `isMenuOpen` signal.
- SSR-safe: any focus call must run browser-only (`isPlatformBrowser` or equivalent).
- No new i18n keys are expected (the burger's accessible name already exists). If the
  implementation turns out to need one, it must be added to both `ua.json` and `en.json`.
- Lint and Prettier must pass; edits carry `// CHANGED:` markers.

## 6. Verification

- One Playwright scenario, added to `ui/e2e/specs/mobile-nav.spec.ts` (the suite cap is
  12 tests, 6 today): open the menu, press `Escape`, assert the nav is out of the viewport
  (`toBeInViewport`, as the existing test explains) and the burger has focus. Covers AC1, AC2.
- AC3, AC5 and AC6 are covered by existing behaviour plus `npm run verify` (SSR build);
  no extra test unless review asks for one.

## 7. Open questions

1. AC2 — should focus return to the burger always, or only when focus was inside the nav?
   Proposed default: always, since the burger is the trigger that opened the menu.
2. Is a dedicated unit spec wanted for `header.ts`, or is the single e2e scenario enough?
   Proposed default: e2e only (the repo has two unit specs and no component-test setup for the header).

# 001 — Plan

Spec: [spec.md](./spec.md). Open questions resolved: focus always returns to the burger; e2e only, no unit spec.

## Design

All changes are in `ui/src/app/layout/header/header.ts` plus one e2e scenario.

- Template: add a `#burger` reference on the existing burger `<button>`.
- Class: `viewChild<ElementRef<HTMLButtonElement>>('burger')` (signal query, matches the signals-first rule).
- Handler: `@HostListener('document:keydown.escape')` next to the existing `window:resize` listener.
  - Menu closed → return immediately (AC3, AC5: the menu can never be open on desktop because `onResize` closes it).
  - Menu open → `closeMenu()`, then `burger()?.nativeElement.focus()` (AC1, AC2, AC4).
- SSR (AC6): host listeners are attached only in the browser and the handler runs only on a key event,
  so no `isPlatformBrowser` check is needed. Nothing is read from `document` at render time.
- No i18n keys, no style or markup changes beyond the template reference.

## Rejected alternatives

- Per-element `(keydown.escape)` on the nav: fails AC4 when focus is on the burger or elsewhere.
- Focus trap / CDK overlay: explicitly out of scope (spec §3).

## Risks

- Focusing the burger while it is CSS-hidden is a no-op; harmless.
- `ariaCurrentWhenActive`, `routerLinkActive` and `closeMenu()` on links are untouched.

## Verification

`npm run verify` in `ui/`, plus the new Playwright scenario in `e2e/specs/mobile-nav.spec.ts`
(suite stays at 7 tests, under the cap of 12).

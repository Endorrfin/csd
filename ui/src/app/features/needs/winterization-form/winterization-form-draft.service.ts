// ui/src/app/features/needs/winterization-form/winterization-form-draft.service.ts
// === ADDED: PR-W2 localStorage draft for the Winterization form. Same
// requirement as Recovery — applicants fill the form during power/connectivity
// outages, so a local draft is persisted (never files) and offered for restore.
// All access is SSR-guarded via isPlatformBrowser (ui/CLAUDE.md — no raw
// localStorage). Separate key from the Recovery draft so the two never clash. ===
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { WinterizationDraft } from './winterization-form.interfaces';

const DRAFT_KEY = 'csd-winterization-draft-v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable({ providedIn: 'root' })
export class WinterizationFormDraftService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Persist a snapshot of the raw form value. Best-effort — never throws. */
  save(value: Record<string, unknown>): void {
    if (!this.isBrowser) return;
    try {
      const draft: WinterizationDraft = {
        version: 1,
        savedAt: Date.now(),
        value,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // quota exceeded / private mode — draft is a nicety, not a hard requirement
    }
  }

  /** Return a valid, non-expired draft or null (self-heals on corrupt/expired data). */
  load(): WinterizationDraft | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as WinterizationDraft;
      const invalid =
        !draft ||
        draft.version !== 1 ||
        typeof draft.savedAt !== 'number' ||
        typeof draft.value !== 'object';
      if (invalid || Date.now() - draft.savedAt > TTL_MS) {
        this.clear();
        return null;
      }
      return draft;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore — nothing to recover from a failed removal
    }
  }
}

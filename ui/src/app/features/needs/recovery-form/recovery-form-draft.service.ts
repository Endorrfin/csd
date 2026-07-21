// ui/src/app/features/needs/recovery-form/recovery-form-draft.service.ts
// === ADDED: PR-3 localStorage draft for the Recovery form. Requirement from
// ТЗ — applicants often fill the form during power/connectivity outages, so we
// persist a draft locally (never files) and offer to restore it. All access is
// SSR-guarded via isPlatformBrowser (see ui/CLAUDE.md — no raw localStorage). ===
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RecoveryDraft } from './recovery-form.interfaces';

const DRAFT_KEY = 'csd-recovery-draft-v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

@Injectable({ providedIn: 'root' })
export class RecoveryFormDraftService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Persist a snapshot of the raw form value. Best-effort — never throws. */
  save(value: Record<string, unknown>): void {
    if (!this.isBrowser) return;
    try {
      const draft: RecoveryDraft = { version: 1, savedAt: Date.now(), value };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // quota exceeded / private mode — draft is a nicety, not a hard requirement
    }
  }

  /** Return a valid, non-expired draft or null (self-heals on corrupt/expired data). */
  load(): RecoveryDraft | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw) as RecoveryDraft;
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

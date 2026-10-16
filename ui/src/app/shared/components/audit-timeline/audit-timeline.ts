// === ADDED: spec 003 — read-only status history for the five audited admin records ===
import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LanguageService } from '../../../core/services/language.service';

/** Entity types the backend accepts on `GET /api/audit-log/:entityType/:entityId`. */
export type AuditedEntityType = 'procurement' | 'vacancy' | 'testimonial' | 'complaint' | 'inquiry';

export type AuditAction = 'created' | 'status_changed' | 'updated' | 'deleted';

/** One entry as returned by the API. It carries no user id and no free text from the record. */
export interface AuditEntry {
  id: string;
  action: AuditAction;
  oldValue: string | null;
  newValue: string | null;
  changedByEmail: string | null;
  createdAt: string;
  details: { status?: string; notesChanged?: boolean } | null;
}

interface TimelineRow {
  id: string;
  action: AuditAction;
  createdAt: string;
  actor: string | null;
  oldLabel: string | null;
  newLabel: string | null;
  note: string | null;
  extra: string | null;
}

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Chronological history of one record (newest first, as the API returns it).
 *
 * Failure is contained on purpose (spec AC23): a failed or slow request only changes this
 * section's own state and offers a retry; it never throws into the host page.
 *
 * Every value is rendered through interpolation, never `innerHTML`.
 */
@Component({
  selector: 'app-audit-timeline',
  standalone: true,
  imports: [DatePipe, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="audit" [attr.aria-label]="'auditTimeline.title' | translate">
      <h3 class="audit__title">{{ 'auditTimeline.title' | translate }}</h3>

      @switch (state()) {
        @case ('loading') {
          <p class="audit__state" role="status">{{ 'common.loading' | translate }}</p>
        }
        @case ('error') {
          <div class="audit__state audit__state--error" role="alert">
            <span>{{ 'auditTimeline.error' | translate }}</span>
            <button type="button" class="audit__retry" (click)="retry()">
              {{ 'auditTimeline.retry' | translate }}
            </button>
          </div>
        }
        @default {
          @if (rows().length === 0) {
            <p class="audit__state">{{ 'auditTimeline.empty' | translate }}</p>
          } @else {
            <ol class="audit__list">
              @for (row of rows(); track row.id) {
                <li class="audit__item" [attr.data-action]="row.action">
                  <div class="audit__head">
                    <span class="audit__badge" [attr.data-action]="row.action">
                      {{ 'auditTimeline.action.' + row.action | translate }}
                    </span>
                    <time class="audit__time" [attr.datetime]="row.createdAt">
                      {{ row.createdAt | date: 'dd.MM.yyyy HH:mm:ss' }}
                    </time>
                  </div>
                  <div class="audit__actor">
                    <span>{{ 'auditTimeline.actor' | translate }}:</span>
                    <strong>{{
                      row.actor ?? ('auditTimeline.publicSubmission' | translate)
                    }}</strong>
                  </div>
                  @if (row.oldLabel !== null && row.newLabel !== null) {
                    <div class="audit__diff">
                      <span class="audit__old">{{ row.oldLabel }}</span>
                      <span aria-hidden="true">→</span>
                      <span class="audit__new">{{ row.newLabel }}</span>
                    </div>
                  }
                  @if (row.note) {
                    <p class="audit__note">{{ row.note }}</p>
                  }
                  @if (row.extra) {
                    <p class="audit__note">{{ row.extra }}</p>
                  }
                </li>
              }
            </ol>
          }
        }
      }
    </section>
  `,
  styles: [
    `
      .audit {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
      }
      .audit__title {
        margin: 0 0 0.75rem;
        font-size: 1rem;
      }
      .audit__state {
        margin: 0;
        font-size: 0.85rem;
        color: #64748b;
      }
      .audit__state--error {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        color: #991b1b;
      }
      .audit__retry {
        padding: 0.25rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        background: #fff;
        cursor: pointer;
      }
      .audit__list {
        position: relative;
        list-style: none;
        margin: 0;
        padding: 0 0 0 1.5rem;
      }
      .audit__list::before {
        content: '';
        position: absolute;
        left: 0.4rem;
        top: 0.5rem;
        bottom: 0.5rem;
        width: 2px;
        background: #e2e8f0;
      }
      .audit__item {
        position: relative;
        margin-bottom: 0.75rem;
        padding: 0.65rem 0.9rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
      }
      .audit__item::before {
        content: '';
        position: absolute;
        left: -1.45rem;
        top: 0.9rem;
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #cbd5e0;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px #e2e8f0;
      }
      .audit__item[data-action='created']::before {
        background: #38a169;
      }
      .audit__item[data-action='updated']::before {
        background: #3182ce;
      }
      .audit__item[data-action='status_changed']::before {
        background: #d69e2e;
      }
      .audit__item[data-action='deleted']::before {
        background: #e53e3e;
      }
      .audit__head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-bottom: 0.35rem;
      }
      .audit__badge {
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        background: #e2e8f0;
        color: #334155;
      }
      .audit__badge[data-action='created'] {
        background: #d1fae5;
        color: #065f46;
      }
      .audit__badge[data-action='updated'] {
        background: #dbeafe;
        color: #1e40af;
      }
      .audit__badge[data-action='status_changed'] {
        background: #fef3c7;
        color: #92400e;
      }
      .audit__badge[data-action='deleted'] {
        background: #fee2e2;
        color: #991b1b;
      }
      .audit__time {
        font-size: 0.75rem;
        color: #64748b;
        font-variant-numeric: tabular-nums;
      }
      .audit__actor {
        font-size: 0.8rem;
        color: #64748b;
        overflow-wrap: anywhere;
      }
      .audit__actor strong {
        color: #1e293b;
        font-weight: 500;
      }
      .audit__diff {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-wrap: wrap;
        margin-top: 0.4rem;
        font-size: 0.85rem;
      }
      .audit__old {
        padding: 0.1rem 0.45rem;
        border-radius: 4px;
        background: #fee2e2;
        color: #991b1b;
        text-decoration: line-through;
      }
      .audit__new {
        padding: 0.1rem 0.45rem;
        border-radius: 4px;
        background: #d1fae5;
        color: #065f46;
      }
      .audit__note {
        margin: 0.4rem 0 0;
        font-size: 0.8rem;
        color: #475569;
      }
    `,
  ],
})
export class AuditTimelineComponent {
  readonly entityType = input.required<AuditedEntityType>();
  readonly entityId = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly state = signal<LoadState>('loading');
  private readonly entries = signal<AuditEntry[]>([]);
  private readonly attempt = signal(0);

  /** Re-derived on every language switch, because labels are looked up imperatively. */
  protected readonly rows = computed<TimelineRow[]>(() => {
    this.language.lang();
    const type = this.entityType();
    return this.entries().map((e) => this.toRow(type, e));
  });

  constructor() {
    // Admin pages can be server-rendered; the history endpoint needs the browser's JWT,
    // so the request is made in the browser only.
    if (!this.isBrowser) return;

    toObservable(
      computed(() => ({
        type: this.entityType(),
        id: this.entityId(),
        attempt: this.attempt(),
      })),
    )
      .pipe(
        tap(() => this.state.set('loading')),
        // switchMap cancels an in-flight request when the record or the attempt changes,
        // so a slow response for a previous record can never overwrite the current one.
        switchMap(({ type, id }) =>
          this.api.get<AuditEntry[]>(`audit-log/${type}/${encodeURIComponent(id)}`).pipe(
            map((rows) => ({ ok: true as const, rows })),
            catchError(() => of({ ok: false as const, rows: [] as AuditEntry[] })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.entries.set(result.rows);
        this.state.set(result.ok ? 'ready' : 'error');
      });
  }

  protected retry(): void {
    this.attempt.update((n) => n + 1);
  }

  private toRow(type: AuditedEntityType, e: AuditEntry): TimelineRow {
    const isStatusChange = e.action === 'status_changed';
    let note: string | null = null;
    let extra: string | null = null;

    if (e.action === 'created' && e.details?.status) {
      note = `${this.t('auditTimeline.initialStatus')}: ${this.statusLabel(type, e.details.status)}`;
    } else if (e.action === 'deleted' && e.details?.status) {
      note = `${this.t('auditTimeline.statusAtDeletion')}: ${this.statusLabel(type, e.details.status)}`;
    } else if (e.action === 'updated' && e.details?.notesChanged) {
      note = this.t('auditTimeline.notesChanged');
    }
    if (isStatusChange && e.details?.notesChanged) {
      extra = this.t('auditTimeline.notesAlsoChanged');
    }

    return {
      id: e.id,
      action: e.action,
      createdAt: e.createdAt,
      actor: e.changedByEmail,
      oldLabel: isStatusChange ? this.statusLabel(type, e.oldValue) : null,
      newLabel: isStatusChange ? this.statusLabel(type, e.newValue) : null,
      note,
      extra,
    };
  }

  /** Same localised labels the rest of the admin uses; falls back to the raw value. */
  private statusLabel(type: AuditedEntityType, value: string | null): string {
    if (!value) return '';
    const key = `${type}.status.${value}`;
    const label = this.translate.instant(key) as string;
    return label === key ? value : label;
  }

  private t(key: string): string {
    return this.translate.instant(key) as string;
  }
}

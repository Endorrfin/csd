// ui/src/app/features/admin/complaints/complaint-drawer.ts
import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ComplaintItem } from '../../cooperation/complaint/complaint.interfaces';

/**
 * Right-side drawer showing full complaint details.
 * All PII (phone, email) is always shown here — user explicitly clicked into detail.
 * Escape key + backdrop click close the drawer.
 */
@Component({
  selector: 'app-complaint-drawer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="drawer-overlay" (click)="close.emit()"></div>
    <aside class="drawer" role="dialog">
      <div class="drawer-header">
        <h3>
          {{ isUa ? 'Деталі скарги' : 'Complaint details' }}
          <span class="drawer-status" [attr.data-status]="item.status">
            {{ 'complaint.status.' + item.status | translate }}
          </span>
        </h3>
        <button type="button" class="drawer-close" (click)="close.emit()" aria-label="Close">✕</button>
      </div>

      <div class="drawer-body">
        <!-- Meta -->
        <section class="drawer-section">
          <div class="field">
            <label>{{ isUa ? 'Категорія' : 'Category' }}</label>
            <div>{{ 'complaint.category.' + item.category | translate }}</div>
          </div>
          <div class="field">
            <label>{{ isUa ? 'Створено' : 'Created' }}</label>
            <div>{{ item.createdAt | date:'dd.MM.yyyy HH:mm' }}</div>
          </div>
          @if (item.submittedAt && item.submittedAt !== item.createdAt) {
            <div class="field">
              <label>{{ isUa ? 'Дата події' : 'Incident date' }}</label>
              <div>{{ item.submittedAt | date:'dd.MM.yyyy' }}</div>
            </div>
          }
        </section>

        <!-- Description -->
        <section class="drawer-section">
          <label class="section-label">{{ isUa ? 'Опис' : 'Description' }}</label>
          <p class="text-block">{{ item.description }}</p>
        </section>

        <!-- Expected resolution -->
        @if (item.expectedResolution) {
          <section class="drawer-section">
            <label class="section-label">{{ isUa ? 'Очікуване вирішення' : 'Expected resolution' }}</label>
            <p class="text-block">{{ item.expectedResolution }}</p>
          </section>
        }

        <!-- Contact info (PII — always visible in drawer) -->
        @if (item.phone || item.email) {
          <section class="drawer-section">
            <label class="section-label">{{ isUa ? 'Контакти' : 'Contact' }}</label>
            @if (item.phone) {
              <div class="field">
                <label>{{ isUa ? 'Телефон' : 'Phone' }}</label>
                <div><a [href]="'tel:' + item.phone">{{ item.phone }}</a></div>
              </div>
            }
            @if (item.email) {
              <div class="field">
                <label>Email</label>
                <div><a [href]="'mailto:' + item.email">{{ item.email }}</a></div>
              </div>
            }
          </section>
        }

        <!-- Location -->
        @if (item.region) {
          <section class="drawer-section">
            <label class="section-label">{{ isUa ? 'Локація' : 'Location' }}</label>
            <div class="text-block">
              {{ formatLocation() }}
            </div>
          </section>
        }

        <!-- Attachments -->
        @if (item.attachments?.length) {
          <section class="drawer-section">
            <label class="section-label">
              {{ isUa ? 'Вкладення' : 'Attachments' }}
              ({{ item.attachments?.length }})
            </label>
            <ul class="attach-list">
              @for (a of item.attachments; track a.url) {
                <li>
                  <a [href]="a.url" target="_blank" rel="noopener noreferrer">
                    📎 {{ a.name || a.url }}
                  </a>
                </li>
              }
            </ul>
          </section>
        }

        <!-- Manager notes -->
        @if (item.managerNotes) {
          <section class="drawer-section drawer-notes">
            <label class="section-label">📝 {{ isUa ? 'Примітки менеджера' : 'Manager notes' }}</label>
            <p class="text-block">{{ item.managerNotes }}</p>
          </section>
        }
      </div>
    </aside>
  `,
  styles: [`
    .drawer-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,.35); z-index:999;
    }
    .drawer {
      position:fixed; top:0; right:0; bottom:0;
      width:min(560px, 95vw);
      background:#fff; z-index:1000;
      display:flex; flex-direction:column;
      box-shadow:-4px 0 16px rgba(0,0,0,.1);
      animation: slide-in .2s ease-out;
    }
    @keyframes slide-in {
      from { transform:translateX(100%); }
      to   { transform:translateX(0); }
    }

    .drawer-header {
      display:flex; justify-content:space-between; align-items:center;
      padding:1rem 1.5rem; border-bottom:1px solid #e2e8f0;
      flex-shrink:0;
    }
    .drawer-header h3 { margin:0; font-size:1.1rem; color:#1a365d; display:flex; align-items:center; gap:.75rem; }
    .drawer-status {
      font-size:.7rem; font-weight:600; text-transform:uppercase;
      padding:.2rem .55rem; border-radius:4px; letter-spacing:.02em;
    }
    .drawer-status[data-status="new"]       { background:#dbeafe; color:#1e40af; }
    .drawer-status[data-status="in_review"] { background:#fef3c7; color:#92400e; }
    .drawer-status[data-status="resolved"]  { background:#d1fae5; color:#065f46; }
    .drawer-status[data-status="closed"]    { background:#e2e8f0; color:#475569; }

    .drawer-close {
      width:32px; height:32px; border-radius:4px;
      background:transparent; border:1px solid #e2e8f0;
      color:#64748b; cursor:pointer; font-size:.9rem;
    }
    .drawer-close:hover { background:#f1f5f9; }

    .drawer-body {
      flex:1; overflow-y:auto;
      padding:1.5rem;
    }
    .drawer-section {
      margin-bottom:1.5rem;
      padding-bottom:1.25rem;
      border-bottom:1px solid #f1f5f9;
    }
    .drawer-section:last-child { border-bottom:none; padding-bottom:0; }

    .drawer-notes {
      background:#fffbeb;
      padding:1rem 1.25rem;
      border-radius:6px;
      border:1px solid #fbd38d;
      margin:1rem 0;
    }

    .section-label {
      display:block; font-size:.75rem; font-weight:600;
      text-transform:uppercase; letter-spacing:.03em;
      color:#64748b; margin-bottom:.5rem;
    }

    .field {
      display:flex; gap:.75rem; padding:.35rem 0;
      font-size:.85rem;
    }
    .field label {
      min-width:110px; color:#64748b; font-weight:500;
    }
    .field div { color:#1a365d; }
    .field a { color:#2b6cb0; text-decoration:none; }
    .field a:hover { text-decoration:underline; }

    .text-block {
      margin:0; font-size:.9rem; line-height:1.6; color:#334155;
      white-space:pre-wrap;
      word-break:break-word;
    }

    .attach-list {
      list-style:none; padding:0; margin:0;
      display:flex; flex-direction:column; gap:.4rem;
    }
    .attach-list a {
      color:#2b6cb0; font-size:.85rem; text-decoration:none;
      word-break:break-all;
    }
    .attach-list a:hover { text-decoration:underline; }
  `],
})
export class ComplaintDrawerComponent {
  @Input({ required: true }) item!: ComplaintItem;
  @Output() close = new EventEmitter<void>();

  private readonly translate = inject(TranslateService);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  // Close on Escape key — consistent with modal UX conventions
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  // Format location as "Region, District, Community, Settlement"
  formatLocation(): string {
    const parts = this.isUa
      ? [this.item.region, this.item.district, this.item.community, this.item.settlement]
      : [this.item.regionEn, this.item.districtEn, this.item.communityEn, this.item.settlementEn];
    return parts.filter((p): p is string => !!p).join(', ');
  }
}

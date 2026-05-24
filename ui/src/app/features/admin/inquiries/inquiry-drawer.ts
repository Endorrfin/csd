import { Component, EventEmitter, HostListener, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from '../../../core/services/language.service';
import { InquiryItem } from './inquiry.interfaces';

/**
 * Right-side drawer showing a full inquiry.
 * PII (name, email, phone, messenger) is always shown here — the manager
 * explicitly clicked into the detail. Escape / backdrop click close it.
 */
@Component({
  selector: 'app-inquiry-drawer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <button
      type="button"
      class="drawer-overlay"
      (click)="closed.emit()"
      aria-label="Close"
    ></button>
    <aside class="drawer" role="dialog">
      <div class="drawer-header">
        <h3>
          {{ isUa() ? 'Деталі звернення' : 'Inquiry details' }}
          <span class="drawer-status" [attr.data-status]="item.status">
            {{ 'inquiry.status.' + item.status | translate }}
          </span>
        </h3>
        <button type="button" class="drawer-close" (click)="closed.emit()" aria-label="Close">
          ✕
        </button>
      </div>

      <div class="drawer-body">
        <!-- Meta -->
        <section class="drawer-section">
          <div class="field">
            <span>{{ isUa() ? 'Тема' : 'Reason' }}</span>
            <div>
              {{ 'inquiry.reason.' + item.reason | translate }}
              @if (item.reason === 'other' && item.reasonOther) {
                — {{ item.reasonOther }}
              }
            </div>
          </div>
          <div class="field">
            <span>{{ isUa() ? 'Створено' : 'Created' }}</span>
            <div>{{ item.createdAt | date: 'dd.MM.yyyy HH:mm' }}</div>
          </div>
          <div class="field">
            <span>{{ isUa() ? 'Мова відповіді' : 'Reply language' }}</span>
            <div>{{ 'inquiry.lang.' + item.preferredLang | translate }}</div>
          </div>
        </section>

        <!-- Message -->
        <section class="drawer-section">
          <span class="section-label">{{ isUa() ? 'Повідомлення' : 'Message' }}</span>
          <p class="text-block">{{ item.message }}</p>
        </section>

        <!-- Contact info (PII — always visible in drawer) -->
        @if (item.name || item.email || item.phone || item.messengerHandle) {
          <section class="drawer-section">
            <span class="section-label">{{ isUa() ? 'Контакти' : 'Contact' }}</span>
            @if (item.name) {
              <div class="field">
                <span>{{ isUa() ? "Ім'я" : 'Name' }}</span>
                <div>{{ item.name }}</div>
              </div>
            }
            @if (item.email) {
              <div class="field">
                <span>Email</span>
                <div>
                  <a [href]="'mailto:' + item.email">{{ item.email }}</a>
                </div>
              </div>
            }
            @if (item.phone) {
              <div class="field">
                <span>{{ isUa() ? 'Телефон' : 'Phone' }}</span>
                <div>
                  <a [href]="'tel:' + item.phone">{{ item.phone }}</a>
                </div>
              </div>
            }
            @if (item.messengerHandle) {
              <div class="field">
                <span>{{ isUa() ? 'Месенджер' : 'Messenger' }}</span>
                <div>
                  @if (item.messengerType) {
                    {{ 'inquiry.messenger.' + item.messengerType | translate }}:
                  }
                  {{ item.messengerHandle }}
                </div>
              </div>
            }
          </section>
        }

        <!-- Consent -->
        <section class="drawer-section">
          <div class="field">
            <span>{{ isUa() ? 'Згода' : 'Consent' }}</span>
            <div>
              @if (item.consent) {
                {{ isUa() ? 'Так' : 'Yes' }}
              } @else {
                {{ isUa() ? 'Ні' : 'No' }}
              }
            </div>
          </div>
        </section>

        <!-- Manager notes -->
        @if (item.managerNotes) {
          <section class="drawer-section drawer-notes">
            <span class="section-label"
              >📝 {{ isUa() ? 'Примітки менеджера' : 'Manager notes' }}</span
            >
            <p class="text-block">{{ item.managerNotes }}</p>
          </section>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .drawer-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.35);
        z-index: 999;
        border: none;
        padding: 0;
        cursor: default;
      }
      .drawer {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(560px, 95vw);
        background: #fff;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        box-shadow: -4px 0 16px rgba(0, 0, 0, 0.1);
        animation: slide-in 0.2s ease-out;
      }
      @keyframes slide-in {
        from {
          transform: translateX(100%);
        }
        to {
          transform: translateX(0);
        }
      }
      .drawer-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        border-bottom: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .drawer-header h3 {
        margin: 0;
        font-size: 1.1rem;
        color: #1a365d;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }
      .drawer-status {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        letter-spacing: 0.02em;
      }
      .drawer-status[data-status='new'] {
        background: #dbeafe;
        color: #1e40af;
      }
      .drawer-status[data-status='read'] {
        background: #fef3c7;
        color: #92400e;
      }
      .drawer-status[data-status='replied'] {
        background: #d1fae5;
        color: #065f46;
      }
      .drawer-status[data-status='archived'] {
        background: #e2e8f0;
        color: #475569;
      }
      .drawer-close {
        width: 32px;
        height: 32px;
        border-radius: 4px;
        background: transparent;
        border: 1px solid #e2e8f0;
        color: #64748b;
        cursor: pointer;
        font-size: 0.9rem;
      }
      .drawer-close:hover {
        background: #f1f5f9;
      }
      .drawer-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
      }
      .drawer-section {
        margin-bottom: 1.5rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid #f1f5f9;
      }
      .drawer-section:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .drawer-notes {
        background: #fffbeb;
        padding: 1rem 1.25rem;
        border-radius: 6px;
        border: 1px solid #fbd38d;
        margin: 1rem 0;
      }
      .section-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        color: #64748b;
        margin-bottom: 0.5rem;
      }
      .field {
        display: flex;
        gap: 0.75rem;
        padding: 0.35rem 0;
        font-size: 0.85rem;
      }
      .field > span {
        min-width: 110px;
        color: #64748b;
        font-weight: 500;
      }
      .field div {
        color: #1a365d;
      }
      .field a {
        color: #2b6cb0;
        text-decoration: none;
      }
      .field a:hover {
        text-decoration: underline;
      }
      .text-block {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.6;
        color: #334155;
        white-space: pre-wrap;
        word-break: break-word;
      }
    `,
  ],
})
export class InquiryDrawerComponent {
  @Input({ required: true }) item!: InquiryItem;
  @Output() closed = new EventEmitter<void>();

  // Signal-based language (zoneless-safe) instead of translate.currentLang getter
  protected readonly isUa = inject(LanguageService).isUa;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}

// ui/src/app/features/contact/contact.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

interface ContactChannel {
  readonly key: 'PROCUREMENT' | 'VACANCY' | 'TESTIMONIAL' | 'COMPLAINT';
  readonly route: string;
  readonly icon: string;
}

type GuideItemKey = 'GENERAL' | 'TESTIMONIAL' | 'COMPLAINT' | 'VACANCY' | 'PROCUREMENT';

/**
 * Page «Contacts»
 *
 * roadmap живе тут, не в HTML — інакше backticks у HTML-коментарі
 * можуть обірвати template literal компонента.
 *
 * TODO (наступні ітерації):
 *  - Google Maps embed або Leaflet (узгодити з activity-map service).
 *  - QR-код (vCard / mailto) — згенерувати на бекенді або через qrcode.js.
 *  - Окремі картки контактів: media, donors, partnerships (дублікат primary-card).
 *  - Форма зв'язку → окремий backend-модуль `inquiry` (NestJS), reactive form у цьому компоненті.
 */

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  template: `
    <div class="contact-page">
      <header class="page-header">
        <h1>{{ 'CONTACT.PAGE.TITLE' | translate }}</h1>
        <p class="page-intro">{{ 'CONTACT.PAGE.INTRO' | translate }}</p>
      </header>

      <!-- ───── Primary contacts ───── -->
      <section class="contact-section" aria-labelledby="primary-heading">
        <h2 id="primary-heading">{{ 'CONTACT.PRIMARY.HEADING' | translate }}</h2>

        <address class="primary-card">
          <dl class="contact-list">
            <div class="contact-row">
              <dt>
                <span class="icon" aria-hidden="true">✉️</span>
                {{ 'CONTACT.PRIMARY.EMAIL_LABEL' | translate }}
              </dt>
              <dd>
                <a [href]="'mailto:' + email" class="contact-link">{{ email }}</a>
              </dd>
            </div>

            <div class="contact-row">
              <dt>
                <span class="icon" aria-hidden="true">👤</span>
                {{ 'CONTACT.PRIMARY.DIRECTOR_LABEL' | translate }}
              </dt>
              <dd>{{ 'CONTACT.PRIMARY.DIRECTOR_NAME' | translate }}</dd>
            </div>

            <div class="contact-row">
              <dt>
                <span class="icon" aria-hidden="true">📍</span>
                {{ 'CONTACT.PRIMARY.ADDRESS_LABEL' | translate }}
              </dt>
              <dd>{{ 'CONTACT.PRIMARY.ADDRESS_VALUE' | translate }}</dd>
            </div>

            <!-- TODO: коли зʼявиться телефон офісу — додати тут <div class="contact-row"> з CONTACT.PRIMARY.PHONE -->
            <!-- TODO: коли зʼявиться повна поштова адреса — розширити ADDRESS_VALUE або додати окремий рядок -->
            <!-- TODO: робочі години → CONTACT.PRIMARY.HOURS -->
          </dl>
        </address>
      </section>

      <!-- ───── Cooperation channels ───── -->
      <section class="contact-section" aria-labelledby="channels-heading">
        <h2 id="channels-heading">{{ 'CONTACT.CHANNELS.HEADING' | translate }}</h2>
        <p class="section-intro">{{ 'CONTACT.CHANNELS.INTRO' | translate }}</p>
      
        <div class="channels-grid">
          @for (ch of channels; track ch.key) {
            <a [routerLink]="ch.route" class="channel-card">
              <span class="channel-icon" aria-hidden="true">{{ ch.icon }}</span>
              <div class="channel-text">
                <div class="channel-title">
                  {{ 'CONTACT.CHANNELS.' + ch.key + '.TITLE' | translate }}
                </div>
                <div class="channel-desc">
                  {{ 'CONTACT.CHANNELS.' + ch.key + '.DESC' | translate }}
                </div>
              </div>
              <span class="channel-arrow" aria-hidden="true">→</span>
            </a>
          }
        </div>
      </section>

      <!-- ───── Social ───── -->
      <!-- ───── Social ───── -->
      <section class="contact-section" aria-labelledby="social-heading">
        <h2 id="social-heading">{{ 'CONTACT.SOCIAL.HEADING' | translate }}</h2>
      
        <div class="social-row">
          <a
            [href]="facebookUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="social-link"
          >
            <span aria-hidden="true">📘</span>
            {{ 'CONTACT.SOCIAL.FACEBOOK' | translate }}
          </a>
        </div>
      </section>

      <!-- ───── Guide / Instructions ───── -->
      <section class="contact-section" aria-labelledby="guide-heading">
        <h2 id="guide-heading">{{ 'CONTACT.GUIDE.HEADING' | translate }}</h2>
        <p class="section-intro">{{ 'CONTACT.GUIDE.INTRO' | translate }}</p>

        <ul class="guide-list">
          @for (key of guideItems; track key) {
            <li>{{ 'CONTACT.GUIDE.' + key | translate }}</li>
          }
        </ul>
      </section>

      <!-- ───── Privacy notice ───── -->
      <aside class="privacy-notice" aria-labelledby="privacy-heading">
        <h2 id="privacy-heading">
          <span aria-hidden="true">🔒</span>
          {{ 'CONTACT.PRIVACY.HEADING' | translate }}
        </h2>
        <p>{{ 'CONTACT.PRIVACY.BODY' | translate }}</p>
      </aside>
    </div>
  `,
  styles: [
    `
      .contact-page {
        max-width: 1024px;
        margin: 0 auto;
        padding: 2rem 1rem;
      }

      .page-header {
        margin-bottom: 2.5rem;
      }
      .page-header h1 {
        font-size: 2rem;
        font-weight: 700;
        color: #1a365d;
        margin: 0 0 0.75rem;
      }
      .page-intro {
        color: #475569;
        font-size: 1.05rem;
        line-height: 1.6;
        max-width: 720px;
      }

      .contact-section {
        margin-bottom: 3rem;
      }
      .contact-section h2 {
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
      }
      .section-intro {
        color: #475569;
        font-size: 0.95rem;
        margin: 0 0 1.25rem;
      }

      /* ───── Primary card ───── */
      .primary-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        font-style: normal; /* address default is italic — reset */
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
      }
      .contact-list {
        display: grid;
        gap: 1rem;
        margin: 0;
      }
      .contact-row {
        display: grid;
        grid-template-columns: 200px 1fr;
        gap: 1rem;
        align-items: baseline;
      }
      .contact-row dt {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: #475569;
        font-size: 0.95rem;
      }
      .contact-row dd {
        margin: 0;
        color: #1a365d;
        font-size: 1rem;
      }
      .icon {
        font-size: 1.1rem;
      }
      .contact-link {
        color: #2b6cb0;
        text-decoration: none;
        font-weight: 500;
      }
      .contact-link:hover {
        text-decoration: underline;
      }

      /* ───── Channels grid ───── */
      .channels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 1rem;
      }
      .channel-card {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        text-decoration: none;
        color: inherit;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        transition: border-color 0.15s ease, transform 0.15s ease;
      }
      .channel-card:hover {
        border-color: #2b6cb0;
        transform: translateY(-1px);
      }
      .channel-icon {
        font-size: 1.75rem;
        flex-shrink: 0;
      }
      .channel-text {
        flex: 1;
        min-width: 0;
      }
      .channel-title {
        font-weight: 600;
        color: #1a365d;
        font-size: 1rem;
        margin-bottom: 0.25rem;
      }
      .channel-desc {
        font-size: 0.85rem;
        color: #64748b;
        line-height: 1.4;
      }
      .channel-arrow {
        color: #94a3b8;
        font-size: 1.25rem;
        flex-shrink: 0;
      }

      /* ───── Social ───── */
      .social-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
      }
      .social-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.6rem 1rem;
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        color: #1a365d;
        font-weight: 500;
        text-decoration: none;
        transition: background 0.15s ease;
      }
      .social-link:hover {
        background: #e2e8f0;
      }

      /* ───── Guide list ───── */
      .guide-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 0.6rem;
      }
      .guide-list li {
        position: relative;
        padding-left: 1.5rem;
        line-height: 1.6;
        color: #2d3748;
      }
      .guide-list li::before {
        content: '✓';
        position: absolute;
        left: 0;
        top: 0;
        color: #2b6cb0;
        font-weight: 700;
      }

      /* ───── Privacy notice ───── */
      .privacy-notice {
        margin-top: 3rem;
        padding: 1.5rem;
        background: #f7fafc;
        border-left: 4px solid #2b6cb0;
        border-radius: 4px;
      }
      .privacy-notice h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.1rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.5rem;
        border-bottom: none;
        padding-bottom: 0;
      }
      .privacy-notice p {
        margin: 0;
        font-size: 0.9rem;
        color: #475569;
        line-height: 1.6;
      }

      /* ───── Responsive ───── */
      @media (max-width: 640px) {
        .page-header h1 {
          font-size: 1.6rem;
        }
        .contact-section h2 {
          font-size: 1.25rem;
        }
        .contact-row {
          grid-template-columns: 1fr;
          gap: 0.25rem;
        }
        .contact-row dt {
          font-size: 0.85rem;
        }
        .channels-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class ContactComponent {
  // константи в класі — single source of truth, не в i18n (це не переклади)
  readonly email = 'office.ua.csd@gmail.com';
  readonly facebookUrl = 'https://www.facebook.com/profile.php?id=61566893468669';

  readonly channels: ReadonlyArray<ContactChannel> = [
    { key: 'PROCUREMENT', route: '/cooperation/procurement', icon: '🛒' },
    { key: 'VACANCY', route: '/cooperation/vacancy', icon: '💼' },
    { key: 'TESTIMONIAL', route: '/cooperation/testimonial', icon: '💬' },
    { key: 'COMPLAINT', route: '/cooperation/complaint', icon: '🛡️' },
  ];

  readonly guideItems: ReadonlyArray<GuideItemKey> = [
    'GENERAL',
    'TESTIMONIAL',
    'COMPLAINT',
    'VACANCY',
    'PROCUREMENT',
  ];
}

// ui/src/app/features/cooperation/testimonial/testimonial-list.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { TestimonialItem } from './testimonial.interfaces';
import { PageTitleService } from '../../../core/services/page-title.service';

@Component({
  selector: 'app-testimonial-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe],
  template: `
    <div class="testimonial-list">
      <div class="testimonial-list__header">
        <div>
          <h2>{{ 'testimonial.list.title' | translate }}</h2>
        </div>
        <!-- removed redundant @if (true) wrapper -->
        <a routerLink="new" class="btn-primary"> ✍️ {{ 'testimonial.list.submit' | translate }} </a>
      </div>

      @if (loading()) {
        <p class="state-msg">{{ 'common.loading' | translate }}</p>
      } @else if (items().length === 0) {
        <p class="state-msg">{{ 'testimonial.list.empty' | translate }}</p>
      } @else {
        <div class="testimonial-grid">
          @for (t of items(); track t.id) {
            <div class="testimonial-card">
              @if (t.rating) {
                <div class="testimonial-card__stars">
                  @for (star of starsArray(t.rating); track $index) {
                    <span>★</span>
                  }
                  @for (empty of emptyStarsArray(t.rating); track $index) {
                    <span class="empty">★</span>
                  }
                </div>
              }
              <p class="testimonial-card__text">{{ t.text }}</p>

              @if (t.assistanceTypes && t.assistanceTypes.length > 0) {
                <div class="testimonial-card__tags">
                  @for (a of t.assistanceTypes; track a) {
                    <span class="assist-badge">
                      {{ 'testimonial.assistance.' + a | translate }}
                      @if (a === 'other' && t.assistanceTypeOther) {
                        : {{ t.assistanceTypeOther }}
                      }
                    </span>
                  }
                </div>
              }

              @if (t.photos && t.photos.length > 0) {
                <div class="testimonial-card__photos">
                  @for (p of t.photos; track p.url) {
                    <button
                      type="button"
                      class="testimonial-card__photo"
                      (click)="openLightbox(p.url)"
                    >
                      <img [src]="p.url" [alt]="p.name || ''" loading="lazy" />
                    </button>
                  }
                </div>
              }

              <div class="testimonial-card__author">
                <strong>{{ t.authorName }}</strong>
                @if (t.organization) {
                  <span>· {{ t.organization }}</span>
                }
                @if (t.isVerified) {
                  <span class="verified-badge">
                    ✓ {{ 'testimonial.list.verified' | translate }}
                  </span>
                }
              </div>
              <div class="testimonial-card__meta">
                <span class="testimonial-card__date">
                  📅 {{ t.createdAt | date: 'dd.MM.yyyy' }}
                </span>
                @if (t.region) {
                  <span class="testimonial-card__location">📍 {{ t.region }}</span>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (lightbox()) {
        <button type="button" class="lightbox" (click)="closeLightbox()">
          <img [src]="lightbox()!" alt="" />
        </button>
      }
    </div>
  `,
  styles: [
    `
      .testimonial-list__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        h2 {
          font-size: 1.375rem;
          color: #1a365d;
          margin: 0;
        }
      }
      .testimonial-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1rem;
      }
      .testimonial-card {
        padding: 1.25rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
        &__stars {
          font-size: 1.125rem;
          color: #f6ad55;
          margin-bottom: 0.5rem;
          .empty {
            color: #e2e8f0;
          }
        }
        &__text {
          font-size: 0.9375rem;
          color: #2d3748;
          margin: 0 0 0.75rem;
          line-height: 1.6;
        }
        &__author {
          font-size: 0.875rem;
          color: #4a5568;
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          align-items: center;
        }
        &__tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-bottom: 0.75rem;
        }
        &__photos {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        &__photo {
          width: 72px;
          height: 72px;
          padding: 0;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          overflow: hidden;
          cursor: pointer;
          background: none;
          img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
        &__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }
        &__date {
          font-size: 0.8125rem;
          color: #718096;
        }
        &__location {
          font-size: 0.8125rem;
          color: #a0aec0;
        }
      }
      .assist-badge {
        font-size: 0.7rem;
        background: #ebf8ff;
        color: #2c5282;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
      }
      .lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        border: none;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 2rem;
        cursor: zoom-out;
        img {
          max-width: 90vw;
          max-height: 90vh;
          border-radius: 8px;
        }
      }
      .verified-badge {
        font-size: 0.75rem;
        background: #f0fff4;
        color: #276749;
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
      }
      .btn-primary {
        padding: 0.5rem 1rem;
        background: #2b6cb0;
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-size: 0.875rem;
      }
      .state-msg {
        color: #718096;
      }
    `,
  ],
})
export class TestimonialListComponent implements OnInit {
  private api = inject(ApiService);

  // === ADDED: inject page title service for dynamic SEO tags ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  protected items = signal<TestimonialItem[]>([]);
  protected loading = signal(true);
  protected lightbox = signal<string | null>(null);

  protected openLightbox(url: string): void {
    this.lightbox.set(url);
  }

  protected closeLightbox(): void {
    this.lightbox.set(null);
  }

  protected starsArray(rating: number): number[] {
    return Array.from({ length: rating });
  }

  protected emptyStarsArray(rating: number): number[] {
    return Array.from({ length: 5 - rating });
  }

  ngOnInit(): void {
    this.api.get<TestimonialItem[]>('testimonials').subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    // === ADDED: update page dynamic metadata and SEO tags ===
    this.pageTitle.updateSeo(
      'cooperation.tabs.testimonial',
      'cooperation.descriptions.testimonial',
    );
    // === END ADDED ===
  }
}

// ui/src/app/features/cooperation/testimonial/testimonial-list.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { TestimonialItem } from './testimonial.interfaces';

@Component({
  selector: 'app-testimonial-list',
  standalone: true,
  imports: [RouterLink, TranslateModule],
  template: `
    <div class="testimonial-list">
      <div class="testimonial-list__header">
        <div>
          <h2>{{ 'testimonial.list.title' | translate }}</h2>
        </div>
        <!-- removed redundant @if (true) wrapper -->
        <a routerLink="new" class="btn-primary">
          ✍️ {{ 'testimonial.list.submit' | translate }}
        </a>
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
                  @for (star of starsArray(t.rating); track star) {
                    <span>★</span>
                  }
                  @for (empty of emptyStarsArray(t.rating); track empty) {
                    <span class="empty">★</span>
                  }
                </div>
              }
              <p class="testimonial-card__text">{{ t.text }}</p>
              <div class="testimonial-card__author">
                <strong>{{ t.authorName }}</strong>
                @if (t.organization) { <span>· {{ t.organization }}</span> }
                @if (t.isVerified) {
                  <span class="verified-badge">
                    ✓ {{ 'testimonial.list.verified' | translate }}
                  </span>
                }
              </div>
              @if (t.region) {
                <p class="testimonial-card__location">📍 {{ t.region }}</p>
              }
            </div>
          }
        </div>
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
        h2 { font-size: 1.375rem; color: #1a365d; margin: 0; }
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
          .empty { color: #e2e8f0; }
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
        &__location {
          font-size: 0.8125rem;
          color: #a0aec0;
          margin: 0.375rem 0 0;
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
      .state-msg { color: #718096; }
    `,
  ],
})
export class TestimonialListComponent implements OnInit {
  private api = inject(ApiService);

  protected items = signal<TestimonialItem[]>([]);
  protected loading = signal(true);

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
  }
}

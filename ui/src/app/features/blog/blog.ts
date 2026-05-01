// path: ui/src/app/features/blog/blog.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface PaginatedPosts {
  items: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [DatePipe, RouterLink, TranslateModule], // CHANGED: TranslateModule
  template: `
    <h1>{{ isUa ? 'Новини' : 'News' }}</h1>

    <!-- CHANGED: skeleton on first load -->
    @if (loading() && posts().length === 0) {
      <div class="post-card-skeleton" aria-hidden="true">
        @for (i of [1, 2, 3]; track i) {
          <div class="skeleton-card">
            <div class="skeleton-line skeleton-line--medium"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line--short"></div>
          </div>
        }
      </div>
    }

    <!-- CHANGED: posts is now signal -->
    @for (post of posts(); track post.id) {
      <article class="post-card">
        <a [routerLink]="['/blog', post.slug]" class="post-card__link">
          <h2>{{ isUa ? post.titleUa : post.titleEn }}</h2>
        </a>
        <p>{{ isUa ? post.excerptUa : post.excerptEn }}</p>
        <small>{{ post.publishedAt || post.createdAt | date }}</small>
      </article>
    }

    <!-- CHANGED: load more button -->
    @if (hasMore()) {
      <div class="post-card__load-more">
        <button class="btn btn--secondary" (click)="loadMore()" [disabled]="loading()">
          @if (loading()) {
            <span class="btn-spinner"></span>
            {{ isUa ? 'Завантаження...' : 'Loading...' }}
          } @else {
            {{ isUa ? 'Показати більше' : 'Load more' }}
          }
        </button>
      </div>
    }

    @if (!loading() && posts().length === 0) {
      <p class="empty">{{ isUa ? 'Новин поки немає' : 'No news yet' }}</p>
    }
  `,
  styles: [
    `
      .post-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.5rem;
        margin-bottom: 1rem;
      }
      .post-card h2 {
        color: #1a365d;
        margin-bottom: 0.5rem;
      }
      .post-card small {
        color: #718096;
      }
      .post-card__link {
        text-decoration: none;
      }
      .post-card__link:hover h2 {
        color: #2a4a7f;
      }
      .post-card__load-more {
        display: flex;
        justify-content: center;
        margin: 2rem 0;
      }
      .empty {
        text-align: center;
        color: #a0aec0;
        padding: 2rem;
      }
      /* skeleton + spinner styles are global in styles.scss (added below) */
    `,
  ],
})
export class BlogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  private readonly PAGE_SIZE = 20;
  posts = signal<any[]>([]);
  page = signal(1);
  hasMore = signal(false);
  loading = signal(false);

  get isUa() {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit() {
    this.loadPosts(1);
  }

  loadPosts(page: number) {
    this.loading.set(true);
    this.api
      .get<PaginatedPosts>(`blog?page=${page}&limit=${this.PAGE_SIZE}`)
      .subscribe({
        next: (res) => {
          this.posts.set(page === 1 ? res.items : [...this.posts(), ...res.items]);
          this.page.set(res.page);
          this.hasMore.set(res.hasMore);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadMore() {
    if (!this.hasMore() || this.loading()) return;
    this.loadPosts(this.page() + 1);
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule, FormsModule, DatePipe],
  template: `
    <section class="hero">
      <h1>{{ 'HOME.TITLE' | translate }}</h1>
      <p>{{ 'HOME.SUBTITLE' | translate }}</p>
    </section>

    <section class="news">
      <div class="news__header">
        <h2>{{ isUa ? 'Новини' : 'News' }}</h2>
        @if (auth.isManager) {
          <button class="news__add" (click)="showForm = !showForm" [title]="isUa ? 'Додати новину' : 'Add news'">
            {{ showForm ? '✕' : '➕' }}
          </button>
        }
      </div>

      <!-- Форма додавання новини -->
      @if (showForm) {
        <div class="news-form">
          <h3>{{ isUa ? 'Нова публікація' : 'New post' }}</h3>

          <label>{{ isUa ? 'Заголовок (UA)' : 'Title (UA)' }} *
            <input [(ngModel)]="form.titleUa" />
          </label>

          <label>{{ isUa ? 'Заголовок (EN)' : 'Title (EN)' }} *
            <input [(ngModel)]="form.titleEn" />
          </label>

          <label>Slug *
            <input [(ngModel)]="form.slug" placeholder="my-news-post" />
          </label>

          <label>{{ isUa ? 'Короткий опис (UA)' : 'Excerpt (UA)' }}
            <input [(ngModel)]="form.excerptUa" />
          </label>

          <label>{{ isUa ? 'Короткий опис (EN)' : 'Excerpt (EN)' }}
            <input [(ngModel)]="form.excerptEn" />
          </label>

          <label>{{ isUa ? 'Зміст (UA)' : 'Content (UA)' }} *
            <textarea [(ngModel)]="form.contentUa" rows="5"></textarea>
          </label>

          <label>{{ isUa ? 'Зміст (EN)' : 'Content (EN)' }} *
            <textarea [(ngModel)]="form.contentEn" rows="5"></textarea>
          </label>

          <label>{{ isUa ? 'Посилання на зображення' : 'Cover image URL' }}
            <input [(ngModel)]="form.coverImage" placeholder="https://..." />
          </label>

          <label>{{ isUa ? 'Посилання на відео (YouTube)' : 'Video URL (YouTube)' }}
            <input [(ngModel)]="form.videoUrl" placeholder="https://youtube.com/watch?v=..." />
          </label>

          <label>{{ isUa ? 'Категорія' : 'Category' }}
            <select [(ngModel)]="form.category">
              <option value="news">{{ isUa ? 'Новини' : 'News' }}</option>
              <option value="story">{{ isUa ? 'Історія успіху' : 'Success story' }}</option>
              <option value="update">{{ isUa ? 'Оновлення' : 'Update' }}</option>
            </select>
          </label>

          @if (formError) {
            <p class="news-form__error">{{ formError }}</p>
          }

          <div class="news-form__actions">
            <button class="btn btn--primary" (click)="publish()">
              {{ isUa ? 'Опублікувати' : 'Publish' }}
            </button>
            <button class="btn btn--secondary" (click)="showForm = false">
              {{ isUa ? 'Скасувати' : 'Cancel' }}
            </button>
          </div>
        </div>
      }

      <!-- Список новин -->
      @for (post of posts; track post.id) {
        <article class="news-card">
          @if (post.coverImage) {
            <img [src]="post.coverImage" [alt]="isUa ? post.titleUa : post.titleEn" class="news-card__image" />
          }
          <div class="news-card__body">
            <span class="news-card__category">{{ post.category }}</span>
            <h3>{{ isUa ? post.titleUa : post.titleEn }}</h3>
            <p>{{ isUa ? post.excerptUa : post.excerptEn }}</p>
            @if (post.videoUrl) {
              <iframe
                [src]="getEmbedUrl(post.videoUrl)"
                width="100%" height="315"
                frameborder="0" allowfullscreen
                class="news-card__video">
              </iframe>
            }
            <div class="news-card__meta">
              <small>{{ post.createdAt | date:'mediumDate' }}</small>
              @if (post.author) {
                <small>{{ post.author.firstName }} {{ post.author.lastName }}</small>
              }
            </div>
          </div>
        </article>
      }

      @if (posts.length === 0) {
        <p class="news__empty">{{ isUa ? 'Новин поки немає' : 'No news yet' }}</p>
      }
    </section>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 3rem 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 2rem;
    }
    .hero h1 { color: #1a365d; font-size: 2rem; margin-bottom: 0.5rem; }
    .hero p { color: #4a5568; font-size: 1.25rem; }

    .news__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .news__header h2 { color: #1a365d; }
    .news__add {
      font-size: 1.5rem;
      background: none;
      border: 2px solid #1a365d;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      color: #1a365d;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .news__add:hover { background: #1a365d; color: white; }

    .news-form {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .news-form h3 { color: #1a365d; margin-bottom: 1rem; }
    .news-form label {
      display: block;
      margin-bottom: 0.75rem;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .news-form input,
    .news-form select,
    .news-form textarea {
      display: block;
      width: 100%;
      padding: 0.5rem;
      margin-top: 0.25rem;
      border: 1px solid #cbd5e0;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .news-form__error { color: #e53e3e; font-size: 0.875rem; }
    .news-form__actions { display: flex; gap: 0.75rem; margin-top: 1rem; }

    .btn {
      padding: 0.5rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .btn--primary { background: #1a365d; color: white; }
    .btn--primary:hover { background: #2a4a7f; }
    .btn--secondary { background: #e2e8f0; color: #1a365d; }

    .news-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .news-card__image {
      width: 100%;
      height: 200px;
      object-fit: cover;
    }
    .news-card__body { padding: 1.5rem; }
    .news-card__category {
      background: #ebf8ff;
      color: #2b6cb0;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .news-card__body h3 { color: #1a365d; margin: 0.5rem 0; }
    .news-card__body p { color: #4a5568; }
    .news-card__video { margin-top: 1rem; border-radius: 4px; }
    .news-card__meta {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
      color: #718096;
    }
    .news__empty { color: #a0aec0; text-align: center; padding: 2rem; }
  `],
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  posts: any[] = [];
  showForm = false;
  formError = '';

  form = {
    slug: '',
    titleUa: '',
    titleEn: '',
    contentUa: '',
    contentEn: '',
    excerptUa: '',
    excerptEn: '',
    coverImage: '',
    videoUrl: '',
    category: 'news',
  };

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.api.get<any[]>('blog').subscribe((data) => (this.posts = data));
  }

  publish(): void {
    if (!this.form.slug || !this.form.titleUa || !this.form.titleEn
      || !this.form.contentUa || !this.form.contentEn) {
      this.formError = this.isUa
        ? 'Заповніть обов\'язкові поля (slug, заголовки, зміст)'
        : 'Fill in required fields (slug, titles, content)';
      return;
    }

    // Очищаем пустые поля
    const body: any = { ...this.form };
    Object.keys(body).forEach((key) => {
      if (body[key] === '') delete body[key];
    });

    this.api.post('blog', body).subscribe({
      next: () => {
        this.showForm = false;
        this.formError = '';
        this.resetForm();
        this.loadPosts();
      },
      error: (err) => {
        this.formError = err.error?.message || 'Error publishing post';
      },
    });
  }

  // YouTube URL → embed URL
  getEmbedUrl(url: string): SafeResourceUrl {
    let videoId = '';
    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`
    );
  }

  private resetForm(): void {
    this.form = {
      slug: '', titleUa: '', titleEn: '',
      contentUa: '', contentEn: '',
      excerptUa: '', excerptEn: '',
      coverImage: '', videoUrl: '', category: 'news',
    };
  }
}

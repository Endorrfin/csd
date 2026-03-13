import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule, FormsModule, DatePipe, CarouselComponent],
  template: `
    <section class="hero">
      <h1>{{ 'HOME.TITLE' | translate }}</h1>
      <p>{{ 'HOME.SUBTITLE' | translate }}</p>
    </section>

    <section class="news">
      <div class="news__header">
        <h2>{{ isUa ? 'Новини' : 'News' }}</h2>
        @if (auth.isManager) {
          <button class="news__add" (click)="openCreateForm()" [title]="isUa ? 'Додати новину' : 'Add news'">
            ➕
          </button>
        }
      </div>

      @if (showForm()) {
        <div class="news-form">
          <div class="news-form__header">
            <h3>{{ editingPostId() ? (isUa ? 'Редагувати' : 'Edit') : (isUa ? 'Нова публікація' : 'New post') }}</h3>
            <button class="news-form__close" (click)="showForm.set(false)">✕</button>
          </div>

          <label>{{ isUa ? 'Заголовок (UA)' : 'Title (UA)' }} *
            <input [ngModel]="form().titleUa" (ngModelChange)="updateFormField('titleUa', $event)" />
          </label>

          <label>{{ isUa ? 'Заголовок (EN)' : 'Title (EN)' }} *
            <input [ngModel]="form().titleEn" (ngModelChange)="updateFormField('titleEn', $event)" />
          </label>

          <label>Slug *
            <input [ngModel]="form().slug" (ngModelChange)="updateFormField('slug', $event)" placeholder="my-news-post" />
          </label>

          <label>{{ isUa ? 'Короткий опис (UA)' : 'Excerpt (UA)' }}
            <input [ngModel]="form().excerptUa" (ngModelChange)="updateFormField('excerptUa', $event)" />
          </label>

          <label>{{ isUa ? 'Короткий опис (EN)' : 'Excerpt (EN)' }}
            <input [ngModel]="form().excerptEn" (ngModelChange)="updateFormField('excerptEn', $event)" />
          </label>

          <label>{{ isUa ? 'Зміст (UA)' : 'Content (UA)' }} *
            <textarea [ngModel]="form().contentUa" (ngModelChange)="updateFormField('contentUa', $event)" rows="5"></textarea>
          </label>

          <label>{{ isUa ? 'Зміст (EN)' : 'Content (EN)' }} *
            <textarea [ngModel]="form().contentEn" (ngModelChange)="updateFormField('contentEn', $event)" rows="5"></textarea>
          </label>

          <div class="news-form__images">
            <label>{{ isUa ? 'Зображення (до 5 посилань)' : 'Images (up to 5 URLs)' }}</label>
            @for (img of form().images; track $index; let i = $index) {
              <div class="news-form__image-row">
                <input [ngModel]="form().images[i]" (ngModelChange)="updateImage(i, $event)"
                       [placeholder]="'https://example.com/photo' + (i + 1) + '.jpg'" />
                <button type="button" class="news-form__remove-img" (click)="removeImage(i)">✕</button>
              </div>
            }
            @if (form().images.length < 5) {
              <button type="button" class="btn btn--secondary btn--small" (click)="addImage()">
                {{ isUa ? '+ Додати зображення' : '+ Add image' }}
              </button>
            }
          </div>

          <label>{{ isUa ? 'Посилання на відео (YouTube)' : 'Video URL (YouTube)' }}
            <input [ngModel]="form().videoUrl" (ngModelChange)="updateFormField('videoUrl', $event)" placeholder="https://youtube.com/watch?v=..." />
          </label>

          <label>{{ isUa ? 'Категорія' : 'Category' }}
            <select [ngModel]="form().category" (ngModelChange)="updateFormField('category', $event)">
              <option value="news">{{ isUa ? 'Новини' : 'News' }}</option>
              <option value="story">{{ isUa ? 'Історія успіху' : 'Success story' }}</option>
              <option value="update">{{ isUa ? 'Оновлення' : 'Update' }}</option>
            </select>
          </label>

          @if (formError()) {
            <p class="news-form__error">{{ formError() }}</p>
          }

          <div class="news-form__actions">
            <button class="btn btn--primary" (click)="editingPostId() ? updatePost() : publish()">
              {{ editingPostId()
                ? (isUa ? 'Зберегти зміни' : 'Save changes')
                : (isUa ? 'Опублікувати' : 'Publish') }}
            </button>
            <button class="btn btn--secondary" (click)="showForm.set(false)">
              {{ isUa ? 'Скасувати' : 'Cancel' }}
            </button>
          </div>
        </div>
      }

      @for (post of posts(); track post.id) {
        <article class="news-card">
          <div class="news-card__body">
            <div class="news-card__top">
              <span class="news-card__category">{{ post.category }}</span>
              <small class="news-card__date">{{ post.createdAt | date:'mediumDate' }}</small>
              @if (auth.isManager) {
                <button class="news-card__edit" (click)="openEditForm(post)" [title]="isUa ? 'Редагувати' : 'Edit'">
                  ✏️
                </button>
                
                <button class="news-card__delete" (click)="deletePost(post)" [title]="isUa ? 'Видалити' : 'Delete'">
                  🗑️
                </button>
              }
            </div>

            <h3>{{ isUa ? post.titleUa : post.titleEn }}</h3>
            <div class="news-card__content" [innerHTML]="isUa ? post.contentUa : post.contentEn"></div>
          </div>

          <!-- Карусель ПІСЛЯ тексту -->
          @if (post.images?.length) {
            <app-carousel [images]="post.images" />
          } @else if (post.coverImage) {
            <img [src]="post.coverImage" [alt]="isUa ? post.titleUa : post.titleEn" class="news-card__image" />
          }

          @if (post.videoUrl) {
            <div class="news-card__video-wrap">
              <iframe [src]="getEmbedUrl(post.videoUrl)" width="100%" height="315"
                      frameborder="0" allowfullscreen class="news-card__video"></iframe>
            </div>
          }
        </article>
      }

      @if (posts().length === 0) {
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
      width: 40px; height: 40px;
      cursor: pointer;
      color: #1a365d;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .news__add:hover { background: #1a365d; color: white; }

    /* Форма */
    .news-form {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }
    .news-form__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }
    .news-form__header h3 { color: #1a365d; margin: 0; }
    .news-form__close {
      background: none; border: none; font-size: 1.25rem;
      cursor: pointer; color: #718096;
    }
    .news-form label {
      display: block; margin-bottom: 0.75rem;
      font-weight: 500; font-size: 0.875rem;
    }
    .news-form input, .news-form select, .news-form textarea {
      display: block; width: 100%; padding: 0.5rem;
      margin-top: 0.25rem; border: 1px solid #cbd5e0;
      border-radius: 4px; font-size: 0.875rem;
    }
    .news-form__images { margin-bottom: 0.75rem; }
    .news-form__images label { margin-bottom: 0.5rem; }
    .news-form__image-row {
      display: flex; gap: 0.5rem; margin-bottom: 0.5rem;
    }
    .news-form__image-row input { flex: 1; }
    .news-form__remove-img {
      background: #fed7d7; border: none; color: #c53030;
      border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;
    }
    .news-form__error { color: #e53e3e; font-size: 0.875rem; }
    .news-form__actions { display: flex; gap: 0.75rem; margin-top: 1rem; }

    .btn {
      padding: 0.5rem 1.5rem; border: none; border-radius: 4px;
      cursor: pointer; font-size: 0.875rem; font-weight: 500;
    }
    .btn--primary { background: #1a365d; color: white; }
    .btn--primary:hover { background: #2a4a7f; }
    .btn--secondary { background: #e2e8f0; color: #1a365d; }
    .btn--small { padding: 0.25rem 0.75rem; font-size: 0.8rem; }

    /* Карточки новин */
    .news-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    
    .news-card__video-wrap { padding: 0 1.5rem 1.5rem; }
    
    .news-card__image {
      width: 100%; height: 300px; object-fit: cover;
    }
    .news-card__body { padding: 1.5rem; }
    .news-card__top {
      display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
    }
    .news-card__category {
      background: #ebf8ff; color: #2b6cb0;
      padding: 0.125rem 0.5rem; border-radius: 4px;
      font-size: 0.75rem; text-transform: uppercase;
    }
    .news-card__date { color: #718096; font-size: 0.8rem; }
    .news-card__edit {
      background: none; border: none; cursor: pointer;
      font-size: 1rem; margin-left: auto;
      opacity: 0.5; transition: opacity 0.2s;
    }
    .news-card__delete {
      background: none; border: none; cursor: pointer;
      font-size: 1rem;
      opacity: 0.5; transition: opacity 0.2s;
    }
    .news-card__edit:hover { opacity: 1; }
    .news-card__delete:hover { opacity: 1; }
    .news-card__body h3 { color: #1a365d; margin: 0.25rem 0 0.75rem; }
    .news-card__content { color: #4a5568; line-height: 1.6; }
    .news-card__video { margin-top: 1rem; border-radius: 4px; }
    .news__empty { color: #a0aec0; text-align: center; padding: 2rem; }
  `],
})

export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  // Signals — Angular 21 zoneless requires signals for reactivity
  posts = signal<any[]>([]);
  showForm = signal(false);
  formError = signal('');
  editingPostId = signal<string | null>(null);
  form = signal(this.emptyForm());

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    this.api.get<any[]>('blog').subscribe((data) => this.posts.set(data));
  }

  openCreateForm(): void {
    this.editingPostId.set(null);
    this.form.set(this.emptyForm());
    this.formError.set('');
    this.showForm.set(true);
  }

  publish(): void {
    if (!this.validateForm()) return;

    const body = this.cleanBody();
    this.api.post('blog', body).subscribe({
      next: () => {
        this.showForm.set(false);
        this.form.set(this.emptyForm());
        this.loadPosts();
      },
      error: (err) => this.formError.set(err.error?.message || 'Error'),
    });
  }

  openEditForm(post: any): void {
    this.editingPostId.set(post.slug);
    this.form.set({
      slug: post.slug,
      titleUa: post.titleUa,
      titleEn: post.titleEn,
      contentUa: post.contentUa,
      contentEn: post.contentEn,
      excerptUa: post.excerptUa || '',
      excerptEn: post.excerptEn || '',
      images: post.images?.length ? [...post.images] : [],
      videoUrl: post.videoUrl || '',
      category: post.category || 'news',
    });
    this.formError.set('');
    this.showForm.set(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deletePost(post: any): void {
    const message = this.isUa
      ? `Видалити "${post.titleUa}"?`
      : `Delete "${post.titleEn}"?`;

    if (confirm(message)) {
      this.api.delete(`blog/${post.slug}`).subscribe({
        next: () => this.loadPosts(),
        error: (err) => this.formError.set(err.error?.message || 'Error deleting post'),
      });
    }
  }

  updatePost(): void {
    if (!this.validateForm()) return;

    const body = this.cleanBody();
    this.api.patch(`blog/${this.editingPostId()}`, body).subscribe({
      next: () => {
        this.showForm.set(false);
        this.editingPostId.set(null);
        this.form.set(this.emptyForm());
        this.loadPosts();
      },
      error: (err) => this.formError.set(err.error?.message || 'Error'),
    });
  }

  addImage(): void {
    const current = this.form();
    if (current.images.length < 5) {
      this.form.set({ ...current, images: [...current.images, ''] });
    }
  }

  removeImage(index: number): void {
    const current = this.form();
    const images = current.images.filter((_, i) => i !== index);
    this.form.set({ ...current, images });
  }

  updateImage(index: number, value: string): void {
    const current = this.form();
    const images = [...current.images];
    images[index] = value;
    this.form.set({ ...current, images });
  }

  updateFormField(field: string, value: string): void {
    this.form.set({ ...this.form(), [field]: value });
  }

  getEmbedUrl(url: string): SafeResourceUrl {
    let videoId = '';
    if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`,
    );
  }

  private validateForm(): boolean {
    const f = this.form();
    if (!f.slug || !f.titleUa || !f.titleEn || !f.contentUa || !f.contentEn) {
      this.formError.set(this.isUa
        ? 'Заповніть обов\'язкові поля (slug, заголовки, зміст)'
        : 'Fill in required fields (slug, titles, content)');
      return false;
    }
    return true;
  }

  private cleanBody(): any {
    const body: any = { ...this.form() };
    body.images = body.images.filter((url: string) => url.trim() !== '');
    if (!body.videoUrl) delete body.videoUrl;
    if (!body.excerptUa) delete body.excerptUa;
    if (!body.excerptEn) delete body.excerptEn;
    if (body.images.length === 0) delete body.images;
    return body;
  }

  private emptyForm() {
    return {
      slug: '', titleUa: '', titleEn: '',
      contentUa: '', contentEn: '',
      excerptUa: '', excerptEn: '',
      images: [] as string[],
      videoUrl: '', category: 'news',
    };
  }
}

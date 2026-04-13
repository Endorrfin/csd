import { Component, inject, OnInit, signal, PLATFORM_ID } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule, FormsModule, DatePipe, CarouselComponent],
  template: `


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

          <!-- rows 5 → 13 (2.5x) -->
          <label>{{ isUa ? 'Зміст (UA)' : 'Content (UA)' }} *
            <textarea [ngModel]="form().contentUa" (ngModelChange)="updateFormField('contentUa', $event)" rows="13"></textarea>
          </label>

          <!-- rows 5 → 13 (2.5x) -->
          <label>{{ isUa ? 'Зміст (EN)' : 'Content (EN)' }} *
            <textarea [ngModel]="form().contentEn" (ngModelChange)="updateFormField('contentEn', $event)" rows="13"></textarea>
          </label>

          <!-- file upload instead of URL inputs -->
          <div class="news-form__images">
            <label>{{ isUa ? 'Зображення (до 5 фото)' : 'Images (up to 5 photos)' }}</label>
            @for (img of form().images; track $index; let i = $index) {
              <div class="news-form__image-row">
                <!-- Hidden native file input, triggered by label -->
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  [id]="'img-file-' + i"
                  class="news-form__file-native"
                  (change)="onImageFileSelected(i, $event)"
                />
                <!-- Custom upload button -->
                <label [for]="'img-file-' + i" class="news-form__upload-btn"
                       [class.news-form__upload-btn--loading]="uploadingImages()[i]">
                  @if (uploadingImages()[i]) {
                    <span class="news-form__spinner">⏳</span>
                    {{ isUa ? 'Завантаження...' : 'Uploading...' }}
                  } @else if (form().images[i]) {
                    🔄 {{ isUa ? 'Замінити' : 'Replace' }}
                  } @else {
                    📎 {{ isUa ? 'Обрати фото' : 'Choose photo' }}
                  }
                </label>
                <!-- Thumbnail preview -->
                @if (form().images[i] && !uploadingImages()[i]) {
                  <img [src]="form().images[i]" class="news-form__thumb" alt="preview" />
                }
                <button type="button" class="news-form__remove-img" (click)="removeImage(i)">✕</button>
              </div>
            }
            @if (form().images.length < 5) {
              <button type="button" class="btn btn--secondary btn--small" (click)="addImage()"
                      [disabled]="isAnyImageUploading()">
                {{ isUa ? '+ Додати фото' : '+ Add photo' }}
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
          
          <label>{{ isUa ? 'Дата публікації (для перенесених записів)' : 'Publication date (for migrated posts)' }}
            <input
              type="date"
              [ngModel]="form().publishedAt"
              (ngModelChange)="updateFormField('publishedAt', $event)"
            />
            <small style="color:#718096">
              {{ isUa
                ? 'Залиш порожнім для нових публікацій — встановиться поточна дата'
                : 'Leave empty for new posts — current date will be used' }}
            </small>
          </label>

          @if (formError()) {
            <p class="news-form__error">{{ formError() }}</p>
          }

          <div class="news-form__actions">
            <button class="btn btn--primary"
                    [disabled]="isAnyImageUploading()"
                    (click)="editingPostId() ? updatePost() : publish()">
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

      <!-- added [id] for anchor-based share URL -->
      @for (post of posts(); track post.id) {
        <article class="news-card" [id]="'post-' + post.slug">
          <div class="news-card__body">
            <div class="news-card__top">
              <span class="news-card__category">{{ post.category }}</span>
              <small class="news-card__date">{{ getPostDate(post) | date:'mediumDate' }}</small>
              @if (auth.isManager) {
                <button class="news-card__edit" (click)="openEditForm(post)" [title]="isUa ? 'Редагувати' : 'Edit'">✏️</button>
                <button class="news-card__delete" (click)="deletePost(post)" [title]="isUa ? 'Видалити' : 'Delete'">🗑️</button>
              }
            </div>

            <h3>{{ isUa ? post.titleUa : post.titleEn }}</h3>
            <div class="news-card__content" [innerHTML]="isUa ? post.contentUa : post.contentEn"></div>

            <!-- social share buttons -->
            <div class="news-card__share">
              <span class="news-card__share-label">{{ isUa ? 'Поділитись:' : 'Share:' }}</span>
              <a [href]="getFacebookShareUrl(post)" target="_blank" rel="noopener noreferrer"
                 class="news-card__share-btn news-card__share-btn--fb" title="Facebook">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </a>
              <a [href]="getLinkedInShareUrl(post)" target="_blank" rel="noopener noreferrer"
                 class="news-card__share-btn news-card__share-btn--li" title="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a [href]="getXShareUrl(post)" target="_blank" rel="noopener noreferrer"
                 class="news-card__share-btn news-card__share-btn--x" title="X (Twitter)">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          <!-- carousel moved below text (unchanged logic) -->
          @if (post.images?.length) {
            <app-carousel [images]="post.images" />
          } @else if (post.coverImage) {
            <img [src]="post.coverImage" [alt]="isUa ? post.titleUa : post.titleEn" class="news-card__image" />
          }

          @if (post.videoUrl) {
            <!-- height 315 → 630 (2x) -->
            <div class="news-card__video-wrap">
              <iframe [src]="getEmbedUrl(post.videoUrl)" width="100%" height="630"
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

    /* FORM */
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

    /* FILE UPLOAD STYLE */
    .news-form__images { margin-bottom: 0.75rem; }
    .news-form__images > label { margin-bottom: 0.5rem; }
    .news-form__image-row {
      display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;
    }
    .news-form__file-native {
      display: none !important; /* hidden — triggered by label */
    }
    .news-form__upload-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.4rem 0.75rem;
      background: #ebf8ff;
      border: 1px solid #90cdf4;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      color: #2b6cb0;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }
    .news-form__upload-btn:hover { background: #bee3f8; }
    .news-form__upload-btn--loading {
      opacity: 0.7; cursor: not-allowed;
    }
    .news-form__thumb {
      width: 48px; height: 48px;
      object-fit: cover; border-radius: 4px;
      border: 1px solid #e2e8f0;
      flex-shrink: 0;
    }
    .news-form__remove-img {
      background: #fed7d7; border: none; color: #c53030;
      border-radius: 4px; padding: 0.25rem 0.5rem; cursor: pointer;
      flex-shrink: 0;
    }

    .news-form__error { color: #e53e3e; font-size: 0.875rem; }
    .news-form__actions { display: flex; gap: 0.75rem; margin-top: 1rem; }

    .btn {
      padding: 0.5rem 1.5rem; border: none; border-radius: 4px;
      cursor: pointer; font-size: 0.875rem; font-weight: 500;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn--primary { background: #1a365d; color: white; }
    .btn--primary:hover:not(:disabled) { background: #2a4a7f; }
    .btn--secondary { background: #e2e8f0; color: #1a365d; }
    .btn--small { padding: 0.25rem 0.75rem; font-size: 0.8rem; }

    .news-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1.5rem;
    }
    .news-card__video-wrap { padding: 0 1.5rem 1.5rem; }

    /* Increase card 300px → 600px */
    .news-card__image {
      width: 100%; height: 600px; object-fit: cover;
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
      font-size: 1rem; opacity: 0.5; transition: opacity 0.2s;
    }
    .news-card__edit:hover, .news-card__delete:hover { opacity: 1; }
    .news-card__body h3 { color: #1a365d; margin: 0.25rem 0 0.75rem; }
    .news-card__content { color: #4a5568; line-height: 1.6; }
    .news-card__video { border-radius: 4px; }
    .news__empty { color: #a0aec0; text-align: center; padding: 2rem; }

    /* SOCIAL SHARE */
    .news-card__share {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e2e8f0;
    }
    .news-card__share-label {
      font-size: 0.8rem;
      color: #718096;
    }
    .news-card__share-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px; height: 32px;
      border-radius: 50%;
      color: white;
      text-decoration: none;
      transition: opacity 0.2s, transform 0.15s;
    }
    .news-card__share-btn:hover { opacity: 0.85; transform: scale(1.1); }
    .news-card__share-btn--fb { background: #1877f2; }
    .news-card__share-btn--li { background: #0a66c2; }
    .news-card__share-btn--x  { background: #000; }
  `],
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);

  posts = signal<any[]>([]);
  showForm = signal(false);
  formError = signal('');
  editingPostId = signal<string | null>(null);
  form = signal(this.emptyForm());

  // per-slot upload state (max 5 slots)
  uploadingImages = signal<boolean[]>(Array(5).fill(false));

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  // block publish if any image is still uploading
  isAnyImageUploading(): boolean {
    return this.uploadingImages().some(Boolean);
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

  getPostDate(post: any): Date {
    // use publishedAt if set, fallback to createdAt
    return post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt);
  }

  openEditForm(post: any): void {
    this.editingPostId.set(post.slug);
    this.form.set({
      slug:post.slug,
      titleUa:post.titleUa,
      titleEn:post.titleEn,
      contentUa:post.contentUa,
      contentEn:post.contentEn,
      excerptUa:post.excerptUa || '',
      excerptEn:post.excerptEn || '',
      images:post.images?.length ? [...post.images] : [],
      videoUrl:post.videoUrl || '',
      category:post.category || 'news',
      publishedAt:post.publishedAt || ''
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
    this.form.set({
      ...current,
      images: current.images.filter((_, i) => i !== index),
    });
  }

  // handle file selection → get presigned URL → upload to S3
  async onImageFileSelected(index: number, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Set uploading state for this slot
    const states = [...this.uploadingImages()];
    states[index] = true;
    this.uploadingImages.set(states);
    this.formError.set('');

    try {
      // Step 1: request presigned URL from backend
      const { uploadUrl, publicUrl } = await firstValueFrom(
        this.api.post<{ uploadUrl: string; publicUrl: string }>(
          'upload/presigned-url',
          { filename: file.name, contentType: file.type },
        ),
      );

      // Step 2: upload file directly to S3 (no auth header — presigned URL handles auth)
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!res.ok) {
        throw new Error(`S3 upload failed: ${res.status}`);
      }

      // Step 3: store public URL in form
      const images = [...this.form().images];
      images[index] = publicUrl;
      this.form.set({ ...this.form(), images });
    } catch (err: any) {
      this.formError.set(
        this.isUa ? 'Помилка завантаження фото' : 'Image upload failed',
      );
    } finally {
      const updated = [...this.uploadingImages()];
      updated[index] = false;
      this.uploadingImages.set(updated);
    }
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

  // build per-article anchor URL for sharing
// use DOCUMENT instead of window, guard for SSR
  private getArticleUrl(post: any): string {
    if (!isPlatformBrowser(this.platformId)) {
      // SSR: return relative URL — social bots won't crawl from server render anyway
      return `https://www.csd-fund.org/#post-${post.slug}`;
    }
    return `${this.document.location.origin}/#post-${post.slug}`;
  }

  // NEW: social share URL builders
  getFacebookShareUrl(post: any): string {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(this.getArticleUrl(post))}`;
  }

  getLinkedInShareUrl(post: any): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(this.getArticleUrl(post))}`;
  }

  getXShareUrl(post: any): string {
    const title = this.isUa ? post.titleUa : post.titleEn;
    return `https://x.com/intent/tweet?url=${encodeURIComponent(this.getArticleUrl(post))}&text=${encodeURIComponent(title)}`;
  }

  private validateForm(): boolean {
    const f = this.form();
    if (!f.slug || !f.titleUa || !f.titleEn || !f.contentUa || !f.contentEn) {
      this.formError.set(
        this.isUa
          ? "Заповніть обов'язкові поля (slug, заголовки, зміст)"
          : 'Fill in required fields (slug, titles, content)',
      );
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
    // remove publishedAt if empty — backend keeps existing value
    if (!body.publishedAt) delete body.publishedAt;
    return body;
  }

  private emptyForm() {
    return {
      slug: '', titleUa: '', titleEn: '',
      contentUa: '', contentEn: '',
      excerptUa: '', excerptEn: '',
      images: [] as string[],
      videoUrl: '', category: 'news',
      publishedAt: '',
    };
  }
}

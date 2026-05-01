// path: ui/src/app/features/home/home.ts
import { Component, inject, OnInit, signal, computed, PLATFORM_ID } from '@angular/core'; // + computed
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuillModule } from 'ngx-quill';
import { QuillHtmlPipe } from '../../shared/pipes/quill-html.pipe';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { DOCUMENT } from '@angular/common';
import { QUILL_MODULES } from '../../shared/config/quill.config';

// response envelope from paginated /blog endpoint
interface PaginatedPosts {
  items: any[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule, FormsModule, DatePipe, CarouselComponent, QuillModule, QuillHtmlPipe],
  template: `
    <section class="news">
      <div class="news__header">
        <h2>{{ isUa ? 'Новини' : 'News' }}</h2>
        @if (auth.isManager) {
          <button
            class="news__add"
            (click)="openCreateForm()"
            [title]="isUa ? 'Додати новину' : 'Add news'"
          >
            ➕
          </button>
        }
      </div>

      <!-- skeleton placeholder while initial fetch is in flight -->
      @if (loading() && posts().length === 0) {
        <div class="news-skeleton" aria-hidden="true">
          @for (i of skeletonItems; track $index) {
            <div class="skeleton-card">
              <div class="skeleton-line skeleton-line--short"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line"></div>
              <div class="skeleton-line skeleton-line--medium"></div>
            </div>
          }
        </div>
      }

      @if (showForm()) {
        <div class="news-form">
          <div class="news-form__header">
            <h3>
              {{
                editingPostId()
                  ? isUa
                    ? 'Редагувати'
                    : 'Edit'
                  : isUa
                    ? 'Нова публікація'
                    : 'New post'
              }}
            </h3>
            <!-- disable close while submitting to prevent state desync -->
            <button
              class="news-form__close"
              (click)="showForm.set(false)"
              [disabled]="submitting()"
            >
              ✕
            </button>
          </div>

          <label
            >{{ isUa ? 'Заголовок (UA)' : 'Title (UA)' }} *
            <input
              [ngModel]="form().titleUa"
              (ngModelChange)="updateFormField('titleUa', $event)"
            />
          </label>

          <label
            >{{ isUa ? 'Заголовок (EN)' : 'Title (EN)' }} *
            <input
              [ngModel]="form().titleEn"
              (ngModelChange)="updateFormField('titleEn', $event)"
            />
          </label>

          <label
            >Slug *
            <input
              [ngModel]="form().slug"
              (ngModelChange)="updateFormField('slug', $event)"
              placeholder="my-news-post"
            />
          </label>

          <label
            >{{ isUa ? 'Короткий опис (UA)' : 'Excerpt (UA)' }}
            <input
              [ngModel]="form().excerptUa"
              (ngModelChange)="updateFormField('excerptUa', $event)"
            />
          </label>

          <label
            >{{ isUa ? 'Короткий опис (EN)' : 'Excerpt (EN)' }}
            <input
              [ngModel]="form().excerptEn"
              (ngModelChange)="updateFormField('excerptEn', $event)"
            />
          </label>

          <label
            >{{ isUa ? 'Детальний опис (UA)' : 'Content (UA)' }} *
            @if (isBrowser) {
              <quill-editor
                class="news-form__quill"
                [ngModel]="form().contentUa"
                (ngModelChange)="updateFormField('contentUa', $event)"
                [modules]="quillModules"
                [placeholder]="isUa ? 'Вводити детальний опис...' : 'Enter content...'"
              ></quill-editor>
            } @else {
              <textarea
                [ngModel]="form().contentUa"
                (ngModelChange)="updateFormField('contentUa', $event)"
                rows="13"
              ></textarea>
            }
          </label>

          <label
            >{{ isUa ? 'Детальний опис (EN)' : 'Content (EN)' }} *
            @if (isBrowser) {
              <quill-editor
                [ngModel]="form().contentEn"
                (ngModelChange)="updateFormField('contentEn', $event)"
                [modules]="quillModules"
                [placeholder]="isUa ? 'Вводити детальний опис...' : 'Enter content...'"
                class="news-form__quill"
              >
              </quill-editor>
            } @else {
              <textarea
                [ngModel]="form().contentEn"
                (ngModelChange)="updateFormField('contentEn', $event)"
                rows="13"
              ></textarea>
            }
          </label>

          <div class="news-form__images">
            <label>{{ isUa ? 'Зображення (до 5 фото)' : 'Images (up to 5 photos)' }}</label>
            @for (img of form().images; track $index; let i = $index) {
              <div class="news-form__image-row">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  [id]="'img-file-' + i"
                  class="news-form__file-native"
                  (change)="onImageFileSelected(i, $event)"
                />
                <label
                  [for]="'img-file-' + i"
                  class="news-form__upload-btn"
                  [class.news-form__upload-btn--loading]="uploadingImages()[i]"
                >
                  @if (uploadingImages()[i]) {
                    <span class="news-form__spinner">⏳</span>
                    {{ isUa ? 'Завантаження...' : 'Uploading...' }}
                  } @else if (form().images[i]) {
                    🔄 {{ isUa ? 'Замінити' : 'Replace' }}
                  } @else {
                    📎 {{ isUa ? 'Обрати фото' : 'Choose photo' }}
                  }
                </label>
                @if (form().images[i] && !uploadingImages()[i]) {
                  <img [src]="form().images[i]" class="news-form__thumb" alt="preview" />
                }
                <button type="button" class="news-form__remove-img" (click)="removeImage(i)">
                  ✕
                </button>
              </div>
            }
            @if (form().images.length < 5) {
              <button
                type="button"
                class="btn btn--secondary btn--small"
                (click)="addImage()"
                [disabled]="isAnyImageUploading()"
              >
                {{ isUa ? '+ Додати фото' : '+ Add photo' }}
              </button>
            }
          </div>

          <label
            >{{ isUa ? 'Посилання на відео (YouTube)' : 'Video URL (YouTube)' }}
            <input
              [ngModel]="form().videoUrl"
              (ngModelChange)="updateFormField('videoUrl', $event)"
              placeholder="https://youtube.com/watch?v=..."
            />
          </label>

          <label
            >{{ isUa ? 'Категорія' : 'Category' }}
            <select
              [ngModel]="form().category"
              (ngModelChange)="updateFormField('category', $event)"
            >
              <option value="news">{{ isUa ? 'Новини' : 'News' }}</option>
              <option value="story">{{ isUa ? 'Історія успіху' : 'Success story' }}</option>
              <option value="update">{{ isUa ? 'Оновлення' : 'Update' }}</option>
            </select>
          </label>

          <label
            >{{
              isUa
                ? 'Дата публікації (для перенесених записів)'
                : 'Publication date (for migrated posts)'
            }}
            <input
              type="date"
              [ngModel]="form().publishedAt"
              (ngModelChange)="updateFormField('publishedAt', $event)"
            />
            <small style="color:#718096">
              {{
                isUa
                  ? 'Залиш порожнім для нових публікацій — встановиться поточна дата'
                  : 'Leave empty for new posts — current date will be used'
              }}
            </small>
          </label>

          @if (formError()) {
            <p class="news-form__error">{{ formError() }}</p>
          }

          <div class="news-form__actions">
            <!-- disabled gate via computed; spinner + label swap during submit -->
            <button
              class="btn btn--primary"
              [disabled]="isSubmitDisabled()"
              (click)="editingPostId() ? updatePost() : publish()"
            >
              @if (submitting()) {
                <span class="btn-spinner"></span>
                {{ isUa ? 'Збереження...' : 'Saving...' }}
              } @else {
                {{
                  editingPostId()
                    ? isUa
                      ? 'Зберегти зміни'
                      : 'Save changes'
                    : isUa
                      ? 'Опублікувати'
                      : 'Publish'
                }}
              }
            </button>
            <!-- disable cancel during submit -->
            <button
              class="btn btn--secondary"
              (click)="showForm.set(false)"
              [disabled]="submitting()"
            >
              {{ isUa ? 'Скасувати' : 'Cancel' }}
            </button>
          </div>
        </div>
      }

      @for (post of posts(); track post.id) {
        <article class="news-card" [id]="'post-' + post.slug">
          <div class="news-card__body">
            <div class="news-card__top">
              <span class="news-card__category">{{ post.category }}</span>
              <small class="news-card__date">{{ getPostDate(post) | date: 'mediumDate' }}</small>
              @if (auth.isManager) {
                <button
                  class="news-card__edit"
                  (click)="openEditForm(post)"
                  [title]="isUa ? 'Редагувати' : 'Edit'"
                >
                  ✏️
                </button>
                <button
                  class="news-card__delete"
                  (click)="deletePost(post)"
                  [title]="isUa ? 'Видалити' : 'Delete'"
                >
                  🗑️
                </button>
              }
            </div>

            <h3>{{ isUa ? post.titleUa : post.titleEn }}</h3>
            <div
              class="rich-content news-card__content"
              [innerHTML]="(isUa ? post.contentUa : post.contentEn) | quillHtml"
            ></div>

            <div class="news-card__share">
              <span class="news-card__share-label">{{ isUa ? 'Поділитись:' : 'Share:' }}</span>
              <a
                [href]="getFacebookShareUrl(post)"
                target="_blank"
                rel="noopener noreferrer"
                class="news-card__share-btn news-card__share-btn--fb"
                title="Facebook"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path
                    d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
                  />
                </svg>
              </a>
              <a
                [href]="getLinkedInShareUrl(post)"
                target="_blank"
                rel="noopener noreferrer"
                class="news-card__share-btn news-card__share-btn--li"
                title="LinkedIn"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path
                    d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                  />
                </svg>
              </a>
              <a
                [href]="getXShareUrl(post)"
                target="_blank"
                rel="noopener noreferrer"
                class="news-card__share-btn news-card__share-btn--x"
                title="X (Twitter)"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path
                    d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <!-- lazy on cover image to defer offscreen network -->
          @if (post.images?.length) {
            <app-carousel [images]="post.images" />
          } @else if (post.coverImage) {
            <img
              [src]="post.coverImage"
              [alt]="isUa ? post.titleUa : post.titleEn"
              class="news-card__image"
              loading="lazy"
              decoding="async"
            />
          }

          <!-- render iframe only after click; thumbnail placeholder by default
               saves ~500 KB of YouTube JS per video on initial page load -->
          @if (post.videoUrl) {
            <div class="news-card__video-wrap">
              @if (isVideoShown(post.id)) {
                <iframe
                  [src]="getEmbedUrl(post.videoUrl)"
                  width="100%"
                  height="630"
                  frameborder="0"
                  allowfullscreen
                  class="news-card__video"
                  loading="lazy"
                ></iframe>
              } @else {
                <button
                  type="button"
                  class="news-card__video-placeholder"
                  (click)="showVideo(post.id)"
                  [attr.aria-label]="isUa ? 'Відтворити відео' : 'Play video'"
                >
                  <img
                    [src]="getYouTubeThumbnail(post.videoUrl)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    class="news-card__video-thumb"
                  />
                  <span class="news-card__video-play">▶</span>
                </button>
              }
            </div>
          }
        </article>
      }

      <!-- load-more button replaces "fetch all on init" pattern -->
      @if (hasMore()) {
        <div class="news__load-more">
          <button
            class="btn btn--secondary"
            (click)="loadMore()"
            [disabled]="loading()"
          >
            @if (loading()) {
              <span class="btn-spinner"></span>
              {{ isUa ? 'Завантаження...' : 'Loading...' }}
            } @else {
              {{ isUa ? 'Показати більше' : 'Load more' }}
            }
          </button>
        </div>
      }

      <!-- empty state guarded by !loading to avoid flash on first load -->
      @if (!loading() && posts().length === 0) {
        <p class="news__empty">{{ isUa ? 'Новин поки немає' : 'No news yet' }}</p>
      }
    </section>
  `,
  styles: [
    `
      .news__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      .news__header h2 {
        color: #1a365d;
      }
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
      .news__add:hover {
        background: #1a365d;
        color: white;
      }

      /* skeleton wrapper layout (skeleton-card / skeleton-line are global in styles.scss) */
      .news-skeleton {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
      }

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
      .news-form__header h3 {
        color: #1a365d;
        margin: 0;
      }
      .news-form__close {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #718096;
      }
      .news-form__close:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
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

      /* FILE UPLOAD STYLE */
      .news-form__images {
        margin-bottom: 0.75rem;
      }
      .news-form__images > label {
        margin-bottom: 0.5rem;
      }
      .news-form__image-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
      }
      .news-form__file-native {
        display: none !important;
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
      .news-form__upload-btn:hover {
        background: #bee3f8;
      }
      .news-form__upload-btn--loading {
        opacity: 0.7;
        cursor: not-allowed;
      }
      .news-form__thumb {
        width: 48px;
        height: 48px;
        object-fit: cover;
        border-radius: 4px;
        border: 1px solid #e2e8f0;
        flex-shrink: 0;
      }
      .news-form__remove-img {
        background: #fed7d7;
        border: none;
        color: #c53030;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        flex-shrink: 0;
      }

      .news-form__error {
        color: #e53e3e;
        font-size: 0.875rem;
      }
      .news-form__actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .btn {
        padding: 0.5rem 1.5rem;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 500;
      }
      .btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn--primary {
        background: #1a365d;
        color: white;
      }
      .btn--primary:hover:not(:disabled) {
        background: #2a4a7f;
      }
      .btn--secondary {
        background: #e2e8f0;
        color: #1a365d;
      }
      .btn--small {
        padding: 0.25rem 0.75rem;
        font-size: 0.8rem;
      }

      .news-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 1.5rem;
        min-width: 0;
        max-width: 100%;
      }
      .news-card__video-wrap {
        padding: 0 1.5rem 1.5rem;
      }

      .news-card__image {
        width: 100%;
        height: 600px;
        object-fit: cover;
      }
      .news-card__body {
        padding: 1.5rem;
      }
      .news-card__top {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
      }
      .news-card__category {
        background: #ebf8ff;
        color: #2b6cb0;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        text-transform: uppercase;
      }
      .news-card__date {
        color: #718096;
        font-size: 0.8rem;
      }
      .news-card__edit {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        margin-left: auto;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .news-card__delete {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        opacity: 0.5;
        transition: opacity 0.2s;
      }
      .news-card__edit:hover,
      .news-card__delete:hover {
        opacity: 1;
      }
      .news-card__body h3 {
        color: #1a365d;
        margin: 0.25rem 0 0.75rem;
        word-break: break-word;
      }
      .news-card__content {
        color: #4a5568;
        line-height: 1.6;
      }

      .ql-container .ql-editor {
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .news-card__video {
        border-radius: 4px;
      }
      .news__empty {
        color: #a0aec0;
        text-align: center;
        padding: 2rem;
      }

      /* lazy YouTube placeholder — clickable thumbnail before iframe loads */
      .news-card__video-placeholder {
        position: relative;
        width: 100%;
        border: none;
        padding: 0;
        cursor: pointer;
        background: #000;
        overflow: hidden;
        display: block;
        border-radius: 4px;
      }
      .news-card__video-thumb {
        width: 100%;
        height: auto;
        display: block;
        opacity: 0.85;
        transition: opacity 0.2s;
      }
      .news-card__video-placeholder:hover .news-card__video-thumb {
        opacity: 1;
      }
      .news-card__video-play {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 3rem;
        color: white;
        background: rgba(0, 0, 0, 0.7);
        width: 80px;
        height: 80px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      }

      /* load-more container */
      .news__load-more {
        display: flex;
        justify-content: center;
        margin: 2rem 0;
      }

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
        width: 32px;
        height: 32px;
        border-radius: 50%;
        color: white;
        text-decoration: none;
        transition:
          opacity 0.2s,
          transform 0.15s;
      }
      .news-card__share-btn:hover {
        opacity: 0.85;
        transform: scale(1.1);
      }
      .news-card__share-btn--fb {
        background: #1877f2;
      }
      .news-card__share-btn--li {
        background: #0a66c2;
      }
      .news-card__share-btn--x {
        background: #000;
      }
      
      .news-form__quill {
        display: block;
        margin-top: 0.25rem;
      
        :host ::ng-deep .ql-container {
          min-height: 260px;
          font-size: 0.9375rem;
          border-radius: 0 0 4px 4px;
          border-color: #cbd5e0;
        }
      
        /* word-break now reaches Quill internals via ::ng-deep
           (the old .custom-quill rule was a no-op due to Angular encapsulation) */
        :host ::ng-deep .ql-editor {
          word-break: break-word;
          overflow-wrap: anywhere;
        }
      
        :host ::ng-deep .ql-toolbar {
          border-radius: 4px 4px 0 0;
          border-color: #cbd5e0;
        }
      }
    `,
  ],
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  readonly auth = inject(AuthService);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly quillModules = QUILL_MODULES;

  // page size lives in one place
  private readonly PAGE_SIZE = 10;

  // skeleton placeholder count
  readonly skeletonItems = [1, 2, 3];

  posts = signal<any[]>([]);
  showForm = signal(false);
  formError = signal('');
  editingPostId = signal<string | null>(null);
  form = signal(this.emptyForm());

  uploadingImages = signal<boolean[]>(Array(5).fill(false));

  // pagination + loading state
  page = signal(1);
  hasMore = signal(false);
  total = signal(0);
  loading = signal(false); // initial fetch + load-more
  submitting = signal(false); // create / update in flight

  // which post videos the user has explicitly opened (avoids global iframe load)
  shownVideos = signal<Set<string>>(new Set());

  // single computed gate for the publish/save button
  isSubmitDisabled = computed(() => this.submitting() || this.isAnyImageUploading());

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  isAnyImageUploading(): boolean {
    return this.uploadingImages().some(Boolean);
  }

  ngOnInit(): void {
    this.loadPosts(1);
  }

  // paginated; appends on page > 1, replaces on page === 1
  loadPosts(page: number): void {
    this.loading.set(true);
    this.api
      .get<PaginatedPosts>(`blog?page=${page}&limit=${this.PAGE_SIZE}`)
      .subscribe({
        next: (res) => {
          this.posts.set(page === 1 ? res.items : [...this.posts(), ...res.items]);
          this.page.set(res.page);
          this.hasMore.set(res.hasMore);
          this.total.set(res.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  // load-more handler
  loadMore(): void {
    if (!this.hasMore() || this.loading()) return;
    this.loadPosts(this.page() + 1);
  }

  openCreateForm(): void {
    this.editingPostId.set(null);
    this.form.set(this.emptyForm());
    this.formError.set('');
    this.showForm.set(true);
  }

  // submitting state lifecycle (set on next AND error to handle both paths)
  publish(): void {
    if (!this.validateForm()) return;
    const body = this.cleanBody();
    this.submitting.set(true);
    this.api.post('blog', body).subscribe({
      next: () => {
        this.showForm.set(false);
        this.form.set(this.emptyForm());
        this.loadPosts(1); // reset to first page so the new post is visible at top
        this.submitting.set(false);
      },
      error: (err) => {
        this.formError.set(err.error?.message || 'Error');
        this.submitting.set(false);
      },
    });
  }

  getPostDate(post: any): Date {
    return post.publishedAt ? new Date(post.publishedAt) : new Date(post.createdAt);
  }

  // prefill publishedAt as YYYY-MM-DD (not raw ISO) so <input type="date"> shows it
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
      publishedAt: this.toDateInputValue(post.publishedAt),
    });
    this.formError.set('');
    this.showForm.set(true);
    // SSR guard for window access
    if (this.isBrowser) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  deletePost(post: any): void {
    const message = this.isUa ? `Видалити "${post.titleUa}"?` : `Delete "${post.titleEn}"?`;
    if (confirm(message)) {
      this.api.delete(`blog/${post.slug}`).subscribe({
        next: () => this.loadPosts(1), // refresh first page
        error: (err) => this.formError.set(err.error?.message || 'Error deleting post'),
      });
    }
  }

  // same submitting state lifecycle as publish()
  updatePost(): void {
    if (!this.validateForm()) return;
    const body = this.cleanBody();
    this.submitting.set(true);
    this.api.patch(`blog/${this.editingPostId()}`, body).subscribe({
      next: () => {
        this.showForm.set(false);
        this.editingPostId.set(null);
        this.form.set(this.emptyForm());
        this.loadPosts(1);
        this.submitting.set(false);
      },
      error: (err) => {
        this.formError.set(err.error?.message || 'Error');
        this.submitting.set(false);
      },
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

  async onImageFileSelected(index: number, event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const states = [...this.uploadingImages()];
    states[index] = true;
    this.uploadingImages.set(states);
    this.formError.set('');

    try {
      const { uploadUrl, publicUrl } = await firstValueFrom(
        this.api.post<{ uploadUrl: string; publicUrl: string }>('upload/presigned-url', {
          filename: file.name,
          contentType: file.type,
        }),
      );

      const res = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!res.ok) {
        throw new Error(`S3 upload failed: ${res.status}`);
      }

      const images = [...this.form().images];
      images[index] = publicUrl;
      this.form.set({ ...this.form(), images });
    } catch {
      this.formError.set(this.isUa ? 'Помилка завантаження фото' : 'Image upload failed');
    } finally {
      const updated = [...this.uploadingImages()];
      updated[index] = false;
      this.uploadingImages.set(updated);
    }
  }

  updateFormField(field: string, value: string): void {
    this.form.set({ ...this.form(), [field]: value });
  }

  // extracted videoId helper (used by embed + thumbnail)
  getVideoId(url: string): string {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1]?.split('&')[0] || '';
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] || '';
    return '';
  }

  getEmbedUrl(url: string): SafeResourceUrl {
    const videoId = this.getVideoId(url); // reuse helper
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`,
    );
  }

  // hqdefault is ~30 KB vs ~500 KB iframe payload
  getYouTubeThumbnail(url: string): string {
    const id = this.getVideoId(url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }

  // lazy iframe — render only after explicit click
  showVideo(postId: string): void {
    const next = new Set(this.shownVideos());
    next.add(postId);
    this.shownVideos.set(next);
  }

  isVideoShown(postId: string): boolean {
    return this.shownVideos().has(postId);
  }

  private getArticleUrl(post: any): string {
    if (!isPlatformBrowser(this.platformId)) {
      return `https://www.csd-fund.org/blog/${post.slug}`;
    }
    return `${this.document.location.origin}/blog/${post.slug}`;
  }

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

  // ISO timestamp -> YYYY-MM-DD for native date input.
  // Use UTC parts to avoid the displayed date shifting by a day in negative-offset timezones.
  private toDateInputValue(iso: string | Date | null | undefined): string {
    if (!iso) return '';
    const d = iso instanceof Date ? iso : new Date(iso);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
    if (!body.publishedAt) delete body.publishedAt;
    return body;
  }

  private emptyForm() {
    return {
      slug: '',
      titleUa: '',
      titleEn: '',
      contentUa: '',
      contentEn: '',
      excerptUa: '',
      excerptEn: '',
      images: [] as string[],
      videoUrl: '',
      category: 'news',
      publishedAt: '',
    };
  }
}

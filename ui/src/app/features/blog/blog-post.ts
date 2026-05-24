import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { QuillHtmlPipe } from '../../shared/pipes/quill-html.pipe';
import { LanguageService } from '../../core/services/language.service';
import { BlogPost } from './blog.interfaces';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [DatePipe, CarouselComponent, QuillHtmlPipe],
  template: `
    <!-- bind the signal to a non-null local (as post) so strictTemplates narrows it -->
    @if (post(); as post) {
      <article class="post">
        <div class="post__body">
          <span class="post__category">{{ post.category }}</span>
          <small class="post__date">{{
            post.publishedAt || post.createdAt | date: 'mediumDate'
          }}</small>
          <!-- title/content follow the active language signal -->
          <h1>{{ isUa() ? post.titleUa : post.titleEn }}</h1>
          <!-- rich-content class + quillHtml pipe so &nbsp; tokens wrap and text no longer overflows the viewport -->
          <div
            class="rich-content post__content"
            [innerHTML]="(isUa() ? post.contentUa : post.contentEn) | quillHtml"
          ></div>
        </div>
        @if (post.images?.length) {
          <div class="post__carousel-wrap">
            <!-- images optional on BlogPost — fall back to [] -->
            <app-carousel [images]="post.images ?? []" />
          </div>
        }

        @if (post.videoUrl; as videoUrl) {
          <div class="post__video-wrap">
            @if (showVideo()) {
              <iframe
                [src]="getEmbedUrl(videoUrl)"
                width="100%"
                height="630"
                frameborder="0"
                allowfullscreen
                loading="lazy"
              ></iframe>
            } @else {
              <button
                type="button"
                class="post__video-placeholder"
                (click)="showVideo.set(true)"
                [attr.aria-label]="'Play video'"
              >
                <img
                  [src]="getYouTubeThumbnail(videoUrl)"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  class="post__video-thumb"
                />
                <span class="post__video-play">▶</span>
              </button>
            }
          </div>
        }
      </article>
    }
  `,
  styles: [
    `
      .post {
        max-width: 860px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .post__body {
        padding: 1.5rem;
      }
      .post__carousel-wrap {
        height: 600px;
        overflow: hidden;
      }
      .post__video-wrap {
        padding: 0 1.5rem 1.5rem;
      }
      .post__category {
        background: #ebf8ff;
        color: #2b6cb0;
        padding: 0.125rem 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        text-transform: uppercase;
      }
      .post__date {
        color: #718096;
        font-size: 0.8rem;
        margin-left: 0.5rem;
      }
      h1 {
        color: #1a365d;
        margin: 0.75rem 0;
      }
      .post__content {
        color: #4a5568;
        line-height: 1.6;
      }

      .post__video-placeholder {
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
      .post__video-thumb {
        width: 100%;
        height: auto;
        display: block;
        opacity: 0.85;
        transition: opacity 0.2s;
      }
      .post__video-placeholder:hover .post__video-thumb {
        opacity: 1;
      }
      .post__video-play {
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
      }
    `,
  ],
})
export class BlogPostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly sanitizer = inject(DomSanitizer);

  post = signal<BlogPost | null>(null);
  showVideo = signal(false);
  protected readonly isUa = inject(LanguageService).isUa;

  ngOnInit(): void {
    // read from resolver data — available synchronously during SSR
    const data = this.route.snapshot.data['post'];
    this.post.set(data);
    this.setMetaTags(data);
  }

  private setMetaTags(post: BlogPost): void {
    // meta reflects the active language at render time (set once; SSR renders the default UA).
    const ua = this.isUa();
    const pageTitle = `${ua ? post.titleUa : post.titleEn} — CSD`;
    const description =
      (ua ? post.excerptUa : post.excerptEn) ||
      (ua ? post.contentUa : post.contentEn)?.slice(0, 160) ||
      '';
    const image =
      post.images?.[0] ||
      post.coverImage ||
      'https://www.csd-fund.org/web-app-manifest-512x512.png';
    const url = `https://www.csd-fund.org/blog/${post.slug}`;

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: pageTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });
  }

  getEmbedUrl(url: string): SafeResourceUrl {
    let videoId = '';
    if (url.includes('watch?v=')) videoId = url.split('watch?v=')[1]?.split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube.com/embed/${videoId}`,
    );
  }

  getVideoId(url: string): string {
    if (url.includes('watch?v=')) return url.split('watch?v=')[1]?.split('&')[0] || '';
    if (url.includes('youtu.be/')) return url.split('youtu.be/')[1]?.split('?')[0] || '';
    return '';
  }

  getYouTubeThumbnail(url: string): string {
    const id = this.getVideoId(url);
    return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { CarouselComponent } from '../../shared/components/carousel/carousel';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [DatePipe, CarouselComponent],
  template: `
    @if (post()) {
      <article class="post">
        <div class="post__body">
          <span class="post__category">{{ post().category }}</span>
          <small class="post__date">{{
            post().publishedAt || post().createdAt | date: 'mediumDate'
          }}</small>
          <h1>{{ post().titleUa }}</h1>
          <div class="post__content" [innerHTML]="post().contentUa"></div>
        </div>
        @if (post().images?.length) {
          <div class="post__carousel-wrap">
            <app-carousel [images]="post().images" />
          </div>
        }
        @if (post().videoUrl) {
          <div class="post__video-wrap">
            <iframe
              [src]="getEmbedUrl(post().videoUrl)"
              width="100%"
              height="630"
              frameborder="0"
              allowfullscreen
            ></iframe>
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
    `,
  ],
})
export class BlogPostComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly sanitizer = inject(DomSanitizer);

  post = signal<any>(null);

  ngOnInit(): void {
    // read from resolver data — available synchronously during SSR
    const data = this.route.snapshot.data['post'];
    this.post.set(data);
    this.setMetaTags(data);
  }

  private setMetaTags(post: any): void {
    const pageTitle = `${post.titleUa} — CSD`;
    const description = post.excerptUa || post.contentUa?.slice(0, 160) || '';
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
}

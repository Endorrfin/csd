import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [DatePipe],
  template: `
    <h1>Blog</h1>
    @for (post of posts; track post.id) {
      <article class="post-card">
        <h2>{{ isUa ? post.titleUa : post.titleEn }}</h2>
        <p>{{ isUa ? post.excerptUa : post.excerptEn }}</p>
        <small>{{ post.createdAt | date }}</small>
      </article>
    }
  `,
  styles: [`
    .post-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .post-card h2 { color: #1a365d; margin-bottom: 0.5rem; }
    .post-card small { color: #718096; }
  `],
})
export class BlogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  posts: any[] = [];
  get isUa() { return (this.translate.currentLang || 'ua') === 'ua'; }

  ngOnInit() {
    this.api.get<any[]>('blog').subscribe((data) => (this.posts = data));
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-cooperation',
  standalone: true,
  template: `
    <h1>{{ isUa ? 'Співпраця' : 'Cooperation' }}</h1>
    @for (item of items; track item.id) {
      <div class="coop-card">
        <span class="coop-card__type">{{ item.type }}</span>
        <span class="coop-card__status">{{ item.status }}</span>
        <h3>{{ isUa ? item.titleUa : item.titleEn }}</h3>
        <p>{{ isUa ? item.descriptionUa : item.descriptionEn }}</p>
        @if (item.location) { <small>📍 {{ item.location }}</small> }
      </div>
    }
  `,
  styles: [`
    .coop-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .coop-card__type {
      background: #ebf8ff;
      color: #2b6cb0;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      text-transform: uppercase;
      margin-right: 0.5rem;
    }
    .coop-card__status {
      background: #f0fff4;
      color: #276749;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }
    .coop-card h3 { color: #1a365d; margin: 0.75rem 0 0.5rem; }
    .coop-card small { color: #718096; }
  `],
})
export class CooperationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  items: any[] = [];
  get isUa() { return (this.translate.currentLang || 'ua') === 'ua'; }

  ngOnInit() {
    this.api.get<any[]>('cooperation').subscribe((data) => (this.items = data));
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-partners',
  standalone: true,
  template: `
    <h1>{{ isUa ? 'Партнери та донори' : 'Partners & Donors' }}</h1>
    @for (p of partners; track p.id) {
      <div class="partner-card">
        <h3>{{ isUa ? p.nameUa : p.nameEn }}</h3>
        <p>{{ isUa ? p.descriptionUa : p.descriptionEn }}</p>
        @if (p.websiteUrl) {
          <a [href]="p.websiteUrl" target="_blank">Website</a>
        }
      </div>
    }
  `,
  styles: [`
    .partner-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
    }
    .partner-card h3 { color: #1a365d; }
    .partner-card a { color: #2b6cb0; }
  `],
})
export class PartnersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  partners: any[] = [];
  get isUa() { return (this.translate.currentLang || 'ua') === 'ua'; }

  ngOnInit() {
    this.api.get<any[]>('partners').subscribe((data) => (this.partners = data));
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h1>{{ title }}</h1>
    <div [innerHTML]="content">
      <p>Ми – Благодійна організація «Благодійний фонд «Центр підтримки та розвитку».</p>
      <p>Можливо ви про нас не чули, проте наша команда роками працювала на сході України, надаючи підтримку найвразливішим верствам населення.</p>
    </div>
  `,
})
export class AboutComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  title = '';
  content = '';

  ngOnInit() {
    this.api.get<any>('pages/about').subscribe((page) => {
      const lang = this.translate.currentLang || 'ua';
      this.title = lang === 'ua' ? page.titleUa : page.titleEn;
      this.content = lang === 'ua' ? page.contentUa : page.contentEn;
    });
  }
}

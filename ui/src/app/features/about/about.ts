import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ApiService } from '../../core/services/api.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <h1>{{ title() }}</h1>
    <div [innerHTML]="content()"></div>
  `,
})
export class AboutComponent {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  // CHANGE: toSignal — works both on server and client
  private readonly page = toSignal(this.api.get<any>('pages/about'));

  title = computed(() => {
    const page = this.page();
    if (!page) return '';
    const lang = this.translate.currentLang || 'ua';
    return lang === 'ua' ? page.titleUa : page.titleEn;
  });

  content = computed(() => {
    const page = this.page();
    if (!page) return '';
    const lang = this.translate.currentLang || 'ua';
    return lang === 'ua' ? page.contentUa : page.contentEn;
  });
}

import { Component, afterNextRender, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './core/services/language.service';
import { HeaderComponent } from './layout/header/header';
import { FooterComponent } from './layout/footer/footer';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `
    <app-header />
    <main class="main">
      <router-outlet />
    </main>
    <app-footer />
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
      }
      .main {
        flex: 1;
        max-width: 1200px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem 1rem;
      }
    `,
  ],
})
export class App {
  protected readonly title = signal('ui');
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  constructor() {
    this.translate.addLangs(['ua', 'en']);
    this.translate.use('ua');
    // CHANGED: SSR and the first client render are always UA; apply the saved language only
    // after hydration, otherwise text would differ from the server HTML (NG0500).
    afterNextRender(() => {
      const saved = this.language.readSaved();
      if (saved && saved !== this.language.lang()) {
        this.translate.use(saved);
      }
    });
  }
}

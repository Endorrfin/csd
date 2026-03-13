import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
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
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    .main {
      flex: 1;
      overflow-y: auto;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
  `],
})
export class App {
  protected readonly title = signal('ui');

  constructor(private translate: TranslateService) {
    translate.addLangs(['ua', 'en']);
    translate.use('ua');
  }

}

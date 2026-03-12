import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <section class="hero">
      <h1>{{ 'HOME.TITLE' | translate }}</h1>
      <p>{{ 'HOME.SUBTITLE' | translate }}</p>
    </section>
  `,
  styles: [`
    .hero {
      text-align: center;
      padding: 4rem 0;
    }
    .hero h1 {
      font-size: 2rem;
      color: #1a365d;
      margin-bottom: 1rem;
    }
    .hero p {
      font-size: 1.25rem;
      color: #4a5568;
    }
  `],
})
export class HomeComponent {}

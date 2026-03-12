import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslateModule],
  template: `
    <footer class="footer">
      <div class="footer__container">
        <p>&copy; {{ year }} {{ 'FOOTER.TITLE' | translate }}. {{ 'FOOTER.RIGHTS' | translate }}</p>
      </div>
    </footer>
  `,
  styles: [`
    .footer {
      background: #1a365d;
      color: rgba(255, 255, 255, 0.7);
      padding: 1.5rem 1rem;
      text-align: center;
      font-size: 0.875rem;
    }
    .footer__container {
      max-width: 1200px;
      margin: 0 auto;
    }
  `],
})
export class FooterComponent {
  year = new Date().getFullYear();
}

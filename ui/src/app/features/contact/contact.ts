import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-contact',
  standalone: true,
  template: `
    <h1>{{ isUa ? 'Контакти' : 'Contacts' }}</h1>
    <div class="contact-info">
      <p><strong>Email:</strong> office.ua.csd&#64;gmail.com</p>
      <p><strong>{{ isUa ? 'Адреса' : 'Address' }}:</strong> {{ isUa ? 'Україна' : 'Ukraine' }}</p>
    </div>
  `,
  styles: [`
    .contact-info {
      background: #f7fafc;
      border-radius: 8px;
      padding: 2rem;
      max-width: 600px;
    }
    .contact-info p { margin-bottom: 0.75rem; }
  `],
})
export class ContactComponent {
  private readonly translate = inject(TranslateService);
  get isUa() { return (this.translate.currentLang || 'ua') === 'ua'; }
}

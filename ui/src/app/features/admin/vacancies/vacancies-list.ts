// ui/src/app/features/admin/vacancies/vacancies-list.ts
import { Component, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-vacancies-list',
  standalone: true,
  template: `
    <div class="placeholder">
      <h2>{{ isUa ? 'Вакансії' : 'Vacancies' }}</h2>
      <p>{{ isUa ? 'Розділ у розробці (Крок 5 Roadmap)' : 'Section under development (Roadmap Step 5)' }}</p>
    </div>
  `,
  styles: [`
    .placeholder { padding: 3rem 1rem; text-align: center; color: #64748b; }
    .placeholder h2 { font-size: 1.35rem; color: #1a365d; margin: 0 0 .5rem; }
    .placeholder p { font-size: .9rem; margin: 0; }
  `],
})
export class AdminVacanciesListComponent {
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }
}

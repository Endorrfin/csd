import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

interface VacancySummary {
  id: string;
  titleUa: string;
  titleEn: string;
  employmentType: string;
  region: string | null;
  applicationDeadline: string | null;
  salary: string | null;
}

@Component({
  selector: 'app-vacancy-list',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe],
  template: `
    <div class="vacancy-list">
      <div class="vacancy-list__header">
        <div>
          <h2>{{ 'vacancy.list.title' | translate }}</h2>
          <p class="subtitle">{{ 'vacancy.list.subtitle' | translate }}</p>
        </div>
        @if (auth.isManager) {
          <a routerLink="new" class="btn-primary">
            + {{ 'vacancy.list.createNew' | translate }}
          </a>
        }
      </div>

      @if (loading()) {
        <p class="state-msg">{{ 'common.loading' | translate }}</p>
      } @else if (vacancies().length === 0) {
        <p class="state-msg">{{ 'vacancy.list.empty' | translate }}</p>
      } @else {
        <div class="vacancy-grid">
          @for (v of vacancies(); track v.id) {
            <a [routerLink]="v.id" class="vacancy-card">
              <span class="vacancy-card__badge">
                {{ 'vacancy.employmentType.' + v.employmentType | translate }}
              </span>
              <h3>{{ lang === 'ua' ? v.titleUa : v.titleEn }}</h3>
              @if (v.region) {
                <p class="vacancy-card__meta">📍 {{ v.region }}</p>
              }
              @if (v.applicationDeadline) {
                <p class="vacancy-card__meta">
                  📅 {{ 'vacancy.list.deadline' | translate }}:
                  {{ v.applicationDeadline | date:'dd.MM.yyyy' }}
                </p>
              }
              @if (v.salary) {
                <p class="vacancy-card__meta">💰 {{ v.salary }}</p>
              }
            </a>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .vacancy-list {
      &__header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        gap: 1rem;
        h2 { font-size: 1.375rem; color: #1a365d; margin: 0 0 0.25rem; }
        .subtitle { color: #718096; font-size: 0.875rem; margin: 0; }
      }
    }
    .vacancy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .vacancy-card {
      display: block;
      padding: 1.25rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: box-shadow 0.15s;
      &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.1); border-color: #bee3f8; }
      &__badge {
        display: inline-block;
        font-size: 0.75rem;
        padding: 0.2rem 0.5rem;
        border-radius: 9999px;
        background: #ebf8ff;
        color: #2b6cb0;
        margin-bottom: 0.625rem;
      }
      h3 { font-size: 1rem; margin: 0 0 0.5rem; color: #1a365d; }
      &__meta { font-size: 0.875rem; color: #718096; margin: 0.2rem 0 0; }
    }
    .btn-primary {
      padding: 0.5rem 1rem;
      background: #2b6cb0;
      color: #fff;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      white-space: nowrap;
    }
    .state-msg { color: #718096; }
  `],
})
export class VacancyListComponent implements OnInit {
  private api = inject(ApiService);
  private translate = inject(TranslateService);
  protected auth = inject(AuthService);

  protected vacancies = signal<VacancySummary[]>([]);
  protected loading = signal(true);
  protected get lang(): string { return this.translate.currentLang ?? 'ua'; }

  // ngOnInit(): void {
  //   this.http.get<VacancySummary[]>(`${environment.apiUrl}/vacancies`).subscribe({
  //     next: (data) => { this.vacancies.set(data); this.loading.set(false); },
  //     error: () => this.loading.set(false),
  //   });
  // }

  ngOnInit(): void {
    this.api
      .get<VacancySummary[]>(`vacancies`).subscribe({
      next: (data) => { this.vacancies.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

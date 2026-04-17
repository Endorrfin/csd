import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface VacancyDetail {
  id: string;
  titleUa: string;
  titleEn: string;
  descriptionUa: string;
  descriptionEn: string;
  requirementsUa: string | null;
  requirementsEn: string | null;
  employmentType: string;
  region: string | null;
  district: string | null;
  community: string | null;
  settlement: string | null;
  applicationDeadline: string | null;
  salary: string | null;
  publishedAt: string | null;
}

@Component({
  selector: 'app-vacancy-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule, DatePipe],
  template: `
    <div class="vacancy-detail">
      <div class="vacancy-detail__nav">
        <a routerLink=".." class="back-link">← {{ 'common.back' | translate }}</a>
        @if (auth.isManager && vacancy()) {
          <a [routerLink]="['..', vacancy()!.id, 'edit']" class="btn-edit">
            ✏️ {{ 'vacancy.detail.edit' | translate }}
          </a>
        }
      </div>

      @if (loading()) {
        <p>{{ 'common.loading' | translate }}</p>
      } @else if (!vacancy()) {
        <p>{{ 'procurement.common.notFound' | translate }}</p>
      } @else {
        <article class="vacancy-detail__body">
          <div class="vacancy-detail__meta-bar">
            <span class="badge">
              {{ 'vacancy.employmentType.' + vacancy()!.employmentType | translate }}
            </span>
            @if (vacancy()!.applicationDeadline) {
              <span class="meta-item">
                📅 {{ 'vacancy.detail.deadline' | translate }}:
                {{ vacancy()!.applicationDeadline | date:'dd.MM.yyyy' }}
              </span>
            }
            @if (vacancy()!.salary) {
              <span class="meta-item">💰 {{ vacancy()!.salary }}</span>
            }
          </div>

          <h1>{{ lang === 'ua' ? vacancy()!.titleUa : vacancy()!.titleEn }}</h1>

          @if (vacancy()!.region) {
            <p class="location">
              📍 {{ vacancy()!.region }}
              @if (vacancy()!.district) { · {{ vacancy()!.district }} }
              @if (vacancy()!.community) { · {{ vacancy()!.community }} }
              @if (vacancy()!.settlement) { · {{ vacancy()!.settlement }} }
            </p>
          }

          <section class="vacancy-detail__section">
            <div [innerHTML]="lang === 'ua' ? vacancy()!.descriptionUa : vacancy()!.descriptionEn"></div>
          </section>

          @if (vacancy()!.requirementsUa || vacancy()!.requirementsEn) {
            <section class="vacancy-detail__section">
              <h3>{{ 'vacancy.detail.requirements' | translate }}</h3>
              <div [innerHTML]="lang === 'ua' ? vacancy()!.requirementsUa : vacancy()!.requirementsEn"></div>
            </section>
          }
        </article>
      }
    </div>
  `,
  styles: [`
    .vacancy-detail {
      max-width: 720px;
      &__nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }
      &__meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      h1 { font-size: 1.5rem; color: #1a365d; margin: 0 0 0.5rem; }
      .location { color: #718096; font-size: 0.875rem; margin-bottom: 1.25rem; }
      &__section {
        margin-top: 1.5rem;
        h3 { font-size: 1rem; color: #2d3748; margin-bottom: 0.5rem; }
      }
    }
    .back-link { color: #4a5568; text-decoration: none; font-size: 0.875rem; }
    .btn-edit {
      padding: 0.375rem 0.875rem;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      text-decoration: none;
      font-size: 0.875rem;
      color: #4a5568;
    }
    .badge {
      display: inline-block;
      font-size: 0.75rem;
      padding: 0.2rem 0.5rem;
      border-radius: 9999px;
      background: #ebf8ff;
      color: #2b6cb0;
    }
    .meta-item { font-size: 0.875rem; color: #718096; }
  `],
})
export class VacancyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private translate = inject(TranslateService);
  protected auth = inject(AuthService);

  protected vacancy = signal<VacancyDetail | null>(null);
  protected loading = signal(true);
  protected get lang(): string { return this.translate.currentLang ?? 'ua'; }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.http.get<VacancyDetail>(`${environment.apiUrl}/vacancies/${id}`).subscribe({
      next: (data) => { this.vacancy.set(data); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}

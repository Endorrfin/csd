import { Component, inject, signal, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, SlicePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Procurement } from './procurement.interfaces';


@Component({
  selector: 'app-procurement-detail',
  standalone: true,
  imports: [RouterLink, TranslateModule, SlicePipe],
  template: `
    <div class="pd">
      @if (isLoading()) {
        <div class="pd__loading">{{ 'common.loading' | translate }}</div>
      } @else if (item()) {
        <div class="pd__header">
          <a routerLink="../" class="pd__back">← {{ 'procurement.list.title' | translate }}</a>

          <div class="pd__badges">
            @if (item()!.procurementMethod) {
              <span class="badge badge--method">
                {{ 'procurement.method.' + item()!.procurementMethod | translate }}
              </span>
            }
            @if (item()!.procurementCategory) {
              <span class="badge badge--category">
                {{ 'procurement.category.' + item()!.procurementCategory | translate }}
              </span>
            }
            <span class="badge" [class]="'badge--' + item()!.status">
              {{ 'procurement.status.' + item()!.status | translate }}
            </span>
          </div>

          <h1 class="pd__title">
            {{ isUa ? item()!.tenderTitleUa : item()!.tenderTitleEn }}
          </h1>

          <!-- Edit button for manager and above -->
          @if (canManage()) {
            <a [routerLink]="['../', item()!.id, 'edit']" class="btn btn--secondary">
              ✏️ {{ 'procurement.common.edit' | translate }}
            </a>
          }
        </div>

        <!-- Section: Identification -->
        <section class="pd__section">
          <h2>{{ 'procurement.steps.basicInfo' | translate }}</h2>
          <div class="pd__grid">
            @if (item()!.referenceNumber) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.referenceNumber' | translate }}</span>
                <span>{{ item()!.referenceNumber }}</span>
              </div>
            }
            @if (item()!.donor) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.donor' | translate }}</span>
                <span>{{ item()!.donor }}</span>
              </div>
            }
            @if (item()!.projectName) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.projectName' | translate }}</span>
                <span>{{ item()!.projectName }}</span>
              </div>
            }
            @if (item()!.projectCode) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.projectCode' | translate }}</span>
                <span>{{ item()!.projectCode }}</span>
              </div>
            }
            @if (item()!.implementingOrganization) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.implementingOrganization' | translate }}</span>
                <span>{{ item()!.implementingOrganization }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Section: Short description -->
        @if (item()!.shortDescriptionUa || item()!.shortDescriptionEn) {
          <section class="pd__section">
            <h2>{{ 'procurement.steps.technical' | translate }}</h2>
            <p class="pd__description">
              {{ isUa ? item()!.shortDescriptionUa : item()!.shortDescriptionEn }}
            </p>

            <!-- Rich text (HTML from Quill) — rendered only in browser -->
            @if (isBrowser && (item()!.detailedDescriptionUa || item()!.detailedDescriptionEn)) {
              <div class="pd__rich-text"
                   [innerHTML]="isUa ? item()!.detailedDescriptionUa : item()!.detailedDescriptionEn">
              </div>
            }
          </section>
        }

        <!-- Section: Timeline -->
        <section class="pd__section">
          <h2>{{ 'procurement.steps.timeline' | translate }}</h2>
          <div class="pd__grid">
            @if (item()!.publicationDate) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.publicationDate' | translate }}</span>
                <span>{{ item()!.publicationDate | slice: 0 : 10 }}</span>
              </div>
            }
            @if (item()!.clarificationDeadline) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.clarificationDeadline' | translate }}</span>
                <span>{{ item()!.clarificationDeadline | slice: 0 : 10 }}</span>
              </div>
            }
            @if (item()!.bidSubmissionDeadline) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.bidSubmissionDeadline' | translate }}</span>
                <span class="pd__deadline">📅 {{ item()!.bidSubmissionDeadline | slice: 0 : 10 }}</span>
              </div>
            }
            @if (item()!.expectedStartDate) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.expectedStartDate' | translate }}</span>
                <span>{{ item()!.expectedStartDate | slice: 0 : 10 }}</span>
              </div>
            }
            @if (item()!.implementationPeriodDays) {
              <div class="pd__field">
                <span class="pd__label">{{ 'procurement.form.implementationPeriodDays' | translate }}</span>
                <span>{{ item()!.implementationPeriodDays }} {{ 'common.days' | translate }}</span>
              </div>
            }
          </div>
        </section>

        <!-- Section: Submission -->
        @if (item()!.submissionEmail || item()!.submissionMethods?.length) {
          <section class="pd__section">
            <h2>{{ 'procurement.form.submissionMethods' | translate }}</h2>
            <div class="pd__grid">
              @if (item()!.submissionEmail) {
                <div class="pd__field">
                  <span class="pd__label">{{ 'procurement.form.submissionEmail' | translate }}</span>
                  <a [href]="'mailto:' + item()!.submissionEmail" class="pd__link">
                    {{ item()!.submissionEmail }}
                  </a>
                </div>
              }
              @if (item()!.fileRequirements) {
                <div class="pd__field">
                  <span class="pd__label">{{ 'procurement.form.fileRequirements' | translate }}</span>
                  <span>{{ item()!.fileRequirements }}</span>
                </div>
              }
            </div>
          </section>
        }

        <!-- Section: Evaluation criteria -->
        @if (item()!.evaluationCriteria?.length) {
          <section class="pd__section">
            <h2>{{ 'procurement.form.evaluationCriteria' | translate }}</h2>
            <table class="pd__table">
              <thead>
                <tr>
                  <th>{{ isUa ? 'Критерій' : 'Criteria' }}</th>
                  <th>{{ 'procurement.form.weight' | translate }} %</th>
                </tr>
              </thead>
              <tbody>
                @for (c of item()!.evaluationCriteria; track $index) {
                  <tr>
                    <td>{{ isUa ? c.criteriaUa : c.criteriaEn }}</td>
                    <td>{{ c.weight }}%</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }

        <!-- Section: Attachments -->
        @if (item()!.attachments?.length) {
          <section class="pd__section">
            <h2>{{ 'procurement.steps.attachments' | translate }}</h2>
            <div class="pd__attachments">
              @for (a of item()!.attachments; track $index) {
                <a [href]="a.url" target="_blank" rel="noopener" class="pd__attachment">
                  📎 {{ a.name }}
                  @if (a.fileType) { <span class="pd__filetype">{{ a.fileType }}</span> }
                </a>
              }
            </div>
          </section>
        }
      } @else {
        <div class="pd__loading">{{ 'common.notFound' | translate }}</div>
      }
    </div>
  `,
  styles: [`
    .pd {
      max-width: 860px;
      margin: 2rem auto;
      padding: 0 1rem;

      &__loading { text-align: center; padding: 3rem; color: #718096; }

      &__back {
        display: inline-block;
        color: #4299e1;
        text-decoration: none;
        font-size: 0.9375rem;
        margin-bottom: 1rem;
        &:hover { text-decoration: underline; }
      }

      &__header {
        margin-bottom: 2rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.75rem;
      }

      &__badges { display: flex; gap: 0.5rem; flex-wrap: wrap; }

      &__title { font-size: 1.625rem; color: #1a365d; margin: 0; }

      &__section {
        margin-bottom: 2rem;
        padding-bottom: 2rem;
        border-bottom: 1px solid #edf2f7;

        h2 {
          font-size: 1.0625rem;
          color: #2d3748;
          margin-bottom: 1rem;
          padding-bottom: 0.375rem;
          border-bottom: 2px solid #ebf8ff;
        }
      }

      &__grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        @media (max-width: 600px) { grid-template-columns: 1fr; }
      }

      &__field { display: flex; flex-direction: column; gap: 0.25rem; }

      &__label { font-size: 0.8125rem; color: #718096; font-weight: 500; }

      &__description { color: #4a5568; line-height: 1.7; }

      &__rich-text {
        margin-top: 1rem;
        color: #4a5568;
        line-height: 1.7;

        h1, h2, h3 { color: #1a365d; margin: 1rem 0 0.5rem; }
        ul, ol { padding-left: 1.5rem; }
        a { color: #4299e1; }
      }

      &__deadline { color: #c05621; font-weight: 500; }

      &__link { color: #4299e1; text-decoration: none; &:hover { text-decoration: underline; } }

      &__table {
        width: 100%;
        border-collapse: collapse;

        th, td {
          text-align: left;
          padding: 0.625rem 0.75rem;
          border-bottom: 1px solid #edf2f7;
          font-size: 0.9375rem;
        }

        th { color: #718096; font-size: 0.8125rem; background: #f7fafc; }
      }

      &__attachments { display: flex; flex-direction: column; gap: 0.5rem; }

      &__attachment {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: #4299e1;
        text-decoration: none;
        padding: 0.5rem 0.75rem;
        border: 1px solid #bee3f8;
        border-radius: 6px;
        font-size: 0.9375rem;
        width: fit-content;
        &:hover { background: #ebf8ff; }
      }

      &__filetype {
        font-size: 0.75rem;
        color: #718096;
        background: #edf2f7;
        padding: 0.125rem 0.375rem;
        border-radius: 4px;
      }
    }

    .badge {
      display: inline-flex;
      padding: 0.2rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;

      &--method { background: #ebf8ff; color: #2b6cb0; }
      &--category { background: #faf5ff; color: #553c9a; }
      &--draft { background: #fefcbf; color: #744210; }
      &--published { background: #f0fff4; color: #276749; }
      &--closed { background: #fff5f5; color: #c53030; }
    }

    .btn {
      padding: 0.5rem 1.125rem;
      border-radius: 6px;
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid #cbd5e0;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      background: white;
      color: #4a5568;
      transition: background 0.15s;

      &--secondary:hover { background: #f7fafc; }
    }
  `],
})
export class ProcurementDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly item = signal<Procurement | null>(null);
  readonly isLoading = signal(true);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  canManage(): boolean {
    return this.auth.isManager;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get<Procurement>(`procurement/${id}`).subscribe({
      next: (data) => {
        this.item.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }
}

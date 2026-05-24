import { Component, inject, signal, PLATFORM_ID, OnInit } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormGroup, FormControl, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuillModule } from 'ngx-quill';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import {
  ProcurementDonor,
  ProcurementMethod,
  ProcurementCategory,
  LotStructure,
  SubmissionMethod,
  ProcurementStatus,
  Procurement,
} from './procurement.interfaces';
import { QUILL_MODULES } from '../../../shared/config/quill.config';

@Component({
  selector: 'app-procurement-form',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule, TranslateModule],
  template: `
    <div class="pf">
      <h2 class="pf__title">
        {{ (editId() ? 'procurement.form.editTitle' : 'procurement.form.createTitle') | translate }}
      </h2>

      <!-- ─── Stepper ─── -->
      <div class="stepper">
        @for (step of steps; track step.n) {
          <div
            class="stepper__item"
            [class.stepper__item--active]="currentStep() === step.n"
            [class.stepper__item--completed]="currentStep() > step.n"
          >
            <div class="stepper__circle">{{ step.n }}</div>
            <span class="stepper__label">{{ step.labelKey | translate }}</span>
          </div>
          @if (step.n < totalSteps) {
            <div class="stepper__line" [class.stepper__line--done]="currentStep() > step.n"></div>
          }
        }
      </div>

      <form [formGroup]="form" class="pf__body">
        <!-- ─── Step 1: Basic Information ─── -->
        @if (currentStep() === 1) {
          <section class="fs">
            <h3>{{ 'procurement.steps.basicInfo' | translate }}</h3>

            <div class="form-row">
              <div class="fg fg--required">
                <label for="tenderTitleUa">{{
                  'procurement.form.tenderTitleUa' | translate
                }}</label>
                <input
                  id="tenderTitleUa"
                  formControlName="tenderTitleUa"
                  placeholder="{{ 'procurement.form.tenderTitleUaPlaceholder' | translate }}"
                />
                @if (f['tenderTitleUa'].invalid && f['tenderTitleUa'].touched) {
                  <span class="fe">{{ 'validation.required' | translate }}</span>
                }
              </div>
              <div class="fg fg--required">
                <label for="tenderTitleEn">{{
                  'procurement.form.tenderTitleEn' | translate
                }}</label>
                <input
                  id="tenderTitleEn"
                  formControlName="tenderTitleEn"
                  placeholder="Supply and Installation of Water Treatment Units"
                />
                @if (f['tenderTitleEn'].invalid && f['tenderTitleEn'].touched) {
                  <span class="fe">{{ 'validation.required' | translate }}</span>
                }
              </div>
            </div>

            <div class="form-row">
              <div class="fg">
                <label for="referenceNumber">{{
                  'procurement.form.referenceNumber' | translate
                }}</label>
                <input
                  id="referenceNumber"
                  formControlName="referenceNumber"
                  placeholder="UKR-WASH-2026-001"
                />
              </div>
              <div class="fg">
                <label for="donor">{{ 'procurement.form.donor' | translate }}</label>
                <select id="donor" formControlName="donor">
                  <option value="">—</option>
                  @for (d of donors; track d) {
                    <option [value]="d">{{ d }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="fg">
                <label for="projectName">{{ 'procurement.form.projectName' | translate }}</label>
                <input
                  id="projectName"
                  formControlName="projectName"
                  placeholder="Emergency WASH Response 2026"
                />
              </div>
              <div class="fg">
                <label for="projectCode">{{ 'procurement.form.projectCode' | translate }}</label>
                <input
                  id="projectCode"
                  formControlName="projectCode"
                  placeholder="WASH-UKR-23-4567"
                />
              </div>
            </div>

            <div class="fg">
              <label for="implementingOrganization">{{
                'procurement.form.implementingOrganization' | translate
              }}</label>
              <input
                id="implementingOrganization"
                formControlName="implementingOrganization"
                placeholder="{{ 'procurement.form.implementingOrgPlaceholder' | translate }}"
              />
            </div>
          </section>
        }

        <!-- ─── Step 2: Procurement Details ─── -->
        @if (currentStep() === 2) {
          <section class="fs">
            <h3>{{ 'procurement.steps.details' | translate }}</h3>

            <div class="form-row">
              <div class="fg">
                <label for="procurementMethod">{{
                  'procurement.form.procurementMethod' | translate
                }}</label>
                <select id="procurementMethod" formControlName="procurementMethod">
                  <option value="">—</option>
                  <option value="open_tender">
                    {{ 'procurement.method.open_tender' | translate }}
                  </option>
                  <option value="rfq">{{ 'procurement.method.rfq' | translate }}</option>
                  <option value="rfp">{{ 'procurement.method.rfp' | translate }}</option>
                </select>
              </div>
              <div class="fg">
                <label for="procurementCategory">{{
                  'procurement.form.procurementCategory' | translate
                }}</label>
                <select id="procurementCategory" formControlName="procurementCategory">
                  <option value="">—</option>
                  <option value="goods">{{ 'procurement.category.goods' | translate }}</option>
                  <option value="works">{{ 'procurement.category.works' | translate }}</option>
                  <option value="services">
                    {{ 'procurement.category.services' | translate }}
                  </option>
                </select>
              </div>
            </div>

            <div class="fg">
              <span class="fg-label">{{ 'procurement.form.lotStructure' | translate }}</span>
              <div class="radio-group">
                <label class="radio-label">
                  <input type="radio" formControlName="lotStructure" value="single" />
                  {{ 'procurement.lotStructure.single' | translate }}
                </label>
                <label class="radio-label">
                  <input type="radio" formControlName="lotStructure" value="multiple" />
                  {{ 'procurement.lotStructure.multiple' | translate }}
                </label>
              </div>
            </div>
          </section>
        }

        <!-- ─── Step 3: Technical Details ─── -->
        @if (currentStep() === 3) {
          <section class="fs">
            <h3>{{ 'procurement.steps.technical' | translate }}</h3>

            <!-- ── textarea → quill-editor for short descriptions ── -->
            @if (isBrowser) {
              <div class="form-row">
                <div class="fg">
                  <span class="fg-label">{{
                    'procurement.form.shortDescriptionUa' | translate
                  }}</span>
                  <quill-editor
                    formControlName="shortDescriptionUa"
                    [modules]="quillModules"
                    [placeholder]="'procurement.form.shortDescUaPlaceholder' | translate"
                  >
                  </quill-editor>
                </div>
                <div class="fg">
                  <span class="fg-label">{{
                    'procurement.form.shortDescriptionEn' | translate
                  }}</span>
                  <quill-editor
                    formControlName="shortDescriptionEn"
                    [modules]="quillModules"
                    placeholder="Installation of modular water purification systems"
                  >
                  </quill-editor>
                </div>
              </div>
            } @else {
              <!-- SSR fallback: plain textarea, no Quill DOM dependencies -->
              <div class="form-row">
                <div class="fg">
                  <label for="shortDescriptionUa">{{
                    'procurement.form.shortDescriptionUa' | translate
                  }}</label>
                  <textarea
                    id="shortDescriptionUa"
                    formControlName="shortDescriptionUa"
                    rows="3"
                    placeholder="{{ 'procurement.form.shortDescUaPlaceholder' | translate }}"
                  ></textarea>
                </div>
                <div class="fg">
                  <label for="shortDescriptionEn">{{
                    'procurement.form.shortDescriptionEn' | translate
                  }}</label>
                  <textarea
                    id="shortDescriptionEn"
                    formControlName="shortDescriptionEn"
                    rows="3"
                    placeholder="Installation of modular water purification systems"
                  ></textarea>
                </div>
              </div>
            }

            <!-- Quill rendered only in browser — SSR unsafe -->
            @if (isBrowser) {
              <div class="fg">
                <span class="fg-label">{{
                  'procurement.form.detailedDescriptionUa' | translate
                }}</span>
                <quill-editor
                  formControlName="detailedDescriptionUa"
                  [modules]="quillModules"
                  [placeholder]="'procurement.form.detailedDescUaPlaceholder' | translate"
                >
                </quill-editor>
              </div>
              <div class="fg">
                <span class="fg-label">{{
                  'procurement.form.detailedDescriptionEn' | translate
                }}</span>
                <quill-editor
                  formControlName="detailedDescriptionEn"
                  [modules]="quillModules"
                  placeholder="TOR / Scope of Work (English)"
                >
                </quill-editor>
              </div>
            }

            <div class="form-row">
              <div class="fg">
                <label for="region">{{ 'procurement.form.region' | translate }}</label>
                <input
                  id="region"
                  formControlName="region"
                  placeholder="{{ 'procurement.form.regionPlaceholder' | translate }}"
                />
              </div>
              <div class="fg">
                <label for="implementationPeriodDays">{{
                  'procurement.form.implementationPeriodDays' | translate
                }}</label>
                <input
                  id="implementationPeriodDays"
                  type="number"
                  formControlName="implementationPeriodDays"
                  min="1"
                  placeholder="60"
                />
              </div>
            </div>
          </section>
        }

        <!-- ─── Step 4: Timeline & Submission ─── -->
        @if (currentStep() === 4) {
          <section class="fs">
            <h3>{{ 'procurement.steps.timeline' | translate }}</h3>

            <div class="form-row">
              <div class="fg">
                <label for="publicationDate">{{
                  'procurement.form.publicationDate' | translate
                }}</label>
                <!-- No min — historical dates allowed for data migration -->
                <input id="publicationDate" type="date" formControlName="publicationDate" />
              </div>
              <div class="fg">
                <label for="clarificationDeadline">{{
                  'procurement.form.clarificationDeadline' | translate
                }}</label>
                <input
                  id="clarificationDeadline"
                  type="date"
                  formControlName="clarificationDeadline"
                />
              </div>
            </div>

            <div class="form-row">
              <div class="fg">
                <label for="bidSubmissionDeadline">{{
                  'procurement.form.bidSubmissionDeadline' | translate
                }}</label>
                <input
                  id="bidSubmissionDeadline"
                  type="date"
                  formControlName="bidSubmissionDeadline"
                />
              </div>
              <div class="fg">
                <label for="expectedStartDate">{{
                  'procurement.form.expectedStartDate' | translate
                }}</label>
                <!-- No min — historical dates allowed for data migration -->
                <input id="expectedStartDate" type="date" formControlName="expectedStartDate" />
              </div>
            </div>

            <div class="fg">
              <span class="fg-label">{{ 'procurement.form.submissionMethods' | translate }}</span>
              <div class="checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="submissionMethodEmail" />
                  {{ 'procurement.submissionMethod.email' | translate }}
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="submissionMethodCourier" />
                  {{ 'procurement.submissionMethod.courier' | translate }}
                </label>
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="submissionMethodEplatform" />
                  {{ 'procurement.submissionMethod.eplatform' | translate }}
                </label>
              </div>
            </div>

            <div class="form-row">
              <div class="fg">
                <label for="submissionEmail">{{
                  'procurement.form.submissionEmail' | translate
                }}</label>
                <input
                  id="submissionEmail"
                  type="email"
                  formControlName="submissionEmail"
                  placeholder="tender.csd@gmail.com"
                />
              </div>
              <div class="fg">
                <label for="fileRequirements">{{
                  'procurement.form.fileRequirements' | translate
                }}</label>
                <input
                  id="fileRequirements"
                  formControlName="fileRequirements"
                  placeholder="PDF + Excel (BOQ)"
                />
              </div>
            </div>
          </section>
        }

        <!-- ─── Step 5: Evaluation & Compliance ─── -->
        @if (currentStep() === 5) {
          <section class="fs">
            <h3>{{ 'procurement.steps.evaluation' | translate }}</h3>

            <div class="fg">
              <label for="evaluationMethod">{{
                'procurement.form.evaluationMethod' | translate
              }}</label>
              <input
                id="evaluationMethod"
                formControlName="evaluationMethod"
                placeholder="{{ 'procurement.form.evaluationMethodPlaceholder' | translate }}"
              />
            </div>

            <!-- Dynamic evaluation criteria table -->
            <div class="fg">
              <span class="fg-label">{{ 'procurement.form.evaluationCriteria' | translate }}</span>
              <table class="criteria-table" formArrayName="evaluationCriteria">
                <thead>
                  <tr>
                    <th>{{ 'procurement.form.criteriaUa' | translate }}</th>
                    <th>{{ 'procurement.form.criteriaEn' | translate }}</th>
                    <th>{{ 'procurement.form.weight' | translate }} (%)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (ctrl of evaluationCriteria.controls; track $index; let i = $index) {
                    <tr [formGroupName]="i">
                      <td><input formControlName="criteriaUa" /></td>
                      <td><input formControlName="criteriaEn" /></td>
                      <td><input type="number" formControlName="weight" min="0" max="100" /></td>
                      <td>
                        <button type="button" class="btn-icon" (click)="removeCriterion(i)">
                          ✕
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              <button type="button" class="btn-text" (click)="addCriterion()">
                + {{ 'procurement.form.addCriteria' | translate }}
              </button>
            </div>

            <!-- Dynamic eligibility requirements -->
            <div class="fg" formArrayName="eligibilityRequirements">
              <span class="fg-label">{{
                'procurement.form.eligibilityRequirements' | translate
              }}</span>
              @for (ctrl of eligibilityRequirements.controls; track $index; let i = $index) {
                <div class="input-row">
                  <input
                    type="text"
                    [formControlName]="i"
                    placeholder="{{ 'procurement.form.requirementPlaceholder' | translate }}"
                  />
                  <button type="button" class="btn-icon" (click)="removeRequirement(i)">✕</button>
                </div>
              }
              <button type="button" class="btn-text" (click)="addRequirement()">
                + {{ 'procurement.form.addRequirement' | translate }}
              </button>
            </div>
          </section>
        }

        <!-- ─── Step 6: Attachments ─── -->
        @if (currentStep() === 6) {
          <section class="fs">
            <h3>{{ 'procurement.steps.attachments' | translate }}</h3>
            <p class="section-hint">{{ 'procurement.form.attachmentsHint' | translate }}</p>

            <div formArrayName="attachments">
              @for (ctrl of attachments.controls; track $index; let i = $index) {
                <div class="attachment-row" [formGroupName]="i">
                  <input
                    formControlName="name"
                    [placeholder]="'procurement.form.attachmentName' | translate"
                  />
                  <input formControlName="url" placeholder="https://..." />
                  <input formControlName="fileType" placeholder="PDF / Excel" />
                  <button type="button" class="btn-icon" (click)="removeAttachment(i)">✕</button>
                </div>
              }
            </div>
            <button type="button" class="btn-text" (click)="addAttachment()">
              + {{ 'procurement.form.addAttachment' | translate }}
            </button>
          </section>
        }

        <!-- ─── Step 7: Review & Publish ─── -->
        @if (currentStep() === 7) {
          <section class="fs">
            <h3>{{ 'procurement.steps.review' | translate }}</h3>

            <div class="review-card">
              @for (row of reviewRows; track row.key) {
                <div class="review-row">
                  <span class="review-label">{{ row.labelKey | translate }}</span>
                  <span>{{ form.get(row.key)?.value || '—' }}</span>
                </div>
              }
            </div>

            @if (!f['tenderTitleUa'].value || !f['tenderTitleEn'].value) {
              <div class="form-warning">⚠️ {{ 'procurement.form.publishWarning' | translate }}</div>
            }
          </section>
        }
      </form>

      <!-- ─── Navigation ─── -->
      <div class="pf__nav">
        @if (currentStep() > 1) {
          <button type="button" class="btn btn--secondary" (click)="prevStep()">
            ← {{ 'common.back' | translate }}
          </button>
        }
        <div class="pf__nav-right">
          <button
            type="button"
            class="btn btn--ghost"
            [disabled]="isLoading()"
            (click)="saveDraft()"
          >
            {{ 'procurement.form.saveDraft' | translate }}
          </button>
          @if (currentStep() < totalSteps) {
            <button type="button" class="btn btn--primary" (click)="nextStep()">
              {{ 'common.next' | translate }} →
            </button>
          } @else {
            <button
              type="button"
              class="btn btn--publish"
              [disabled]="isLoading()"
              (click)="publish()"
            >
              {{
                isLoading()
                  ? ('common.saving' | translate)
                  : ('procurement.form.publish' | translate)
              }}
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .pf {
        max-width: 900px;
        margin: 2rem auto;
        padding: 0 1rem;

        &__title {
          font-size: 1.75rem;
          color: #1a365d;
          margin-bottom: 2rem;
        }
        &__body {
          margin-bottom: 1.5rem;
        }

        &__nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 1.5rem;
        }

        &__nav-right {
          display: flex;
          gap: 0.75rem;
          margin-left: auto;
        }
      }

      /* Stepper */
      .stepper {
        display: flex;
        align-items: center;
        margin-bottom: 2.5rem;
        overflow-x: auto;
        padding-bottom: 0.25rem;

        &__item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          flex-shrink: 0;

          &--active .stepper__circle {
            background: #2b6cb0;
            color: white;
            border-color: #2b6cb0;
          }
          &--completed .stepper__circle {
            background: #48bb78;
            color: white;
            border-color: #48bb78;
          }
        }

        &__circle {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: 2px solid #cbd5e0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          color: #718096;
          background: white;
        }

        &__label {
          font-size: 0.675rem;
          color: #718096;
          text-align: center;
          max-width: 4.5rem;
        }

        &__line {
          flex: 1;
          height: 2px;
          background: #cbd5e0;
          margin-bottom: 1.375rem;
          min-width: 1.5rem;

          &--done {
            background: #48bb78;
          }
        }
      }

      /* Form section */
      .fs h3 {
        font-size: 1.125rem;
        color: #1a365d;
        margin-bottom: 1.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #ebf8ff;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.25rem;
        margin-bottom: 1.25rem;

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }

      .fg {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
        margin-bottom: 1.25rem;

        &--required label::after,
        &--required .fg-label::after {
          content: ' *';
          color: #e53e3e;
        }

        label,
        .fg-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #4a5568;
        }

        input,
        select,
        textarea {
          padding: 0.625rem 0.875rem;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #2d3748;
          width: 100%;
          box-sizing: border-box;
          transition: border-color 0.15s;
          font-family: inherit;

          &:focus {
            outline: none;
            border-color: #4299e1;
            box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
          }
        }

        textarea {
          resize: vertical;
        }
      }

      .fe {
        font-size: 0.8125rem;
        color: #e53e3e;
      }

      .form-warning {
        padding: 0.75rem 1rem;
        background: #fffbeb;
        border: 1px solid #f6e05e;
        border-radius: 6px;
        color: #744210;
        font-size: 0.875rem;
        margin-top: 1rem;
      }

      .radio-group,
      .checkbox-group {
        display: flex;
        gap: 1.5rem;
        flex-wrap: wrap;
      }

      .radio-label,
      .checkbox-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
        font-size: 0.9375rem;
        color: #2d3748;
      }

      /* Criteria table */
      .criteria-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 0.75rem;

        th {
          text-align: left;
          padding: 0.5rem 0.5rem;
          font-size: 0.8125rem;
          color: #718096;
          border-bottom: 1px solid #e2e8f0;
        }

        td {
          padding: 0.3rem 0.25rem;
          input {
            width: 100%;
            padding: 0.4rem 0.5rem;
            border: 1px solid #cbd5e0;
            border-radius: 4px;
          }
        }
      }

      .input-row {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.5rem;

        input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          font-size: 0.9375rem;
          &:focus {
            outline: none;
            border-color: #4299e1;
          }
        }
      }

      .attachment-row {
        display: grid;
        grid-template-columns: 2fr 3fr 1.5fr auto;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;

        input {
          padding: 0.5rem 0.75rem;
          border: 1px solid #cbd5e0;
          border-radius: 6px;
          font-size: 0.875rem;
          &:focus {
            outline: none;
            border-color: #4299e1;
          }
        }

        @media (max-width: 600px) {
          grid-template-columns: 1fr;
        }
      }

      .section-hint {
        font-size: 0.875rem;
        color: #718096;
        margin-bottom: 1rem;
      }

      /* Review */
      .review-card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
      }

      .review-row {
        display: grid;
        grid-template-columns: 220px 1fr;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #f7fafc;
        &:last-child {
          border-bottom: none;
        }
      }

      .review-label {
        font-size: 0.875rem;
        color: #718096;
        font-weight: 500;
      }

      /* Buttons */
      .btn {
        padding: 0.625rem 1.5rem;
        border-radius: 6px;
        font-size: 0.9375rem;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition:
          background 0.15s,
          opacity 0.15s;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        &--primary {
          background: #2b6cb0;
          color: white;
          &:hover:not(:disabled) {
            background: #2c5282;
          }
        }
        &--secondary {
          background: #e2e8f0;
          color: #4a5568;
          &:hover {
            background: #cbd5e0;
          }
        }
        &--ghost {
          background: transparent;
          color: #4a5568;
          border: 1px solid #cbd5e0;
          &:hover {
            background: #f7fafc;
          }
        }
        &--publish {
          background: #276749;
          color: white;
          &:hover:not(:disabled) {
            background: #22543d;
          }
        }
      }

      .btn-icon {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.25rem 0.5rem;
        color: #a0aec0;
        transition: color 0.15s;
        &:hover {
          color: #e53e3e;
        }
      }

      .btn-text {
        background: none;
        border: none;
        cursor: pointer;
        color: #4299e1;
        font-size: 0.875rem;
        padding: 0;
        margin-top: 0.5rem;
        &:hover {
          text-decoration: underline;
        }
      }
    `,
  ],
})
export class ProcurementFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly isBrowser = isPlatformBrowser(this.platformId);
  readonly currentStep = signal(1);
  readonly totalSteps = 7;
  readonly isLoading = signal(false);
  readonly editId = signal<string | null>(null);

  readonly steps = [
    { n: 1, labelKey: 'procurement.steps.basicInfo' },
    { n: 2, labelKey: 'procurement.steps.details' },
    { n: 3, labelKey: 'procurement.steps.technical' },
    { n: 4, labelKey: 'procurement.steps.timeline' },
    { n: 5, labelKey: 'procurement.steps.evaluation' },
    { n: 6, labelKey: 'procurement.steps.attachments' },
    { n: 7, labelKey: 'procurement.steps.review' },
  ];

  // Summary rows shown in Step 7 review
  readonly reviewRows = [
    { key: 'tenderTitleUa', labelKey: 'procurement.form.tenderTitleUa' },
    { key: 'tenderTitleEn', labelKey: 'procurement.form.tenderTitleEn' },
    { key: 'referenceNumber', labelKey: 'procurement.form.referenceNumber' },
    { key: 'donor', labelKey: 'procurement.form.donor' },
    { key: 'procurementMethod', labelKey: 'procurement.form.procurementMethod' },
    { key: 'procurementCategory', labelKey: 'procurement.form.procurementCategory' },
    { key: 'bidSubmissionDeadline', labelKey: 'procurement.form.bidSubmissionDeadline' },
    { key: 'submissionEmail', labelKey: 'procurement.form.submissionEmail' },
  ];

  readonly quillModules = QUILL_MODULES;
  readonly donors = Object.values(ProcurementDonor);

  form = new FormGroup({
    // Step 1
    tenderTitleUa: new FormControl('', Validators.required),
    tenderTitleEn: new FormControl('', Validators.required),
    referenceNumber: new FormControl(''),
    donor: new FormControl<ProcurementDonor | ''>(''),
    projectName: new FormControl(''),
    projectCode: new FormControl(''),
    implementingOrganization: new FormControl(''),
    // Step 2
    procurementMethod: new FormControl<ProcurementMethod | ''>(''),
    procurementCategory: new FormControl<ProcurementCategory | ''>(''),
    lotStructure: new FormControl<LotStructure>(LotStructure.SINGLE),
    // Step 3
    shortDescriptionUa: new FormControl(''),
    shortDescriptionEn: new FormControl(''),
    detailedDescriptionUa: new FormControl(''),
    detailedDescriptionEn: new FormControl(''),
    region: new FormControl(''),
    implementationPeriodDays: new FormControl<number | null>(null),
    // Step 4 — no min date: historical dates allowed
    publicationDate: new FormControl(''),
    clarificationDeadline: new FormControl(''),
    bidSubmissionDeadline: new FormControl(''),
    expectedStartDate: new FormControl(''),
    submissionEmail: new FormControl('', Validators.email),
    submissionMethodEmail: new FormControl(false),
    submissionMethodCourier: new FormControl(false),
    submissionMethodEplatform: new FormControl(false),
    fileRequirements: new FormControl(''),
    // Step 5
    evaluationMethod: new FormControl(''),
    evaluationCriteria: new FormArray<FormGroup>([]),
    eligibilityRequirements: new FormArray<FormControl>([]),
    // Step 6
    attachments: new FormArray<FormGroup>([]),
  });

  // Convenience accessor for template
  get f() {
    return this.form.controls;
  }

  get evaluationCriteria(): FormArray<FormGroup> {
    return this.form.get('evaluationCriteria') as FormArray<FormGroup>;
  }

  get eligibilityRequirements(): FormArray<FormControl> {
    return this.form.get('eligibilityRequirements') as FormArray<FormControl>;
  }

  get attachments(): FormArray<FormGroup> {
    return this.form.get('attachments') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editId.set(id);
      this.loadExisting(id);
    }
    // Default: one empty criterion row
    this.addCriterion();
  }

  addCriterion(): void {
    this.evaluationCriteria.push(
      new FormGroup({
        criteriaUa: new FormControl(''),
        criteriaEn: new FormControl(''),
        weight: new FormControl<number>(0),
      }),
    );
  }

  removeCriterion(index: number): void {
    this.evaluationCriteria.removeAt(index);
  }

  addRequirement(): void {
    this.eligibilityRequirements.push(new FormControl(''));
  }

  removeRequirement(index: number): void {
    this.eligibilityRequirements.removeAt(index);
  }

  addAttachment(): void {
    this.attachments.push(
      new FormGroup({
        name: new FormControl(''),
        url: new FormControl(''),
        fileType: new FormControl(''),
      }),
    );
  }

  removeAttachment(index: number): void {
    this.attachments.removeAt(index);
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update((s) => s + 1);
    }
  }

  prevStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  saveDraft(): void {
    this.submit(ProcurementStatus.DRAFT);
  }

  publish(): void {
    if (!this.f['tenderTitleUa'].value || !this.f['tenderTitleEn'].value) {
      this.f['tenderTitleUa'].markAsTouched();
      this.f['tenderTitleEn'].markAsTouched();
      this.currentStep.set(1);
      return;
    }
    this.submit(ProcurementStatus.PUBLISHED);
  }

  private submit(status: ProcurementStatus): void {
    this.isLoading.set(true);
    const payload = this.buildPayload(status);
    const id = this.editId();
    const req$ = id
      ? this.api.patch<Procurement>(`procurement/${id}`, payload)
      : this.api.post<Procurement>('procurement', payload);

    req$.subscribe({
      next: () => {
        this.isLoading.set(false);
        void this.router.navigate(['/cooperation/procurement']);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private buildPayload(status: ProcurementStatus): Record<string, unknown> {
    const v = this.form.value;

    // Collect checked submission methods into array
    const submissionMethods: SubmissionMethod[] = [];
    if (v.submissionMethodEmail) submissionMethods.push(SubmissionMethod.EMAIL);
    if (v.submissionMethodCourier) submissionMethods.push(SubmissionMethod.COURIER);
    if (v.submissionMethodEplatform) submissionMethods.push(SubmissionMethod.EPLATFORM);

    return {
      tenderTitleUa: v.tenderTitleUa,
      tenderTitleEn: v.tenderTitleEn,
      referenceNumber: v.referenceNumber || null,
      donor: v.donor || null,
      projectName: v.projectName || null,
      projectCode: v.projectCode || null,
      implementingOrganization: v.implementingOrganization || null,
      procurementMethod: v.procurementMethod || null,
      procurementCategory: v.procurementCategory || null,
      lotStructure: v.lotStructure,
      shortDescriptionUa: v.shortDescriptionUa || null,
      shortDescriptionEn: v.shortDescriptionEn || null,
      detailedDescriptionUa: v.detailedDescriptionUa || null,
      detailedDescriptionEn: v.detailedDescriptionEn || null,
      region: v.region || null,
      implementationPeriodDays: v.implementationPeriodDays || null,
      publicationDate: v.publicationDate || null,
      clarificationDeadline: v.clarificationDeadline || null,
      bidSubmissionDeadline: v.bidSubmissionDeadline || null,
      expectedStartDate: v.expectedStartDate || null,
      submissionMethods: submissionMethods.length ? submissionMethods : null,
      submissionEmail: v.submissionEmail || null,
      fileRequirements: v.fileRequirements || null,
      evaluationMethod: v.evaluationMethod || null,
      evaluationCriteria: this.evaluationCriteria.value.filter(
        (c: { criteriaUa: string; criteriaEn: string }) => c.criteriaUa || c.criteriaEn,
      ),
      eligibilityRequirements: this.eligibilityRequirements.value.filter(Boolean),
      attachments: this.attachments.value.filter((a: { url: string }) => !!a.url),
      status,
    };
  }

  private loadExisting(id: string): void {
    this.api.get<Procurement>(`procurement/${id}`).subscribe((data) => {
      this.form.patchValue({
        tenderTitleUa: data.tenderTitleUa,
        tenderTitleEn: data.tenderTitleEn,
        referenceNumber: data.referenceNumber ?? '',
        donor: data.donor ?? '',
        projectName: data.projectName ?? '',
        projectCode: data.projectCode ?? '',
        implementingOrganization: data.implementingOrganization ?? '',
        procurementMethod: data.procurementMethod ?? '',
        procurementCategory: data.procurementCategory ?? '',
        lotStructure: data.lotStructure ?? LotStructure.SINGLE,
        shortDescriptionUa: data.shortDescriptionUa ?? '',
        shortDescriptionEn: data.shortDescriptionEn ?? '',
        detailedDescriptionUa: data.detailedDescriptionUa ?? '',
        detailedDescriptionEn: data.detailedDescriptionEn ?? '',
        region: data.region ?? '',
        implementationPeriodDays: data.implementationPeriodDays,
        // Trim to YYYY-MM-DD for date inputs
        publicationDate: data.publicationDate?.substring(0, 10) ?? '',
        clarificationDeadline: data.clarificationDeadline?.substring(0, 10) ?? '',
        bidSubmissionDeadline: data.bidSubmissionDeadline?.substring(0, 10) ?? '',
        expectedStartDate: data.expectedStartDate?.substring(0, 10) ?? '',
        submissionEmail: data.submissionEmail ?? '',
        submissionMethodEmail: data.submissionMethods?.includes(SubmissionMethod.EMAIL) ?? false,
        submissionMethodCourier:
          data.submissionMethods?.includes(SubmissionMethod.COURIER) ?? false,
        submissionMethodEplatform:
          data.submissionMethods?.includes(SubmissionMethod.EPLATFORM) ?? false,
        fileRequirements: data.fileRequirements ?? '',
        evaluationMethod: data.evaluationMethod ?? '',
      });

      // Restore FormArrays
      this.evaluationCriteria.clear();
      (data.evaluationCriteria ?? []).forEach((c) => {
        this.evaluationCriteria.push(
          new FormGroup({
            criteriaUa: new FormControl(c.criteriaUa),
            criteriaEn: new FormControl(c.criteriaEn),
            weight: new FormControl(c.weight),
          }),
        );
      });
      if (this.evaluationCriteria.length === 0) this.addCriterion();

      this.eligibilityRequirements.clear();
      (data.eligibilityRequirements ?? []).forEach((r) => {
        this.eligibilityRequirements.push(new FormControl(r));
      });

      this.attachments.clear();
      (data.attachments ?? []).forEach((a) => {
        this.attachments.push(
          new FormGroup({
            name: new FormControl(a.name),
            url: new FormControl(a.url),
            fileType: new FormControl(a.fileType ?? ''),
          }),
        );
      });
    });
  }
}

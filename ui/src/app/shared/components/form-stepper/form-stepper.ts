// ui/src/app/shared/components/form-stepper/form-stepper.ts
// === ADDED: PR-3 shared multi-step header. Generalized from the wash-form
// stepper markup so future needs-forms (recovery, shelters) reuse one widget.
// Signal-based isUa (LanguageService) — the app is zoneless, so a plain
// translate.currentLang getter would not react to language toggles. ===
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { LanguageService } from '../../../core/services/language.service';

/** One step descriptor. `group` themes the circle colour; `optional` renders a dashed ring. */
export interface FormStep {
  key: string;
  labelUa: string;
  labelEn: string;
  optional?: boolean;
  group?: 'primary' | 'review' | string;
}

@Component({
  selector: 'app-form-stepper',
  standalone: true,
  template: `
    <div class="stepper" role="list">
      @for (s of steps; track s.key; let i = $index) {
        <div
          class="step"
          role="listitem"
          [class.active]="current === i"
          [class.completed]="current > i"
          [class.optional]="s.optional"
          [attr.data-group]="s.group || 'primary'"
          tabindex="0"
          [attr.aria-current]="current === i ? 'step' : null"
          [attr.aria-label]="isUa() ? s.labelUa : s.labelEn"
          (click)="stepClick.emit(i)"
          (keydown.enter)="stepClick.emit(i)"
          (keydown.space)="stepClick.emit(i); $event.preventDefault()"
        >
          <div class="step-circle">
            @if (current > i) {
              <span class="step-check" aria-hidden="true">✓</span>
            } @else {
              <span class="step-num" aria-hidden="true">{{ i + 1 }}</span>
            }
          </div>
          <span class="step-label">{{ isUa() ? s.labelUa : s.labelEn }}</span>
        </div>
        @if (i < steps.length - 1) {
          <div
            class="step-line"
            [class.completed]="current > i"
            [attr.data-group]="s.group || 'primary'"
          ></div>
        }
      }
    </div>
  `,
  styles: [
    `
      .stepper {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        margin-bottom: 2rem;
        padding: 0 0.5rem;
      }
      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.35rem;
        cursor: pointer;
        min-width: 52px;
        border: none;
        background: none;
      }
      .step:focus-visible {
        outline: 2px solid #2b6cb0;
        outline-offset: 3px;
        border-radius: 8px;
      }
      .step-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        font-weight: 600;
        background: #e2e8f0;
        color: #64748b;
        transition: all 0.2s;
      }
      .step-check {
        font-size: 1rem;
        line-height: 1;
      }
      .step.active .step-circle {
        background: #2b6cb0;
        color: #fff;
      }
      .step.completed .step-circle {
        background: #38a169;
        color: #fff;
      }
      .step[data-group='review'] .step-circle {
        color: #475569;
      }
      .step[data-group='review'].active .step-circle {
        background: #475569;
        color: #fff;
      }
      .step.completed[data-group] .step-circle {
        background: #38a169;
        color: #fff;
      }
      .step.optional .step-circle {
        border: 2px dashed #cbd5e0;
        background: #f8fafc;
      }
      .step.optional.active .step-circle {
        border-color: #2b6cb0;
        background: #ebf8ff;
        color: #2b6cb0;
      }
      .step.optional.completed .step-circle {
        border-style: solid;
        border-color: #38a169;
        background: #38a169;
        color: #fff;
      }
      .step-label {
        font-size: 0.62rem;
        color: #64748b;
        text-align: center;
        font-weight: 500;
        max-width: 72px;
        line-height: 1.2;
      }
      .step.active .step-label {
        color: #2b6cb0;
        font-weight: 600;
      }
      .step.completed .step-label {
        color: #38a169;
      }
      .step-line {
        flex: 1;
        height: 2px;
        background: #e2e8f0;
        margin: 17px 0.15rem 0;
        transition: background 0.2s;
      }
      .step-line.completed {
        background: #38a169;
      }
      @media (max-width: 640px) {
        .stepper {
          gap: 0;
          padding: 0;
        }
        .step {
          min-width: 40px;
        }
        .step-label {
          font-size: 0.52rem;
          max-width: 54px;
        }
        .step-circle {
          width: 30px;
          height: 30px;
          font-size: 0.75rem;
        }
        .step-line {
          margin-top: 15px;
        }
      }
    `,
  ],
})
export class FormStepperComponent {
  /** Reactive language flag — call as isUa() in the template. */
  protected readonly isUa = inject(LanguageService).isUa;

  @Input({ required: true }) steps: readonly FormStep[] = [];
  @Input() current = 0;

  /** Emits the clicked step index; the parent decides whether navigation is allowed. */
  @Output() stepClick = new EventEmitter<number>();
}

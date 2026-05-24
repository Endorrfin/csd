import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { LanguageService } from '../../core/services/language.service';

type InquiryReason = 'partnership' | 'volunteering' | 'press' | 'general' | 'other';
type MessengerType = 'telegram' | 'viber' | 'whatsapp' | 'other';

// At least one of email / phone / messenger handle must be filled
function atLeastOneContact(group: AbstractControl): ValidationErrors | null {
  const email = group.get('email')?.value?.trim();
  const phone = group.get('phone')?.value?.trim();
  const handle = group.get('messengerHandle')?.value?.trim();
  return email || phone || handle ? null : { noContact: true };
}

/**
 * General contact / inquiry form (Contacts page).
 * Public submission → POST /api/inquiries. No auth.
 * Assistance requests are routed to the needs/WASH form, not here.
 */
@Component({
  selector: 'app-inquiry-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <div class="if">
      @if (submitted()) {
        <div class="if__success">✅ {{ 'CONTACT.FORM.SUCCESS' | translate }}</div>
      } @else {
        <form [formGroup]="form" class="if__form" novalidate (ngSubmit)="submit()">
          <!-- Reason -->
          <div class="form-field">
            <label for="if-reason">{{ 'CONTACT.FORM.REASON' | translate }} *</label>
            <select id="if-reason" formControlName="reason">
              <option value="" disabled>{{ 'CONTACT.FORM.REASON_PLACEHOLDER' | translate }}</option>
              @for (r of reasons; track r) {
                <option [value]="r">{{ 'CONTACT.FORM.REASON_OPT.' + r | translate }}</option>
              }
            </select>
            @if (form.get('reason')?.invalid && form.get('reason')?.touched) {
              <span class="err">{{ 'CONTACT.FORM.ERR_REQUIRED' | translate }}</span>
            }
          </div>

          <!-- Reason: other (conditional) -->
          @if (form.get('reason')?.value === 'other') {
            <div class="form-field">
              <label for="if-reason-other">{{ 'CONTACT.FORM.REASON_OTHER' | translate }} *</label>
              <input
                id="if-reason-other"
                formControlName="reasonOther"
                type="text"
                maxlength="160"
                [placeholder]="'CONTACT.FORM.REASON_OTHER_PLACEHOLDER' | translate"
              />
              @if (form.get('reasonOther')?.invalid && form.get('reasonOther')?.touched) {
                <span class="err">{{ 'CONTACT.FORM.ERR_REQUIRED' | translate }}</span>
              }
            </div>
          }

          <!-- Name -->
          <div class="form-field">
            <label for="if-name">{{ 'CONTACT.FORM.NAME' | translate }}</label>
            <input id="if-name" formControlName="name" type="text" autocomplete="name" />
            <span class="hint">{{ 'CONTACT.FORM.NAME_HINT' | translate }}</span>
          </div>

          <!-- Contact block: at least one of email / phone / messenger -->
          <fieldset class="if__contact">
            <legend>{{ 'CONTACT.FORM.CONTACT_LEGEND' | translate }} *</legend>

            <!-- Email -->
            <div class="form-field">
              <label for="if-email">{{ 'CONTACT.FORM.EMAIL' | translate }}</label>
              <input
                id="if-email"
                formControlName="email"
                type="email"
                autocomplete="email"
                placeholder="name@example.com"
                (blur)="onEmailBlur()"
              />
              @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
                <span class="err">{{ 'CONTACT.FORM.ERR_EMAIL' | translate }}</span>
              }
            </div>

            <!-- Phone -->
            <div class="form-field">
              <label for="if-phone">{{ 'CONTACT.FORM.PHONE' | translate }}</label>
              <div class="if__phone-wrapper">
                <span class="if__phone-prefix">+38</span>
                <input
                  id="if-phone"
                  formControlName="phone"
                  type="tel"
                  maxlength="10"
                  placeholder="0501234567"
                  (input)="onPhoneInput($event)"
                />
              </div>
              @if (form.get('phone')?.hasError('pattern') && form.get('phone')?.touched) {
                <span class="err">{{ 'CONTACT.FORM.ERR_PHONE' | translate }}</span>
              }
            </div>

            <!-- Messenger -->
            <div class="if__messenger">
              <div class="form-field">
                <label for="if-messenger-type">{{ 'CONTACT.FORM.MESSENGER' | translate }}</label>
                <select id="if-messenger-type" formControlName="messengerType">
                  <option value="">—</option>
                  @for (m of messengers; track m) {
                    <option [value]="m">{{ 'CONTACT.FORM.MESSENGER_OPT.' + m | translate }}</option>
                  }
                </select>
              </div>
              <div class="form-field">
                <label for="if-messenger-handle">{{
                  'CONTACT.FORM.MESSENGER_HANDLE' | translate
                }}</label>
                <input
                  id="if-messenger-handle"
                  formControlName="messengerHandle"
                  type="text"
                  maxlength="120"
                  [placeholder]="'CONTACT.FORM.MESSENGER_HANDLE_PLACEHOLDER' | translate"
                />
                @if (form.get('messengerHandle')?.invalid && form.get('messengerHandle')?.touched) {
                  <span class="err">{{ 'CONTACT.FORM.ERR_REQUIRED' | translate }}</span>
                }
              </div>
            </div>

            @if (form.hasError('noContact') && form.get('message')?.touched) {
              <span class="err">{{ 'CONTACT.FORM.ERR_NO_CONTACT' | translate }}</span>
            }
          </fieldset>

          <!-- Preferred language -->
          <div class="form-field">
            <label for="if-lang">{{ 'CONTACT.FORM.LANG' | translate }} *</label>
            <select id="if-lang" formControlName="preferredLang">
              <option value="ua">{{ 'CONTACT.FORM.LANG_OPT.ua' | translate }}</option>
              <option value="en">{{ 'CONTACT.FORM.LANG_OPT.en' | translate }}</option>
            </select>
          </div>

          <!-- Message -->
          <div class="form-field">
            <label for="if-message">{{ 'CONTACT.FORM.MESSAGE' | translate }} *</label>
            <textarea
              id="if-message"
              formControlName="message"
              rows="6"
              maxlength="5000"
              [placeholder]="'CONTACT.FORM.MESSAGE_PLACEHOLDER' | translate"
            ></textarea>
            <span class="hint">{{ 'CONTACT.FORM.MESSAGE_HINT' | translate }}</span>
            @if (form.get('message')?.invalid && form.get('message')?.touched) {
              <span class="err">{{ 'CONTACT.FORM.ERR_REQUIRED' | translate }}</span>
            }
          </div>

          <!-- Consent (soft) -->
          <div class="if__consent">
            <label>
              <input type="checkbox" formControlName="consent" />
              <span>{{ 'CONTACT.FORM.CONSENT' | translate }}</span>
            </label>
          </div>

          <!-- Actions -->
          <div class="if__actions">
            @if (error()) {
              <p class="err">{{ 'CONTACT.FORM.ERR_SUBMIT' | translate }}</p>
            }
            <button type="submit" class="btn-primary" [disabled]="saving() || form.invalid">
              {{ saving() ? ('common.saving' | translate) : ('CONTACT.FORM.SUBMIT' | translate) }}
            </button>
          </div>
        </form>
      }
    </div>
  `,
  styles: [
    `
      .if {
        max-width: 640px;
      }
      .if__form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      .if__contact {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem 1.25rem 1.25rem;
        margin: 0;
      }
      .if__contact legend {
        font-size: 0.875rem;
        font-weight: 600;
        color: #334155;
        padding: 0 0.4rem;
      }
      .if__messenger {
        display: grid;
        grid-template-columns: minmax(140px, 1fr) 2fr;
        gap: 0.75rem;
      }
      .if__consent {
        font-size: 0.85rem;
        color: #475569;
      }
      .if__consent label {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        cursor: pointer;
      }
      .if__consent input {
        margin-top: 0.2rem;
      }
      .if__actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
        padding-top: 0.5rem;
      }
      .if__success {
        padding: 1.25rem;
        background: #f0fff4;
        border: 1px solid #9ae6b4;
        border-radius: 8px;
        color: #276749;
        font-size: 0.9375rem;
      }
      .if__phone-wrapper {
        display: flex;
        align-items: center;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        overflow: hidden;
      }
      .if__phone-wrapper:focus-within {
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .if__phone-prefix {
        padding: 0.55rem 0.625rem;
        background: #f1f5f9;
        color: #4a5568;
        font-size: 0.9rem;
        border-right: 1px solid #cbd5e0;
        white-space: nowrap;
      }
      .if__phone-wrapper input {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        flex: 1;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.375rem;
      }
      .form-field label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #334155;
      }
      .form-field input,
      .form-field select,
      .form-field textarea {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        font-family: inherit;
      }
      .form-field input:focus,
      .form-field select:focus,
      .form-field textarea:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .form-field textarea {
        resize: vertical;
      }
      .hint {
        font-size: 0.8125rem;
        color: #a0aec0;
      }
      .err {
        color: #e53e3e;
        font-size: 0.8125rem;
        margin: 0;
      }
      .btn-primary {
        padding: 0.5rem 1.25rem;
        background: #2b6cb0;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 640px) {
        .if__messenger {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class InquiryFormComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private readonly language = inject(LanguageService);

  protected saving = signal(false);
  protected submitted = signal(false);
  protected error = signal(false);

  protected readonly reasons: InquiryReason[] = [
    'partnership',
    'volunteering',
    'press',
    'general',
    'other',
  ];
  protected readonly messengers: MessengerType[] = ['telegram', 'viber', 'whatsapp', 'other'];

  protected form = this.fb.group(
    {
      reason: ['' as InquiryReason | '', Validators.required],
      reasonOther: [''],
      name: [''],
      email: ['', Validators.email],
      phone: ['', Validators.pattern(/^\d{10}$/)],
      messengerType: ['' as MessengerType | ''],
      messengerHandle: [''],
      // Default to the active UI language to reduce friction
      preferredLang: [this.language.lang()],
      message: ['', Validators.required],
      consent: [false],
    },
    { validators: atLeastOneContact },
  );

  constructor() {
    // reasonOther required only when reason = 'other'
    this.form.get('reason')!.valueChanges.subscribe((v) => {
      this.toggleRequired('reasonOther', v === 'other');
    });
    // messengerHandle required once a messenger type is chosen
    this.form.get('messengerType')!.valueChanges.subscribe((v) => {
      this.toggleRequired('messengerHandle', !!v);
    });
  }

  private toggleRequired(controlName: string, required: boolean): void {
    const ctrl = this.form.get(controlName)!;
    ctrl.setValidators(required ? [Validators.required] : []);
    ctrl.updateValueAndValidity({ emitEvent: false });
  }

  // CHANGED: trim email on blur so a stray pasted space doesn't fail Validators.email
  protected onEmailBlur(): void {
    const ctrl = this.form.get('email')!;
    const trimmed = (ctrl.value ?? '').trim();
    if (trimmed !== ctrl.value) ctrl.setValue(trimmed);
  }

  // Keep only digits, cap at 10 (national number without the +38 prefix)
  protected onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;
    this.form.get('phone')!.setValue(digits, { emitEvent: false });
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    this.error.set(false);

    const raw = this.form.getRawValue();
    const handle = raw.messengerHandle?.trim();
    const payload = {
      reason: raw.reason,
      ...(raw.reason === 'other' &&
        raw.reasonOther?.trim() && { reasonOther: raw.reasonOther.trim() }),
      ...(raw.name?.trim() && { name: raw.name.trim() }),
      ...(raw.email?.trim() && { email: raw.email.trim() }),
      ...(raw.phone && raw.phone.length === 10 && { phone: `+38${raw.phone}` }),
      ...(raw.messengerType &&
        handle && { messengerType: raw.messengerType, messengerHandle: handle }),
      preferredLang: raw.preferredLang,
      message: raw.message!.trim(),
      consent: !!raw.consent,
    };

    this.api.post('inquiries', payload).subscribe({
      next: () => this.submitted.set(true),
      error: () => {
        this.error.set(true);
        this.saving.set(false);
      },
    });
  }
}

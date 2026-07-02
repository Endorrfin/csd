import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (!token) {
          <div class="error-state">
            <h1 class="auth-title">{{ isUa ? 'Невалідне посилання' : 'Invalid Link' }}</h1>
            <p class="auth-subtitle">
              {{
                isUa
                  ? 'Посилання для відновлення пароля недійсне або прострочене.'
                  : 'The password reset link is invalid or has expired.'
              }}
            </p>
            <a routerLink="/forgot-password" class="btn-link">
              {{ isUa ? 'Запросити нове посилання' : 'Request a new link' }}
            </a>
          </div>
        } @else if (success()) {
          <div class="success-state">
            <div class="success-icon">&#10003;</div>
            <h1 class="auth-title">{{ isUa ? 'Пароль змінено!' : 'Password Changed!' }}</h1>
            <p class="auth-subtitle">
              {{
                isUa
                  ? 'Тепер ви можете увійти з новим паролем.'
                  : 'You can now log in with your new password.'
              }}
            </p>
            <a routerLink="/login" class="btn-primary-link">{{ isUa ? 'Увійти' : 'Log in' }}</a>
          </div>
        } @else {
          <h1 class="auth-title">{{ isUa ? 'Новий пароль' : 'New Password' }}</h1>
          <p class="auth-subtitle">
            {{
              isUa
                ? 'Введіть новий пароль для вашого облікового запису.'
                : 'Enter a new password for your account.'
            }}
          </p>

          @if (errorMessage()) {
            <div class="auth-error">{{ errorMessage() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-field">
              <label for="reset-password"
                >{{ isUa ? 'Новий пароль' : 'New password' }} <span class="req">*</span></label
              >
              <input
                id="reset-password"
                type="password"
                formControlName="password"
                [placeholder]="isUa ? 'Мінімум 6 символів' : 'Min 6 characters'"
                autocomplete="new-password"
              />
              @if (showError('password')) {
                <span class="field-error">{{
                  isUa ? 'Мінімум 6 символів' : 'Min 6 characters'
                }}</span>
              }
            </div>

            <div class="form-field">
              <label for="reset-confirmPassword"
                >{{ isUa ? 'Підтвердити пароль' : 'Confirm password' }}
                <span class="req">*</span></label
              >
              <input
                id="reset-confirmPassword"
                type="password"
                formControlName="confirmPassword"
                [placeholder]="isUa ? 'Повторіть пароль' : 'Repeat password'"
                autocomplete="new-password"
              />
              @if (passwordMismatch()) {
                <span class="field-error">{{
                  isUa ? 'Паролі не збігаються' : 'Passwords do not match'
                }}</span>
              }
            </div>

            <button type="submit" class="btn-submit" [disabled]="submitting()">
              {{ submitting() ? '...' : isUa ? 'Змінити пароль' : 'Change Password' }}
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .auth-page {
        display: flex;
        justify-content: center;
        padding: 2rem 1rem;
        min-height: 60vh;
      }
      .auth-card {
        width: 100%;
        max-width: 440px;
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 2rem;
      }
      .auth-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1a365d;
        margin: 0 0 0.25rem;
      }
      .auth-subtitle {
        font-size: 0.9rem;
        color: #64748b;
        margin: 0 0 1.5rem;
        line-height: 1.5;
      }
      .auth-error {
        background: #fff5f5;
        color: #c53030;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        font-size: 0.85rem;
        margin-bottom: 1rem;
        border: 1px solid #fed7d7;
      }
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .form-field label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
      }
      .req {
        color: #e53e3e;
      }
      .form-field input {
        padding: 0.6rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        background: #fff;
        transition: border-color 0.15s;
      }
      .form-field input:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .field-error {
        font-size: 0.75rem;
        color: #e53e3e;
      }
      .btn-submit {
        padding: 0.7rem;
        background: #2b6cb0;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 0.95rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.15s;
        margin-top: 0.25rem;
      }
      .btn-submit:hover {
        background: #2c5282;
      }
      .btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .success-state,
      .error-state {
        text-align: center;
      }
      .success-icon {
        font-size: 2.5rem;
        color: #38a169;
        margin-bottom: 0.75rem;
      }
      .btn-link {
        color: #2b6cb0;
        text-decoration: underline;
        font-size: 0.9rem;
        font-weight: 500;
      }
      .btn-primary-link {
        display: inline-block;
        margin-top: 0.75rem;
        padding: 0.6rem 2rem;
        background: #2b6cb0;
        color: #fff;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 600;
        font-size: 0.9rem;
      }
      .btn-primary-link:hover {
        background: #2c5282;
      }
      @media (max-width: 480px) {
        .auth-card {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===
  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  token = '';
  submitting = signal(false);
  success = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.pageTitle.setTitle('auth.reset.title');
  }

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  passwordMismatch(): boolean {
    const pw = this.form.get('password');
    const cpw = this.form.get('confirmPassword');
    return !!(cpw?.touched && pw?.value && cpw?.value && pw.value !== cpw.value);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.passwordMismatch()) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.api
      .post('auth/reset-password', {
        token: this.token,
        password: this.form.value.password,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.success.set(true);
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err?.error?.message;
          if (msg?.includes('expired')) {
            this.errorMessage.set(
              this.isUa
                ? 'Токен прострочений. Запросіть нове посилання.'
                : 'Token has expired. Request a new link.',
            );
          } else {
            this.errorMessage.set(
              this.isUa
                ? 'Невалідний токен. Запросіть нове посилання.'
                : 'Invalid token. Request a new link.',
            );
          }
        },
      });
  }
}

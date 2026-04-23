// ui/src/app/features/forgot-password/forgot-password.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        @if (sent()) {
          <div class="success-state">
            <div class="success-icon">&#9993;</div>
            <h1 class="auth-title">{{ isUa ? 'Перевірте пошту' : 'Check your email' }}</h1>
            <p class="auth-subtitle">
              {{
                isUa
                  ? 'Якщо обліковий запис з цим email існує, ми надіслали посилання для відновлення пароля.'
                  : 'If an account with this email exists, we have sent a password reset link.'
              }}
            </p>
            <p class="auth-hint">
              {{
                isUa
                  ? 'Не отримали лист? Перевірте папку «Спам».'
                  : "Didn't receive it? Check your spam folder."
              }}
            </p>
            <button class="btn-link" (click)="resetState()">
              {{ isUa ? 'Спробувати інший email' : 'Try another email' }}
            </button>
          </div>
        } @else {
          <h1 class="auth-title">{{ isUa ? 'Відновлення пароля' : 'Reset Password' }}</h1>
          <p class="auth-subtitle">
            {{
              isUa
                ? 'Введіть email, і ми надішлемо посилання для відновлення пароля.'
                : 'Enter your email and we will send you a reset link.'
            }}
          </p>

          @if (errorMessage()) {
            <div class="auth-error">{{ errorMessage() }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-field">
              <label>Email <span class="req">*</span></label>
              <input
                type="email"
                formControlName="email"
                placeholder="email&#64;example.com"
                autocomplete="email"
              />
              @if (showError('email')) {
                <span class="field-error">{{
                  isUa ? 'Введіть коректний email' : 'Enter a valid email'
                }}</span>
              }
            </div>

            <button type="submit" class="btn-submit" [disabled]="submitting()">
              {{ submitting() ? '...' : isUa ? 'Надіслати посилання' : 'Send Reset Link' }}
            </button>
          </form>
        }

        <p class="auth-link">
          <a routerLink="/login">{{ isUa ? '← Повернутися до входу' : '← Back to login' }}</a>
        </p>
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
      .auth-hint {
        font-size: 0.8rem;
        color: #94a3b8;
        margin: 0.75rem 0 1rem;
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
      .btn-link {
        background: none;
        border: none;
        color: #2b6cb0;
        cursor: pointer;
        font-size: 0.85rem;
        font-weight: 500;
        padding: 0;
        text-decoration: underline;
      }
      .success-state {
        text-align: center;
      }
      .success-icon {
        font-size: 2.5rem;
        margin-bottom: 0.75rem;
      }
      .auth-link {
        text-align: center;
        font-size: 0.85rem;
        color: #64748b;
        margin: 1.25rem 0 0;
      }
      .auth-link a {
        color: #2b6cb0;
        text-decoration: none;
        font-weight: 500;
      }
      .auth-link a:hover {
        text-decoration: underline;
      }
      @media (max-width: 480px) {
        .auth-card {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  submitting = signal(false);
  sent = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  resetState(): void {
    this.sent.set(false);
    this.form.reset();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.api.post('auth/forgot-password', { email: this.form.value.email }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.sent.set(true);
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(
          this.isUa ? 'Помилка. Спробуйте ще раз.' : 'Error. Please try again.',
        );
      },
    });
  }
}

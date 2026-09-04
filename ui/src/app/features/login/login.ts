// ui/src/app/features/login/login.ts
import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { PageTitleService } from '../../core/services/page-title.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-title">{{ isUa ? 'Вхід' : 'Log In' }}</h1>
        <p class="auth-subtitle">
          {{ isUa ? 'Увійдіть у свій обліковий запис' : 'Sign in to your account' }}
        </p>

        @if (errorMessage()) {
          <div class="auth-error">{{ errorMessage() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-field">
            <label for="login-email">Email <span class="req">*</span></label>
            <input
              id="login-email"
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

          <div class="form-field">
            <div class="label-row">
              <label for="login-password"
                >{{ isUa ? 'Пароль' : 'Password' }} <span class="req">*</span></label
              >
              <a routerLink="/forgot-password" class="forgot-link">
                {{ isUa ? 'Забули пароль?' : 'Forgot password?' }}
              </a>
            </div>
            <input
              id="login-password"
              type="password"
              formControlName="password"
              [placeholder]="isUa ? 'Ваш пароль' : 'Your password'"
              autocomplete="current-password"
            />
            @if (showError('password')) {
              <span class="field-error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span>
            }
          </div>

          <button type="submit" class="btn-submit" [disabled]="submitting()">
            {{ submitting() ? '...' : isUa ? 'Увійти' : 'Log In' }}
          </button>
        </form>

        <p class="auth-link">
          {{ isUa ? 'Немає облікового запису?' : "Don't have an account?" }}
          <a routerLink="/register">{{ isUa ? 'Зареєструватися' : 'Sign up' }}</a>
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
      .label-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
      }
      .forgot-link {
        font-size: 0.8rem;
        color: #2b6cb0;
        text-decoration: none;
        font-weight: 500;
      }
      .forgot-link:hover {
        text-decoration: underline;
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  // === ADDED: inject page title service for dynamic SEO tags ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  ngOnInit(): void {
    // === ADDED: update dynamic page title for the browser tab ===
    this.pageTitle.setTitle('NAV.LOGIN');
    // === END ADDED ===
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set('');

    this.api
      .post<{ accessToken: string }>('auth/login', {
        email: this.form.value.email,
        password: this.form.value.password,
      })
      .subscribe({
        next: (res) => {
          this.auth.login(res.accessToken);
          this.router.navigate(['/']);
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set(
            this.isUa ? 'Невірний email або пароль' : 'Invalid email or password',
          );
        },
      });
  }
}

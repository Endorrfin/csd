// ui/src/app/features/register/register.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <h1 class="auth-title">{{ isUa ? 'Реєстрація' : 'Create Account' }}</h1>
        <p class="auth-subtitle">
          {{
            isUa
              ? 'Заповніть форму для створення облікового запису'
              : 'Fill in the form to create your account'
          }}
        </p>

        @if (errorMessage()) {
          <div class="auth-error">{{ errorMessage() }}</div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-row">
            <div class="form-field">
              <label>{{ isUa ? "Ім'я" : 'First name' }} <span class="req">*</span></label>
              <input
                formControlName="firstName"
                [placeholder]="isUa ? 'Іван' : 'John'"
                autocomplete="given-name"
              />
              @if (showError('firstName')) {
                <span class="field-error">{{
                  isUa ? 'Мінімум 2 символи' : 'Min 2 characters'
                }}</span>
              }
            </div>
            <div class="form-field">
              <label>{{ isUa ? 'Прізвище' : 'Last name' }} <span class="req">*</span></label>
              <input
                formControlName="lastName"
                [placeholder]="isUa ? 'Петренко' : 'Doe'"
                autocomplete="family-name"
              />
              @if (showError('lastName')) {
                <span class="field-error">{{
                  isUa ? 'Мінімум 2 символи' : 'Min 2 characters'
                }}</span>
              }
            </div>
          </div>

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

          <div class="form-field">
            <label>{{ isUa ? 'Пароль' : 'Password' }} <span class="req">*</span></label>
            <input
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
            <label
              >{{ isUa ? 'Підтвердити пароль' : 'Confirm password' }}
              <span class="req">*</span></label
            >
            <input
              type="password"
              formControlName="confirmPassword"
              [placeholder]="isUa ? 'Повторіть пароль' : 'Repeat password'"
              autocomplete="new-password"
            />
            @if (showError('confirmPassword')) {
              <span class="field-error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span>
            }
            @if (passwordMismatch()) {
              <span class="field-error">{{
                isUa ? 'Паролі не збігаються' : 'Passwords do not match'
              }}</span>
            }
          </div>

          <button type="submit" class="btn-submit" [disabled]="submitting()">
            {{ submitting() ? '...' : isUa ? 'Зареєструватися' : 'Sign Up' }}
          </button>
        </form>

        <p class="auth-link">
          {{ isUa ? 'Вже є обліковий запис?' : 'Already have an account?' }}
          <a routerLink="/login">{{ isUa ? 'Увійти' : 'Log in' }}</a>
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
        max-width: 460px;
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
      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
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
        margin-top: 0.5rem;
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
        .form-row {
          grid-template-columns: 1fr;
        }
        .auth-card {
          padding: 1.5rem;
        }
      }
    `,
  ],
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  submitting = signal(false);
  errorMessage = signal('');

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

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

    const { firstName, lastName, email, password } = this.form.getRawValue();

    this.api
      .post<{ accessToken: string }>('auth/register', {
        firstName,
        lastName,
        email,
        password,
      })
      .subscribe({
        next: (res) => {
          this.auth.login(res.accessToken);
          this.router.navigate(['/']);
        },
        error: (err) => {
          this.submitting.set(false);
          const msg = err?.error?.message;
          if (msg === 'Email already registered') {
            this.errorMessage.set(
              this.isUa ? 'Цей email вже зареєстрований' : 'This email is already registered',
            );
          } else {
            this.errorMessage.set(
              this.isUa
                ? 'Помилка реєстрації. Спробуйте ще раз.'
                : 'Registration error. Please try again.',
            );
          }
        },
      });
  }
}

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login">
      <h1>Login</h1>
      @if (error) { <p class="login__error">{{ error }}</p> }
      <label>Email
        <input type="email" [(ngModel)]="email" />
      </label>
      <label>Password
        <input type="password" [(ngModel)]="password" />
      </label>
      <button (click)="onLogin()">Login</button>
    </div>
  `,
  styles: [`
    .login { max-width: 400px; margin: 2rem auto; }
    .login label { display: block; margin-bottom: 1rem; font-weight: 500; }
    .login input {
      display: block; width: 100%; padding: 0.5rem;
      margin-top: 0.25rem; border: 1px solid #cbd5e0; border-radius: 4px;
    }
    .login button {
      background: #1a365d; color: white; padding: 0.5rem 2rem;
      border: none; border-radius: 4px; cursor: pointer;
    }
    .login__error { color: #e53e3e; }
  `],
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  email = '';
  password = '';
  error = '';

  onLogin() {
    this.api
      .post<{ accessToken: string }>('auth/login', {
        email: this.email,
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.auth.login(res.accessToken);
          this.router.navigate(['/']);
        },
        error: () => (this.error = 'Invalid credentials'),
      });
  }
}

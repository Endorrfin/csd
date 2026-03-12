import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);

  // Reactive signals - components are automatically updated
  readonly isLoggedIn = signal(false);
  readonly userRole = signal<string | null>(null);
  readonly userEmail = signal<string | null>(null);

  constructor() {
    this.loadFromToken();
  }

  get isManager(): boolean {
    return this.userRole() === 'manager' || this.userRole() === 'admin';
  }

  get isAdmin(): boolean {
    return this.userRole() === 'admin';
  }

  login(token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
    }
    this.loadFromToken();
  }

  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.isLoggedIn.set(false);
    this.userRole.set(null);
    this.userEmail.set(null);
  }

  private loadFromToken(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      // Decoding JWT payload (base64)
      const payload: TokenPayload = JSON.parse(atob(token.split('.')[1]));

      // Checking the expiration date
      if (payload.exp * 1000 < Date.now()) {
        this.logout();
        return;
      }

      this.isLoggedIn.set(true);
      this.userRole.set(payload.role);
      this.userEmail.set(payload.email);
    } catch {
      this.logout();
    }
  }
}

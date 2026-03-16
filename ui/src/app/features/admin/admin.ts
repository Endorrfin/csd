import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin-layout">
      <div class="admin-header">
        <h1>{{ isUa ? 'Панель управління' : 'Admin Panel' }}</h1>
        <span class="admin-user">{{ auth.userEmail() }} ({{ auth.userRole() }})</span>
      </div>
      <nav class="admin-tabs">
        <a routerLink="wash-forms" routerLinkActive="active" class="admin-tab">
          {{ isUa ? 'WASH Заявки' : 'WASH Forms' }}
        </a>
      </nav>
      <div class="admin-content">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .admin-layout { max-width:1200px; margin:0 auto; padding:2rem 1.5rem; }
    .admin-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; }
    .admin-header h1 { font-size:1.75rem; font-weight:700; color:#1a365d; margin:0; }
    .admin-user { font-size:.85rem; color:#64748b; background:#f1f5f9; padding:.35rem .75rem; border-radius:6px; }
    .admin-tabs { display:flex; gap:.5rem; border-bottom:2px solid #e2e8f0; margin-bottom:2rem; }
    .admin-tab { padding:.75rem 1.25rem; font-size:.9rem; font-weight:500; color:#64748b; text-decoration:none; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .2s; }
    .admin-tab:hover { color:#1a365d; }
    .admin-tab.active { color:#1a365d; border-bottom-color:#2b6cb0; }
    @media (max-width:640px) {
      .admin-layout { padding:1rem; }
      .admin-header { flex-direction:column; align-items:flex-start; gap:.5rem; }
      .admin-header h1 { font-size:1.35rem; }
    }
  `],
})
export class AdminComponent {
  readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }
}

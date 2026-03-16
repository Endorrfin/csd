import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-wash-form-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <button class="btn-back" (click)="goBack()">
      {{ isUa ? 'Назад до списку' : 'Back to list' }}
    </button>

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (form()) {
      <div class="detail">
        <div class="detail-header">
          <div>
            <h2>{{ form()!.organizationName }}</h2>
            <p class="detail-meta">
              {{ form()!.region }} | {{ form()!.createdAt | date:'dd.MM.yyyy HH:mm' }}
            </p>
          </div>
          <span class="status-badge" [attr.data-status]="form()!.status">
            {{ getStatusLabel(form()!.status) }}
          </span>
        </div>

        <!-- Status management -->
        <div class="status-panel">
          <label>{{ isUa ? 'Змінити статус:' : 'Change status:' }}</label>
          <select [(ngModel)]="newStatus">
            <option value="new">{{ isUa ? 'Нова' : 'New' }}</option>
            <option value="in_review">{{ isUa ? 'На розгляді' : 'In review' }}</option>
            <option value="approved">{{ isUa ? 'Затверджено' : 'Approved' }}</option>
            <option value="rejected">{{ isUa ? 'Відхилено' : 'Rejected' }}</option>
            <option value="in_progress">{{ isUa ? 'В роботі' : 'In progress' }}</option>
            <option value="completed">{{ isUa ? 'Завершено' : 'Completed' }}</option>
          </select>
          <textarea [(ngModel)]="managerNotes" rows="2"
                    [placeholder]="isUa ? 'Нотатки менеджера' : 'Manager notes'"
          ></textarea>
          <button class="btn btn-save" (click)="updateStatus()" [disabled]="saving()">
            {{ saving() ? '...' : (isUa ? 'Зберегти' : 'Save') }}
          </button>
        </div>

        <!-- General info -->
        <div class="section-card">
          <h3>{{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}</h3>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">{{ isUa ? 'Область' : 'Region' }}</span><span>{{ form()!.region }}</span></div>
            <div class="info-item"><span class="info-label">{{ isUa ? 'Організація' : 'Organization' }}</span><span>{{ form()!.organizationName }}</span></div>
            <div class="info-item"><span class="info-label">{{ isUa ? 'ПІБ керівника' : 'Head' }}</span><span>{{ form()!.headName }}</span></div>
            <div class="info-item"><span class="info-label">{{ isUa ? 'Телефон' : 'Phone' }}</span><span>{{ form()!.headPhone }}</span></div>
            <div class="info-item"><span class="info-label">Email</span><span>{{ form()!.email }}</span></div>
          </div>
        </div>

        <!-- Object -->
        <div class="section-card">
          <h3>{{ isUa ? 'II. Обʼєкт' : 'II. Object' }}</h3>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">{{ isUa ? 'Назва' : 'Name' }}</span><span>{{ form()!.objectName }}</span></div>
            <div class="info-item"><span class="info-label">{{ isUa ? 'Залежних людей' : 'People' }}</span><span>{{ form()!.dependentPopulation }}</span></div>
            @if (form()!.socialFacilities) {
              <div class="info-item full-w"><span class="info-label">{{ isUa ? 'Соц. установи' : 'Facilities' }}</span><span>{{ form()!.socialFacilities }}</span></div>
            }
            @if (form()!.installationDeadline) {
              <div class="info-item"><span class="info-label">{{ isUa ? 'Термін' : 'Deadline' }}</span><span>{{ form()!.installationDeadline }}</span></div>
            }
            <div class="info-item full-w"><span class="info-label">{{ isUa ? 'Причини' : 'Reason' }}</span><span>{{ form()!.replacementReason }}</span></div>
          </div>
        </div>

        <!-- Borehole -->
        @if (form()!.boreholeDrilling) {
          <div class="section-card">
            <h3>{{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">{{ isUa ? 'Тип' : 'Type' }}</span><span>{{ form()!.boreholeDrilling.boreholeType }}</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Дебіт' : 'Flow' }}</span><span>{{ form()!.boreholeDrilling.expectedFlowRate }} m3/h</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Діаметр' : 'Diameter' }}</span><span>{{ form()!.boreholeDrilling.desiredDiameter }} mm</span></div>
              @if (form()!.boreholeDrilling.notes) {
                <div class="info-item full-w"><span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span><span>{{ form()!.boreholeDrilling.notes }}</span></div>
              }
            </div>
          </div>
        }

        <!-- Water Tower -->
        @if (form()!.waterTower) {
          <div class="section-card">
            <h3>{{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">{{ isUa ? 'Тип' : 'Type' }}</span><span>{{ form()!.waterTower.towerType }}</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Кількість' : 'Qty' }}</span><span>{{ form()!.waterTower.quantity }}</span></div>
              @if (form()!.waterTower.notes) {
                <div class="info-item full-w"><span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span><span>{{ form()!.waterTower.notes }}</span></div>
              }
            </div>
          </div>
        }

        <!-- Purification -->
        @if (form()!.purificationSystem) {
          <div class="section-card">
            <h3>{{ isUa ? 'V. Системи очищення' : 'V. Purification' }}</h3>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">{{ isUa ? 'Приміщення' : 'Room' }}</span><span>{{ form()!.purificationSystem.hasRoom ? 'Так/Yes' : 'Ні/No' }}</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Температура' : 'Temp' }}</span><span>{{ form()!.purificationSystem.hasTemperatureControl ? 'Так/Yes' : 'Ні/No' }}</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Водопостачання' : 'Water' }}</span><span>{{ form()!.purificationSystem.hasWaterInletDrainage ? 'Так/Yes' : 'Ні/No' }}</span></div>
              <div class="info-item"><span class="info-label">{{ isUa ? 'Електрика' : 'Power' }}</span><span>{{ form()!.purificationSystem.hasPowerSupply ? 'Так/Yes' : 'Ні/No' }}</span></div>
              @if (form()!.purificationSystem.notes) {
                <div class="info-item full-w"><span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span><span>{{ form()!.purificationSystem.notes }}</span></div>
              }
            </div>
          </div>
        }

        <!-- Equipment items -->
        @if (form()!.items?.length) {
          <div class="section-card">
            <h3>{{ isUa ? 'VI. Обладнання' : 'VI. Equipment' }} ({{ form()!.items.length }})</h3>
            <div class="equip-table-wrap">
              <table class="equip-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ isUa ? 'Категорія' : 'Category' }}</th>
                    <th>{{ isUa ? 'Позиція' : 'Item' }}</th>
                    <th>{{ isUa ? 'К-сть' : 'Qty' }}</th>
                    <th>{{ isUa ? 'Од.' : 'Unit' }}</th>
                    <th>{{ isUa ? 'Примітки' : 'Notes' }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of form()!.items; track item.id; let i = $index) {
                    <tr>
                      <td>{{ i + 1 }}</td>
                      <td>{{ isUa ? item.equipmentItem?.category?.nameUa : item.equipmentItem?.category?.nameEn }}</td>
                      <td>{{ isUa ? item.equipmentItem?.nameUa : item.equipmentItem?.nameEn }}</td>
                      <td>{{ item.quantity }}</td>
                      <td>{{ item.equipmentItem?.unit }}</td>
                      <td>{{ item.notes || '---' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        <!-- Delete -->
        @if (auth.isAdmin) {
          <div class="danger-zone">
            <button class="btn btn-danger" (click)="deleteForm()">
              {{ isUa ? 'Видалити заявку' : 'Delete form' }}
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .btn-back { background:none; border:none; color:#2b6cb0; cursor:pointer; font-size:.9rem; margin-bottom:1rem; padding:0; }
    .btn-back:hover { text-decoration:underline; }
    .detail-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem; }
    .detail-header h2 { font-size:1.25rem; font-weight:600; color:#1a365d; margin:0 0 .25rem; }
    .detail-meta { font-size:.85rem; color:#64748b; margin:0; }
    .status-badge { display:inline-block; padding:.25rem .75rem; border-radius:4px; font-size:.75rem; font-weight:600; text-transform:uppercase; }
    [data-status="new"] { background:#dbeafe; color:#1e40af; }
    [data-status="in_review"] { background:#fef3c7; color:#92400e; }
    [data-status="approved"] { background:#d1fae5; color:#065f46; }
    [data-status="rejected"] { background:#fee2e2; color:#991b1b; }
    [data-status="in_progress"] { background:#e0e7ff; color:#3730a3; }
    [data-status="completed"] { background:#d1fae5; color:#065f46; }
    .status-panel { display:flex; flex-wrap:wrap; gap:.75rem; align-items:flex-end; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; margin-bottom:1.5rem; }
    .status-panel label { font-size:.85rem; font-weight:500; color:#334155; width:100%; }
    .status-panel select { padding:.5rem .75rem; border:1px solid #cbd5e0; border-radius:6px; font-size:.85rem; }
    .status-panel textarea { flex:1; min-width:200px; padding:.5rem .75rem; border:1px solid #cbd5e0; border-radius:6px; font-size:.85rem; resize:vertical; }
    .btn-save { background:#2b6cb0; color:#fff; padding:.5rem 1.25rem; border:none; border-radius:6px; font-size:.85rem; cursor:pointer; }
    .btn-save:hover { background:#2c5282; }
    .btn-save:disabled { opacity:.5; }
    .section-card { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.25rem; margin-bottom:1rem; }
    .section-card h3 { font-size:.95rem; font-weight:600; color:#1a365d; margin:0 0 .75rem; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
    .info-item { display:flex; flex-direction:column; gap:.1rem; }
    .info-label { font-size:.7rem; color:#64748b; text-transform:uppercase; letter-spacing:.03em; }
    .info-item span:last-child { font-size:.9rem; color:#1e293b; }
    .full-w { grid-column:1/-1; }
    .equip-table-wrap { overflow-x:auto; }
    .equip-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .equip-table th { text-align:left; padding:.5rem; border-bottom:2px solid #e2e8f0; color:#64748b; font-weight:600; font-size:.75rem; text-transform:uppercase; }
    .equip-table td { padding:.5rem; border-bottom:1px solid #f1f5f9; }
    .danger-zone { margin-top:2rem; padding-top:1.5rem; border-top:1px solid #fee2e2; }
    .btn-danger { background:#e53e3e; color:#fff; padding:.5rem 1.25rem; border:none; border-radius:6px; font-size:.85rem; cursor:pointer; }
    .btn-danger:hover { background:#c53030; }
    .loading { text-align:center; padding:3rem; color:#64748b; }
    @media (max-width:640px) {
      .info-grid { grid-template-columns:1fr; }
      .detail-header { flex-direction:column; gap:.75rem; }
      .status-panel { flex-direction:column; }
    }
  `],
})
export class WashFormDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }

  form = signal<any>(null);
  loading = signal(true);
  saving = signal(false);
  newStatus = '';
  managerNotes = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadForm(id);
  }

  private loadForm(id: string): void {
    this.api.get<any>(`needs-forms/wash/${id}`).subscribe({
      next: (f) => {
        this.form.set(f);
        this.newStatus = f.status;
        this.managerNotes = f.managerNotes ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/admin', 'wash-forms']);
      },
    });
  }

  updateStatus(): void {
    const id = this.form()?.id;
    if (!id) return;
    this.saving.set(true);
    this.api.patch<any>(`needs-forms/wash/${id}`, {
      status: this.newStatus,
      managerNotes: this.managerNotes || undefined,
    }).subscribe({
      next: (updated) => {
        this.form.set(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  deleteForm(): void {
    const msg = this.isUa
      ? 'Ви впевнені, що хочете видалити цю заявку?'
      : 'Are you sure you want to delete this form?';
    if (!confirm(msg)) return;

    const id = this.form()?.id;
    if (!id) return;
    this.api.delete(`needs-forms/wash/${id}`).subscribe({
      next: () => this.router.navigate(['/admin', 'wash-forms']),
    });
  }

  goBack(): void { this.router.navigate(['/admin', 'wash-forms']); }

  getStatusLabel(status: string): string {
    const map: Record<string, [string, string]> = {
      new: ['Нова', 'New'], in_review: ['На розгляді', 'In review'],
      approved: ['Затверджено', 'Approved'], rejected: ['Відхилено', 'Rejected'],
      in_progress: ['В роботі', 'In progress'], completed: ['Завершено', 'Completed'],
    };
    const v = map[status];
    return v ? (this.isUa ? v[0] : v[1]) : status;
  }
}

// ui/src/app/features/admin/wash-form-detail/wash-form-detail.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { WashFormComponent } from '../../needs/wash-form/wash-form';
import { PageTitleService } from '../../../core/services/page-title.service';

import {
  WashFormDetail,
  UpdateWashFormFullPayload,
  WashFormStatus,
  PUMP_PURPOSE_LABELS,
  getUnitLabel,
} from '../../needs/wash-form/wash-form.interfaces';

interface AuditLogEntry {
  id: string;
  washFormId: string;
  changedById: string | null;
  changedByEmail: string | null;
  action: 'created' | 'updated' | 'status_changed' | 'deleted';
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

@Component({
  selector: 'app-wash-form-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, WashFormComponent],
  template: `
    <button class="btn-back" (click)="goBack()">
      ← {{ isUa ? 'Назад до списку' : 'Back to list' }}
    </button>

    @if (loading()) {
      <div class="loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (form(); as f) {
      <!-- ════════════ EDIT MODE ════════════ -->
      @if (mode() === 'edit') {
        <div class="edit-header">
          <h2>{{ isUa ? 'Редагування заявки' : 'Edit form' }}</h2>
          <p class="edit-meta">{{ f.organizationName }}</p>
        </div>
        @if (saveError()) {
          <div class="error-banner">{{ saveError() }}</div>
        }
        <app-wash-form
          [mode]="'edit'"
          [initialData]="f"
          [externalSaving]="saving()"
          (saved)="onFormSaved($event)"
          (cancelled)="cancelEdit()"
        ></app-wash-form>
      } @else {
        <!-- ════════════ VIEW MODE ════════════ -->
        <div class="detail-header">
          <div>
            <h2>{{ f.organizationName }}</h2>
            <p class="detail-meta">
              {{ isUa ? f.region : f.regionEn }} ·
              {{ f.createdAt | date: 'dd.MM.yyyy HH:mm' }}
            </p>
          </div>
          <div class="detail-actions">
            <span class="status-badge" [attr.data-status]="f.status">
              {{ getStatusLabel(f.status) }}
            </span>
            <button class="btn btn-edit" (click)="enterEditMode()">
              {{ isUa ? 'Редагувати' : 'Edit' }}
            </button>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            [class.active]="activeTab() === 'details'"
            (click)="setTab('details')"
          >
            {{ isUa ? 'Деталі' : 'Details' }}
          </button>
          <button class="tab" [class.active]="activeTab() === 'audit'" (click)="setTab('audit')">
            {{ isUa ? 'Історія змін' : 'Audit log' }}
            @if (auditLoaded() && auditLog().length > 0) {
              <span class="tab-badge">{{ auditLog().length }}</span>
            }
          </button>
        </div>

        @if (activeTab() === 'details') {
          <!-- Quick status panel -->
          <div class="status-panel">
            <label for="status-select">{{ isUa ? 'Змінити статус:' : 'Change status:' }}</label>
            <select id="status-select" [(ngModel)]="newStatus">
              <option value="new">{{ isUa ? 'Нова' : 'New' }}</option>
              <option value="in_review">{{ isUa ? 'На розгляді' : 'In review' }}</option>
              <option value="approved">{{ isUa ? 'Затверджено' : 'Approved' }}</option>
              <option value="rejected">{{ isUa ? 'Відхилено' : 'Rejected' }}</option>
              <option value="in_progress">{{ isUa ? 'В роботі' : 'In progress' }}</option>
              <option value="completed">{{ isUa ? 'Завершено' : 'Completed' }}</option>
            </select>
            <textarea
              [(ngModel)]="managerNotes"
              rows="2"
              [placeholder]="isUa ? 'Нотатки менеджера' : 'Manager notes'"
            ></textarea>
            <button class="btn btn-save" (click)="updateStatus()" [disabled]="statusSaving()">
              {{ statusSaving() ? '...' : isUa ? 'Зберегти статус' : 'Save status' }}
            </button>
          </div>

          <!-- I. General Information -->
          <div class="section-card">
            <h3>{{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'Область' : 'Region' }}</span>
                <span>{{ isUa ? f.region : f.regionEn }}</span>
              </div>
              @if (f.district) {
                <div class="info-item">
                  <span class="info-label">{{ isUa ? 'Район' : 'District' }}</span>
                  <span>{{ isUa ? f.district : f.districtEn }}</span>
                </div>
              }
              @if (f.community) {
                <div class="info-item">
                  <span class="info-label">{{ isUa ? 'Громада' : 'Community' }}</span>
                  <span>{{ isUa ? f.community : f.communityEn }}</span>
                </div>
              }
              @if (f.settlement) {
                <div class="info-item">
                  <span class="info-label">{{ isUa ? 'Населений пункт' : 'Settlement' }}</span>
                  <span>{{ isUa ? f.settlement : f.settlementEn }}</span>
                </div>
              }
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'Організація' : 'Organization' }}</span>
                <span>{{ f.organizationName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'ПІБ керівника' : 'Head' }}</span>
                <span>{{ f.headName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'Телефон' : 'Phone' }}</span>
                <span>{{ f.headPhone }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <span>{{ f.email }}</span>
              </div>
            </div>
          </div>

          <!-- II. Object -->
          <div class="section-card">
            <h3>{{ isUa ? 'II. Обʼєкт' : 'II. Object' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'Назва' : 'Name' }}</span>
                <span>{{ f.objectName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa ? 'Залежних людей' : 'People' }}</span>
                <span>{{ f.dependentPopulation }}</span>
              </div>
              @if (f.socialFacilities) {
                <div class="info-item full-w">
                  <span class="info-label">{{ isUa ? 'Соц. установи' : 'Facilities' }}</span>
                  <span>{{ f.socialFacilities }}</span>
                </div>
              }
              @if (f.installationDeadline) {
                <div class="info-item">
                  <span class="info-label">{{ isUa ? 'Термін' : 'Deadline' }}</span>
                  <span>{{ f.installationDeadline }}</span>
                </div>
              }
              <div class="info-item full-w">
                <span class="info-label">{{ isUa ? 'Причини' : 'Reason' }}</span>
                <span>{{ f.replacementReason }}</span>
              </div>
              @if (f.managerNotes) {
                <div class="info-item full-w">
                  <span class="info-label">{{ isUa ? 'Нотатки менеджера' : 'Manager notes' }}</span>
                  <span>{{ f.managerNotes }}</span>
                </div>
              }
            </div>
          </div>

          <!-- III. Boreholes -->
          @if (f.boreholes.length) {
            <div class="section-card">
              <h3>
                {{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}
                ({{ f.boreholes.length }})
              </h3>
              @for (b of f.boreholes; track b.id; let i = $index) {
                <div class="subsection">
                  <h4>{{ (isUa ? 'Свердловина #' : 'Borehole #') + (i + 1) }}</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Варіант робіт' : 'Work type' }}</span>
                      <span>{{ b.workType }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{
                        isUa ? 'Очікуваний дебіт' : 'Expected flow'
                      }}</span>
                      <span>{{ b.expectedFlowRate }} m³/h</span>
                    </div>
                    @if (b.existingDepth) {
                      <div class="info-item">
                        <span class="info-label">{{
                          isUa ? 'Глибина існуючої' : 'Existing depth'
                        }}</span>
                        <span>{{ b.existingDepth }} m</span>
                      </div>
                    }
                    @if (b.existingDebit) {
                      <div class="info-item">
                        <span class="info-label">{{
                          isUa ? 'Дебіт існуючої' : 'Existing debit'
                        }}</span>
                        <span>{{ b.existingDebit }} m³/h</span>
                      </div>
                    }
                    @if (b.oldLocation) {
                      <div class="info-item full-w">
                        <span class="info-label">{{
                          isUa ? 'Розташування старої' : 'Old location'
                        }}</span>
                        <span>{{ b.oldLocation }}</span>
                      </div>
                    }
                    @if (b.notes) {
                      <div class="info-item full-w">
                        <span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span>
                        <span>{{ b.notes }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- IV. Towers -->
          @if (f.towers.length) {
            <div class="section-card">
              <h3>
                {{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}
                ({{ f.towers.length }})
              </h3>
              @for (t of f.towers; track t.id; let i = $index) {
                <div class="subsection">
                  <h4>{{ (isUa ? 'Башта #' : 'Tower #') + (i + 1) }}</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Тип' : 'Type' }}</span>
                      <span>{{ t.towerType }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Висота' : 'Height' }}</span>
                      <span>
                        {{ t.towerHeight === 'over_25' ? (t.customHeight ?? '?') : t.towerHeight }}
                        m
                      </span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Фундамент' : 'Foundation' }}</span>
                      <span>{{ yesNo(t.hasFoundation) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Кран' : 'Crane' }}</span>
                      <span>{{ yesNo(t.canProvideCrane) }}</span>
                    </div>
                    @if (t.notes) {
                      <div class="info-item full-w">
                        <span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span>
                        <span>{{ t.notes }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- V. Purification -->
          @if (f.purifications.length) {
            <div class="section-card">
              <h3>
                {{ isUa ? 'V. Системи очищення' : 'V. Purification' }}
                ({{ f.purifications.length }})
              </h3>
              @for (p of f.purifications; track p.id; let i = $index) {
                <div class="subsection">
                  <h4>{{ (isUa ? 'Система #' : 'System #') + (i + 1) }}</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Приміщення' : 'Room' }}</span>
                      <span>{{ yesNo(p.hasRoom) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Електрика' : 'Power' }}</span>
                      <span>{{ yesNo(p.hasPowerSupply) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Обслуговування' : 'Maintenance' }}</span>
                      <span>{{ yesNo(p.canMaintainSystem) }}</span>
                    </div>
                    @if (p.notes) {
                      <div class="info-item full-w">
                        <span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span>
                        <span>{{ p.notes }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- VI. Pumps -->
          @if (f.pumps.length) {
            <div class="section-card">
              <h3>
                {{ isUa ? 'VI. Насоси' : 'VI. Pumps' }}
                ({{ f.pumps.length }})
              </h3>
              @for (p of f.pumps; track p.id; let i = $index) {
                <div class="subsection">
                  <h4>{{ (isUa ? 'Насос #' : 'Pump #') + (i + 1) }}</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Призначення' : 'Purpose' }}</span>
                      <span>{{ getPumpPurposeLabel(p.purpose) }}</span>
                    </div>
                    @if (p.brand || p.model) {
                      <div class="info-item">
                        <span class="info-label">{{
                          isUa ? 'Бренд / модель' : 'Brand / model'
                        }}</span>
                        <span>{{ p.brand }} {{ p.model }}</span>
                      </div>
                    }
                    @if (p.powerKw !== null) {
                      <div class="info-item">
                        <span class="info-label">{{ isUa ? 'Потужність' : 'Power' }}</span>
                        <span>{{ p.powerKw }} kW</span>
                      </div>
                    }
                    <div class="info-item">
                      <span class="info-label">{{ isUa ? 'Кількість' : 'Quantity' }}</span>
                      <span>{{ p.quantity }}</span>
                    </div>
                    @if (p.notes) {
                      <div class="info-item full-w">
                        <span class="info-label">{{ isUa ? 'Примітки' : 'Notes' }}</span>
                        <span>{{ p.notes }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- VII. Equipment -->
          @if (f.items.length) {
            <div class="section-card">
              <h3>
                {{ isUa ? 'VII. Обладнання' : 'VII. Equipment' }}
                ({{ f.items.length }})
              </h3>
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
                    @for (it of f.items; track it.id; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td>
                          {{
                            isUa
                              ? it.equipmentItem?.category?.nameUa
                              : it.equipmentItem?.category?.nameEn
                          }}
                        </td>
                        <td>{{ isUa ? it.equipmentItem?.nameUa : it.equipmentItem?.nameEn }}</td>
                        <td>{{ it.quantity }}</td>
                        <td>
                          @if (it.equipmentItem?.unit; as u) {
                            {{ getUnitLabel(u, isUa) }}
                          }
                        </td>
                        <td>{{ it.notes || '---' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Danger zone -->
          @if (auth.isAdmin) {
            <div class="danger-zone">
              <button class="btn btn-danger" (click)="deleteForm()">
                {{ isUa ? 'Видалити заявку' : 'Delete form' }}
              </button>
            </div>
          }
        } @else {
          <!-- ────── Audit log tab ────── -->
          @if (auditLoading()) {
            <div class="loading">{{ isUa ? 'Завантаження історії...' : 'Loading history...' }}</div>
          } @else if (auditLog().length === 0) {
            <div class="empty">{{ isUa ? 'Історія порожня' : 'No history yet' }}</div>
          } @else {
            <div class="audit-timeline">
              @for (entry of auditLog(); track entry.id) {
                <div class="audit-entry" [attr.data-action]="entry.action">
                  <div class="audit-marker"></div>
                  <div class="audit-body">
                    <div class="audit-head">
                      <span class="audit-action-badge" [attr.data-action]="entry.action">
                        {{ getActionLabel(entry.action) }}
                      </span>
                      <span class="audit-time">
                        {{ entry.createdAt | date: 'dd.MM.yyyy HH:mm:ss' }}
                      </span>
                    </div>
                    <div class="audit-actor">
                      <span class="audit-actor-label">
                        {{ isUa ? 'Користувач:' : 'User:' }}
                      </span>
                      <span class="audit-actor-email">
                        {{ entry.changedByEmail || (isUa ? 'Анонімно' : 'Anonymous') }}
                      </span>
                    </div>
                    @if (entry.fieldName) {
                      <div class="audit-diff">
                        <span class="audit-field">{{ getFieldLabel(entry.fieldName) }}:</span>
                        <span class="audit-old">{{ formatAuditValue(entry.oldValue) }}</span>
                        <span class="audit-arrow">→</span>
                        <span class="audit-new">{{ formatAuditValue(entry.newValue) }}</span>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        }
      }
    }
  `,
  styles: [
    `
      .btn-back {
        background: none;
        border: none;
        color: #2b6cb0;
        cursor: pointer;
        font-size: 0.9rem;
        margin-bottom: 1rem;
        padding: 0;
      }
      .btn-back:hover {
        text-decoration: underline;
      }

      .edit-header {
        margin-bottom: 1.5rem;
      }
      .edit-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.25rem;
      }
      .edit-meta {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
      }

      .detail-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
        gap: 1rem;
      }
      .detail-header h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.25rem;
      }
      .detail-meta {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
      }
      .detail-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .btn {
        cursor: pointer;
      }
      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .btn-edit {
        background: #2b6cb0;
        color: #fff;
        padding: 0.45rem 1.1rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
        font-weight: 500;
      }
      .btn-edit:hover {
        background: #2c5282;
      }
      .btn-save {
        background: #2b6cb0;
        color: #fff;
        padding: 0.5rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .btn-save:hover {
        background: #2c5282;
      }
      .btn-danger {
        background: #e53e3e;
        color: #fff;
        padding: 0.5rem 1.25rem;
        border: none;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .btn-danger:hover {
        background: #c53030;
      }

      .status-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      [data-status='new'] {
        background: #dbeafe;
        color: #1e40af;
      }
      [data-status='in_review'] {
        background: #fef3c7;
        color: #92400e;
      }
      [data-status='approved'] {
        background: #d1fae5;
        color: #065f46;
      }
      [data-status='rejected'] {
        background: #fee2e2;
        color: #991b1b;
      }
      [data-status='in_progress'] {
        background: #e0e7ff;
        color: #3730a3;
      }
      [data-status='completed'] {
        background: #d1fae5;
        color: #065f46;
      }

      .status-panel {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        align-items: flex-end;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
        margin-bottom: 1.5rem;
      }
      .status-panel label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
        width: 100%;
      }
      .status-panel select {
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .status-panel textarea {
        flex: 1;
        min-width: 200px;
        padding: 0.5rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.85rem;
        resize: vertical;
      }

      .section-card {
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1.25rem;
        margin-bottom: 1rem;
      }
      .section-card h3 {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.75rem;
      }
      .subsection {
        padding: 0.75rem 0;
        border-top: 1px dashed #e2e8f0;
      }
      .subsection:first-of-type {
        border-top: none;
        padding-top: 0;
      }
      .subsection h4 {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
      }
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.6rem;
      }
      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.1rem;
      }
      .info-label {
        font-size: 0.7rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .info-item span:last-child {
        font-size: 0.9rem;
        color: #1e293b;
      }
      .full-w {
        grid-column: 1/-1;
      }

      .equip-table-wrap {
        overflow-x: auto;
      }
      .equip-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .equip-table th {
        text-align: left;
        padding: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        font-size: 0.75rem;
        text-transform: uppercase;
      }
      .equip-table td {
        padding: 0.5rem;
        border-bottom: 1px solid #f1f5f9;
      }

      .danger-zone {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #fee2e2;
      }
      .loading {
        text-align: center;
        padding: 3rem;
        color: #64748b;
      }
      .error-banner {
        background: #fff5f5;
        color: #e53e3e;
        padding: 0.75rem 1rem;
        border: 1px solid #fed7d7;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.9rem;
      }

      /* NEW: Tabs */
      .tabs {
        display: flex;
        gap: 0;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1.5rem;
      }
      .tab {
        background: none;
        border: none;
        padding: 0.75rem 1.25rem;
        font-size: 0.9rem;
        font-weight: 500;
        color: #64748b;
        cursor: pointer;
        border-bottom: 2px solid transparent;
        margin-bottom: -1px;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .tab:hover {
        color: #334155;
      }
      .tab.active {
        color: #2b6cb0;
        border-bottom-color: #2b6cb0;
      }
      .tab-badge {
        background: #e2e8f0;
        color: #64748b;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 600;
      }
      .tab.active .tab-badge {
        background: #2b6cb0;
        color: #fff;
      }

      /* NEW: Audit timeline */
      .audit-timeline {
        position: relative;
        padding-left: 1.5rem;
      }
      .audit-timeline::before {
        content: '';
        position: absolute;
        left: 0.4rem;
        top: 0.5rem;
        bottom: 0.5rem;
        width: 2px;
        background: #e2e8f0;
      }
      .audit-entry {
        position: relative;
        padding: 0 0 1.25rem 1rem;
      }
      .audit-marker {
        position: absolute;
        left: -1.1rem;
        top: 0.4rem;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #cbd5e0;
        border: 2px solid #fff;
        box-shadow: 0 0 0 1px #e2e8f0;
      }
      .audit-entry[data-action='created'] .audit-marker {
        background: #38a169;
      }
      .audit-entry[data-action='updated'] .audit-marker {
        background: #3182ce;
      }
      .audit-entry[data-action='status_changed'] .audit-marker {
        background: #d69e2e;
      }
      .audit-entry[data-action='deleted'] .audit-marker {
        background: #e53e3e;
      }

      .audit-body {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.75rem 1rem;
      }
      .audit-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.4rem;
        flex-wrap: wrap;
      }
      .audit-action-badge {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.03em;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
      }
      .audit-action-badge[data-action='created'] {
        background: #d1fae5;
        color: #065f46;
      }
      .audit-action-badge[data-action='updated'] {
        background: #dbeafe;
        color: #1e40af;
      }
      .audit-action-badge[data-action='status_changed'] {
        background: #fef3c7;
        color: #92400e;
      }
      .audit-action-badge[data-action='deleted'] {
        background: #fee2e2;
        color: #991b1b;
      }

      .audit-time {
        font-size: 0.75rem;
        color: #94a3b8;
        font-variant-numeric: tabular-nums;
      }
      .audit-actor {
        font-size: 0.8rem;
        color: #64748b;
        margin-bottom: 0.4rem;
      }
      .audit-actor-label {
        margin-right: 0.3rem;
      }
      .audit-actor-email {
        color: #1e293b;
        font-weight: 500;
      }

      .audit-diff {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        flex-wrap: wrap;
        padding-top: 0.5rem;
        border-top: 1px dashed #e2e8f0;
      }
      .audit-field {
        font-weight: 600;
        color: #334155;
      }
      .audit-old {
        background: #fee2e2;
        color: #991b1b;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
        text-decoration: line-through;
      }
      .audit-new {
        background: #d1fae5;
        color: #065f46;
        padding: 0.15rem 0.5rem;
        border-radius: 4px;
      }
      .audit-arrow {
        color: #94a3b8;
      }
      .empty {
        text-align: center;
        padding: 3rem;
        color: #64748b;
        font-size: 0.9rem;
      }

      @media (max-width: 640px) {
        .info-grid {
          grid-template-columns: 1fr;
        }
        .detail-header {
          flex-direction: column;
        }
        .status-panel {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `,
  ],
})
export class WashFormDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  // === ADDED: Page title service for SEO ===
  private readonly pageTitle = inject(PageTitleService);
  // === END ADDED ===

  readonly getUnitLabel = getUnitLabel;

  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }

  // ───── State ─────
  form = signal<WashFormDetail | null>(null);
  loading = signal(true);
  mode = signal<'view' | 'edit'>('view');

  // Status panel (view mode)
  statusSaving = signal(false);
  newStatus: WashFormStatus = 'new';
  managerNotes = '';

  // Full edit (edit mode)
  saving = signal(false);
  saveError = signal<string | null>(null);
  activeTab = signal<'details' | 'audit'>('details');
  auditLog = signal<AuditLogEntry[]>([]);
  auditLoading = signal(false);
  auditLoaded = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadForm(id);
    this.pageTitle.setTitle('admin_titles.wash_form_detail', true);
  }

  private loadForm(id: string): void {
    this.loading.set(true);
    this.api.get<WashFormDetail>(`needs-forms/wash/${id}`).subscribe({
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

  // ───── Mode toggling ─────
  enterEditMode(): void {
    this.saveError.set(null);
    this.mode.set('edit');
  }
  cancelEdit(): void {
    this.mode.set('view');
    this.saveError.set(null);
  }

  // ───── Full edit save (PATCH /full) ─────
  onFormSaved(payload: UpdateWashFormFullPayload): void {
    const id = this.form()?.id;
    if (!id) return;

    this.saving.set(true);
    this.saveError.set(null);

    this.api.patch<WashFormDetail>(`needs-forms/wash/${id}/full`, payload).subscribe({
      next: (updated) => {
        this.form.set(updated);
        this.saving.set(false);
        this.mode.set('view');
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const msg = Array.isArray(err.error?.message)
          ? err.error.message.join('; ')
          : (err.error?.message ?? err.message);
        this.saveError.set((this.isUa ? 'Помилка збереження: ' : 'Save error: ') + msg);
      },
    });
  }

  // ───── Quick status update (PATCH) ─────
  updateStatus(): void {
    const id = this.form()?.id;
    if (!id) return;
    this.statusSaving.set(true);
    this.api
      .patch<WashFormDetail>(`needs-forms/wash/${id}`, {
        status: this.newStatus,
        managerNotes: this.managerNotes || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.form.set(updated);
          this.statusSaving.set(false);
        },
        error: () => this.statusSaving.set(false),
      });
  }

  // ───── Delete ─────
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

  // ───── Helpers ─────
  goBack(): void {
    this.router.navigate(['/admin', 'wash-forms']);
  }

  yesNo(v: boolean | null | undefined): string {
    if (v === null || v === undefined) return '---';
    return v ? (this.isUa ? 'Так' : 'Yes') : this.isUa ? 'Ні' : 'No';
  }

  getPumpPurposeLabel(value: string | null | undefined): string {
    if (!value) return '---';
    const labels = PUMP_PURPOSE_LABELS[value as keyof typeof PUMP_PURPOSE_LABELS];
    if (!labels) return value;
    return this.isUa ? labels.ua : labels.en;
  }

  getStatusLabel(status: string): string {
    const map: Record<string, [string, string]> = {
      new: ['Нова', 'New'],
      in_review: ['На розгляді', 'In review'],
      approved: ['Затверджено', 'Approved'],
      rejected: ['Відхилено', 'Rejected'],
      in_progress: ['В роботі', 'In progress'],
      completed: ['Завершено', 'Completed'],
    };
    const v = map[status];
    return v ? (this.isUa ? v[0] : v[1]) : status;
  }

  // tab switching with lazy-load of audit log
  setTab(tab: 'details' | 'audit'): void {
    this.activeTab.set(tab);
    if (tab === 'audit' && !this.auditLoaded()) {
      this.loadAuditLog();
    }
  }

  private loadAuditLog(): void {
    const id = this.form()?.id;
    if (!id) return;
    this.auditLoading.set(true);
    this.api.get<AuditLogEntry[]>(`needs-forms/wash/${id}/audit-log`).subscribe({
      next: (entries) => {
        this.auditLog.set(entries);
        this.auditLoading.set(false);
        this.auditLoaded.set(true);
      },
      error: () => this.auditLoading.set(false),
    });
  }

  // human-readable action label
  getActionLabel(action: AuditLogEntry['action']): string {
    const map: Record<AuditLogEntry['action'], [string, string]> = {
      created: ['Створено', 'Created'],
      updated: ['Оновлено', 'Updated'],
      status_changed: ['Зміна статусу', 'Status changed'],
      deleted: ['Видалено', 'Deleted'],
    };
    return this.isUa ? map[action][0] : map[action][1];
  }

  // friendly field name for audit diff display
  getFieldLabel(field: string | null): string {
    if (!field) return '';
    const map: Record<string, [string, string]> = {
      organizationName: ['Організація', 'Organization'],
      headName: ['ПІБ керівника', 'Head name'],
      headPhone: ['Телефон', 'Phone'],
      email: ['Email', 'Email'],
      objectName: ['Назва обʼєкту', 'Object name'],
      dependentPopulation: ['Залежних людей', 'Dependent population'],
      socialFacilities: ['Соц. установи', 'Social facilities'],
      installationDeadline: ['Термін монтажу', 'Installation deadline'],
      replacementReason: ['Причини', 'Replacement reason'],
      region: ['Область', 'Region'],
      district: ['Район', 'District'],
      community: ['Громада', 'Community'],
      settlement: ['Населений пункт', 'Settlement'],
      status: ['Статус', 'Status'],
      managerNotes: ['Нотатки менеджера', 'Manager notes'],
      boreholes: ['Свердловини', 'Boreholes'],
      towers: ['Башти', 'Towers'],
      purifications: ['Очищення', 'Purification'],
      pumps: ['Насоси', 'Pumps'],
      items: ['Обладнання', 'Equipment'],
    };
    const v = map[field];
    return v ? (this.isUa ? v[0] : v[1]) : field;
  }

  // render value for diff display (collapse JSON arrays/objects)
  formatAuditValue(value: string | null): string {
    if (value === null || value === undefined) return '—';
    if (value === '') return this.isUa ? '(порожньо)' : '(empty)';

    // If it's stringified JSON array/object → show count instead of raw blob
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return this.isUa ? `${parsed.length} запис(ів)` : `${parsed.length} item(s)`;
        }
        return this.isUa ? '(обʼєкт)' : '(object)';
      } catch {
        // Fall through to raw value
      }
    }
    // Truncate long text
    return value.length > 80 ? value.slice(0, 80) + '…' : value;
  }
}

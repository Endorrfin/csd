// ui/src/app/features/admin/recovery-form-detail/recovery-form-detail.ts
// Admin detail for the "Recovery" needs form (PR-5). View mode shows every
// field + a photo gallery (presigned GET) + documents + audit log; edit mode
// reuses the public RecoveryFormComponent with [mode]="'edit'". Language is
// read from the signal-based LanguageService (zoneless-safe).
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { RecoveryFormComponent } from '../../needs/recovery-form/recovery-form';
import {
  ACCESSIBILITY_FEATURE_OPTIONS,
  APPLICANT_CATEGORY_OPTIONS,
  ASBESTOS_OPTIONS,
  COFINANCING_OPTIONS,
  COST_BASIS_OPTIONS,
  DAMAGE_CATEGORY_OPTIONS,
  DAMAGE_CAUSE_OPTIONS,
  DAMAGE_ELEMENTS,
  DESIRED_TIMELINE_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  EDUCATION_MODE_OPTIONS,
  FUNCTIONING_STATUS_OPTIONS,
  HEALTH_FACILITY_KIND_OPTIONS,
  LabeledOption,
  OBJECT_TYPE_OPTIONS,
  OWNERSHIP_TYPE_OPTIONS,
  RecoveryAuditLogEntry,
  RecoveryFormDetail,
  RecoveryFormStatus,
  REMOTE_OPERATION_OPTIONS,
  SHELTER_STATUS_OPTIONS,
  SHELTER_TYPE_OPTIONS,
  URGENCY_OPTIONS,
  UpdateRecoveryFormFullPayload,
  WORK_CATEGORY_OPTIONS,
} from '../../needs/recovery-form/recovery-form.interfaces';

@Component({
  selector: 'app-recovery-form-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RecoveryFormComponent],
  template: `
    <button class="btn-back" (click)="goBack()">
      ← {{ isUa() ? 'Назад до списку' : 'Back to list' }}
    </button>

    @if (loading()) {
      <div class="loading">{{ isUa() ? 'Завантаження...' : 'Loading...' }}</div>
    } @else if (form(); as f) {
      <!-- ════════════ EDIT MODE ════════════ -->
      @if (mode() === 'edit') {
        <div class="edit-header">
          <h2>{{ isUa() ? 'Редагування заявки' : 'Edit form' }}</h2>
          <p class="edit-meta">{{ f.trackingNumber }} · {{ f.organizationName }}</p>
        </div>
        @if (saveError()) {
          <div class="error-banner">{{ saveError() }}</div>
        }
        <app-recovery-form
          [mode]="'edit'"
          [initialData]="f"
          [externalSaving]="saving()"
          (saved)="onFormSaved($event)"
          (cancelled)="cancelEdit()"
        ></app-recovery-form>
      } @else {
        <!-- ════════════ VIEW MODE ════════════ -->
        <div class="detail-header">
          <div>
            <h2>{{ f.objectName }}</h2>
            <p class="detail-meta">
              <span class="track">{{ f.trackingNumber }}</span> ·
              {{ isUa() ? f.region : f.regionEn }} ·
              {{ f.createdAt | date: 'dd.MM.yyyy HH:mm' }}
            </p>
          </div>
          <div class="detail-actions">
            <span class="status-badge" [attr.data-status]="f.status">
              {{ getStatusLabel(f.status) }}
            </span>
            <button class="btn btn-edit" (click)="enterEditMode()">
              {{ isUa() ? 'Редагувати' : 'Edit' }}
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
            {{ isUa() ? 'Деталі' : 'Details' }}
          </button>
          <button class="tab" [class.active]="activeTab() === 'audit'" (click)="setTab('audit')">
            {{ isUa() ? 'Історія змін' : 'Audit log' }}
            @if (auditLoaded() && auditLog().length > 0) {
              <span class="tab-badge">{{ auditLog().length }}</span>
            }
          </button>
        </div>

        @if (activeTab() === 'details') {
          <!-- Quick status panel -->
          <div class="status-panel">
            <label for="status-select">{{ isUa() ? 'Змінити статус:' : 'Change status:' }}</label>
            <select id="status-select" [(ngModel)]="newStatus">
              @for (s of STATUSES; track s) {
                <option [value]="s">{{ getStatusLabel(s) }}</option>
              }
            </select>
            <textarea
              [(ngModel)]="managerNotes"
              rows="2"
              [placeholder]="isUa() ? 'Нотатки менеджера' : 'Manager notes'"
            ></textarea>
            <button class="btn btn-save" (click)="updateStatus()" [disabled]="statusSaving()">
              {{ statusSaving() ? '...' : isUa() ? 'Зберегти статус' : 'Save status' }}
            </button>
          </div>

          <!-- I. Applicant & contacts -->
          <div class="section-card">
            <h3>{{ isUa() ? 'I. Заявник і контакти' : 'I. Applicant & contacts' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Категорія' : 'Category' }}</span>
                <span
                  >{{ optLabel(applicantCategories, f.applicantCategory)
                  }}{{ f.applicantCategoryOther ? ' · ' + f.applicantCategoryOther : '' }}</span
                >
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Організація' : 'Organization' }}</span>
                <span>{{ f.organizationName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Область' : 'Region' }}</span>
                <span>{{ isUa() ? f.region : f.regionEn }}</span>
              </div>
              @if (f.district) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Район' : 'District' }}</span>
                  <span>{{ isUa() ? f.district : f.districtEn }}</span>
                </div>
              }
              @if (f.community) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Громада' : 'Community' }}</span>
                  <span>{{ isUa() ? f.community : f.communityEn }}</span>
                </div>
              }
              @if (f.settlement) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Населений пункт' : 'Settlement' }}</span>
                  <span>{{ isUa() ? f.settlement : f.settlementEn }}</span>
                </div>
              }
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Контактна особа' : 'Contact' }}</span>
                <span>{{ f.contactName }} ({{ f.contactPosition }})</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Телефон' : 'Phone' }}</span>
                <span>{{ f.phone }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email</span>
                <span>{{ f.email }}</span>
              </div>
              @if (f.messenger) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Месенджер' : 'Messenger' }}</span>
                  <span>{{ f.messenger }}</span>
                </div>
              }
              @if (f.altContactName || f.altContactPhone) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Додатковий контакт' : 'Alternate contact'
                  }}</span>
                  <span>{{ f.altContactName }} {{ f.altContactPhone }}</span>
                </div>
              }
              @if (f.website) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Вебсайт' : 'Website' }}</span>
                  <span
                    ><a [href]="f.website" target="_blank" rel="noopener">{{ f.website }}</a></span
                  >
                </div>
              }
            </div>
          </div>

          <!-- II. Object & damage -->
          <div class="section-card">
            <h3>{{ isUa() ? 'II. Обʼєкт і пошкодження' : 'II. Object & damage' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Назва' : 'Name' }}</span>
                <span>{{ f.objectName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Тип' : 'Type' }}</span>
                <span
                  >{{ optLabel(objectTypes, f.objectType)
                  }}{{ f.objectTypeOther ? ' · ' + f.objectTypeOther : '' }}</span
                >
              </div>
              @if (f.streetAddress) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Адреса' : 'Address' }}</span>
                  <span>{{ f.streetAddress }}</span>
                </div>
              }
              @if (f.ownershipType) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Власність' : 'Ownership' }}</span>
                  <span
                    >{{ optLabel(ownershipTypes, f.ownershipType)
                    }}{{ f.ownershipTypeOther ? ' · ' + f.ownershipTypeOther : '' }}</span
                  >
                </div>
              }
              @if (f.onApplicantBalance !== null) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'На балансі заявника' : 'On applicant balance'
                  }}</span>
                  <span>{{ yesNo(f.onApplicantBalance) }}</span>
                </div>
              }
              @if (f.buildYear) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Рік побудови' : 'Build year' }}</span>
                  <span>{{ f.buildYear }}</span>
                </div>
              }
              @if (f.totalArea) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Площа, м²' : 'Area, m²' }}</span>
                  <span>{{ f.totalArea }}</span>
                </div>
              }
              @if (f.floors) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Поверхів' : 'Floors' }}</span>
                  <span>{{ f.floors }}</span>
                </div>
              }
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Категорії робіт' : 'Work categories' }}</span>
                <span>{{ optLabels(workCategoryOptions, f.workCategories) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Причина' : 'Cause' }}</span>
                <span
                  >{{ optLabel(damageCauses, f.damageCause)
                  }}{{ f.damageCauseOther ? ' · ' + f.damageCauseOther : '' }}</span
                >
              </div>
              @if (f.damageDate) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Дата пошкодження' : 'Damage date' }}</span>
                  <span>{{ f.damageDate }}</span>
                </div>
              }
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Категорія' : 'Category' }}</span>
                <span>{{ optLabel(damageCategories, f.damageCategory) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Стан' : 'Status' }}</span>
                <span>{{ optLabel(functioningStatuses, f.functioningStatus) }}</span>
              </div>
              @if (f.accessibilityFeatures?.length) {
                <div class="info-item full-w">
                  <span class="info-label">{{ isUa() ? 'Доступність' : 'Accessibility' }}</span>
                  <span>{{ optLabels(accessibilityFeatureOptions, f.accessibilityFeatures) }}</span>
                </div>
              }
              <div class="info-item full-w">
                <span class="info-label">{{
                  isUa() ? 'Опис пошкоджень' : 'Damage description'
                }}</span>
                <span class="pre">{{ f.damageDescription }}</span>
              </div>
            </div>

            @if (f.damages.length) {
              <div class="subsection">
                <h4>
                  {{ isUa() ? 'Пошкоджені елементи' : 'Damaged elements' }} ({{ f.damages.length }})
                </h4>
                <table class="mini-table">
                  <thead>
                    <tr>
                      <th>{{ isUa() ? 'Елемент' : 'Element' }}</th>
                      <th>{{ isUa() ? 'Обсяг' : 'Volume' }}</th>
                      <th>{{ isUa() ? 'Од.' : 'Unit' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of f.damages; track d.id) {
                      <tr>
                        <td>{{ damageElementLabel(d.element) }}</td>
                        <td>{{ d.volume ?? '—' }}</td>
                        <td>{{ damageUnitLabel(d.element) || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <!-- III. Beneficiaries -->
          <div class="section-card">
            <h3>{{ isUa() ? 'III. Бенефіціари та вплив' : 'III. Beneficiaries & impact' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Прямі' : 'Direct' }}</span>
                <span>{{ f.directBeneficiaries }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'ВПО' : 'IDPs' }}</span>
                <span>{{ f.idpCount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Діти' : 'Children' }}</span>
                <span>{{ f.childrenCount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Інвалідність' : 'PwD' }}</span>
                <span>{{ f.pwdCount }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">60+</span>
                <span>{{ f.elderlyCount }}</span>
              </div>
              @if (f.femaleCount !== null || f.maleCount !== null) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Ж / Ч' : 'F / M' }}</span>
                  <span>{{ f.femaleCount ?? '—' }} / {{ f.maleCount ?? '—' }}</span>
                </div>
              }
              @if (f.indirectBeneficiaries !== null) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Непрямі' : 'Indirect' }}</span>
                  <span>{{ f.indirectBeneficiaries }}</span>
                </div>
              }
              @if (f.staffCount !== null) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Персонал' : 'Staff' }}</span>
                  <span>{{ f.staffCount }}</span>
                </div>
              }
              @if (f.canOperateRemotely) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Дистанційна робота' : 'Remote operation'
                  }}</span>
                  <span>{{ optLabel(remoteOperationOptions, f.canOperateRemotely) }}</span>
                </div>
              }
            </div>

            @if (f.objectType === 'education') {
              <div class="subsection">
                <h4>{{ isUa() ? 'Освіта' : 'Education' }}</h4>
                <div class="info-grid">
                  @if (f.educationMode) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Формат' : 'Mode' }}</span>
                      <span>{{ optLabel(educationModes, f.educationMode) }}</span>
                    </div>
                  }
                  @if (f.shelterStatus) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Укриття' : 'Shelter' }}</span>
                      <span>{{ optLabel(shelterStatuses, f.shelterStatus) }}</span>
                    </div>
                  }
                  @if (f.shelterType) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Тип укриття' : 'Shelter type' }}</span>
                      <span>{{ optLabel(shelterTypes, f.shelterType) }}</span>
                    </div>
                  }
                  @if (f.shelterCapacity) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Місткість' : 'Capacity' }}</span>
                      <span>{{ f.shelterCapacity }}</span>
                    </div>
                  }
                </div>
              </div>
            }

            @if (f.objectType === 'healthcare') {
              <div class="subsection">
                <h4>{{ isUa() ? 'Охорона здоровʼя' : 'Healthcare' }}</h4>
                <div class="info-grid">
                  @if (f.healthFacilityKind) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Тип закладу' : 'Facility kind' }}</span>
                      <span>{{ optLabel(healthFacilityKinds, f.healthFacilityKind) }}</span>
                    </div>
                  }
                  @if (f.declarationsCount !== null) {
                    <div class="info-item">
                      <span class="info-label">{{ isUa() ? 'Декларації' : 'Declarations' }}</span>
                      <span>{{ f.declarationsCount }}</span>
                    </div>
                  }
                  @if (f.suspendedServices) {
                    <div class="info-item full-w">
                      <span class="info-label">{{
                        isUa() ? 'Призупинені послуги' : 'Suspended services'
                      }}</span>
                      <span class="pre">{{ f.suspendedServices }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- IV. Budget & documentation -->
          <div class="section-card">
            <h3>
              {{ isUa() ? 'IV. Бюджет, документація, терміни' : 'IV. Budget, docs, timeline' }}
            </h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Вартість, грн' : 'Cost, UAH' }}</span>
                <span>{{ formatCost(f.estimatedCost) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Підстава' : 'Cost basis' }}</span>
                <span>{{ optLabel(costBases, f.costBasis) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Співфінансування' : 'Co-financing' }}</span>
                <span
                  >{{ optLabel(cofinancingOptions, f.cofinancing)
                  }}{{ f.cofinancingDetails ? ' · ' + f.cofinancingDetails : '' }}</span
                >
              </div>
              <div class="info-item full-w">
                <span class="info-label">{{ isUa() ? 'Документація' : 'Documentation' }}</span>
                <span>{{ optLabels(docsAvailableOptions, f.docsAvailable) }}</span>
              </div>
              @if (f.desiredTimeline) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Терміни' : 'Timeline' }}</span>
                  <span>{{ optLabel(desiredTimelines, f.desiredTimeline) }}</span>
                </div>
              }
              @if (f.urgency) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Терміновість' : 'Urgency' }}</span>
                  <span>{{ optLabel(urgencyOptions, f.urgency) }}</span>
                </div>
              }
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Інші донори' : 'Other donors' }}</span>
                <span
                  >{{ yesNo(f.otherDonors)
                  }}{{ f.otherDonorsDetails ? ' · ' + f.otherDonorsDetails : '' }}</span
                >
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Азбест (АВМ)' : 'Asbestos' }}</span>
                <span>{{ optLabel(asbestosOptions, f.asbestosPresence) }}</span>
              </div>
              @if (f.cloudLink) {
                <div class="info-item full-w">
                  <span class="info-label">{{ isUa() ? 'Хмарне посилання' : 'Cloud link' }}</span>
                  <span
                    ><a [href]="f.cloudLink" target="_blank" rel="noopener">{{
                      f.cloudLink
                    }}</a></span
                  >
                </div>
              }
              @if (f.managerNotes) {
                <div class="info-item full-w">
                  <span class="info-label">{{
                    isUa() ? 'Нотатки менеджера' : 'Manager notes'
                  }}</span>
                  <span class="pre">{{ f.managerNotes }}</span>
                </div>
              }
            </div>
          </div>

          <!-- V. Photos & documents -->
          <div class="section-card">
            <h3>{{ isUa() ? 'V. Фото та документи' : 'V. Photos & documents' }}</h3>

            <div class="subsection">
              <h4>{{ isUa() ? 'Фотографії' : 'Photos' }} ({{ photos().length }})</h4>
              @if (photos().length) {
                <div class="gallery">
                  @for (p of photos(); track p.id) {
                    @if (p.url) {
                      <button type="button" class="gallery-thumb" (click)="openLightbox(p.url)">
                        <img [src]="p.url" [alt]="p.originalName" loading="lazy" />
                      </button>
                    } @else {
                      <div class="gallery-thumb gallery-thumb--broken" [title]="p.originalName">
                        ⚠
                      </div>
                    }
                  }
                </div>
              } @else {
                <span class="muted">{{ isUa() ? 'Немає фото' : 'No photos' }}</span>
              }
            </div>

            <div class="subsection">
              <h4>{{ isUa() ? 'Документи' : 'Documents' }} ({{ documents().length }})</h4>
              @if (documents().length) {
                <ul class="doc-list">
                  @for (d of documents(); track d.id) {
                    <li>
                      @if (d.url) {
                        <a [href]="d.url" target="_blank" rel="noopener">{{ d.originalName }}</a>
                      } @else {
                        <span>{{ d.originalName }}</span>
                      }
                      <span class="doc-size">{{ fileSize(d.sizeBytes) }}</span>
                    </li>
                  }
                </ul>
              } @else {
                <span class="muted">{{ isUa() ? 'Немає документів' : 'No documents' }}</span>
              }
            </div>
          </div>

          <!-- Danger zone -->
          @if (auth.isAdmin) {
            <div class="danger-zone">
              <button class="btn btn-danger" (click)="deleteForm()">
                {{ isUa() ? 'Видалити заявку' : 'Delete form' }}
              </button>
            </div>
          }
        } @else {
          <!-- ────── Audit log tab ────── -->
          @if (auditLoading()) {
            <div class="loading">
              {{ isUa() ? 'Завантаження історії...' : 'Loading history...' }}
            </div>
          } @else if (auditLog().length === 0) {
            <div class="empty">{{ isUa() ? 'Історія порожня' : 'No history yet' }}</div>
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
                      <span class="audit-time">{{
                        entry.createdAt | date: 'dd.MM.yyyy HH:mm:ss'
                      }}</span>
                    </div>
                    <div class="audit-actor">
                      <span class="audit-actor-label">{{ isUa() ? 'Користувач:' : 'User:' }}</span>
                      <span class="audit-actor-email">
                        {{ entry.changedByEmail || (isUa() ? 'Анонімно' : 'Anonymous') }}
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

    <!-- Lightbox overlay -->
    @if (lightbox(); as url) {
      <div
        class="lightbox"
        role="button"
        tabindex="0"
        [attr.aria-label]="isUa() ? 'Закрити' : 'Close'"
        (click)="onLightboxBackdropClick($event)"
        (keydown.escape)="closeLightbox()"
        (keydown.enter)="closeLightbox()"
      >
        <img [src]="url" alt="" />
        <button class="lightbox-close" (click)="closeLightbox()">✕</button>
      </div>
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
      .track {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        color: #2b6cb0;
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
        padding: 0.75rem 0 0;
        margin-top: 0.75rem;
        border-top: 1px dashed #e2e8f0;
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
      .info-item .pre {
        white-space: pre-wrap;
      }
      .full-w {
        grid-column: 1/-1;
      }
      .mini-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .mini-table th {
        text-align: left;
        padding: 0.4rem 0.5rem;
        border-bottom: 2px solid #e2e8f0;
        color: #64748b;
        font-weight: 600;
        font-size: 0.72rem;
        text-transform: uppercase;
      }
      .mini-table td {
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 0.6rem;
      }
      .gallery-thumb {
        padding: 0;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        aspect-ratio: 4/3;
        cursor: pointer;
        background: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gallery-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .gallery-thumb--broken {
        color: #cbd5e0;
        font-size: 1.5rem;
        cursor: default;
      }
      .doc-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      .doc-list li {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.45rem 0.65rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        font-size: 0.85rem;
      }
      .doc-size {
        color: #94a3b8;
        white-space: nowrap;
      }
      .muted {
        color: #94a3b8;
        font-size: 0.85rem;
      }
      .danger-zone {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #fee2e2;
      }
      .loading,
      .empty {
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
      .lightbox {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 2rem;
      }
      .lightbox img {
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: 6px;
      }
      .lightbox-close {
        position: absolute;
        top: 1rem;
        right: 1.25rem;
        background: rgba(255, 255, 255, 0.15);
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 1.2rem;
        padding: 0.35rem 0.7rem;
        cursor: pointer;
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
export class RecoveryFormDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly isUa = inject(LanguageService).isUa;
  private readonly pageTitle = inject(PageTitleService);

  // Option catalogs for label lookups (single source = interfaces file).
  protected readonly applicantCategories = APPLICANT_CATEGORY_OPTIONS;
  protected readonly objectTypes = OBJECT_TYPE_OPTIONS;
  protected readonly ownershipTypes = OWNERSHIP_TYPE_OPTIONS;
  protected readonly workCategoryOptions = WORK_CATEGORY_OPTIONS;
  protected readonly damageCauses = DAMAGE_CAUSE_OPTIONS;
  protected readonly damageCategories = DAMAGE_CATEGORY_OPTIONS;
  protected readonly functioningStatuses = FUNCTIONING_STATUS_OPTIONS;
  protected readonly accessibilityFeatureOptions = ACCESSIBILITY_FEATURE_OPTIONS;
  protected readonly educationModes = EDUCATION_MODE_OPTIONS;
  protected readonly shelterStatuses = SHELTER_STATUS_OPTIONS;
  protected readonly shelterTypes = SHELTER_TYPE_OPTIONS;
  protected readonly healthFacilityKinds = HEALTH_FACILITY_KIND_OPTIONS;
  protected readonly remoteOperationOptions = REMOTE_OPERATION_OPTIONS;
  protected readonly costBases = COST_BASIS_OPTIONS;
  protected readonly cofinancingOptions = COFINANCING_OPTIONS;
  protected readonly docsAvailableOptions = DOCS_AVAILABLE_OPTIONS;
  protected readonly desiredTimelines = DESIRED_TIMELINE_OPTIONS;
  protected readonly urgencyOptions = URGENCY_OPTIONS;
  protected readonly asbestosOptions = ASBESTOS_OPTIONS;

  // ───── State ─────
  form = signal<RecoveryFormDetail | null>(null);
  loading = signal(true);
  mode = signal<'view' | 'edit'>('view');

  // Status panel (view mode)
  statusSaving = signal(false);
  newStatus: RecoveryFormStatus = 'new';
  managerNotes = '';

  // Full edit (edit mode)
  saving = signal(false);
  saveError = signal<string | null>(null);
  activeTab = signal<'details' | 'audit'>('details');
  auditLog = signal<RecoveryAuditLogEntry[]>([]);
  auditLoading = signal(false);
  auditLoaded = signal(false);

  // Lightbox
  lightbox = signal<string | null>(null);

  // Derived attachment lists
  photos = computed(() => (this.form()?.attachments ?? []).filter((a) => a.kind === 'photo'));
  documents = computed(() => (this.form()?.attachments ?? []).filter((a) => a.kind === 'document'));

  readonly STATUSES: readonly RecoveryFormStatus[] = [
    'new',
    'in_review',
    'approved',
    'rejected',
    'in_progress',
    'completed',
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loadForm(id);
    this.pageTitle.setTitle('admin_titles.recovery_form_detail', true);
  }

  private loadForm(id: string): void {
    this.loading.set(true);
    this.api.get<RecoveryFormDetail>(`needs-forms/recovery/${id}`).subscribe({
      next: (f) => {
        this.form.set(f);
        this.newStatus = f.status;
        this.managerNotes = f.managerNotes ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/admin', 'recovery-forms']);
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
  onFormSaved(payload: UpdateRecoveryFormFullPayload): void {
    const id = this.form()?.id;
    if (!id) return;

    this.saving.set(true);
    this.saveError.set(null);

    this.api.patch<RecoveryFormDetail>(`needs-forms/recovery/${id}/full`, payload).subscribe({
      next: (updated) => {
        this.form.set(updated);
        this.saving.set(false);
        this.mode.set('view');
        // audit changed — force reload next time the tab opens
        this.auditLoaded.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        const msg = Array.isArray(err.error?.message)
          ? err.error.message.join('; ')
          : (err.error?.message ?? err.message);
        this.saveError.set((this.isUa() ? 'Помилка збереження: ' : 'Save error: ') + msg);
      },
    });
  }

  // ───── Quick status update (PATCH) ─────
  updateStatus(): void {
    const id = this.form()?.id;
    if (!id) return;
    this.statusSaving.set(true);
    this.api
      .patch<RecoveryFormDetail>(`needs-forms/recovery/${id}`, {
        status: this.newStatus,
        managerNotes: this.managerNotes || undefined,
      })
      .subscribe({
        next: (updated) => {
          this.form.set(updated);
          this.statusSaving.set(false);
          this.auditLoaded.set(false);
        },
        error: () => this.statusSaving.set(false),
      });
  }

  // ───── Delete ─────
  deleteForm(): void {
    const msg = this.isUa()
      ? 'Ви впевнені, що хочете видалити цю заявку?'
      : 'Are you sure you want to delete this form?';
    if (!confirm(msg)) return;

    const id = this.form()?.id;
    if (!id) return;
    this.api.delete(`needs-forms/recovery/${id}`).subscribe({
      next: () => this.router.navigate(['/admin', 'recovery-forms']),
    });
  }

  // ───── Lightbox ─────
  openLightbox(url: string): void {
    this.lightbox.set(url);
  }
  closeLightbox(): void {
    this.lightbox.set(null);
  }
  /** CHANGED: close only when the backdrop itself is clicked, not the image. */
  onLightboxBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeLightbox();
  }

  // ───── Helpers ─────
  goBack(): void {
    this.router.navigate(['/admin', 'recovery-forms']);
  }

  yesNo(v: boolean | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v ? (this.isUa() ? 'Так' : 'Yes') : this.isUa() ? 'Ні' : 'No';
  }

  optLabel(options: readonly LabeledOption<string>[], value: unknown): string {
    if (value == null || value === '') return '—';
    const o = options.find((x) => x.value === value);
    return o ? (this.isUa() ? o.ua : o.en) : String(value);
  }

  optLabels(
    options: readonly LabeledOption<string>[],
    values: readonly string[] | null | undefined,
  ): string {
    if (!values || !values.length) return '—';
    return values.map((v) => this.optLabel(options, v)).join(', ');
  }

  damageElementLabel(element: string): string {
    const d = DAMAGE_ELEMENTS.find((x) => x.element === element);
    return d ? (this.isUa() ? d.ua : d.en) : element;
  }

  damageUnitLabel(element: string): string {
    const d = DAMAGE_ELEMENTS.find((x) => x.element === element);
    return d ? (this.isUa() ? d.unitUa : d.unitEn) : '';
  }

  formatCost(value: number | string): string {
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return n.toLocaleString(this.isUa() ? 'uk-UA' : 'en-US');
  }

  fileSize(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} ${this.isUa() ? 'МБ' : 'MB'}`;
    return `${Math.max(1, Math.round(bytes / 1024))} ${this.isUa() ? 'КБ' : 'KB'}`;
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
    return v ? (this.isUa() ? v[0] : v[1]) : status;
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
    this.api.get<RecoveryAuditLogEntry[]>(`needs-forms/recovery/${id}/audit-log`).subscribe({
      next: (entries) => {
        this.auditLog.set(entries);
        this.auditLoading.set(false);
        this.auditLoaded.set(true);
      },
      error: () => this.auditLoading.set(false),
    });
  }

  getActionLabel(action: RecoveryAuditLogEntry['action']): string {
    const map: Record<RecoveryAuditLogEntry['action'], [string, string]> = {
      created: ['Створено', 'Created'],
      updated: ['Оновлено', 'Updated'],
      status_changed: ['Зміна статусу', 'Status changed'],
      deleted: ['Видалено', 'Deleted'],
    };
    return this.isUa() ? map[action][0] : map[action][1];
  }

  getFieldLabel(field: string | null): string {
    if (!field) return '';
    const map: Record<string, [string, string]> = {
      status: ['Статус', 'Status'],
      managerNotes: ['Нотатки менеджера', 'Manager notes'],
      organizationName: ['Організація', 'Organization'],
      objectName: ['Назва обʼєкта', 'Object name'],
      objectType: ['Тип обʼєкта', 'Object type'],
      damageCategory: ['Категорія пошкодження', 'Damage category'],
      damageDescription: ['Опис пошкоджень', 'Damage description'],
      functioningStatus: ['Стан функціонування', 'Functioning status'],
      estimatedCost: ['Вартість', 'Estimated cost'],
      directBeneficiaries: ['Прямі бенефіціари', 'Direct beneficiaries'],
      urgency: ['Терміновість', 'Urgency'],
      damages: ['Пошкодження', 'Damages'],
      region: ['Область', 'Region'],
      contactName: ['Контактна особа', 'Contact name'],
      phone: ['Телефон', 'Phone'],
      email: ['Email', 'Email'],
    };
    const v = map[field];
    return v ? (this.isUa() ? v[0] : v[1]) : field;
  }

  formatAuditValue(value: string | null): string {
    if (value === null || value === undefined) return '—';
    if (value === '') return this.isUa() ? '(порожньо)' : '(empty)';
    if (value.startsWith('[') || value.startsWith('{')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return this.isUa() ? `${parsed.length} запис(ів)` : `${parsed.length} item(s)`;
        }
        return this.isUa() ? '(обʼєкт)' : '(object)';
      } catch {
        // fall through
      }
    }
    return value.length > 80 ? value.slice(0, 80) + '…' : value;
  }
}

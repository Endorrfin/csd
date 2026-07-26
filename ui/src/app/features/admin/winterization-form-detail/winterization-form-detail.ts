// ui/src/app/features/admin/winterization-form-detail/winterization-form-detail.ts
// Admin detail for the "Winterization" needs form (PR-W4). View mode shows every
// field, the need specification grouped by category, a photo gallery (presigned
// GET), documents and the audit log; edit mode reuses the public
// WinterizationFormComponent with [mode]="'edit'". Language is read from the
// signal-based LanguageService (zoneless-safe).
//
// Household (`hh*`) fields are intentionally not rendered: the scenario is gated
// off by WINTERIZATION_HOUSEHOLD_ENABLED and the same gate guards
// PATCH :id/full, so an admin cannot switch a form to household either.
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { PageTitleService } from '../../../core/services/page-title.service';
import { WinterizationFormComponent } from '../../needs/winterization-form/winterization-form';
import {
  APPLICANT_TYPE_OPTIONS,
  BACKUP_POWER_OPTIONS,
  BUILDING_CONDITION_OPTIONS,
  COFINANCING_OPTIONS,
  COST_BASIS_OPTIONS,
  DOCS_AVAILABLE_OPTIONS,
  FACILITY_KIND_OPTIONS,
  FRONTLINE_STATUS_OPTIONS,
  GENERATOR_FUEL_TYPE_OPTIONS,
  GENERATOR_PURPOSE_OPTIONS,
  HEATING_SOURCE_OPTIONS,
  LabeledOption,
  LIQUID_FUEL_ITEM_OPTIONS,
  LOGISTICS_OPTIONS,
  NEED_BY_OPTIONS,
  NeedCategory,
  NeedItem,
  ORGANIZATION_NEED_CATEGORY_OPTIONS,
  RESILIENCE_POINT_STATUS_OPTIONS,
  UpdateWinterizationFormFullPayload,
  URGENCY_OPTIONS,
  WinterizationAuditLogEntry,
  WinterizationFormDetail,
  WinterizationFormStatus,
  WinterizationNeedFull,
} from '../../needs/winterization-form/winterization-form.interfaces';

/** One rendered block of the specification table. */
interface NeedGroup {
  category: NeedCategory;
  rows: WinterizationNeedFull[];
}

@Component({
  selector: 'app-winterization-form-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, WinterizationFormComponent],
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
        <app-winterization-form
          [mode]="'edit'"
          [initialData]="f"
          [externalSaving]="saving()"
          (saved)="onFormSaved($event)"
          (cancelled)="cancelEdit()"
        ></app-winterization-form>
      } @else {
        <!-- ════════════ VIEW MODE ════════════ -->
        <div class="detail-header">
          <div>
            <h2>{{ f.facilityName || f.organizationName }}</h2>
            <p class="detail-meta">
              <span class="track">{{ f.trackingNumber }}</span> ·
              {{ isUa() ? f.region : f.regionEn }} ·
              {{ f.createdAt | date: 'dd.MM.yyyy HH:mm' }}
            </p>
          </div>
          <div class="detail-actions">
            <span class="urg-badge" [attr.data-urg]="f.urgency">
              {{ optLabel(urgencyOptions, f.urgency) }}
            </span>
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
                <span class="info-label">{{ isUa() ? 'Тип заявника' : 'Applicant type' }}</span>
                <span>{{ optLabel(applicantTypes, f.applicantType) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Організація' : 'Organization' }}</span>
                <span>{{ f.organizationName }}</span>
              </div>
              @if (f.edrpou) {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'ЄДРПОУ' : 'EDRPOU' }}</span>
                  <span>{{ f.edrpou }}</span>
                </div>
              }
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
                <span
                  >{{ f.contactName
                  }}{{ f.contactPosition ? ' (' + f.contactPosition + ')' : '' }}</span
                >
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

          <!-- II. Object & heating (institution) / hromada (municipality) -->
          <div class="section-card">
            <h3>
              {{
                f.applicantType === 'institution'
                  ? isUa()
                    ? 'II. Обʼєкт та опалення'
                    : 'II. Facility & heating'
                  : isUa()
                    ? 'II. Громада'
                    : 'II. Hromada'
              }}
            </h3>
            <div class="info-grid">
              @if (f.applicantType === 'institution') {
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Назва закладу' : 'Facility name' }}</span>
                  <span>{{ f.facilityName || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">{{ isUa() ? 'Тип закладу' : 'Facility kind' }}</span>
                  <span
                    >{{ optLabel(facilityKinds, f.facilityKind)
                    }}{{ f.facilityKindOther ? ' · ' + f.facilityKindOther : '' }}</span
                  >
                </div>
                @if (f.streetAddress) {
                  <div class="info-item">
                    <span class="info-label">{{ isUa() ? 'Адреса' : 'Address' }}</span>
                    <span>{{ f.streetAddress }}</span>
                  </div>
                }
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Джерело опалення' : 'Heating source'
                  }}</span>
                  <span
                    >{{ optLabel(heatingSources, f.heatingSource)
                    }}{{ f.heatingSourceOther ? ' · ' + f.heatingSourceOther : '' }}</span
                  >
                </div>
                @if (f.heatedArea) {
                  <div class="info-item">
                    <span class="info-label">{{
                      isUa() ? 'Опалювана площа, м²' : 'Heated area, m²'
                    }}</span>
                    <span>{{ f.heatedArea }}</span>
                  </div>
                }
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Резервне живлення' : 'Backup power'
                  }}</span>
                  <span>{{ optLabel(backupPowerOptions, f.backupPower) }}</span>
                </div>
                @if (f.buildingCondition) {
                  <div class="info-item">
                    <span class="info-label">{{
                      isUa() ? 'Стан будівлі' : 'Building condition'
                    }}</span>
                    <span>{{ optLabel(buildingConditions, f.buildingCondition) }}</span>
                  </div>
                }
              } @else {
                @if (f.populationTotal !== null) {
                  <div class="info-item">
                    <span class="info-label">{{ isUa() ? 'Населення' : 'Population' }}</span>
                    <span>{{ f.populationTotal }}</span>
                  </div>
                }
                @if (f.settlementsCovered !== null) {
                  <div class="info-item">
                    <span class="info-label">{{
                      isUa() ? 'Населених пунктів' : 'Settlements covered'
                    }}</span>
                    <span>{{ f.settlementsCovered }}</span>
                  </div>
                }
                @if (f.frontlineStatus) {
                  <div class="info-item">
                    <span class="info-label">{{
                      isUa() ? 'Статус громади' : 'Hromada status'
                    }}</span>
                    <span>{{ optLabel(frontlineStatuses, f.frontlineStatus) }}</span>
                  </div>
                }
                @if (f.targetFacilities) {
                  <div class="info-item full-w">
                    <span class="info-label">{{
                      isUa() ? 'Цільові обʼєкти' : 'Target facilities'
                    }}</span>
                    <span class="pre">{{ f.targetFacilities }}</span>
                  </div>
                }
              }
            </div>
          </div>

          <!-- III. Winter needs -->
          <div class="section-card">
            <h3>{{ isUa() ? 'III. Потреби на зиму' : 'III. Winter needs' }}</h3>
            <div class="info-grid">
              <div class="info-item full-w">
                <span class="info-label">{{ isUa() ? 'Категорії' : 'Categories' }}</span>
                <span>{{ optLabels(needCategoryOptions, f.needCategories) }}</span>
              </div>
              @if (f.needCategoryOther) {
                <div class="info-item full-w">
                  <span class="info-label">{{
                    isUa() ? 'Інше (опис)' : 'Other (description)'
                  }}</span>
                  <span class="pre">{{ f.needCategoryOther }}</span>
                </div>
              }
              @if (f.situationDescription) {
                <div class="info-item full-w">
                  <span class="info-label">{{ isUa() ? 'Опис ситуації' : 'Situation' }}</span>
                  <span class="pre">{{ f.situationDescription }}</span>
                </div>
              }

              <!-- Category-level scalars: properties of the application, not of a
                   specification row (§14.3 п.2). -->
              @if (f.solidFuelBoilerCount !== null) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Котлів на твердому паливі' : 'Solid-fuel boilers'
                  }}</span>
                  <span>{{ f.solidFuelBoilerCount }}</span>
                </div>
              }
              @if (f.solidFuelStorageAvailable !== null) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Є склад для палива' : 'Fuel storage'
                  }}</span>
                  <span>{{ yesNo(f.solidFuelStorageAvailable) }}</span>
                </div>
              }
              @if (f.resiliencePointStatus) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Пункт незламності' : 'Resilience point'
                  }}</span>
                  <span>{{ optLabel(resiliencePointStatuses, f.resiliencePointStatus) }}</span>
                </div>
              }
              @if (f.resiliencePointCapacity !== null) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Місткість, осіб' : 'Capacity, people'
                  }}</span>
                  <span>{{ f.resiliencePointCapacity }}</span>
                </div>
              }
              @if (f.liquidFuelMonthsNeeded !== null) {
                <div class="info-item">
                  <span class="info-label">{{
                    isUa() ? 'Пальне: місяців' : 'Fuel: months needed'
                  }}</span>
                  <span>{{ f.liquidFuelMonthsNeeded }}</span>
                </div>
              }
              @if (f.heatingRepairDescription) {
                <div class="info-item full-w">
                  <span class="info-label">{{
                    isUa() ? 'Опис ремонту теплопостачання' : 'Heating repair description'
                  }}</span>
                  <span class="pre">{{ f.heatingRepairDescription }}</span>
                </div>
              }
            </div>

            <!-- Specification: one table per category — this is the bank the
                 budget is computed from, so quantities stay visible per row. -->
            @if (needGroups().length) {
              @for (g of needGroups(); track g.category) {
                <div class="subsection">
                  <h4>
                    {{ optLabel(needCategoryOptions, g.category) }}
                    <span class="muted">({{ g.rows.length }})</span>
                  </h4>
                  <table class="mini-table">
                    <thead>
                      <tr>
                        <th>{{ isUa() ? 'Позиція' : 'Item' }}</th>
                        <th>{{ isUa() ? 'К-сть' : 'Qty' }}</th>
                        <th>{{ isUa() ? 'Од.' : 'Unit' }}</th>
                        @if (g.category === 'generators') {
                          <th>{{ isUa() ? 'кВт' : 'kW' }}</th>
                          <th>{{ isUa() ? 'Паливо' : 'Fuel' }}</th>
                          <th>{{ isUa() ? 'Призначення' : 'Purpose' }}</th>
                        }
                        <th>{{ isUa() ? 'Деталі' : 'Details' }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (n of g.rows; track n.id) {
                        <tr>
                          <td>{{ itemLabel(n.item, n.category) }}</td>
                          <td class="num">{{ n.quantity ?? '—' }}</td>
                          <td>{{ unitLabel(n.unit) }}</td>
                          @if (g.category === 'generators') {
                            <td class="num">{{ n.powerKw ?? '—' }}</td>
                            <td>{{ optLabel(generatorFuelTypes, n.fuelType) }}</td>
                            <td>{{ optLabel(generatorPurposes, n.purpose) }}</td>
                          }
                          <td>{{ n.details || '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            } @else {
              <div class="subsection">
                <span class="muted">{{
                  isUa() ? 'Специфікація порожня' : 'No specification rows'
                }}</span>
              </div>
            }
          </div>

          <!-- IV. Beneficiaries -->
          <div class="section-card">
            <h3>{{ isUa() ? 'IV. Бенефіціари' : 'IV. Beneficiaries' }}</h3>
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
            </div>
          </div>

          <!-- V. Budget & coordination -->
          <div class="section-card">
            <h3>{{ isUa() ? 'V. Бюджет і координація' : 'V. Budget & coordination' }}</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Потрібно до' : 'Needed by' }}</span>
                <span>{{ optLabel(needByOptions, f.needBy) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Терміновість' : 'Urgency' }}</span>
                <span>{{ optLabel(urgencyOptions, f.urgency) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Вартість, грн' : 'Cost, UAH' }}</span>
                <span>{{ formatCost(f.estimatedCost) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Підстава' : 'Cost basis' }}</span>
                <span>{{ optLabel(costBases, f.costBasis) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Інші донори' : 'Other donors' }}</span>
                <span
                  >{{ yesNo(f.otherDonors)
                  }}{{ f.otherDonorsDetails ? ' · ' + f.otherDonorsDetails : '' }}</span
                >
              </div>
              <div class="info-item">
                <span class="info-label">{{ isUa() ? 'Співфінансування' : 'Co-financing' }}</span>
                <span
                  >{{ optLabel(cofinancingOptions, f.cofinancing)
                  }}{{ f.cofinancingDetails ? ' · ' + f.cofinancingDetails : '' }}</span
                >
              </div>
              <div class="info-item full-w">
                <span class="info-label">{{ isUa() ? 'Логістика' : 'Logistics' }}</span>
                <span>{{ optLabels(logisticsOptions, f.logistics) }}</span>
              </div>
              <div class="info-item full-w">
                <span class="info-label">{{ isUa() ? 'Наявні документи' : 'Docs available' }}</span>
                <span>{{ optLabels(docsAvailableOptions, f.docsAvailable) }}</span>
              </div>
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

          <!-- VI. Photos & documents -->
          <div class="section-card">
            <h3>{{ isUa() ? 'VI. Фото та документи' : 'VI. Photos & documents' }}</h3>

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

            @if (f.cloudLink) {
              <div class="subsection">
                <h4>{{ isUa() ? 'Хмарне посилання' : 'Cloud link' }}</h4>
                <a [href]="f.cloudLink" target="_blank" rel="noopener">{{ f.cloudLink }}</a>
              </div>
            }
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
        flex-wrap: wrap;
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
      .status-badge,
      .urg-badge {
        display: inline-block;
        padding: 0.25rem 0.75rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        white-space: nowrap;
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
      [data-urg='critical'] {
        background: #fee2e2;
        color: #991b1b;
      }
      [data-urg='high'] {
        background: #fed7aa;
        color: #9a3412;
      }
      [data-urg='medium'] {
        background: #fef9c3;
        color: #854d0e;
      }

      .tabs {
        display: flex;
        gap: 0.25rem;
        border-bottom: 1px solid #e2e8f0;
        margin-bottom: 1.25rem;
      }
      .tab {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        padding: 0.6rem 1rem;
        font-size: 0.9rem;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }
      .tab:hover {
        color: #1a365d;
      }
      .tab.active {
        color: #1a365d;
        border-bottom-color: #2b6cb0;
        font-weight: 600;
      }
      .tab-badge {
        background: #e2e8f0;
        color: #475569;
        border-radius: 10px;
        padding: 0 0.45rem;
        font-size: 0.7rem;
        font-weight: 600;
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
      .info-item.full-w {
        grid-column: 1 / -1;
      }
      .info-label {
        font-size: 0.7rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.03em;
      }
      .info-item > span:last-child {
        font-size: 0.9rem;
        color: #1e293b;
        word-break: break-word;
      }
      .pre {
        white-space: pre-wrap;
      }
      .muted {
        color: #94a3b8;
        font-size: 0.85rem;
        font-weight: 400;
      }

      .mini-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.85rem;
      }
      .mini-table th {
        text-align: left;
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid #e2e8f0;
        color: #64748b;
        font-size: 0.7rem;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .mini-table td {
        padding: 0.4rem 0.5rem;
        border-bottom: 1px solid #f1f5f9;
      }
      .mini-table .num {
        text-align: right;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .gallery {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
      }
      .gallery-thumb {
        width: 120px;
        height: 90px;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        overflow: hidden;
        padding: 0;
        background: #f8fafc;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .gallery-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
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
        gap: 0.6rem;
        align-items: baseline;
        font-size: 0.875rem;
      }
      .doc-size {
        color: #94a3b8;
        font-size: 0.75rem;
      }

      .danger-zone {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 1px solid #fed7d7;
      }
      .error-banner {
        background: #fee2e2;
        border: 1px solid #fecaca;
        color: #991b1b;
        border-radius: 6px;
        padding: 0.75rem 1rem;
        font-size: 0.85rem;
        margin-bottom: 1rem;
      }

      .audit-timeline {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .audit-entry {
        display: flex;
        gap: 0.75rem;
      }
      .audit-marker {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #cbd5e0;
        margin-top: 0.5rem;
        flex-shrink: 0;
      }
      .audit-body {
        flex: 1;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 0.6rem 0.85rem;
      }
      .audit-head {
        display: flex;
        justify-content: space-between;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
      }
      .audit-action-badge {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 0.1rem 0.45rem;
        border-radius: 4px;
        background: #e2e8f0;
        color: #475569;
      }
      [data-action='created'] {
        background: #d1fae5;
        color: #065f46;
      }
      [data-action='status_changed'] {
        background: #fef3c7;
        color: #92400e;
      }
      [data-action='deleted'] {
        background: #fee2e2;
        color: #991b1b;
      }
      .audit-time,
      .audit-actor {
        font-size: 0.75rem;
        color: #64748b;
      }
      .audit-diff {
        margin-top: 0.35rem;
        font-size: 0.8rem;
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        align-items: baseline;
      }
      .audit-field {
        font-weight: 600;
        color: #334155;
      }
      .audit-old {
        color: #991b1b;
        text-decoration: line-through;
      }
      .audit-new {
        color: #065f46;
      }

      .loading,
      .empty {
        text-align: center;
        padding: 3rem;
        color: #64748b;
        font-size: 0.95rem;
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
        .subsection {
          overflow-x: auto;
        }
      }
    `,
  ],
})
export class WinterizationFormDetailComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly isUa = inject(LanguageService).isUa;
  private readonly pageTitle = inject(PageTitleService);

  // Option catalogs for label lookups (single source = interfaces file).
  protected readonly applicantTypes = APPLICANT_TYPE_OPTIONS;
  protected readonly facilityKinds = FACILITY_KIND_OPTIONS;
  protected readonly heatingSources = HEATING_SOURCE_OPTIONS;
  protected readonly backupPowerOptions = BACKUP_POWER_OPTIONS;
  protected readonly buildingConditions = BUILDING_CONDITION_OPTIONS;
  protected readonly frontlineStatuses = FRONTLINE_STATUS_OPTIONS;
  protected readonly needCategoryOptions = ORGANIZATION_NEED_CATEGORY_OPTIONS;
  protected readonly resiliencePointStatuses = RESILIENCE_POINT_STATUS_OPTIONS;
  protected readonly generatorFuelTypes = GENERATOR_FUEL_TYPE_OPTIONS;
  protected readonly generatorPurposes = GENERATOR_PURPOSE_OPTIONS;
  protected readonly needByOptions = NEED_BY_OPTIONS;
  protected readonly urgencyOptions = URGENCY_OPTIONS;
  protected readonly costBases = COST_BASIS_OPTIONS;
  protected readonly cofinancingOptions = COFINANCING_OPTIONS;
  protected readonly logisticsOptions = LOGISTICS_OPTIONS;
  protected readonly docsAvailableOptions = DOCS_AVAILABLE_OPTIONS;

  // ───── State ─────
  form = signal<WinterizationFormDetail | null>(null);
  loading = signal(true);
  mode = signal<'view' | 'edit'>('view');

  // Status panel (view mode)
  statusSaving = signal(false);
  newStatus: WinterizationFormStatus = 'new';
  managerNotes = '';

  // Full edit (edit mode)
  saving = signal(false);
  saveError = signal<string | null>(null);
  activeTab = signal<'details' | 'audit'>('details');
  auditLog = signal<WinterizationAuditLogEntry[]>([]);
  auditLoading = signal(false);
  auditLoaded = signal(false);

  // Lightbox
  lightbox = signal<string | null>(null);

  // Derived attachment lists
  photos = computed(() => (this.form()?.attachments ?? []).filter((a) => a.kind === 'photo'));
  documents = computed(() => (this.form()?.attachments ?? []).filter((a) => a.kind === 'document'));

  /**
   * Specification rows grouped by category, in the order the applicant's
   * categories were stored — so the table reads like the form the applicant
   * filled, not like the child table's primary key order.
   */
  needGroups = computed<NeedGroup[]>(() => {
    const f = this.form();
    if (!f) return [];
    const byCategory = new Map<NeedCategory, WinterizationNeedFull[]>();
    for (const n of f.needs ?? []) {
      const bucket = byCategory.get(n.category);
      if (bucket) bucket.push(n);
      else byCategory.set(n.category, [n]);
    }
    const ordered: NeedGroup[] = [];
    for (const c of f.needCategories ?? []) {
      const rows = byCategory.get(c);
      if (rows) {
        ordered.push({ category: c, rows: [...rows].sort((a, b) => a.sortOrder - b.sortOrder) });
        byCategory.delete(c);
      }
    }
    // Orphans should not exist (the service rejects rows outside the selected
    // categories) — render them anyway rather than hiding data.
    for (const [category, rows] of byCategory) ordered.push({ category, rows });
    return ordered;
  });

  readonly STATUSES: readonly WinterizationFormStatus[] = [
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
    this.pageTitle.setTitle('admin_titles.winterization_form_detail', true);
  }

  private loadForm(id: string): void {
    this.loading.set(true);
    this.api.get<WinterizationFormDetail>(`needs-forms/winterization/${id}`).subscribe({
      next: (f) => {
        this.form.set(f);
        this.newStatus = f.status;
        this.managerNotes = f.managerNotes ?? '';
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.router.navigate(['/admin', 'winterization-forms']);
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
  onFormSaved(payload: UpdateWinterizationFormFullPayload): void {
    const id = this.form()?.id;
    if (!id) return;

    this.saving.set(true);
    this.saveError.set(null);

    this.api
      .patch<WinterizationFormDetail>(`needs-forms/winterization/${id}/full`, payload)
      .subscribe({
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
      .patch<WinterizationFormDetail>(`needs-forms/winterization/${id}`, {
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
    this.api.delete(`needs-forms/winterization/${id}`).subscribe({
      next: () => this.router.navigate(['/admin', 'winterization-forms']),
    });
  }

  // ───── Lightbox ─────
  openLightbox(url: string): void {
    this.lightbox.set(url);
  }
  closeLightbox(): void {
    this.lightbox.set(null);
  }
  /** Close only when the backdrop itself is clicked, not the image. */
  onLightboxBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeLightbox();
  }

  // ───── Helpers ─────
  goBack(): void {
    this.router.navigate(['/admin', 'winterization-forms']);
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

  /**
   * Item labels are per category, because the same key means different things
   * in different blocks (`generator` in resilience-point equipment, `other`
   * everywhere). `liquid_fuel` is the special case where the item IS the fuel
   * type, so it reuses the fuel catalog.
   */
  itemLabel(item: NeedItem, category: NeedCategory): string {
    if (category === 'liquid_fuel') return this.optLabel(LIQUID_FUEL_ITEM_OPTIONS, item);
    const map: Record<string, [string, string]> = {
      generator: ['Генератор', 'Generator'],
      coal: ['Вугілля', 'Coal'],
      pellets: ['Пелети', 'Pellets'],
      firewood: ['Дрова', 'Firewood'],
      briquettes: ['Брикети', 'Briquettes'],
      convector: ['Конвектор', 'Convector'],
      oil_heater: ['Масляний радіатор', 'Oil heater'],
      fan_heater: ['Тепловентилятор', 'Fan heater'],
      solid_fuel_stove: ['Твердопаливна піч', 'Solid-fuel stove'],
      potbelly_stove: ['Буржуйка', 'Potbelly stove'],
      gas_heater: ['Газовий обігрівач', 'Gas heater'],
      boiler: ['Заміна / ремонт котла', 'Boiler replacement / repair'],
      heat_networks: ['Теплові мережі', 'Heat networks'],
      pumps: ['Насоси', 'Pumps'],
      heat_substation: ['ІТП (тепловий пункт)', 'Heating substation'],
      water_heating_equipment: ['Бойлерне обладнання', 'Water-heating equipment'],
      windows: ['Вікна', 'Windows'],
      doors: ['Двері', 'Doors'],
      roof: ['Покрівля', 'Roof'],
      facade: ['Утеплення фасаду / горища', 'Facade / attic insulation'],
      heating: ['Обігрів', 'Heating'],
      furniture: ['Меблі / спальні місця', 'Furniture / sleeping places'],
      water_boiler: ['Бойлер / термопоти', 'Water boiler / thermopots'],
      connectivity: ['Звʼязок / Starlink', 'Connectivity / Starlink'],
      powerbanks: ['Павербанки', 'Powerbanks'],
      blankets: ['Ковдри', 'Blankets'],
      sleeping_bags: ['Спальники', 'Sleeping bags'],
      thermal_underwear: ['Термобілизна', 'Thermal underwear'],
      warm_clothing: ['Теплий одяг', 'Warm clothing'],
      thermoses: ['Термоси', 'Thermoses'],
      flashlights: ['Ліхтарі', 'Flashlights'],
      other: ['Інше', 'Other'],
    };
    const v = map[item];
    return v ? (this.isUa() ? v[0] : v[1]) : item;
  }

  /** Server-derived unit snapshot (NEED_ITEM_UNITS); null for unitless items. */
  unitLabel(unit: string | null): string {
    if (!unit) return '—';
    const map: Record<string, [string, string]> = {
      t: ['т', 't'],
      m3: ['м³', 'm³'],
      pcs: ['шт.', 'pcs'],
      m: ['м', 'm'],
      m2: ['м²', 'm²'],
      l: ['л', 'l'],
      set: ['компл.', 'set'],
    };
    const v = map[unit];
    return v ? (this.isUa() ? v[0] : v[1]) : unit;
  }

  /** estimatedCost is optional for winterization (unlike Recovery). */
  formatCost(value: number | string | null): string {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!isFinite(n)) return '—';
    return n.toLocaleString(this.isUa() ? 'uk-UA' : 'en-US');
  }

  fileSize(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(1)} ${this.isUa() ? 'МБ' : 'MB'}`;
    return `${Math.max(1, Math.round(bytes / 1024))} ${this.isUa() ? 'КБ' : 'KB'}`;
  }

  /** `approved` reads as «Включено в проєкт» in the winterization context
   *  (the 4 statuses of the ТЗ map onto the shared 6 — decision of 2026-07-26). */
  getStatusLabel(status: string): string {
    const map: Record<string, [string, string]> = {
      new: ['Нова', 'New'],
      in_review: ['На розгляді', 'In review'],
      approved: ['Включено в проєкт', 'Included in project'],
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
    this.api
      .get<WinterizationAuditLogEntry[]>(`needs-forms/winterization/${id}/audit-log`)
      .subscribe({
        next: (entries) => {
          this.auditLog.set(entries);
          this.auditLoading.set(false);
          this.auditLoaded.set(true);
        },
        error: () => this.auditLoading.set(false),
      });
  }

  getActionLabel(action: WinterizationAuditLogEntry['action']): string {
    const map: Record<WinterizationAuditLogEntry['action'], [string, string]> = {
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
      applicantType: ['Тип заявника', 'Applicant type'],
      organizationName: ['Організація', 'Organization'],
      facilityName: ['Назва закладу', 'Facility name'],
      facilityKind: ['Тип закладу', 'Facility kind'],
      heatingSource: ['Джерело опалення', 'Heating source'],
      needCategories: ['Категорії потреб', 'Need categories'],
      needs: ['Специфікація потреб', 'Need specification'],
      situationDescription: ['Опис ситуації', 'Situation description'],
      estimatedCost: ['Вартість', 'Estimated cost'],
      directBeneficiaries: ['Прямі бенефіціари', 'Direct beneficiaries'],
      needBy: ['Потрібно до', 'Needed by'],
      urgency: ['Терміновість', 'Urgency'],
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

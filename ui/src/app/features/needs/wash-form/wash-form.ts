import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';
import {
  EquipmentCategory,
  EquipmentItem,
  CreateWashFormPayload,
  getUnitLabel,
} from './wash-form.interfaces';

@Component({
  selector: 'app-wash-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <!-- ═══ Stepper ═══ -->
    <div class="stepper">
      @for (s of steps; track s.key; let i = $index) {
        <div
          class="step"
          [class.active]="currentStep() === i"
          [class.completed]="currentStep() > i"
          (click)="goToStep(i)"
        >
          <div class="step-circle">
            @if (currentStep() > i) {
              <span class="check">✓</span>
            } @else {
              {{ i + 1 }}
            }
          </div>
          <span class="step-label">{{ isUa ? s.labelUa : s.labelEn }}</span>
        </div>
        @if (i < steps.length - 1) {
          <div class="step-line" [class.completed]="currentStep() > i"></div>
        }
      }
    </div>

    @if (submitted()) {
      <!-- ═══ Success ═══ -->
      <div class="success-card">
        <div class="success-icon">✅</div>
        <h2>{{ isUa ? 'Заявку успішно подано!' : 'Form submitted successfully!' }}</h2>
        <p>{{ isUa
          ? 'Ми зв\'яжемось з вами найближчим часом за вказаним email.'
          : 'We will contact you shortly at the provided email.'
        }}</p>
        <button class="btn btn-primary" (click)="resetForm()">
          {{ isUa ? 'Подати нову заявку' : 'Submit another form' }}
        </button>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="wash-form">

        <!-- ═══ STEP 0: General Info ═══ -->
        @if (currentStep() === 0) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'Загальна інформація' : 'General Information' }}
            </h2>

            <div class="form-grid">
              <div class="form-field">
                <label>{{ isUa ? 'Область' : 'Region' }} <span class="req">*</span></label>
                <input formControlName="region"
                       [placeholder]="isUa ? 'напр. Харківська' : 'e.g. Kharkivska'" />
                @if (showError('region')) {
                  <span class="error">{{ isUa ? 'Обов\'язкове поле' : 'Required' }}</span>
                }
              </div>

              <div class="form-field">
                <label>{{ isUa ? 'Назва організації' : 'Organization name' }} <span class="req">*</span></label>
                <input formControlName="organizationName"
                       [placeholder]="isUa ? 'Громада, водоканал, медичний заклад...' : 'Community, water utility, hospital...'" />
                @if (showError('organizationName')) {
                  <span class="error">{{ isUa ? 'Обов\'язкове поле' : 'Required' }}</span>
                }
              </div>

              <div class="form-field">
                <label>{{ isUa ? 'ПІБ керівника' : 'Head name' }} <span class="req">*</span></label>
                <input formControlName="headName"
                       [placeholder]="isUa ? 'Прізвище Імʼя По-батькові' : 'Full name'" />
                @if (showError('headName')) {
                  <span class="error">{{ isUa ? 'Обов\'язкове поле' : 'Required' }}</span>
                }
              </div>

              <div class="form-field">
                <label>{{ isUa ? 'Телефон керівника' : 'Head phone' }} <span class="req">*</span></label>
                <input formControlName="headPhone" type="tel"
                       placeholder="+380XXXXXXXXX" />
                @if (showError('headPhone')) {
                  <span class="error">{{ isUa ? 'Мін. 6 символів' : 'Min 6 characters' }}</span>
                }
              </div>

              <div class="form-field">
                <label>Email <span class="req">*</span></label>
                <input formControlName="email" type="email"
                       placeholder="email@example.com" />
                @if (showError('email')) {
                  <span class="error">{{ isUa ? 'Введіть коректний email' : 'Enter valid email' }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- ═══ 🦶🏻🦶🏻STEP 1: Object Info ═══ -->
        @if (currentStep() === 1) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'Інформація про об\'єкт' : 'Object Information' }}
            </h2>

            <div class="form-grid">
              <div class="form-field full-width">
                <label>
                  {{ isUa ? 'Назва об\'єкту' : 'Object name' }} <span class="req">*</span>
                </label>
                <input formControlName="objectName"
                       [placeholder]="isUa
                         ? 'Назва або вулиця з уточненням (вода, каналізація, КНС, ВНС)'
                         : 'Name or street with details (water, sewage, pumping station)'" />
                @if (showError('objectName')) {
                  <span class="error">{{ isUa ? 'Обов\'язкове поле' : 'Required' }}</span>
                }
              </div>

              <div class="form-field">
                <label>
                  {{ isUa ? 'Кількість залежних людей' : 'Dependent population' }}
                  <span class="req">*</span>
                </label>
                <input formControlName="dependentPopulation" type="number" min="1"
                       [placeholder]="isUa ? 'Кількість людей' : 'Number of people'" />
                @if (showError('dependentPopulation')) {
                  <span class="error">{{ isUa ? 'Введіть число більше 0' : 'Enter number > 0' }}</span>
                }
              </div>

              <div class="form-field">
                <label>{{ isUa ? 'Орієнтовний термін монтажу' : 'Installation deadline' }}</label>
                <input formControlName="installationDeadline"
                       [placeholder]="isUa ? 'напр. 30 днів' : 'e.g. 30 days'" />
              </div>

              <div class="form-field full-width">
                <label>
                  {{ isUa ? 'Залежні соціальні установи' : 'Dependent social facilities' }}
                </label>
                <textarea formControlName="socialFacilities" rows="2"
                          [placeholder]="isUa
                            ? 'Лікарня, школа, садочок та інше'
                            : 'Hospital, school, kindergarten, etc.'"
                ></textarea>
              </div>

              <div class="form-field full-width">
                <label>
                  {{ isUa ? 'Причини заміни / опис проблеми' : 'Replacement reason' }}
                  <span class="req">*</span>
                </label>
                <textarea formControlName="replacementReason" rows="3"
                          [placeholder]="isUa
                            ? 'Опишіть причини необхідності заміни обладнання та матеріалів, наприклад, фізичний та моральний знос мереж та обладнання'
                            : 'Describe the reasons for replacement of equipment and materials'"
                ></textarea>
                @if (showError('replacementReason')) {
                  <span class="error">{{ isUa ? 'Мінімум 10 символів' : 'Min 10 characters' }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- ═══ 🦶🏻🦶🏻 STEP 2: Equipment Selection ═══ -->
        @if (currentStep() === 2) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'Обладнання та матеріали' : 'Equipment & Materials' }}
            </h2>
            <p class="section-hint">
              {{ isUa
                ? 'Оберіть категорію, потім позицію з каталогу та вкажіть кількість. Можна додати кілька позицій.'
                : 'Select a category, then an item from the catalog and specify the quantity. You can add multiple items.'
              }}
            </p>

            @if (catalogLoading()) {
              <div class="loading">{{ isUa ? 'Завантаження каталогу...' : 'Loading catalog...' }}</div>
            } @else {
              <div class="equipment-list" formArrayName="items">
                @for (item of itemsArray.controls; track item; let idx = $index) {
                  <div class="equipment-row" [formGroupName]="idx">
                    <div class="equipment-row-header">
                      <span class="row-number">{{ idx + 1 }}</span>
                      @if (itemsArray.length > 1) {
                        <button type="button" class="btn-remove" (click)="removeItem(idx)"
                                [title]="isUa ? 'Видалити' : 'Remove'">✕</button>
                      }
                    </div>

                    <div class="equipment-row-fields">
                      <!-- Category -->
                      <div class="form-field">
                        <label>{{ isUa ? 'Категорія' : 'Category' }}</label>
                        <select formControlName="categoryId"
                                (change)="onCategoryChange(idx)">
                          <option value="">{{ isUa ? '— Оберіть категорію —' : '— Select category —' }}</option>
                          @for (cat of categories(); track cat.id) {
                            <option [value]="cat.id">
                              {{ isUa ? cat.nameUa : cat.nameEn }}
                            </option>
                          }
                        </select>
                      </div>

                      <!-- Equipment item -->
                      <div class="form-field">
                        <label>{{ isUa ? 'Позиція' : 'Item' }} <span class="req">*</span></label>
                        <select formControlName="equipmentItemId">
                          <option value="">{{ isUa ? '— Оберіть позицію —' : '— Select item —' }}</option>
                          @for (eq of getFilteredItems(idx); track eq.id) {
                            <option [value]="eq.id">
                              {{ isUa ? eq.nameUa : eq.nameEn }}
                            </option>
                          }
                        </select>
                        @if (itemsArray.at(idx).get('equipmentItemId')?.touched
                             && itemsArray.at(idx).get('equipmentItemId')?.invalid) {
                          <span class="error">{{ isUa ? 'Оберіть позицію' : 'Select an item' }}</span>
                        }
                      </div>

                      <!-- Quantity -->
                      <div class="form-field form-field-sm">
                        <label>
                          {{ isUa ? 'Кількість' : 'Qty' }}
                          @if (getSelectedItemUnit(idx); as unitLabel) {
                            <span class="unit-hint">({{ unitLabel }})</span>
                          }
                          <span class="req">*</span>
                        </label>
                        <input type="number" formControlName="quantity" min="0.01" step="any" />
                        @if (itemsArray.at(idx).get('quantity')?.touched
                             && itemsArray.at(idx).get('quantity')?.invalid) {
                          <span class="error">{{ isUa ? 'Введіть кількість' : 'Enter quantity' }}</span>
                        }
                      </div>

                      <!-- Notes -->
                      <div class="form-field">
                        <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                        <input formControlName="notes"
                               [placeholder]="isUa ? 'Додаткова інформація' : 'Additional info'" />
                      </div>
                    </div>
                  </div>
                }
              </div>

              <button type="button" class="btn btn-add" (click)="addItem()">
                ➕ {{ isUa ? 'Додати позицію' : 'Add item' }}
              </button>
            }
          </div>
        }

        <!-- ═══ 🦶🏻🦶🏻 STEP 3: Review ═══ -->
        @if (currentStep() === 3) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'Перевірка та подання' : 'Review & Submit' }}
            </h2>

            <div class="review-block">
              <h3>{{ isUa ? 'Загальна інформація' : 'General Information' }}</h3>
              <div class="review-grid">
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Область' : 'Region' }}</span>
                  <span class="review-value">{{ form.value.region }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Організація' : 'Organization' }}</span>
                  <span class="review-value">{{ form.value.organizationName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'ПІБ керівника' : 'Head name' }}</span>
                  <span class="review-value">{{ form.value.headName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Телефон' : 'Phone' }}</span>
                  <span class="review-value">{{ form.value.headPhone }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Email</span>
                  <span class="review-value">{{ form.value.email }}</span>
                </div>
              </div>
            </div>

            <div class="review-block">
              <h3>{{ isUa ? "Об'єкт" : "Facility" }}</h3>
              <div class="review-grid">
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Назва' : 'Name' }}</span>
                  <span class="review-value">{{ form.value.objectName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Кількість людей, що залежать від обʼєкту' : 'Dependent people' }}</span>
                  <span class="review-value">{{ form.value.dependentPopulation }}</span>
                </div>
                @if (form.value.socialFacilities) {
                  <div class="review-item full-width">
                    <span class="review-label">{{ isUa ? 'Соціальні установи' : 'Social facilities' }}</span>
                    <span class="review-value">{{ form.value.socialFacilities }}</span>
                  </div>
                }
                @if (form.value.installationDeadline) {
                  <div class="review-item">
                    <span class="review-label">{{ isUa ? 'Термін монтажу' : 'Installation deadline' }}</span>
                    <span class="review-value">{{ form.value.installationDeadline }}</span>
                  </div>
                }
                <div class="review-item full-width">
                  <span class="review-label">{{ isUa ? 'Причини заміни' : 'Replacement reason' }}</span>
                  <span class="review-value">{{ form.value.replacementReason }}</span>
                </div>
              </div>
            </div>

            <div class="review-block">
              <h3>
                {{ isUa ? 'Обладнання та матеріали' : 'Equipment & Materials' }}
                ({{ itemsArray.length }} {{ isUa ? 'поз.' : 'items' }})
              </h3>
              <div class="review-table-wrap">
                <table class="review-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{{ isUa ? 'Позиція' : 'Item' }}</th>
                      <th>{{ isUa ? 'К-сть' : 'Qty' }}</th>
                      <th>{{ isUa ? 'Од.' : 'Unit' }}</th>
                      <th>{{ isUa ? 'Примітки' : 'Notes' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of itemsArray.controls; track row; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td>{{ getItemNameById(row.value.equipmentItemId) }}</td>
                        <td>{{ row.value.quantity }}</td>
                        <td>{{ getItemUnitById(row.value.equipmentItemId) }}</td>
                        <td>{{ row.value.notes || '—' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        }

        <!-- ═══ Navigation buttons ═══ -->
        <div class="form-nav">
          @if (currentStep() > 0) {
            <button type="button" class="btn btn-secondary" (click)="prevStep()">
              ← {{ isUa ? 'Назад' : 'Back' }}
            </button>
          } @else {
            <div></div>
          }

          @if (currentStep() < steps.length - 1) {
            <button type="button" class="btn btn-primary" (click)="nextStep()">
              {{ isUa ? 'Далі' : 'Next' }} →
            </button>
          } @else {
            <button type="submit" class="btn btn-submit" [disabled]="submitting()">
              {{ submitting()
                ? (isUa ? 'Відправлення...' : 'Submitting...')
                : (isUa ? 'Подати заявку' : 'Submit')
              }}
            </button>
          }
        </div>

        @if (submitError()) {
          <div class="error-banner">
            {{ isUa ? 'Помилка при відправленні. Спробуйте ще раз.' : 'Submit error. Please try again.' }}
          </div>
        }
      </form>
    }
  `,
  styles: [`
    /* ─── Stepper ─── */
    .stepper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      margin-bottom: 2rem;
      padding: 0 1rem;
    }
    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      cursor: pointer;
      min-width: 80px;
    }
    .step-circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 600;
      background: #e2e8f0;
      color: #64748b;
      transition: all 0.2s;
    }
    .step.active .step-circle {
      background: #2b6cb0;
      color: #fff;
    }
    .step.completed .step-circle {
      background: #38a169;
      color: #fff;
    }
    .check { font-size: 0.95rem; }
    .step-label {
      font-size: 0.7rem;
      color: #64748b;
      text-align: center;
      font-weight: 500;
    }
    .step.active .step-label { color: #2b6cb0; font-weight: 600; }
    .step.completed .step-label { color: #38a169; }
    .step-line {
      flex: 1;
      height: 2px;
      background: #e2e8f0;
      margin: 0 0.25rem;
      margin-bottom: 1.2rem;
      transition: background 0.2s;
    }
    .step-line.completed { background: #38a169; }

    /* ─── Form sections ─── */
    .form-section { margin-bottom: 1rem; }
    .section-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 0.25rem;
    }
    .section-hint {
      color: #64748b;
      font-size: 0.85rem;
      margin: 0 0 1.25rem;
    }

    /* ─── Form grid ─── */
    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    .full-width { grid-column: 1 / -1; }

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
    .req { color: #e53e3e; }
    .unit-hint { color: #64748b; font-weight: 400; }

    .form-field input,
    .form-field select,
    .form-field textarea {
      padding: 0.55rem 0.75rem;
      border: 1px solid #cbd5e0;
      border-radius: 6px;
      font-size: 0.9rem;
      background: #fff;
      transition: border-color 0.15s;
    }
    .form-field input:focus,
    .form-field select:focus,
    .form-field textarea:focus {
      outline: none;
      border-color: #2b6cb0;
      box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
    }
    .form-field textarea { resize: vertical; }

    .error {
      font-size: 0.75rem;
      color: #e53e3e;
    }

    /* ─── Equipment rows ─── */
    .equipment-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .equipment-row {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1rem;
    }
    .equipment-row-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .row-number {
      background: #2b6cb0;
      color: #fff;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .btn-remove {
      background: none;
      border: 1px solid #e2e8f0;
      color: #e53e3e;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.15s;
    }
    .btn-remove:hover {
      background: #fff5f5;
      border-color: #e53e3e;
    }

    .equipment-row-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .form-field-sm { max-width: 140px; }

    /* ─── Buttons ─── */
    .btn {
      padding: 0.6rem 1.5rem;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary {
      background: #2b6cb0;
      color: #fff;
    }
    .btn-primary:hover { background: #2c5282; }
    .btn-secondary {
      background: #fff;
      color: #334155;
      border: 1px solid #cbd5e0;
    }
    .btn-secondary:hover { background: #f8fafc; }
    .btn-submit {
      background: #38a169;
      color: #fff;
      font-weight: 600;
      padding: 0.75rem 2rem;
    }
    .btn-submit:hover { background: #2f855a; }
    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-add {
      background: #fff;
      color: #2b6cb0;
      border: 1px dashed #2b6cb0;
      margin-top: 0.75rem;
      width: 100%;
      padding: 0.65rem;
    }
    .btn-add:hover { background: #ebf8ff; }

    /* ─── Navigation ─── */
    .form-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e2e8f0;
    }

    /* ─── Review ─── */
    .review-block {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .review-block h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #1a365d;
      margin: 0 0 0.75rem;
    }
    .review-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.6rem;
    }
    .review-item {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .review-label {
      font-size: 0.75rem;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .review-value {
      font-size: 0.9rem;
      color: #1e293b;
    }

    .review-table-wrap { overflow-x: auto; }
    .review-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .review-table th {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 2px solid #e2e8f0;
      color: #64748b;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
    }
    .review-table td {
      padding: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
    }

    /* ─── Success ─── */
    .success-card {
      text-align: center;
      padding: 3rem 1.5rem;
      background: #f0fff4;
      border: 1px solid #c6f6d5;
      border-radius: 12px;
    }
    .success-icon { font-size: 3rem; margin-bottom: 1rem; }
    .success-card h2 {
      color: #276749;
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
    }
    .success-card p {
      color: #2f855a;
      margin: 0 0 1.5rem;
    }

    /* ─── Misc ─── */
    .loading {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }
    .error-banner {
      background: #fff5f5;
      color: #e53e3e;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      text-align: center;
      margin-top: 1rem;
      font-size: 0.9rem;
    }

    /* ─── Responsive ─── */
    @media (max-width: 640px) {
      .stepper { gap: 0; padding: 0; }
      .step { min-width: 60px; }
      .step-label { font-size: 0.6rem; }
      .form-grid,
      .review-grid,
      .equipment-row-fields {
        grid-template-columns: 1fr;
      }
      .form-field-sm { max-width: none; }
    }
  `],
})
export class WashFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }

  // ── State ──
  currentStep = signal(0);
  submitted = signal(false);
  submitting = signal(false);
  submitError = signal(false);
  catalogLoading = signal(true);
  categories = signal<EquipmentCategory[]>([]);

  /** Flat lookup map: itemId → EquipmentItem */
  private itemsMap = new Map<string, EquipmentItem>();

  steps = [
    { key: 'general', labelUa: 'Загальна інфо', labelEn: 'General Info' },
    { key: 'object', labelUa: 'Об\'єкт', labelEn: 'Object' },
    { key: 'equipment', labelUa: 'Обладнання', labelEn: 'Equipment' },
    { key: 'review', labelUa: 'Перевірка', labelEn: 'Review' },
  ];

  // ── Form ──
  form: FormGroup = this.fb.group({
    // Step 0
    region: ['', [Validators.required, Validators.minLength(2)]],
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    headName: ['', [Validators.required, Validators.minLength(2)]],
    headPhone: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    // Step 1
    objectName: ['', [Validators.required, Validators.minLength(2)]],
    dependentPopulation: [null, [Validators.required, Validators.min(1)]],
    socialFacilities: [''],
    installationDeadline: [''],
    replacementReason: ['', [Validators.required, Validators.minLength(10)]],
    // Step 2 — dynamic items
    items: this.fb.array([this.createItemGroup()]),
  });

  get itemsArray(): FormArray {
    return this.form.get('items') as FormArray;
  }

  /** Fields validated per step */
  private stepFields: string[][] = [
    ['region', 'organizationName', 'headName', 'headPhone', 'email'],
    ['objectName', 'dependentPopulation', 'replacementReason'],
    ['items'],
    [],
  ];

  ngOnInit(): void {
    this.loadCatalog();
  }

  // ── Catalog ──

  private loadCatalog(): void {
    this.api.get<EquipmentCategory[]>('equipment-catalog').subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.itemsMap.clear();
        for (const cat of cats) {
          for (const item of cat.items) {
            this.itemsMap.set(item.id, item);
          }
        }
        this.catalogLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load catalog:', err);
        this.catalogLoading.set(false);
      },
    });
  }

  // ── Equipment items management ──

  private createItemGroup(): FormGroup {
    return this.fb.group({
      categoryId: [''],
      equipmentItemId: ['', Validators.required],
      quantity: [null, [Validators.required, Validators.min(0.01)]],
      notes: [''],
    });
  }

  addItem(): void {
    this.itemsArray.push(this.createItemGroup());
  }

  removeItem(index: number): void {
    this.itemsArray.removeAt(index);
  }

  onCategoryChange(index: number): void {
    const group = this.itemsArray.at(index) as FormGroup;
    group.patchValue({ equipmentItemId: '' });
  }

  /** Returns items filtered by selected category for a given row */
  getFilteredItems(index: number): EquipmentItem[] {
    const group = this.itemsArray.at(index);
    const catId = group.get('categoryId')?.value;
    if (!catId) {
      // No category selected → show all items
      return this.categories().flatMap((c) => c.items);
    }
    const cat = this.categories().find((c) => c.id === catId);
    return cat?.items ?? [];
  }

  /** Returns unit label for the selected item in a row */
  getSelectedItemUnit(index: number): string {
    const itemId = this.itemsArray.at(index).get('equipmentItemId')?.value;
    if (!itemId) return '';
    const item = this.itemsMap.get(itemId);
    return item ? getUnitLabel(item.unit, this.isUa) : '';
  }

  // ── Review helpers ──

  getItemNameById(id: string): string {
    const item = this.itemsMap.get(id);
    if (!item) return '—';
    return this.isUa ? item.nameUa : item.nameEn;
  }

  getItemUnitById(id: string): string {
    const item = this.itemsMap.get(id);
    return item ? getUnitLabel(item.unit, this.isUa) : '';
  }

  // ── Navigation ──

  goToStep(step: number): void {
    // Only allow going back or to already completed steps
    if (step < this.currentStep()) {
      this.currentStep.set(step);
    }
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) return;
    this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
  }

  prevStep(): void {
    this.currentStep.update((s) => Math.max(s - 1, 0));
  }

  private validateCurrentStep(): boolean {
    const fields = this.stepFields[this.currentStep()];

    if (this.currentStep() === 2) {
      // Validate items FormArray
      let valid = true;
      for (let i = 0; i < this.itemsArray.length; i++) {
        const group = this.itemsArray.at(i) as FormGroup;
        Object.values(group.controls).forEach((c) => c.markAsTouched());
        if (group.invalid) valid = false;
      }
      return valid;
    }

    let valid = true;
    for (const field of fields) {
      const control = this.form.get(field);
      if (control) {
        control.markAsTouched();
        if (control.invalid) valid = false;
      }
    }
    return valid;
  }

  showError(field: string): boolean {
    const c = this.form.get(field);
    return !!(c && c.invalid && c.touched);
  }

  // ── Submit ──

  onSubmit(): void {
    if (this.form.invalid || this.submitting()) return;

    this.submitting.set(true);
    this.submitError.set(false);

    const v = this.form.value;
    const payload: CreateWashFormPayload = {
      region: v.region,
      organizationName: v.organizationName,
      headName: v.headName,
      headPhone: v.headPhone,
      email: v.email,
      objectName: v.objectName,
      dependentPopulation: v.dependentPopulation,
      socialFacilities: v.socialFacilities || undefined,
      installationDeadline: v.installationDeadline || undefined,
      replacementReason: v.replacementReason,
      items: v.items.map((item: { equipmentItemId: string; quantity: number; notes: string }) => ({
        equipmentItemId: item.equipmentItemId,
        quantity: item.quantity,
        ...(item.notes ? { notes: item.notes } : {}),
      })),
    };

    this.api.post('needs-forms/wash', payload).subscribe({
      next: () => {
        this.submitted.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        console.error('Submit error:', err);
        this.submitError.set(true);
        this.submitting.set(false);
      },
    });
  }

  resetForm(): void {
    this.form.reset();
    this.itemsArray.clear();
    this.itemsArray.push(this.createItemGroup());
    this.currentStep.set(0);
    this.submitted.set(false);
    this.submitError.set(false);
  }
}

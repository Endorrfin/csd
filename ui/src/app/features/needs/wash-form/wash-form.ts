import { Component, inject, OnInit, signal } from '@angular/core';
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
    <!-- Stepper -->
    <div class="stepper">
      @for (s of steps; track s.key; let i = $index) {
        <div class="step"
          [class.active]="currentStep() === i"
          [class.completed]="currentStep() > i"
          [class.optional]="s.optional"
          (click)="goToStep(i)">
          <div class="step-circle">
            @if (currentStep() > i) { <span class="check">&#10003;</span> }
            @else { {{ i + 1 }} }
          </div>
          <span class="step-label">{{ isUa ? s.labelUa : s.labelEn }}</span>
        </div>
        @if (i < steps.length - 1) {
          <div class="step-line" [class.completed]="currentStep() > i"></div>
        }
      }
    </div>

    @if (submitted()) {
      <div class="success-card">
        <div class="success-icon">&#9989;</div>
        <h2>{{ isUa ? 'Заявку успішно подано!' : 'Form submitted successfully!' }}</h2>
        <p>{{ isUa ? 'Ми звʼяжемось з вами найближчим часом.' : 'We will contact you shortly.' }}</p>
        <button class="btn btn-primary" (click)="resetForm()">
          {{ isUa ? 'Подати нову заявку' : 'Submit another form' }}
        </button>
      </div>
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="wash-form">

        <!-- STEP 0: General Info -->
        @if (currentStep() === 0) {
          <div class="form-section">
            <h2 class="section-title">{{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}</h2>
            <div class="form-grid">
              <div class="form-field">
                <label>{{ isUa ? 'Область' : 'Region' }} <span class="req">*</span></label>
                <input formControlName="region" [placeholder]="isUa ? 'напр. Харківська' : 'e.g. Kharkivska'" />
                @if (showError('region')) { <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span> }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Назва організації' : 'Organization name' }} <span class="req">*</span></label>
                <input formControlName="organizationName" [placeholder]="isUa ? 'Громада, водоканал...' : 'Community, water utility...'" />
                @if (showError('organizationName')) { <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span> }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'ПІБ керівника' : 'Head name' }} <span class="req">*</span></label>
                <input formControlName="headName" [placeholder]="isUa ? 'Прізвище Імʼя По-батькові' : 'Full name'" />
                @if (showError('headName')) { <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span> }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Телефон керівника' : 'Head phone' }} <span class="req">*</span></label>
                <input formControlName="headPhone" type="tel" placeholder="+380XXXXXXXXX" />
                @if (showError('headPhone')) { <span class="error">{{ isUa ? 'Мін. 6 символів' : 'Min 6 chars' }}</span> }
              </div>
              <div class="form-field">
                <label>Email <span class="req">*</span></label>
                <input formControlName="email" type="email" placeholder="email&#64;example.com" />
                @if (showError('email')) { <span class="error">{{ isUa ? 'Введіть коректний email' : 'Enter valid email' }}</span> }
              </div>
            </div>
          </div>
        }

        <!-- STEP 1: Object -->
        @if (currentStep() === 1) {
          <div class="form-section">
            <h2 class="section-title">{{ isUa ? 'II. Інформація про обʼєкт' : 'II. Object Information' }}</h2>
            <div class="form-grid">
              <div class="form-field full-width">
                <label>{{ isUa ? 'Назва обʼєкту' : 'Object name' }} <span class="req">*</span></label>
                <input formControlName="objectName" [placeholder]="isUa ? 'Вода, каналізація, КНС, ВНС тощо' : 'Water, sewage, pumping station'" />
                @if (showError('objectName')) { <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span> }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Кількість залежних людей' : 'Dependent population' }} <span class="req">*</span></label>
                <input formControlName="dependentPopulation" type="number" min="1" />
                @if (showError('dependentPopulation')) { <span class="error">{{ isUa ? 'Число більше 0' : 'Number > 0' }}</span> }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Орієнтовний термін монтажу' : 'Installation deadline' }}</label>
                <input formControlName="installationDeadline" [placeholder]="isUa ? 'напр. 30 днів' : 'e.g. 30 days'" />
              </div>
              <div class="form-field full-width">
                <label>{{ isUa ? 'Залежні соціальні установи' : 'Dependent social facilities' }}</label>
                <textarea formControlName="socialFacilities" rows="2" [placeholder]="isUa ? 'Лікарня, школа, садочок...' : 'Hospital, school...'"></textarea>
              </div>
              <div class="form-field full-width">
                <label>{{ isUa ? 'Причини заміни / опис проблеми' : 'Replacement reason' }} <span class="req">*</span></label>
                <textarea formControlName="replacementReason" rows="3" [placeholder]="isUa ? 'Опишіть причини необхідності заміни' : 'Describe replacement reasons'"></textarea>
                @if (showError('replacementReason')) { <span class="error">{{ isUa ? 'Мінімум 10 символів' : 'Min 10 chars' }}</span> }
              </div>
            </div>
          </div>
        }

        <!-- STEP 2: Borehole Drilling -->
        @if (currentStep() === 2) {
          <div class="form-section" formGroupName="boreholeDrilling">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">{{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}</h2>
                <p class="section-hint">{{ isUa ? 'Заповніть, якщо потрібне буріння. Інакше натисніть Пропустити.' : 'Fill if drilling is needed. Otherwise click Skip.' }}</p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label>{{ isUa ? 'Тип свердловини' : 'Borehole type' }}</label>
                <select formControlName="boreholeType">
                  <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                  <option value="sand">{{ isUa ? 'Піщана (15-30 м)' : 'Sand (15-30 m)' }}</option>
                  <option value="artesian">{{ isUa ? 'Артезіанська (30-200+ м)' : 'Artesian (30-200+ m)' }}</option>
                </select>
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Очікуваний дебіт, м3/год' : 'Expected flow rate, m3/h' }}</label>
                <input type="number" formControlName="expectedFlowRate" min="1" max="50" placeholder="1 - 50" />
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Бажаний діаметр, мм' : 'Desired diameter, mm' }}</label>
                <input type="number" formControlName="desiredDiameter" min="125" max="160" placeholder="125 - 160" />
              </div>
              <div class="form-field full-width">
                <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                <textarea formControlName="notes" rows="2" [placeholder]="isUa ? 'Додаткова інформація' : 'Additional information'"></textarea>
              </div>
            </div>
          </div>
        }

        <!-- STEP 3: Water Towers -->
        @if (currentStep() === 3) {
          <div class="form-section" formGroupName="waterTower">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">{{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}</h2>
                <p class="section-hint">{{ isUa ? 'ВБР класифікуються за обʼємом бака (15, 25, 50 м3) та висотою опори (8, 12, 15, 18 м).' : 'VBRs classified by tank volume and support height.' }}</p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>
            <div class="form-grid">
              <div class="form-field">
                <label>{{ isUa ? 'Тип башти' : 'Tower type' }}</label>
                <select formControlName="towerType">
                  <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                  <option value="vbr_15">{{ isUa ? 'ВБР-15 (15 м3)' : 'VBR-15 (15 m3)' }}</option>
                  <option value="vbr_25">{{ isUa ? 'ВБР-25 (25 м3)' : 'VBR-25 (25 m3)' }}</option>
                  <option value="vbr_50">{{ isUa ? 'ВБР-50 (50 м3)' : 'VBR-50 (50 m3)' }}</option>
                  <option value="vbr_over_50">{{ isUa ? 'ВБР понад 50 м3' : 'VBR over 50 m3' }}</option>
                </select>
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Кількість' : 'Quantity' }}</label>
                <input type="number" formControlName="quantity" min="1" placeholder="1" />
              </div>
              <div class="form-field full-width">
                <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                <textarea formControlName="notes" rows="2" [placeholder]="isUa ? 'Додаткова інформація' : 'Additional information'"></textarea>
              </div>
            </div>
          </div>
        }

        <!-- STEP 4: Purification -->
        @if (currentStep() === 4) {
          <div class="form-section" formGroupName="purificationSystem">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">{{ isUa ? 'V. Системи очищення води' : 'V. Water Purification Systems' }}</h2>
                <p class="section-hint">{{ isUa ? 'Вкажіть наявність необхідних умов для встановлення.' : 'Indicate availability of required conditions.' }}</p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>
            <div class="checklist">
              <label class="checklist-item">
                <input type="checkbox" formControlName="hasRoom" />
                <span class="checklist-text">{{ isUa ? 'Наявність приміщення (площа 8-10 м2, висота не менше 2.7 м)' : 'Room available (area 8-10 m2, height at least 2.7 m)' }}</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="hasTemperatureControl" />
                <span class="checklist-text">{{ isUa ? 'Температура в приміщенні від +5C до +30C' : 'Room temperature from +5C to +30C' }}</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="hasWaterInletDrainage" />
                <span class="checklist-text">{{ isUa ? 'Наявність вхідного водопостачання та дренажу для зворотного промивання' : 'Water inlet and drainage for backwashing available' }}</span>
              </label>
              <label class="checklist-item">
                <input type="checkbox" formControlName="hasPowerSupply" />
                <span class="checklist-text">{{ isUa ? 'Електроживлення 220В та достатня кількість розеток' : '220V power supply and sufficient sockets' }}</span>
              </label>
            </div>
            <div class="form-grid" style="margin-top: 1rem">
              <div class="form-field full-width">
                <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                <textarea formControlName="notes" rows="2" [placeholder]="isUa ? 'Додаткова інформація' : 'Additional information'"></textarea>
              </div>
            </div>
          </div>
        }

        <!-- STEP 5: Equipment -->
        @if (currentStep() === 5) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">{{ isUa ? 'VI. Обладнання та матеріали' : 'VI. Equipment & Materials' }}</h2>
                <p class="section-hint">{{ isUa ? 'Оберіть категорію, позицію з каталогу та вкажіть кількість.' : 'Select category, item and specify quantity.' }}</p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>
            @if (catalogLoading()) {
              <div class="loading">{{ isUa ? 'Завантаження каталогу...' : 'Loading catalog...' }}</div>
            } @else {
              <div class="equipment-list" formArrayName="items">
                @for (item of itemsArray.controls; track item; let idx = $index) {
                  <div class="equipment-row" [formGroupName]="idx">
                    <div class="equipment-row-header">
                      <span class="row-number">{{ idx + 1 }}</span>
                      @if (itemsArray.length > 1) {
                        <button type="button" class="btn-remove" (click)="removeItem(idx)">&#10005;</button>
                      }
                    </div>
                    <div class="equipment-row-fields">
                      <div class="form-field">
                        <label>{{ isUa ? 'Категорія' : 'Category' }}</label>
                        <select formControlName="categoryId" (change)="onCategoryChange(idx)">
                          <option value="">{{ isUa ? '-- Категорія --' : '-- Category --' }}</option>
                          @for (cat of categories(); track cat.id) {
                            <option [value]="cat.id">{{ isUa ? cat.nameUa : cat.nameEn }}</option>
                          }
                        </select>
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Пошук / Позиція' : 'Search / Item' }}</label>
                        <input class="search-input"
                               [placeholder]="isUa ? 'Почніть вводити назву...' : 'Start typing name...'"
                               [value]="getSearchText(idx)"
                               (input)="onSearchInput(idx, $event)" />
                        <select formControlName="equipmentItemId" (change)="onItemSelected(idx)">
                          <option value="">{{ isUa ? '-- Позиція --' : '-- Item --' }}</option>
                          @for (eq of getFilteredItems(idx); track eq.id) {
                            <option [value]="eq.id">{{ isUa ? eq.nameUa : eq.nameEn }}</option>
                          }
                        </select>
                        @if (isDuplicate(idx)) {
                          <span class="warning-text">{{ isUa ? 'Ця позиція вже додана вище' : 'This item is already added above' }}</span>
                        }
                      </div>
                      <div class="form-field form-field-sm">
                        <label>{{ isUa ? 'К-сть' : 'Qty' }}
                          @if (getSelectedItemUnit(idx); as u) { <span class="unit-hint">({{ u }})</span> }
                        </label>
                        <input type="number" formControlName="quantity" min="0.01" step="any" />
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                        <input formControlName="notes" [placeholder]="isUa ? 'Додатково' : 'Additional'" />
                      </div>
                    </div>
                  </div>
                }
              </div>
              <button type="button" class="btn btn-add" (click)="addItem()">+ {{ isUa ? 'Додати позицію' : 'Add item' }}</button>
            }
          </div>
        }

        <!-- STEP 6: Review -->
        @if (currentStep() === 6) {
          <div class="form-section">
            <h2 class="section-title">{{ isUa ? 'Перевірка та подання' : 'Review & Submit' }}</h2>

            <div class="review-block">
              <h3>{{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}</h3>
              <div class="review-grid">
                <div class="review-item"><span class="review-label">{{ isUa ? 'Область' : 'Region' }}</span><span class="review-value">{{ form.value.region }}</span></div>
                <div class="review-item"><span class="review-label">{{ isUa ? 'Організація' : 'Organization' }}</span><span class="review-value">{{ form.value.organizationName }}</span></div>
                <div class="review-item"><span class="review-label">{{ isUa ? 'ПІБ керівника' : 'Head' }}</span><span class="review-value">{{ form.value.headName }}</span></div>
                <div class="review-item"><span class="review-label">{{ isUa ? 'Телефон' : 'Phone' }}</span><span class="review-value">{{ form.value.headPhone }}</span></div>
                <div class="review-item"><span class="review-label">Email</span><span class="review-value">{{ form.value.email }}</span></div>
              </div>
            </div>

            <div class="review-block">
              <h3>{{ isUa ? 'II. Обʼєкт' : 'II. Object' }}</h3>
              <div class="review-grid">
                <div class="review-item"><span class="review-label">{{ isUa ? 'Назва' : 'Name' }}</span><span class="review-value">{{ form.value.objectName }}</span></div>
                <div class="review-item"><span class="review-label">{{ isUa ? 'Залежних людей' : 'People' }}</span><span class="review-value">{{ form.value.dependentPopulation }}</span></div>
                @if (form.value.socialFacilities) {
                  <div class="review-item full-width"><span class="review-label">{{ isUa ? 'Соц. установи' : 'Facilities' }}</span><span class="review-value">{{ form.value.socialFacilities }}</span></div>
                }
                <div class="review-item full-width"><span class="review-label">{{ isUa ? 'Причини' : 'Reason' }}</span><span class="review-value">{{ form.value.replacementReason }}</span></div>
              </div>
            </div>

            @if (isBoreholeFilled()) {
              <div class="review-block">
                <h3>{{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}</h3>
                <div class="review-grid">
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Тип' : 'Type' }}</span><span class="review-value">{{ getBoreholeTypeLabel() }}</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Дебіт' : 'Flow' }}</span><span class="review-value">{{ form.value.boreholeDrilling?.expectedFlowRate }} m3/h</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Діаметр' : 'Diameter' }}</span><span class="review-value">{{ form.value.boreholeDrilling?.desiredDiameter }} mm</span></div>
                </div>
              </div>
            }

            @if (isWaterTowerFilled()) {
              <div class="review-block">
                <h3>{{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}</h3>
                <div class="review-grid">
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Тип' : 'Type' }}</span><span class="review-value">{{ getWaterTowerTypeLabel() }}</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Кількість' : 'Qty' }}</span><span class="review-value">{{ form.value.waterTower?.quantity }}</span></div>
                </div>
              </div>
            }

            @if (isPurificationFilled()) {
              <div class="review-block">
                <h3>{{ isUa ? 'V. Системи очищення' : 'V. Purification' }}</h3>
                <div class="review-grid">
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Приміщення' : 'Room' }}</span><span class="review-value">{{ form.value.purificationSystem?.hasRoom ? 'Так' : 'Ні' }}</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Температура' : 'Temp' }}</span><span class="review-value">{{ form.value.purificationSystem?.hasTemperatureControl ? 'Так' : 'Ні' }}</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Водопостачання' : 'Water' }}</span><span class="review-value">{{ form.value.purificationSystem?.hasWaterInletDrainage ? 'Так' : 'Ні' }}</span></div>
                  <div class="review-item"><span class="review-label">{{ isUa ? 'Електрика' : 'Power' }}</span><span class="review-value">{{ form.value.purificationSystem?.hasPowerSupply ? 'Так' : 'Ні' }}</span></div>
                </div>
              </div>
            }

            @if (hasEquipmentItems()) {
              <div class="review-block">
                <h3>{{ isUa ? 'VI. Обладнання' : 'VI. Equipment' }} ({{ getFilledItemsCount() }} {{ isUa ? 'поз.' : 'items' }})</h3>
                <div class="review-table-wrap">
                  <table class="review-table">
                    <thead><tr><th>#</th><th>{{ isUa ? 'Позиція' : 'Item' }}</th><th>{{ isUa ? 'К-сть' : 'Qty' }}</th><th>{{ isUa ? 'Од.' : 'Unit' }}</th><th>{{ isUa ? 'Примітки' : 'Notes' }}</th></tr></thead>
                    <tbody>
                      @for (row of getFilledItems(); track row; let i = $index) {
                        <tr>
                          <td>{{ i + 1 }}</td>
                          <td>{{ getItemNameById(row.value.equipmentItemId) }}</td>
                          <td>{{ row.value.quantity }}</td>
                          <td>{{ getItemUnitById(row.value.equipmentItemId) }}</td>
                          <td>{{ row.value.notes || '---' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (!hasAnySectionFilled()) {
              <div class="warning-banner">
                {{ isUa ? 'Увага: жоден розділ III-VI не заповнений. Заповніть хоча б один.' : 'Warning: no sections III-VI filled. Please fill at least one.' }}
              </div>
            }
          </div>
        }

        <!-- Navigation -->
        <div class="form-nav">
          @if (currentStep() > 0) {
            <button type="button" class="btn btn-secondary" (click)="prevStep()">{{ isUa ? 'Назад' : 'Back' }}</button>
          } @else { <div></div> }
          <div class="form-nav-right">
            @if (isOptionalStep()) {
              <button type="button" class="btn btn-skip" (click)="skipStep()">{{ isUa ? 'Пропустити' : 'Skip' }}</button>
            }
            @if (currentStep() < steps.length - 1) {
              <button type="button" class="btn btn-primary" (click)="nextStep()">{{ isUa ? 'Далі' : 'Next' }}</button>
            } @else {
              <button type="submit" class="btn btn-submit" [disabled]="submitting() || !hasAnySectionFilled()">
                {{ submitting() ? (isUa ? 'Відправлення...' : 'Submitting...') : (isUa ? 'Подати заявку' : 'Submit') }}
              </button>
            }
          </div>
        </div>

        @if (submitError()) {
          <div class="error-banner">{{ isUa ? 'Помилка при відправленні. Спробуйте ще раз.' : 'Submit error. Please try again.' }}</div>
        }
      </form>
    }
  `,
  styles: [`
    .stepper { display:flex; align-items:center; justify-content:center; margin-bottom:2rem; padding:0 .5rem; }
    .step { display:flex; flex-direction:column; align-items:center; gap:.3rem; cursor:pointer; min-width:50px; }
    .step-circle { width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.8rem; font-weight:600; background:#e2e8f0; color:#64748b; transition:all .2s; }
    .step.active .step-circle { background:#2b6cb0; color:#fff; }
    .step.completed .step-circle { background:#38a169; color:#fff; }
    .step.optional .step-circle { border:2px dashed #cbd5e0; background:#f8fafc; }
    .step.optional.active .step-circle { border-color:#2b6cb0; background:#ebf8ff; color:#2b6cb0; }
    .step.optional.completed .step-circle { border-style:solid; border-color:#38a169; background:#38a169; color:#fff; }
    .check { font-size:.85rem; }
    .step-label { font-size:.6rem; color:#64748b; text-align:center; font-weight:500; }
    .step.active .step-label { color:#2b6cb0; font-weight:600; }
    .step.completed .step-label { color:#38a169; }
    .step-line { flex:1; height:2px; background:#e2e8f0; margin:0 .15rem; margin-bottom:1rem; transition:background .2s; }
    .step-line.completed { background:#38a169; }
    .form-section { margin-bottom:1rem; }
    .section-title { font-size:1.15rem; font-weight:600; color:#1a365d; margin:0 0 .25rem; }
    .section-hint { color:#64748b; font-size:.85rem; margin:0 0 1.25rem; }
    .section-header-optional { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; }
    .badge-optional { font-size:.65rem; background:#fef3c7; color:#92400e; padding:.2rem .5rem; border-radius:4px; text-transform:uppercase; font-weight:600; letter-spacing:.03em; white-space:nowrap; margin-top:.25rem; }
    .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
    .full-width { grid-column:1/-1; }
    .form-field { display:flex; flex-direction:column; gap:.3rem; }
    .form-field label { font-size:.85rem; font-weight:500; color:#334155; }
    .req { color:#e53e3e; }
    .unit-hint { color:#64748b; font-weight:400; }
    .form-field input,.form-field select,.form-field textarea { padding:.55rem .75rem; border:1px solid #cbd5e0; border-radius:6px; font-size:.9rem; background:#fff; transition:border-color .15s; }
    .form-field input:focus,.form-field select:focus,.form-field textarea:focus { outline:none; border-color:#2b6cb0; box-shadow:0 0 0 3px rgba(43,108,176,.1); }
    .form-field textarea { resize:vertical; }
    .error { font-size:.75rem; color:#e53e3e; }
    .checklist { display:flex; flex-direction:column; gap:.75rem; }
    .checklist-item { display:flex; align-items:flex-start; gap:.6rem; padding:.75rem 1rem; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; cursor:pointer; transition:border-color .15s; }
    .checklist-item:hover { border-color:#2b6cb0; }
    .checklist-item input[type="checkbox"] { width:18px; height:18px; margin-top:2px; accent-color:#2b6cb0; cursor:pointer; }
    .checklist-text { font-size:.9rem; color:#334155; line-height:1.4; }
    .equipment-list { display:flex; flex-direction:column; gap:1rem; }
    .equipment-row { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1rem; }
    .equipment-row-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem; }
    .row-number { background:#2b6cb0; color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:.75rem; font-weight:600; }
    .btn-remove { background:none; border:1px solid #e2e8f0; color:#e53e3e; width:28px; height:28px; border-radius:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:.85rem; }
    .btn-remove:hover { background:#fff5f5; border-color:#e53e3e; }
    .equipment-row-fields { display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
    .form-field-sm { max-width:140px; }
    .search-input { margin-bottom:.35rem; background:#fffbeb !important; border-color:#fbbf24 !important; font-size:.8rem !important; }
    .search-input::placeholder { color:#92400e; opacity:.6; }
    .warning-text { font-size:.7rem; color:#d97706; font-weight:500; }
    .btn { padding:.6rem 1.5rem; border:none; border-radius:6px; font-size:.9rem; font-weight:500; cursor:pointer; transition:all .15s; }
    .btn-primary { background:#2b6cb0; color:#fff; }
    .btn-primary:hover { background:#2c5282; }
    .btn-secondary { background:#fff; color:#334155; border:1px solid #cbd5e0; }
    .btn-secondary:hover { background:#f8fafc; }
    .btn-skip { background:#fff; color:#64748b; border:1px solid #e2e8f0; }
    .btn-skip:hover { background:#f8fafc; color:#334155; }
    .btn-submit { background:#38a169; color:#fff; font-weight:600; padding:.75rem 2rem; }
    .btn-submit:hover { background:#2f855a; }
    .btn-submit:disabled { opacity:.6; cursor:not-allowed; }
    .btn-add { background:#fff; color:#2b6cb0; border:1px dashed #2b6cb0; margin-top:.75rem; width:100%; padding:.65rem; }
    .btn-add:hover { background:#ebf8ff; }
    .form-nav { display:flex; justify-content:space-between; align-items:center; margin-top:2rem; padding-top:1.5rem; border-top:1px solid #e2e8f0; }
    .form-nav-right { display:flex; gap:.5rem; }
    .review-block { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:1.25rem; margin-bottom:1rem; }
    .review-block h3 { font-size:.95rem; font-weight:600; color:#1a365d; margin:0 0 .75rem; }
    .review-grid { display:grid; grid-template-columns:1fr 1fr; gap:.6rem; }
    .review-item { display:flex; flex-direction:column; gap:.1rem; }
    .review-label { font-size:.75rem; color:#64748b; text-transform:uppercase; letter-spacing:.03em; }
    .review-value { font-size:.9rem; color:#1e293b; }
    .review-table-wrap { overflow-x:auto; }
    .review-table { width:100%; border-collapse:collapse; font-size:.85rem; }
    .review-table th { text-align:left; padding:.5rem; border-bottom:2px solid #e2e8f0; color:#64748b; font-weight:600; font-size:.75rem; text-transform:uppercase; }
    .review-table td { padding:.5rem; border-bottom:1px solid #f1f5f9; }
    .success-card { text-align:center; padding:3rem 1.5rem; background:#f0fff4; border:1px solid #c6f6d5; border-radius:12px; }
    .success-icon { font-size:3rem; margin-bottom:1rem; }
    .success-card h2 { color:#276749; margin:0 0 .5rem; font-size:1.35rem; }
    .success-card p { color:#2f855a; margin:0 0 1.5rem; }
    .loading { text-align:center; padding:2rem; color:#64748b; }
    .error-banner { background:#fff5f5; color:#e53e3e; padding:.75rem 1rem; border-radius:6px; text-align:center; margin-top:1rem; font-size:.9rem; }
    .warning-banner { background:#fffbeb; color:#92400e; padding:.75rem 1rem; border:1px solid #fef3c7; border-radius:6px; text-align:center; font-size:.9rem; }
    @media (max-width:640px) {
      .stepper { gap:0; padding:0; }
      .step { min-width:36px; }
      .step-label { font-size:.5rem; }
      .step-circle { width:28px; height:28px; font-size:.7rem; }
      .form-grid,.review-grid,.equipment-row-fields { grid-template-columns:1fr; }
      .form-field-sm { max-width:none; }
      .section-header-optional { flex-direction:column; gap:.5rem; }
    }
  `],
})
export class WashFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean { return (this.translate.currentLang || 'ua') === 'ua'; }

  currentStep = signal(0);
  submitted = signal(false);
  submitting = signal(false);
  submitError = signal(false);
  catalogLoading = signal(true);
  categories = signal<EquipmentCategory[]>([]);
  private itemsMap = new Map<string, EquipmentItem>();
  /** Per-row search text (not part of form, UI-only) */
  private searchTexts = new Map<number, string>();

  steps = [
    { key: 'general', labelUa: 'Інфо', labelEn: 'Info', optional: false },
    { key: 'object', labelUa: 'Обʼєкт', labelEn: 'Object', optional: false },
    { key: 'borehole', labelUa: 'Буріння', labelEn: 'Borehole', optional: true },
    { key: 'tower', labelUa: 'Башти', labelEn: 'Towers', optional: true },
    { key: 'purification', labelUa: 'Очищення', labelEn: 'Purify', optional: true },
    { key: 'equipment', labelUa: 'Обладнання', labelEn: 'Equipment', optional: true },
    { key: 'review', labelUa: 'Перевірка', labelEn: 'Review', optional: false },
  ];

  form: FormGroup = this.fb.group({
    region: ['', [Validators.required, Validators.minLength(2)]],
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    headName: ['', [Validators.required, Validators.minLength(2)]],
    headPhone: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    objectName: ['', [Validators.required, Validators.minLength(2)]],
    dependentPopulation: [null, [Validators.required, Validators.min(1)]],
    socialFacilities: [''],
    installationDeadline: [''],
    replacementReason: ['', [Validators.required, Validators.minLength(10)]],
    boreholeDrilling: this.fb.group({ boreholeType: [''], expectedFlowRate: [null], desiredDiameter: [null], notes: [''] }),
    waterTower: this.fb.group({ towerType: [''], quantity: [null], notes: [''] }),
    purificationSystem: this.fb.group({ hasRoom: [false], hasTemperatureControl: [false], hasWaterInletDrainage: [false], hasPowerSupply: [false], notes: [''] }),
    items: this.fb.array([this.createItemGroup()]),
  });

  get itemsArray(): FormArray { return this.form.get('items') as FormArray; }

  private stepFields: string[][] = [
    ['region', 'organizationName', 'headName', 'headPhone', 'email'],
    ['objectName', 'dependentPopulation', 'replacementReason'],
    [], [], [], [], [],
  ];

  ngOnInit(): void { this.loadCatalog(); }

  private loadCatalog(): void {
    this.api.get<EquipmentCategory[]>('equipment-catalog').subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.itemsMap.clear();
        for (const cat of cats) for (const item of cat.items) this.itemsMap.set(item.id, item);
        this.catalogLoading.set(false);
      },
      error: () => this.catalogLoading.set(false),
    });
  }

  private createItemGroup(): FormGroup {
    return this.fb.group({ categoryId: [''], equipmentItemId: [''], quantity: [null], notes: [''] });
  }
  addItem(): void { this.itemsArray.push(this.createItemGroup()); }
  removeItem(i: number): void { this.itemsArray.removeAt(i); this.searchTexts.delete(i); }
  onCategoryChange(i: number): void {
    (this.itemsArray.at(i) as FormGroup).patchValue({ equipmentItemId: '' });
    this.searchTexts.set(i, '');
  }

  /** Called when user selects an item from dropdown — clear search */
  onItemSelected(i: number): void { this.searchTexts.set(i, ''); }

  /** Get current search text for a row */
  getSearchText(i: number): string { return this.searchTexts.get(i) ?? ''; }

  /** Handle search input */
  onSearchInput(i: number, event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchTexts.set(i, val);
    // Clear selected item when typing
    (this.itemsArray.at(i) as FormGroup).patchValue({ equipmentItemId: '' });
  }

  getFilteredItems(i: number): EquipmentItem[] {
    const catId = this.itemsArray.at(i).get('categoryId')?.value;
    let items: EquipmentItem[];
    if (!catId) {
      items = this.categories().flatMap((c) => c.items);
    } else {
      items = this.categories().find((c) => c.id === catId)?.items ?? [];
    }
    // Apply text search filter
    const search = (this.searchTexts.get(i) ?? '').toLowerCase().trim();
    if (search) {
      items = items.filter((item) =>
        item.nameUa.toLowerCase().includes(search) ||
        item.nameEn.toLowerCase().includes(search),
      );
    }
    return items;
  }

  /** Check if item at index is a duplicate of an earlier row */
  isDuplicate(i: number): boolean {
    const itemId = this.itemsArray.at(i).get('equipmentItemId')?.value;
    if (!itemId) return false;
    for (let j = 0; j < i; j++) {
      if (this.itemsArray.at(j).get('equipmentItemId')?.value === itemId) return true;
    }
    return false;
  }
  getSelectedItemUnit(i: number): string {
    const id = this.itemsArray.at(i).get('equipmentItemId')?.value;
    const item = id ? this.itemsMap.get(id) : null;
    return item ? getUnitLabel(item.unit, this.isUa) : '';
  }
  getItemNameById(id: string): string { const i = this.itemsMap.get(id); return i ? (this.isUa ? i.nameUa : i.nameEn) : '---'; }
  getItemUnitById(id: string): string { const i = this.itemsMap.get(id); return i ? getUnitLabel(i.unit, this.isUa) : ''; }

  isBoreholeFilled(): boolean { const v = this.form.value.boreholeDrilling; return !!(v?.boreholeType && v?.expectedFlowRate && v?.desiredDiameter); }
  isWaterTowerFilled(): boolean { const v = this.form.value.waterTower; return !!(v?.towerType && v?.quantity); }
  isPurificationFilled(): boolean { const v = this.form.value.purificationSystem; return !!(v?.hasRoom || v?.hasTemperatureControl || v?.hasWaterInletDrainage || v?.hasPowerSupply); }
  hasEquipmentItems(): boolean { return this.getFilledItemsCount() > 0; }
  hasAnySectionFilled(): boolean { return this.isBoreholeFilled() || this.isWaterTowerFilled() || this.isPurificationFilled() || this.hasEquipmentItems(); }
  getFilledItemsCount(): number { return this.itemsArray.controls.filter((c) => c.value.equipmentItemId && c.value.quantity).length; }
  getFilledItems() { return this.itemsArray.controls.filter((c) => c.value.equipmentItemId && c.value.quantity); }

  getBoreholeTypeLabel(): string {
    const t = this.form.value.boreholeDrilling?.boreholeType;
    return t === 'sand' ? (this.isUa ? 'Піщана (15-30 м)' : 'Sand (15-30 m)') : t === 'artesian' ? (this.isUa ? 'Артезіанська (30-200+ м)' : 'Artesian (30-200+ m)') : '---';
  }
  getWaterTowerTypeLabel(): string {
    const m: Record<string, [string, string]> = { vbr_15: ['ВБР-15 (15 м3)', 'VBR-15 (15 m3)'], vbr_25: ['ВБР-25 (25 м3)', 'VBR-25 (25 m3)'], vbr_50: ['ВБР-50 (50 м3)', 'VBR-50 (50 m3)'], vbr_over_50: ['ВБР понад 50 м3', 'VBR over 50 m3'] };
    const t = this.form.value.waterTower?.towerType;
    return t && m[t] ? (this.isUa ? m[t][0] : m[t][1]) : '---';
  }

  isOptionalStep(): boolean { return this.steps[this.currentStep()]?.optional ?? false; }
  goToStep(s: number): void { if (s < this.currentStep()) this.currentStep.set(s); }
  nextStep(): void { if (this.validateCurrentStep()) this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1)); }
  skipStep(): void { this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1)); }
  prevStep(): void { this.currentStep.update((s) => Math.max(s - 1, 0)); }

  private validateCurrentStep(): boolean {
    const fields = this.stepFields[this.currentStep()];
    if (!fields.length) return true;
    let valid = true;
    for (const f of fields) { const c = this.form.get(f); if (c) { c.markAsTouched(); if (c.invalid) valid = false; } }
    return valid;
  }
  showError(f: string): boolean { const c = this.form.get(f); return !!(c && c.invalid && c.touched); }

  onSubmit(): void {
    if (this.submitting() || !this.hasAnySectionFilled()) return;
    this.submitting.set(true);
    this.submitError.set(false);
    const v = this.form.value;
    const payload: CreateWashFormPayload = {
      region: v.region, organizationName: v.organizationName, headName: v.headName,
      headPhone: v.headPhone, email: v.email, objectName: v.objectName,
      dependentPopulation: v.dependentPopulation,
      socialFacilities: v.socialFacilities || undefined,
      installationDeadline: v.installationDeadline || undefined,
      replacementReason: v.replacementReason,
    };
    if (this.isBoreholeFilled()) {
      payload.boreholeDrilling = { boreholeType: v.boreholeDrilling.boreholeType, expectedFlowRate: v.boreholeDrilling.expectedFlowRate, desiredDiameter: v.boreholeDrilling.desiredDiameter, ...(v.boreholeDrilling.notes ? { notes: v.boreholeDrilling.notes } : {}) };
    }
    if (this.isWaterTowerFilled()) {
      payload.waterTower = { towerType: v.waterTower.towerType, quantity: v.waterTower.quantity, ...(v.waterTower.notes ? { notes: v.waterTower.notes } : {}) };
    }
    if (this.isPurificationFilled()) {
      payload.purificationSystem = { hasRoom: v.purificationSystem.hasRoom, hasTemperatureControl: v.purificationSystem.hasTemperatureControl, hasWaterInletDrainage: v.purificationSystem.hasWaterInletDrainage, hasPowerSupply: v.purificationSystem.hasPowerSupply, ...(v.purificationSystem.notes ? { notes: v.purificationSystem.notes } : {}) };
    }
    const filled = v.items?.filter((i: { equipmentItemId: string; quantity: number }) => i.equipmentItemId && i.quantity);
    if (filled?.length) {
      payload.items = filled.map((i: { equipmentItemId: string; quantity: number; notes: string }) => ({ equipmentItemId: i.equipmentItemId, quantity: i.quantity, ...(i.notes ? { notes: i.notes } : {}) }));
    }
    this.api.post('needs-forms/wash', payload).subscribe({
      next: () => { this.submitted.set(true); this.submitting.set(false); },
      error: (err) => { console.error('Submit error:', err); this.submitError.set(true); this.submitting.set(false); },
    });
  }

  resetForm(): void {
    this.form.reset({ boreholeDrilling: { boreholeType: '', notes: '' }, waterTower: { towerType: '', notes: '' }, purificationSystem: { hasRoom: false, hasTemperatureControl: false, hasWaterInletDrainage: false, hasPowerSupply: false, notes: '' } });
    this.itemsArray.clear();
    this.itemsArray.push(this.createItemGroup());
    this.searchTexts.clear();
    this.currentStep.set(0);
    this.submitted.set(false);
    this.submitError.set(false);
  }
}

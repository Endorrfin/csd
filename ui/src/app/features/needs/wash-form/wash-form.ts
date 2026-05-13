// ui/src/app/features/needs/wash-form/wash-form.ts
import { Component, EventEmitter, inject, Input, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormArray,
  Validators,
  AbstractControl,
} from '@angular/forms';
import { LocationSelectorComponent } from '../../../shared/components/location-selector/location-selector';
import { LocationValue } from '../../../shared/interfaces/location.interfaces';
import { ApiService } from '../../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';
import {
  EquipmentCategory,
  EquipmentItem,
  CreateWashFormPayload,
  CreateBoreholePayload,
  CreateTowerPayload,
  CreatePurificationPayload,
  CreatePumpPayload,
  PumpPurpose,
  PUMP_PURPOSE_LABELS,
  getUnitLabel,
  WashFormDetail,
  UpdateWashFormFullPayload,
} from './wash-form.interfaces';
import {
  LucideAngularModule,
  Info,
  Building2,
  Drill,
  Waves,
  FlaskConical,
  Wrench,
  Boxes,
  ClipboardCheck,
  Check,
  Plus,
  X as XIcon,
  ChevronDown, // collapse/expand chevron.
  Search, // search input icon.
} from 'lucide-angular';

@Component({
  selector: 'app-wash-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LocationSelectorComponent, LucideAngularModule],
  template: `
    <!-- stepper with lucide icons and semantic group colors. -->
    <div class="stepper">
      @for (s of steps; track s.key; let i = $index) {
        <div
          class="step"
          [class.active]="currentStep() === i"
          [class.completed]="currentStep() > i"
          [class.optional]="s.optional"
          [attr.data-group]="s.group"
          (click)="goToStep(i)"
        >

          
          <div class="step-circle">
            @if (currentStep() > i) {
              <!-- completed state always shows the check, regardless of icon source -->
              <lucide-icon [img]="icons.check" [size]="16"></lucide-icon>
            } @else if (s.iconSrc) {
              <!-- CHANGED: SVG icon for infra steps (visual parity with Activity Map sidebar) -->
              <img
                [src]="s.iconSrc"
                [alt]="''"
                aria-hidden="true"
                class="step-icon-svg"
              />
            } @else {
              <lucide-icon [img]="icons[s.iconKey!]" [size]="16"></lucide-icon>
            }
          </div>
          
          
          
          <span class="step-label">{{ isUa ? s.labelUa : s.labelEn }}</span>
        </div>
        @if (i < steps.length - 1) {
          <div
            class="step-line"
            [class.completed]="currentStep() > i"
            [attr.data-group]="s.group"
          ></div>
        }
      }
    </div>

    @if (submitted() && mode === 'create') {
      <div class="success-card">
        <div class="success-icon">&#9989;</div>
        <h2>{{ isUa ? 'Заявку успішно подано!' : 'Form submitted successfully!' }}</h2>
        <p>
          {{ isUa ? 'Ми звʼяжемось з вами найближчим часом.' : 'We will contact you shortly.' }}
        </p>
        <button class="btn btn-primary" (click)="resetForm()">
          {{ isUa ? 'Подати нову заявку' : 'Submit another form' }}
        </button>
      </div>
      
    } @else {
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="wash-form">
        <!-- STEP 0: General Info -->
        @if (currentStep() === 0) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}
            </h2>
            <div class="form-grid">
              <div class="location-block">
                <app-location-selector formControlName="location" [isUa]="isUa" [required]="true">
                </app-location-selector>
                @if (showError('location')) {
                  <span class="error">{{
                    isUa ? 'Оберіть хоча б область' : 'Select at least a region'
                  }}</span>
                }
              </div>
              
              <div class="form-field full-width">
                <label
                  >{{
                    isUa
                      ? 'Назва організації / установи / закладу'
                      : 'Name of organization / institution / facility'
                  }}
                  <span class="req">*</span></label
                >
                <input
                  formControlName="organizationName"
                  [placeholder]="
                    isUa
                      ? 'Громада, школа, лікарня, водоканал...'
                      : 'Community, school, hospital, water utility...'
                  "
                />
                @if (showError('organizationName')) {
                  <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span>
                }
              </div>
              
              <div class="form-field full-width">
                <label>{{ isUa ? 'ПІБ керівника' : 'Head name' }} <span class="req">*</span></label>
                <input
                  formControlName="headName"
                  [placeholder]="isUa ? 'Прізвище Імʼя По-батькові' : 'Full name'"
                />
                @if (showError('headName')) {
                  <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span>
                }
              </div>
              
              <div class="form-field">
                <label>
                  {{ isUa ? 'Телефон керівника' : 'Head phone' }}
                  <span class="req">*</span>
                </label>
                <!-- CHANGED: '+38' prefix + digits-only input, 10 chars. -->
                <div class="phone-input">
                  <span class="phone-prefix">+38</span>
                  <input
                    type="tel"
                    inputmode="numeric"
                    [value]="form.get('headPhoneDigits')?.value"
                    (input)="onPhoneInput($event)"
                    maxlength="10"
                    placeholder="0501234567"
                  />
                </div>
                <span class="hint">
                  {{ isUa ? 'Формат: +380XXXXXXXXX (10 цифр після +38)' : 'Format: +380XXXXXXXXX (10 digits after +38)' }}
                </span>
                @if (showError('headPhoneDigits')) {
                  <span class="error">{{ isUa ? 'Введіть 10 цифр' : 'Enter 10 digits' }}</span>
                }
              </div>

              <div class="form-field">
                <label>Email <span class="req">*</span></label>
                <input formControlName="email" type="email" placeholder="email&#64;example.com" />
                @if (showError('email')) {
                  <span class="error">{{
                    isUa ? 'Введіть коректний email' : 'Enter valid email'
                  }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- STEP 1: Object -->
        @if (currentStep() === 1) {
          <div class="form-section">
            <h2 class="section-title">
              {{ isUa ? 'II. Інформація про обʼєкт' : 'II. Object Information' }}
            </h2>
            <div class="form-grid">
              <div class="form-field full-width">
                <label
                  >{{ isUa ? 'Назва обʼєкту' : 'Object name' }} <span class="req">*</span></label
                >
                <input
                  formControlName="objectName"
                  [placeholder]="
                    isUa ? 'Вода, каналізація, КНС, ВНС тощо' : 'Water, sewage, pumping station'
                  "
                />
                @if (showError('objectName')) {
                  <span class="error">{{ isUa ? 'Обовʼязкове поле' : 'Required' }}</span>
                }
              </div>
              <div class="form-field">
                <label
                  >{{ isUa ? 'Кількість залежних людей' : 'Dependent population' }}
                  <span class="req">*</span></label
                >
                <input formControlName="dependentPopulation" type="number" min="1" />
                @if (showError('dependentPopulation')) {
                  <span class="error">{{ isUa ? 'Число більше 0' : 'Number > 0' }}</span>
                }
              </div>
              <div class="form-field">
                <label>{{ isUa ? 'Орієнтовний термін монтажу' : 'Installation deadline' }}</label>
                <input
                  formControlName="installationDeadline"
                  [placeholder]="isUa ? 'напр. 30 днів' : 'e.g. 30 days'"
                />
              </div>
              <div class="form-field full-width">
                <label>{{
                  isUa ? 'Залежні соціальні установи' : 'Dependent social facilities'
                }}</label>
                <textarea
                  formControlName="socialFacilities"
                  rows="2"
                  [placeholder]="isUa ? 'Лікарня, школа, садочок...' : 'Hospital, school...'"
                ></textarea>
              </div>
              <div class="form-field full-width">
                <label
                  >{{ isUa ? 'Причини заміни / опис проблеми' : 'Replacement reason' }}
                  <span class="req">*</span></label
                >
                <textarea
                  formControlName="replacementReason"
                  rows="3"
                  [placeholder]="
                    isUa
                      ? 'Опишіть причини необхідності заміни (пошкодження, фізичний знос, тощо)'
                      : 'Describe replacement reasons (damage, physical wear, etc.)'
                  "
                ></textarea>
                @if (showError('replacementReason')) {
                  <span class="error">{{ isUa ? 'Мінімум 10 символів' : 'Min 10 chars' }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- STEP 2: Borehole Drilling (CHANGED — repeatable) -->
        @if (currentStep() === 2) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">
                  {{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}
                </h2>
                <p class="section-hint">
                  {{
                    isUa
                      ? 'Додайте одну або кілька свердловин, якщо потрібне буріння.'
                      : 'Add one or more boreholes if drilling is needed.'
                  }}
                </p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>

            <div class="repeat-list" formArrayName="boreholes">
              @for (bh of boreholesArray.controls; track bh; let i = $index) {
                <div class="repeat-card" [formGroupName]="i">
                  <div class="repeat-card-header">
                    <span class="row-number">{{ i + 1 }}</span>
                    <button type="button" class="btn-remove" (click)="removeBorehole(i)">
                      <lucide-icon [img]="icons.remove" [size]="14"></lucide-icon>
                    </button>
                  </div>

                  <div class="form-grid">
                    <div class="form-field full-width">
                      <label>
                        {{ isUa ? 'Виберіть необхідний варіант' : 'Select the required option' }}
                        <span class="req">*</span>
                      </label>
                      <select formControlName="workType">
                        <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                        <option value="new_drilling">
                          {{ isUa ? 'Буріння нової свердловини' : 'Drilling a new borehole' }}
                        </option>
                        <option value="repair_cleaning">
                          {{
                            isUa
                              ? 'Ремонт (чистка) існуючої свердловини'
                              : 'Repair (cleaning) of an existing borehole'
                          }}
                        </option>
                        <option value="new_near_existing">
                          {{ isUa ? 'Буріння нової поруч із існуючою' : 'Drilling new next to existing' }}
                        </option>
                      </select>
                    </div>

                    @if (bh.get('workType')?.value === 'new_near_existing') {
                      <div class="form-field">
                        <label>{{ isUa ? 'Чи є відомості про водоносний горизонт?' : 'Aquifer info available?' }}</label>
                        <select formControlName="hasAquiferInfo">
                          <option [ngValue]="false">{{ isUa ? 'Ні' : 'No' }}</option>
                          <option [ngValue]="true">{{ isUa ? 'Так' : 'Yes' }}</option>
                        </select>
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Глибина існуючої свердловини, м' : 'Existing borehole depth, m' }}</label>
                        <input type="number" formControlName="existingDepth" min="1" max="800" placeholder="1 – 800" />
                        <span class="hint">
                          {{ isUa ? 'Діапазон: 1–800 м' : 'Range: 1–800 m' }}
                        </span>
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Дебіт існуючої свердловини, м³/год' : 'Existing borehole debit, m³/h' }}</label>
                        <input type="number" formControlName="existingDebit" min="1" max="30" placeholder="1 – 30" />
                        <span class="hint">
                          {{ isUa ? 'Діапазон: 1–30 м³/год' : 'Range: 1–30 m³/h' }}
                        </span>
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Чи є інформація про конструкцію?' : 'Design info available?' }}</label>
                        <select formControlName="hasDesignInfo">
                          <option [ngValue]="false">{{ isUa ? 'Ні' : 'No' }}</option>
                          <option [ngValue]="true">{{ isUa ? 'Так' : 'Yes' }}</option>
                        </select>
                      </div>
                      <div class="form-field">
                        <label>{{ isUa ? 'Чи є паспорт на існуючу свердловину?' : 'Passport available?' }}</label>
                        <select formControlName="hasPassport">
                          <option [ngValue]="false">{{ isUa ? 'Ні' : 'No' }}</option>
                          <option [ngValue]="true">{{ isUa ? 'Так' : 'Yes' }}</option>
                        </select>
                      </div>
                      <div class="form-field full-width">
                        <label>{{ isUa ? 'Де розташована стара свердловина?' : 'Where is the old borehole located?' }}</label>
                        <input formControlName="oldLocation" [placeholder]="isUa ? 'Опишіть розташування' : 'Describe location'" />
                      </div>
                    }

                    <div class="form-field">
                      <label>
                        {{ isUa ? 'Очікуваний дебіт після виконання робіт, м³/год' : 'Expected flow rate after work, m³/h' }}
                        <span class="req">*</span>
                      </label>
                      <input type="number" formControlName="expectedFlowRate" min="7" max="50" placeholder="7 – 50" />
                      <span class="hint">
                        {{ isUa ? 'Діапазон: 7–50 м³/год' : 'Range: 7–50 m³/h' }}
                      </span>
                    </div>
                    <div class="form-field full-width">
                      <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                      <textarea formControlName="notes" rows="2" [placeholder]="isUa ? 'Додаткова інформація' : 'Additional information'"></textarea>
                    </div>
                  </div>
                </div>
              }
            </div>

            <button type="button" class="btn btn-add" (click)="addBorehole()">
              <lucide-icon [img]="icons.plus" [size]="16"></lucide-icon>
              {{ isUa ? 'Додати свердловину' : 'Add borehole' }}
            </button>
          </div>
        }

        <!-- STEP 3: Water Towers (repeatable) -->
        @if (currentStep() === 3) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">
                  {{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}
                </h2>
                <p class="section-hint">
                  {{
                    isUa
                      ? 'Додайте одну або кілька башт. ВБР класифікуються за обʼємом бака та висотою опори.'
                      : 'Add one or more towers. VBRs are classified by tank volume and support height.'
                  }}
                </p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>

            <div class="repeat-list" formArrayName="towers">
              @for (tw of towersArray.controls; track tw; let i = $index) {
                <div class="repeat-card" [formGroupName]="i">
                  <div class="repeat-card-header">
                    <span class="row-number">{{ i + 1 }}</span>
                    <button type="button" class="btn-remove" (click)="removeTower(i)">
                      <lucide-icon [img]="icons.remove" [size]="14"></lucide-icon>
                    </button>
                  </div>

                  <div class="form-grid">
                    <div class="form-field">
                      <label>{{ isUa ? 'Тип башти' : 'Tower type' }} <span class="req">*</span></label>
                      <select formControlName="towerType">
                        <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                        <option value="vbr_15">{{ isUa ? 'ВБР-15 (15 м³)' : 'VBR-15 (15 m³)' }}</option>
                        <option value="vbr_25">{{ isUa ? 'ВБР-25 (25 м³)' : 'VBR-25 (25 m³)' }}</option>
                        <option value="vbr_50">{{ isUa ? 'ВБР-50 (50 м³)' : 'VBR-50 (50 m³)' }}</option>
                        <option value="vbr_over_50">{{ isUa ? 'ВБР понад 50 м³' : 'VBR over 50 m³' }}</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Висота башти' : 'Tower height' }} <span class="req">*</span></label>
                      <select formControlName="towerHeight">
                        <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                        <option value="8">8 {{ isUa ? 'м (низька)' : 'm (low)' }}</option>
                        <option value="10">10 {{ isUa ? 'м (низька)' : 'm (low)' }}</option>
                        <option value="12">12 {{ isUa ? 'м (низька)' : 'm (low)' }}</option>
                        <option value="15">15 {{ isUa ? 'м (середня)' : 'm (average)' }}</option>
                        <option value="18">18 {{ isUa ? 'м (середня)' : 'm (average)' }}</option>
                        <option value="20">20 {{ isUa ? 'м (висока)' : 'm (high)' }}</option>
                        <option value="25">25 {{ isUa ? 'м (висока)' : 'm (high)' }}</option>
                        <option value="over_25">{{ isUa ? 'Понад 25 м' : 'Over 25 m' }}</option>
                      </select>
                    </div>
                    @if (tw.get('towerHeight')?.value === 'over_25') {
                      <div class="form-field">
                        <label>{{ isUa ? 'Вкажіть висоту, м' : 'Enter height, m' }}</label>
                        <input type="number" formControlName="customHeight" min="26" placeholder="26+" />
                      </div>
                    }
                  </div>

                  <div class="checklist" style="margin-top: 1rem">
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="hasFoundation" />
                      <span class="checklist-text">{{ isUa ? 'Чи є фундамент?' : 'Is there a foundation?' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="isFoundationSuitable" />
                      <span class="checklist-text">{{ isUa ? 'Чи придатний фундамент? (візуальна оцінка)' : 'Is the foundation suitable? (visual assessment)' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="needsFoundationReconstruction" />
                      <span class="checklist-text">{{ isUa ? 'Чи є потреба в реконструкції фундаменту?' : 'Need for foundation reconstruction?' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="canSelfReconstruct" />
                      <span class="checklist-text">{{ isUa ? 'Чи є можливість виконати роботи власними силами?' : 'Can carry out works on your own?' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="canProvideCrane" />
                      <span class="checklist-text">{{ isUa ? 'Чи є можливість надати кран?' : 'Can you provide a crane?' }}</span>
                    </label>
                  </div>

                  <div class="form-grid" style="margin-top: 1rem">
                    <div class="form-field full-width">
                      <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                      <textarea formControlName="notes" rows="2"></textarea>
                    </div>
                  </div>
                </div>
              }
            </div>

            <button type="button" class="btn btn-add" (click)="addTower()">
              <lucide-icon [img]="icons.plus" [size]="16"></lucide-icon>
              {{ isUa ? 'Додати башту' : 'Add tower' }}
            </button>
          </div>
        }
        
        
        <!-- STEP 4: Purification (repeatable) -->
        @if (currentStep() === 4) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">
                  {{ isUa ? 'V. Системи очищення води' : 'V. Water Purification Systems' }}
                </h2>
                <p class="section-hint">
                  {{
                    isUa
                      ? 'Додайте одну або кілька систем очищення. Вкажіть наявність необхідних умов.'
                      : 'Add one or more purification systems. Indicate availability of required conditions.'
                  }}
                </p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>

            <div class="repeat-list" formArrayName="purifications">
              @for (ps of purificationsArray.controls; track ps; let i = $index) {
                <div class="repeat-card" [formGroupName]="i">
                  <div class="repeat-card-header">
                    <span class="row-number">{{ i + 1 }}</span>
                    <button type="button" class="btn-remove" (click)="removePurification(i)">
                      <lucide-icon [img]="icons.remove" [size]="14"></lucide-icon>
                    </button>
                  </div>

                  <div class="checklist">
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="hasRoom" />
                      <span class="checklist-text">{{ isUa ? 'Наявність приміщення (8–10 м², висота ≥ 2.7 м)' : 'Room available (8–10 m², height ≥ 2.7 m)' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="hasTemperatureControl" />
                      <span class="checklist-text">{{ isUa ? 'Температура +5 °C … +30 °C' : 'Temperature +5 °C … +30 °C' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="hasWaterInletDrainage" />
                      <span class="checklist-text">{{ isUa ? 'Вхідне водопостачання та дренаж' : 'Water inlet and drainage' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="hasPowerSupply" />
                      <span class="checklist-text">{{ isUa ? 'Електроживлення 220 В' : '220 V power supply' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="canMaintainSystem" />
                      <span class="checklist-text">{{ isUa ? 'Спроможність обслуговування' : 'Ability to maintain system' }}</span>
                    </label>
                    <label class="checklist-item">
                      <input type="checkbox" formControlName="willingToProvideWater" />
                      <span class="checklist-text">{{ isUa ? 'Готовність надавати очищену воду жителям' : 'Willingness to provide purified water to residents' }}</span>
                    </label>
                  </div>

                  <div class="form-grid" style="margin-top: 1rem">
                    <div class="form-field full-width">
                      <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                      <textarea formControlName="notes" rows="2"></textarea>
                    </div>
                  </div>
                </div>
              }
            </div>

            <button type="button" class="btn btn-add" (click)="addPurification()">
              <lucide-icon [img]="icons.plus" [size]="16"></lucide-icon>
              {{ isUa ? 'Додати систему очищення' : 'Add purification system' }}
            </button>
          </div>
        }

        <!-- STEP 5: Pumps (CHANGED in 5b — real repeatable form) -->
        @if (currentStep() === 5) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">
                  {{ isUa ? 'VI. Насоси' : 'VI. Pumps' }}
                </h2>
                <p class="section-hint">
                  {{
                    isUa
                      ? 'Додайте насоси. Обовʼязкові поля — призначення та кількість. Решта — опціонально.'
                      : 'Add pumps. Required: purpose and quantity. Everything else is optional.'
                  }}
                </p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>

            <div class="repeat-list" formArrayName="pumps">
              @for (pu of pumpsArray.controls; track pu; let i = $index) {
                <div class="repeat-card" [formGroupName]="i">
                  <div class="repeat-card-header">
                    <span class="row-number">{{ i + 1 }}</span>
                    <button type="button" class="btn-remove" (click)="removePump(i)">
                      <lucide-icon [img]="icons.remove" [size]="14"></lucide-icon>
                    </button>
                  </div>

                  <div class="form-grid">
                    <div class="form-field">
                      <label>{{ isUa ? 'Призначення' : 'Purpose' }} <span class="req">*</span></label>
                      <select formControlName="purpose">
                        <option value="">{{ isUa ? '-- Оберіть --' : '-- Select --' }}</option>
                        @for (p of pumpPurposes; track p) {
                          <option [value]="p">
                            {{ isUa ? PUMP_PURPOSE_LABELS[p].ua : PUMP_PURPOSE_LABELS[p].en }}
                          </option>
                        }
                      </select>
                    </div>
                    @if (pu.get('purpose')?.value === 'other') {
                      <div class="form-field">
                        <label>{{ isUa ? 'Уточніть призначення' : 'Specify purpose' }} <span class="req">*</span></label>
                        <input formControlName="purposeOther" [placeholder]="isUa ? 'Опишіть' : 'Describe'" />
                      </div>
                    }

                    <div class="form-field">
                      <label>{{ isUa ? 'Бренд' : 'Brand' }}</label>
                      <input formControlName="brand" placeholder="Pedrollo, Wilo, MNP..." />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Модель' : 'Model' }}</label>
                      <input formControlName="model" placeholder="4SR 8/43, TWU4.08-29-DM-C..." />
                    </div>

                    <div class="form-field">
                      <label>{{ isUa ? 'Потужність, кВт' : 'Power, kW' }}</label>
                      <input type="number" step="0.1" formControlName="powerKw" placeholder="7.5" />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Продуктивність, м³/год' : 'Flow rate, m³/h' }}</label>
                      <input type="number" step="0.1" formControlName="flowRateM3h" placeholder="10" />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Напір, м' : 'Head, m' }}</label>
                      <input type="number" step="0.1" formControlName="headM" placeholder="113" />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Діаметр, дюйм' : 'Diameter, inch' }}</label>
                      <input type="number" step="0.5" formControlName="diameterInches" placeholder="4" />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Напруга' : 'Voltage' }}</label>
                      <input formControlName="voltage" placeholder="380V" />
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Фази' : 'Phases' }}</label>
                      <select formControlName="phases">
                        <option [ngValue]="null">{{ isUa ? '—' : '—' }}</option>
                        <option [ngValue]="1">1</option>
                        <option [ngValue]="3">3</option>
                      </select>
                    </div>
                    <div class="form-field">
                      <label>{{ isUa ? 'Кількість' : 'Quantity' }} <span class="req">*</span></label>
                      <input type="number" formControlName="quantity" min="1" placeholder="1" />
                    </div>
                    <div class="form-field full-width">
                      <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                      <textarea formControlName="notes" rows="2"></textarea>
                    </div>
                  </div>
                </div>
              }
            </div>

            <button type="button" class="btn btn-add" (click)="addPump()">
              <lucide-icon [img]="icons.plus" [size]="16"></lucide-icon>
              {{ isUa ? 'Додати насос' : 'Add pump' }}
            </button>
          </div>
        }
        
        <!-- STEP 6: Equipment (CHANGED in 5c — accordion multi-select) -->
        @if (currentStep() === 6) {
          <div class="form-section">
            <div class="section-header-optional">
              <div>
                <h2 class="section-title">
                  {{ isUa ? 'VII. Обладнання та матеріали' : 'VII. Equipment & Materials' }}
                </h2>
                <p class="section-hint">
                  {{
                    isUa
                      ? 'Розкрийте категорію, оберіть потрібні позиції та вкажіть кількість.'
                      : 'Expand a category, select the items you need and enter quantities.'
                  }}
                </p>
              </div>
              <span class="badge-optional">{{ isUa ? 'опціонально' : 'optional' }}</span>
            </div>

            @if (catalogLoading()) {
              <div class="loading">
                {{ isUa ? 'Завантаження каталогу...' : 'Loading catalog...' }}
              </div>
            } @else {
              <!-- Sticky header: search + selection counter -->
              <div class="equip-toolbar">
                <div class="equip-search">
                  <lucide-icon [img]="icons.search" [size]="16" class="equip-search-icon"></lucide-icon>
                  <input
                    type="text"
                    [value]="equipmentSearch()"
                    (input)="onEquipmentSearchInput($event)"
                    [placeholder]="isUa ? 'Пошук по всіх категоріях...' : 'Search across all categories...'"
                  />
                </div>
                <div class="equip-counter">
                  @if (totalSelectedCount() > 0) {
                    <span class="equip-counter-badge">
                      {{
                        isUa
                          ? totalSelectedCount() + ' обрано'
                          : totalSelectedCount() + ' selected'
                      }}
                    </span>
                  }
                </div>
              </div>

              <!-- Accordion -->
              <div class="equip-accordion">
                @for (cat of categories(); track cat.id) {
                  @if (!equipmentSearch() || categoryMatchCount(cat) > 0) {
                    <div class="equip-cat" [class.open]="isCategoryExpanded(cat.id)">
                      <button
                        type="button"
                        class="equip-cat-header"
                        (click)="toggleCategory(cat.id)"
                      >
                        <lucide-icon
                          [img]="icons.chevron"
                          [size]="16"
                          class="equip-chevron"
                        ></lucide-icon>
                        <span class="equip-cat-name">
                          {{ isUa ? cat.nameUa : cat.nameEn }}
                        </span>
                        <span class="equip-cat-counts">
                          @if (categorySelectedCount(cat) > 0) {
                            <span class="equip-cat-selected">
                              {{ categorySelectedCount(cat) }}
                            </span>
                          }
                          <span class="equip-cat-total">
                            / {{ cat.items.length }}
                          </span>
                        </span>
                      </button>

                      @if (isCategoryExpanded(cat.id)) {
                        <div class="equip-cat-body">
                          <div class="equip-cat-actions">
                            <button
                              type="button"
                              class="btn-mini"
                              (click)="selectAllInCategory(cat)"
                            >
                              {{ isUa ? 'Обрати всі' : 'Select all' }}
                            </button>
                            <button
                              type="button"
                              class="btn-mini btn-mini-ghost"
                              (click)="clearCategory(cat)"
                            >
                              {{ isUa ? 'Скинути' : 'Clear' }}
                            </button>
                          </div>

                          @for (it of filterCategoryItems(cat); track it.id) {
                            <div
                              class="equip-item"
                              [class.selected]="isItemSelected(it.id)"
                            >
                              <label class="equip-item-checkbox">
                                <input
                                  type="checkbox"
                                  [checked]="isItemSelected(it.id)"
                                  (change)="toggleItem(it.id)"
                                />
                                <span class="equip-item-name">
                                  {{ isUa ? it.nameUa : it.nameEn }}
                                </span>
                              </label>

                              @if (isItemSelected(it.id)) {
                                <div class="equip-item-details">
                                  <div class="form-field form-field-sm">
                                    <label>
                                      {{ isUa ? 'К-сть' : 'Qty' }}
                                      <span class="unit-hint">
                                        ({{ getUnitLabel(it.unit, isUa) }})
                                      </span>
                                    </label>
                                    <input
                                      type="number"
                                      min="0.01"
                                      step="any"
                                      [value]="getItemQuantity(it.id) ?? ''"
                                      (input)="setItemQuantity(it.id, $any($event.target).value)"
                                    />
                                  </div>
                                  <div class="form-field">
                                    <label>{{ isUa ? 'Примітки' : 'Notes' }}</label>
                                    <input
                                      type="text"
                                      [value]="getItemNotes(it.id)"
                                      (input)="setItemNotes(it.id, $any($event.target).value)"
                                      [placeholder]="isUa ? 'Додатково' : 'Additional'"
                                    />
                                  </div>
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  }
                }
              </div>
            }
          </div>
        }

        <!-- STEP 7: Review -->
        @if (currentStep() === 7) {
          <div class="form-section">
            <h2 class="section-title">{{ isUa ? 'Перевірка та подання' : 'Review & Submit' }}</h2>

            <div class="review-block">
              <h3>{{ isUa ? 'I. Загальна інформація' : 'I. General Information' }}</h3>
              <div class="review-grid">
                @if (form.value.location?.districtUa) {
                  <div class="review-item">
                    <span class="review-label">{{ isUa ? 'Район' : 'District' }}</span>
                    <span class="review-value">{{
                      isUa ? form.value.location?.districtUa : form.value.location?.districtEn
                    }}</span>
                  </div>
                }
                @if (form.value.location?.communityUa) {
                  <div class="review-item">
                    <span class="review-label">{{ isUa ? 'Громада' : 'Community' }}</span>
                    <span class="review-value">{{
                      isUa ? form.value.location?.communityUa : form.value.location?.communityEn
                    }}</span>
                  </div>
                }
                @if (form.value.location?.settlementUa) {
                  <div class="review-item">
                    <span class="review-label">{{ isUa ? 'Населений пункт' : 'Settlement' }}</span>
                    <span class="review-value">{{
                      isUa ? form.value.location?.settlementUa : form.value.location?.settlementEn
                    }}</span>
                  </div>
                }

                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Організація' : 'Organization' }}</span
                  ><span class="review-value">{{ form.value.organizationName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'ПІБ керівника' : 'Head' }}</span
                  ><span class="review-value">{{ form.value.headName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Телефон' : 'Phone' }}</span
                  ><span class="review-value">{{ form.value.headPhone }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">Email</span
                  ><span class="review-value">{{ form.value.email }}</span>
                </div>
              </div>
            </div>

            <div class="review-block">
              <h3>{{ isUa ? 'II. Обʼєкт' : 'II. Object' }}</h3>
              <div class="review-grid">
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Назва' : 'Name' }}</span
                  ><span class="review-value">{{ form.value.objectName }}</span>
                </div>
                <div class="review-item">
                  <span class="review-label">{{ isUa ? 'Залежних людей' : 'People' }}</span
                  ><span class="review-value">{{ form.value.dependentPopulation }}</span>
                </div>
                @if (form.value.socialFacilities) {
                  <div class="review-item full-width">
                    <span class="review-label">{{ isUa ? 'Соц. установи' : 'Facilities' }}</span
                    ><span class="review-value">{{ form.value.socialFacilities }}</span>
                  </div>
                }
                <div class="review-item full-width">
                  <span class="review-label">{{ isUa ? 'Причини' : 'Reason' }}</span
                  ><span class="review-value">{{ form.value.replacementReason }}</span>
                </div>
              </div>
            </div>
            
            @if (boreholesArray.length) {
              <div class="review-block">
                <h3>
                  {{ isUa ? 'III. Буріння свердловин' : 'III. Borehole Drilling' }}
                  ({{ boreholesArray.length }})
                </h3>
                @for (bh of boreholesArray.controls; track bh; let i = $index) {
                  <div class="review-subblock">
                    <h4>{{ (isUa ? 'Свердловина #' : 'Borehole #') + (i + 1) }}</h4>
                    <div class="review-grid">
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Варіант робіт' : 'Work type' }}</span>
                        <span class="review-value">{{ getBoreholeWorkTypeLabel(bh.get('workType')?.value) }}</span>
                      </div>
                      @if (bh.get('expectedFlowRate')?.value) {
                        <div class="review-item">
                          <span class="review-label">{{ isUa ? 'Очікуваний дебіт' : 'Expected flow' }}</span>
                          <span class="review-value">{{ bh.get('expectedFlowRate')?.value }} m³/h</span>
                        </div>
                      }
                      @if (bh.get('workType')?.value === 'new_near_existing') {
                        @if (bh.get('existingDepth')?.value) {
                          <div class="review-item">
                            <span class="review-label">{{ isUa ? 'Глибина існуючої' : 'Existing depth' }}</span>
                            <span class="review-value">{{ bh.get('existingDepth')?.value }} m</span>
                          </div>
                        }
                        @if (bh.get('existingDebit')?.value) {
                          <div class="review-item">
                            <span class="review-label">{{ isUa ? 'Дебіт існуючої' : 'Existing debit' }}</span>
                            <span class="review-value">{{ bh.get('existingDebit')?.value }} m³/h</span>
                          </div>
                        }
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (towersArray.length) {
              <div class="review-block">
                <h3>
                  {{ isUa ? 'IV. Водонапірні башти' : 'IV. Water Towers' }}
                  ({{ towersArray.length }})
                </h3>
                @for (tw of towersArray.controls; track tw; let i = $index) {
                  <div class="review-subblock">
                    <h4>{{ (isUa ? 'Башта #' : 'Tower #') + (i + 1) }}</h4>
                    <div class="review-grid">
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Тип' : 'Type' }}</span>
                        <span class="review-value">{{ getTowerTypeLabel(tw.get('towerType')?.value) }}</span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Висота' : 'Height' }}</span>
                        <span class="review-value">{{ getTowerHeightLabel(tw.get('towerHeight')?.value, tw.get('customHeight')?.value) }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            @if (purificationsArray.length) {
              <div class="review-block">
                <h3>
                  {{ isUa ? 'V. Системи очищення' : 'V. Purification' }}
                  ({{ purificationsArray.length }})
                </h3>
                @for (ps of purificationsArray.controls; track ps; let i = $index) {
                  <div class="review-subblock">
                    <h4>{{ (isUa ? 'Система #' : 'System #') + (i + 1) }}</h4>
                    <div class="review-grid">
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Приміщення' : 'Room' }}</span>
                        <span class="review-value">{{ ps.get('hasRoom')?.value ? (isUa ? 'Так' : 'Yes') : (isUa ? 'Ні' : 'No') }}</span>
                      </div>
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Електрика' : 'Power' }}</span>
                        <span class="review-value">{{ ps.get('hasPowerSupply')?.value ? (isUa ? 'Так' : 'Yes') : (isUa ? 'Ні' : 'No') }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            @if (pumpsArray.length) {
              <div class="review-block">
                <h3>
                  {{ isUa ? 'VI. Насоси' : 'VI. Pumps' }}
                  ({{ pumpsArray.length }})
                </h3>
                @for (pu of pumpsArray.controls; track pu; let i = $index) {
                  <div class="review-subblock">
                    <h4>{{ (isUa ? 'Насос #' : 'Pump #') + (i + 1) }}</h4>
                    <div class="review-grid">
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Призначення' : 'Purpose' }}</span>
                        <span class="review-value">{{ getPumpPurposeLabel(pu.get('purpose')?.value) }}</span>
                      </div>
                      @if (pu.get('brand')?.value) {
                        <div class="review-item">
                          <span class="review-label">{{ isUa ? 'Бренд / модель' : 'Brand / model' }}</span>
                          <span class="review-value">{{ pu.get('brand')?.value }} {{ pu.get('model')?.value }}</span>
                        </div>
                      }
                      @if (pu.get('powerKw')?.value) {
                        <div class="review-item">
                          <span class="review-label">{{ isUa ? 'Потужність' : 'Power' }}</span>
                          <span class="review-value">{{ pu.get('powerKw')?.value }} kW</span>
                        </div>
                      }
                      <div class="review-item">
                        <span class="review-label">{{ isUa ? 'Кількість' : 'Quantity' }}</span>
                        <span class="review-value">{{ pu.get('quantity')?.value }}</span>
                      </div>
                    </div>
                  </div>
                }
              </div>
            }
            
            
            

            <!-- CHANGED in 5c: review uses selectedEquipment map. -->
            @if (hasEquipmentItems()) {
              <div class="review-block">
                <h3>
                  {{ isUa ? 'VII. Обладнання' : 'VII. Equipment' }}
                  ({{ getFilledEquipmentEntries().length }}
                  {{ isUa ? 'поз.' : 'items' }})
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
                      @for (e of getFilledEquipmentEntries(); track e.itemId; let i = $index) {
                        <tr>
                          <td>{{ i + 1 }}</td>
                          <td>
                            {{ isUa
                                ? (getEquipmentItem(e.itemId)?.nameUa ?? '---')
                                : (getEquipmentItem(e.itemId)?.nameEn ?? '---') }}
                          </td>
                          <td>{{ e.quantity }}</td>
                          <td>
                            @if (getEquipmentItem(e.itemId); as item) {
                              {{ getUnitLabel(item.unit, isUa) }}
                            }
                          </td>
                          <td>{{ e.notes || '---' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }

            @if (!hasAnySectionFilled()) {
              <div class="warning-banner">
                {{
                  isUa
                    ? 'Увага: жоден розділ III-VI не заповнений. Заповніть хоча б один.'
                    : 'Warning: no sections III-VI filled. Please fill at least one.'
                }}
              </div>
            }
          </div>
        }

        <!-- Navigation -->
        <div class="form-nav">
          @if (currentStep() > 0) {
            <button type="button" class="btn btn-secondary" (click)="prevStep()">
              {{ isUa ? 'Назад' : 'Back' }}
            </button>
          } @else {
            <div></div>
          }
          <div class="form-nav-right">
            @if (isOptionalStep()) {
              <button type="button" class="btn btn-skip" (click)="skipStep()">
                {{ isUa ? 'Пропустити' : 'Skip' }}
              </button>
            }
            
            @if (currentStep() < steps.length - 1) {
              <button type="button" class="btn btn-primary" (click)="nextStep()">
                {{ isUa ? 'Далі' : 'Next' }}
              </button>
            } @else {
              <!-- edit mode shows Cancel + Save changes; create mode keeps Submit -->
              @if (mode === 'edit') {
                <button type="button" class="btn btn-secondary" (click)="onCancel()">
                  {{ isUa ? 'Скасувати' : 'Cancel' }}
                </button>
                <button
                  type="submit"
                  class="btn btn-submit"
                  [disabled]="externalSaving || !hasAnySectionFilled()"
                >
                  {{
                    externalSaving
                      ? (isUa ? 'Збереження...' : 'Saving...')
                      : (isUa ? 'Зберегти зміни' : 'Save changes')
                  }}
                </button>
              } @else {
                <button
                  type="submit"
                  class="btn btn-submit"
                  [disabled]="submitting() || !hasAnySectionFilled()"
                >
                  {{
                    submitting()
                      ? (isUa ? 'Відправлення...' : 'Submitting...')
                      : (isUa ? 'Подати заявку' : 'Submit')
                  }}
                </button>
              }
            }
            
          </div>
        </div>

        @if (submitError()) {
          <div class="error-banner">
            {{
              isUa
                ? 'Помилка при відправленні. Спробуйте ще раз.'
                : 'Submit error. Please try again.'
            }}
          </div>
        }

        <!-- visible banner when Next is blocked by invalid fields. -->
        @if (stepInvalid()) {
          <div class="error-banner">
            {{
              isUa
                ? 'Заповніть усі обовʼязкові поля (позначені *) перед тим як перейти далі.'
                : 'Please fill in all required fields (marked with *) before continuing.'
            }}
          </div>
        }
      </form>
    }
  `,
  styles: [
    `
      .stepper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 2rem;
        padding: 0 0.5rem;
      }
      .step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
        min-width: 50px;
      }
      .step-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
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
      
      /* semantic group colors for stepper circles.
         primary = blue; infra = teal; equipment = amber; review = gray.
         \`active\` overrides the base, \`completed\` wins over \`active\`. */
      .step[data-group='primary'] .step-circle { color: #1e40af; }
      .step[data-group='infra'] .step-circle { color: #0f766e; }
      .step[data-group='equipment'] .step-circle { color: #b45309; }
      .step[data-group='review'] .step-circle { color: #475569; }

      .step[data-group='primary'].active .step-circle {
        background: #1e40af; color: #fff;
      }
      .step[data-group='infra'].active .step-circle {
        background: #0f766e; color: #fff;
      }
      .step[data-group='equipment'].active .step-circle {
        background: #b45309; color: #fff;
      }
      .step[data-group='review'].active .step-circle {
        background: #475569; color: #fff;
      }

      .step.completed[data-group] .step-circle {
        background: #38a169;
        color: #fff;
      }

      .step.optional[data-group='infra'] .step-circle {
        border: 2px dashed #5eead4;
        background: #f0fdfa;
        color: #0f766e;
      }
      .step.optional[data-group='equipment'] .step-circle {
        border: 2px dashed #fcd34d;
        background: #fffbeb;
        color: #b45309;
      }

      .step-label {
        transition: color 0.2s;
      }
      .step[data-group='primary'].active .step-label { color: #1e40af; }
      .step[data-group='infra'].active .step-label { color: #0f766e; }
      .step[data-group='equipment'].active .step-label { color: #b45309; }
      .step[data-group='review'].active .step-label { color: #475569; }

      .placeholder-card {
        background: #fffbeb;
        border: 1px dashed #fcd34d;
        border-radius: 8px;
        padding: 2rem 1.5rem;
        text-align: center;
        color: #92400e;
        font-size: 0.95rem;
      }
      
      .step.optional .step-circle {
        border: 2px dashed #cbd5e0;
        background: #f8fafc;
      }
      .step.optional.active .step-circle {
        border-color: #2b6cb0;
        background: #ebf8ff;
        color: #2b6cb0;
      }
      .step.optional.completed .step-circle {
        border-style: solid;
        border-color: #38a169;
        background: #38a169;
        color: #fff;
      }
      .check {
        font-size: 0.85rem;
      }
      .step-label {
        font-size: 0.6rem;
        color: #64748b;
        text-align: center;
        font-weight: 500;
      }
      .step.active .step-label {
        color: #2b6cb0;
        font-weight: 600;
      }
      .step.completed .step-label {
        color: #38a169;
      }
      .step-line {
        flex: 1;
        height: 2px;
        background: #e2e8f0;
        margin: 0 0.15rem;
        margin-bottom: 1rem;
        transition: background 0.2s;
      }
      .step-line.completed {
        background: #38a169;
      }
      .form-section {
        margin-bottom: 1rem;
      }
      .section-title {
        font-size: 1.15rem;
        font-weight: 600;
        color: #1a365d;
        margin: 0 0 0.25rem;
      }
      .section-hint {
        color: #64748b;
        font-size: 0.85rem;
        margin: 0 0 1.25rem;
      }
      .section-header-optional {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.25rem;
      }
      .location-block {
        margin-bottom: 1.25rem;
      }
      .badge-optional {
        font-size: 0.65rem;
        background: #fef3c7;
        color: #92400e;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.03em;
        white-space: nowrap;
        margin-top: 0.25rem;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .full-width {
        grid-column: 1/-1;
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
      .unit-hint {
        color: #64748b;
        font-weight: 400;
      }
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
      .form-field textarea {
        resize: vertical;
      }
      .error {
        font-size: 0.75rem;
        color: #e53e3e;
      }
      .checklist {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .checklist-item {
        display: flex;
        align-items: flex-start;
        gap: 0.6rem;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        transition: border-color 0.15s;
      }
      .checklist-item:hover {
        border-color: #2b6cb0;
      }
      .checklist-item input[type='checkbox'] {
        width: 18px;
        height: 18px;
        margin-top: 2px;
        accent-color: #2b6cb0;
        cursor: pointer;
      }
      .checklist-text {
        font-size: 0.9rem;
        color: #334155;
        line-height: 1.4;
      }
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
      .form-field-sm {
        max-width: 140px;
      }
      .search-input {
        margin-bottom: 0.35rem;
        background: #fffbeb !important;
        border-color: #fbbf24 !important;
        font-size: 0.8rem !important;
      }
      .search-input::placeholder {
        color: #92400e;
        opacity: 0.6;
      }
      .warning-text {
        font-size: 0.7rem;
        color: #d97706;
        font-weight: 500;
      }
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
      .btn-primary:hover {
        background: #2c5282;
      }
      .btn-secondary {
        background: #fff;
        color: #334155;
        border: 1px solid #cbd5e0;
      }
      .btn-secondary:hover {
        background: #f8fafc;
      }
      .btn-skip {
        background: #fff;
        color: #64748b;
        border: 1px solid #e2e8f0;
      }
      .btn-skip:hover {
        background: #f8fafc;
        color: #334155;
      }
      .btn-submit {
        background: #38a169;
        color: #fff;
        font-weight: 600;
        padding: 0.75rem 2rem;
      }
      .btn-submit:hover {
        background: #2f855a;
      }
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
      .btn-add:hover {
        background: #ebf8ff;
      }
      .form-nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e2e8f0;
      }
      .form-nav-right {
        display: flex;
        gap: 0.5rem;
      }
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
      .review-table-wrap {
        overflow-x: auto;
      }
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
      .success-card {
        text-align: center;
        padding: 3rem 1.5rem;
        background: #f0fff4;
        border: 1px solid #c6f6d5;
        border-radius: 12px;
      }
      .success-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
      .success-card h2 {
        color: #276749;
        margin: 0 0 0.5rem;
        font-size: 1.35rem;
      }
      .success-card p {
        color: #2f855a;
        margin: 0 0 1.5rem;
      }
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
      .warning-banner {
        background: #fffbeb;
        color: #92400e;
        padding: 0.75rem 1rem;
        border: 1px solid #fef3c7;
        border-radius: 6px;
        text-align: center;
        font-size: 0.9rem;
      }
      
      .step.active .step-circle {
        background: #2b6cb0;
        color: #fff;
      }
      .step.completed .step-circle {
        background: #38a169;
        color: #fff;
      }
      
      @media (max-width: 640px) {
        .stepper {
          gap: 0;
          padding: 0;
        }
        .step {
          min-width: 36px;
        }
        .step-label {
          font-size: 0.5rem;
        }
        .step-circle {
          width: 28px;
          height: 28px;
          font-size: 0.7rem;
        }
        .form-grid,
        .review-grid,
        .equipment-row-fields {
          grid-template-columns: 1fr;
        }
        .form-field-sm {
          max-width: none;
        }
        .section-header-optional {
          flex-direction: column;
          gap: 0.5rem;
        }
      }
      
      /* CHANGED: Task 5b — repeatable sections. */
      .repeat-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .repeat-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 1rem;
      }
      .repeat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
      }
      .review-subblock {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px dashed #e2e8f0;
      }
      .review-subblock:first-child {
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .review-subblock h4 {
        margin: 0 0 0.5rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: #475569;
      }

      /* CHANGED: phone input with '+38' prefix. */
      .phone-input {
        display: flex;
        align-items: stretch;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        overflow: hidden;
        background: #fff;
      }
      .phone-input:focus-within {
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .phone-prefix {
        background: #f1f5f9;
        color: #334155;
        padding: 0.55rem 0.75rem;
        border-right: 1px solid #cbd5e0;
        font-size: 0.9rem;
        font-weight: 500;
      }
      .phone-input input {
        border: none !important;
        outline: none;
        flex: 1;
        padding: 0.55rem 0.75rem;
        font-size: 0.9rem;
        box-shadow: none !important;
      }
      .phone-input input:focus {
        box-shadow: none !important;
      }

      /* CHANGED: subtle hint under input fields. */
      .hint {
        font-size: 0.75rem;
        color: #64748b;
      }

      /* align + icon with button label. */
      .btn-add {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.35rem;
      }
      .btn-remove {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      /* SVG icon inside step-circle — same size as lucide-icon (16px). */
      .step-icon-svg {
        width: 16px;
        height: 16px;
        object-fit: contain;
        /* Inherit color from parent .step-circle so completed/active states
           stay consistent if SVG uses currentColor. If your SVGs are full-color
           (look at the screenshot — they are), no filter is applied. */
        display: block;
      }
      
      /* ══════ Equipment accordion (Task 5c) ══════ */

      .equip-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0;
        margin-bottom: 1rem;
        position: sticky;
        top: 0;
        background: #fff;
        z-index: 2;
        border-bottom: 1px solid #e2e8f0;
      }
      .equip-search {
        flex: 1;
        position: relative;
      }
      .equip-search-icon {
        position: absolute;
        left: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
      }
      .equip-search input {
        width: 100%;
        padding: 0.55rem 0.75rem 0.55rem 2.25rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
      }
      .equip-search input:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .equip-counter-badge {
        background: #b45309;
        color: #fff;
        padding: 0.35rem 0.75rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        white-space: nowrap;
      }

      .equip-accordion {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .equip-cat {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        background: #fff;
      }
      .equip-cat.open {
        border-color: #cbd5e0;
      }
      .equip-cat-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.85rem 1rem;
        border: none;
        background: #f8fafc;
        cursor: pointer;
        font-size: 0.95rem;
        color: #1a365d;
        font-weight: 500;
        text-align: left;
        transition: background 0.15s;
      }
      .equip-cat-header:hover {
        background: #f1f5f9;
      }
      .equip-cat.open .equip-cat-header {
        background: #fff;
        border-bottom: 1px solid #e2e8f0;
      }
      .equip-chevron {
        transition: transform 0.2s;
        color: #64748b;
        flex-shrink: 0;
      }
      .equip-cat.open .equip-chevron {
        transform: rotate(180deg);
      }
      .equip-cat-name {
        flex: 1;
      }
      .equip-cat-counts {
        font-size: 0.8rem;
        color: #64748b;
        display: inline-flex;
        gap: 0.25rem;
      }
      .equip-cat-selected {
        background: #b45309;
        color: #fff;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .equip-cat-body {
        padding: 0.75rem 1rem 1rem;
      }
      .equip-cat-actions {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
      }
      .btn-mini {
        padding: 0.35rem 0.85rem;
        font-size: 0.8rem;
        font-weight: 500;
        border-radius: 4px;
        border: 1px solid #b45309;
        background: #b45309;
        color: #fff;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-mini:hover {
        background: #92400e;
        border-color: #92400e;
      }
      .btn-mini-ghost {
        background: #fff;
        color: #64748b;
        border-color: #cbd5e0;
      }
      .btn-mini-ghost:hover {
        background: #f8fafc;
        color: #334155;
      }

      .equip-item {
        padding: 0.5rem 0.25rem;
        border-top: 1px solid #f1f5f9;
      }
      .equip-item:first-child {
        border-top: none;
      }
      .equip-item-checkbox {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        cursor: pointer;
      }
      .equip-item-checkbox input[type='checkbox'] {
        width: 16px;
        height: 16px;
        accent-color: #b45309;
        cursor: pointer;
        flex-shrink: 0;
      }
      .equip-item-name {
        font-size: 0.875rem;
        color: #334155;
        line-height: 1.4;
      }
      .equip-item.selected .equip-item-name {
        color: #1e293b;
        font-weight: 500;
      }
      .equip-item-details {
        margin-top: 0.5rem;
        margin-left: 1.75rem;
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: #fffbeb;
        border: 1px solid #fde68a;
        border-radius: 6px;
      }

      @media (max-width: 640px) {
        .equip-toolbar {
          flex-direction: column;
          align-items: stretch;
        }
        .equip-item-details {
          grid-template-columns: 1fr;
        }
      }
      
    `,
  ],
})
export class WashFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  get isUa(): boolean {
    return (this.translate.currentLang || 'ua') === 'ua';
  }
  readonly getUnitLabel = getUnitLabel;

  readonly icons = {
    info: Info,
    object: Building2,
    borehole: Drill,
    tower: Waves,
    purification: FlaskConical,
    pump: Wrench,
    equipment: Boxes,
    review: ClipboardCheck,
    check: Check,
    plus: Plus,
    remove: XIcon,
    chevron: ChevronDown,
    search: Search,
  };

  /** exposed for template — pump purpose options. */
  readonly pumpPurposes: PumpPurpose[] = ['borehole', 'surface', 'drainage_sewage', 'other'];
  readonly PUMP_PURPOSE_LABELS = PUMP_PURPOSE_LABELS;

  currentStep = signal(0);
  submitted = signal(false);
  submitting = signal(false);
  submitError = signal(false);
  stepInvalid = signal(false);


  catalogLoading = signal(true);
  categories = signal<EquipmentCategory[]>([]);
  private itemsMap = new Map<string, EquipmentItem>();

  /** 'create' = public submit; 'edit' = admin edit, emits `saved` instead of POST. */
  @Input() mode: 'create' | 'edit' = 'create';

  /** Existing form to patch into reactive state when mode === 'edit'. */
  @Input() initialData: WashFormDetail | null = null;

  /** Parent's PATCH in-flight state — used to disable submit during save. */
  @Input() externalSaving = false;

  /** Fired in edit mode on submit — parent calls PATCH /full. */
  @Output() saved = new EventEmitter<UpdateWashFormFullPayload>();

  /** Fired when user clicks Cancel in edit mode. */
  @Output() cancelled = new EventEmitter<void>();

  // ══════════════════════════════════════════════════════════════
  // Equipment multi-select state (Task 5c)
  // ══════════════════════════════════════════════════════════════

  /** Map of selected equipment items: equipmentItemId → { quantity, notes }. */
  selectedEquipment = signal<Map<string, { quantity: number | null; notes: string }>>(new Map());

  /** Set of expanded category IDs. */
  expandedCategories = signal<Set<string>>(new Set());

  /** Global search query (filters visible items across all categories). */
  equipmentSearch = signal('');



  /**
   * 8 steps with semantic group colour and icon.
   * Groups: 'primary' (blue) | 'infra' (teal) | 'equipment' (amber) | 'review' (gray).
   * 4 infra steps use SVG icons from /assets/icons/activities/
   * (visual consistency with the public Activity Map sidebar).
   * Other steps keep lucide icons via `iconKey`.
   */
  steps = [
    { key: 'general', labelUa: 'Інфо', labelEn: 'Info',
      optional: false, group: 'primary',
      iconKey: 'info' as const, iconSrc: null },
    { key: 'object', labelUa: 'Обʼєкт', labelEn: 'Object',
      optional: false, group: 'primary',
      iconKey: 'object' as const, iconSrc: null },
    { key: 'borehole', labelUa: 'Буріння', labelEn: 'Borehole',
      optional: true, group: 'infra',
      iconKey: null, iconSrc: '/assets/icons/activities/borehole.svg' },
    { key: 'tower', labelUa: 'Башти', labelEn: 'Towers',
      optional: true, group: 'infra',
      iconKey: null, iconSrc: '/assets/icons/activities/water-tower.svg' },
    { key: 'purification', labelUa: 'Очищення', labelEn: 'Purify',
      optional: true, group: 'infra',
      iconKey: null, iconSrc: '/assets/icons/activities/purification-system.svg' },
    { key: 'pumps', labelUa: 'Насоси', labelEn: 'Pumps',
      optional: true, group: 'infra',
      iconKey: null, iconSrc: '/assets/icons/activities/pumps.svg' },
    { key: 'equipment', labelUa: 'Обладнання', labelEn: 'Equipment',
      optional: true, group: 'equipment',
      iconKey: 'equipment' as const, iconSrc: null },
    { key: 'review', labelUa: 'Перевірка', labelEn: 'Review',
      optional: false, group: 'review',
      iconKey: 'review' as const, iconSrc: null },
  ] as const;

  /**
   * in Task 5b: repeatable arrays for boreholes / towers /
   * purifications / pumps. Each starts empty — user clicks "+ Add" to
   * create the first entry.
   *
   * headPhone uses digits-only control (10 digits after +380).
   * Full submit concatenates '+380' + digits.
   */
  form: FormGroup = this.fb.group({
    location: [null, [Validators.required]],
    organizationName: ['', [Validators.required, Validators.minLength(2)]],
    headName: ['', [Validators.required, Validators.minLength(2)]],
    // digits-only, exactly 10 chars. '+380' is the frozen prefix.
    headPhoneDigits: [
      '',
      [Validators.required, Validators.pattern(/^\d{10}$/)],
    ],
    email: ['', [Validators.required, Validators.email]],
    objectName: ['', [Validators.required, Validators.minLength(2)]],
    dependentPopulation: [null, [Validators.required, Validators.min(1)]],
    socialFacilities: [''],
    installationDeadline: [''],
    replacementReason: ['', [Validators.required, Validators.minLength(10)]],
    boreholes: this.fb.array([] as FormGroup[]),
    towers: this.fb.array([] as FormGroup[]),
    purifications: this.fb.array([] as FormGroup[]),
    pumps: this.fb.array([] as FormGroup[]),
  });

  // typed accessors for new repeatable arrays.
  get boreholesArray(): FormArray {
    return this.form.get('boreholes') as FormArray;
  }
  get towersArray(): FormArray {
    return this.form.get('towers') as FormArray;
  }
  get purificationsArray(): FormArray {
    return this.form.get('purifications') as FormArray;
  }
  get pumpsArray(): FormArray {
    return this.form.get('pumps') as FormArray;
  }
  /** Convenience for template: FormGroup at index. */
  boreholeAt(i: number): FormGroup {
    return this.boreholesArray.at(i) as FormGroup;
  }
  towerAt(i: number): FormGroup {
    return this.towersArray.at(i) as FormGroup;
  }
  purificationAt(i: number): FormGroup {
    return this.purificationsArray.at(i) as FormGroup;
  }
  pumpAt(i: number): FormGroup {
    return this.pumpsArray.at(i) as FormGroup;
  }

  // ══════════════════════════════════════════════════════════════
  // Factory methods for repeatable rows
  // ══════════════════════════════════════════════════════════════

  /** CHANGED: validation ranges aligned with backend (7–50 / 1–800 / 1–30). */
  private createBoreholeGroup(): FormGroup {
    return this.fb.group({
      workType: ['', [Validators.required]],
      expectedFlowRate: [
        null,
        [Validators.required, Validators.min(7), Validators.max(50)],
      ],
      hasAquiferInfo: [false],
      existingDepth: [null, [Validators.min(1), Validators.max(800)]],
      existingDebit: [null, [Validators.min(1), Validators.max(30)]],
      hasDesignInfo: [false],
      hasPassport: [false],
      oldLocation: [''],
      notes: [''],
    });
  }

  /** towerHeight now accepts '10' via template options. */
  private createTowerGroup(): FormGroup {
    return this.fb.group({
      towerType: ['', [Validators.required]],
      towerHeight: ['', [Validators.required]],
      customHeight: [null, [Validators.min(26)]],
      hasFoundation: [false],
      isFoundationSuitable: [false],
      needsFoundationReconstruction: [false],
      canSelfReconstruct: [false],
      canProvideCrane: [false],
      notes: [''],
    });
  }

  private createPurificationGroup(): FormGroup {
    return this.fb.group({
      hasRoom: [false],
      hasTemperatureControl: [false],
      hasWaterInletDrainage: [false],
      hasPowerSupply: [false],
      canMaintainSystem: [false],
      willingToProvideWater: [false],
      notes: [''],
    });
  }

  /** Pump — only purpose and quantity required; specs are free-form. */
  private createPumpGroup(): FormGroup {
    return this.fb.group({
      purpose: ['', [Validators.required]],
      purposeOther: [''],
      brand: [''],
      model: [''],
      powerKw: [null],
      flowRateM3h: [null],
      headM: [null],
      diameterInches: [null],
      voltage: [''],
      phases: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      notes: [''],
    });
  }

  // ══════════════════════════════════════════════════════════════
  // Add/remove handlers (template)
  // ══════════════════════════════════════════════════════════════

  addBorehole(): void {
    this.boreholesArray.push(this.createBoreholeGroup());
  }
  removeBorehole(i: number): void {
    this.boreholesArray.removeAt(i);
  }
  addTower(): void {
    this.towersArray.push(this.createTowerGroup());
  }
  removeTower(i: number): void {
    this.towersArray.removeAt(i);
  }
  addPurification(): void {
    this.purificationsArray.push(this.createPurificationGroup());
  }
  removePurification(i: number): void {
    this.purificationsArray.removeAt(i);
  }
  addPump(): void {
    this.pumpsArray.push(this.createPumpGroup());
  }
  removePump(i: number): void {
    this.pumpsArray.removeAt(i);
  }


  // ══════════════════════════════════════════════════════════════
  // Equipment accordion (Task 5c)
  // ══════════════════════════════════════════════════════════════

  /** Toggle a category's collapsed/expanded state. */
  toggleCategory(catId: string): void {
    this.expandedCategories.update((set) => {
      const next = new Set(set);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  isCategoryExpanded(catId: string): boolean {
    return this.expandedCategories().has(catId);
  }

  /** Checkbox handler for a single equipment item. */
  toggleItem(itemId: string): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      if (next.has(itemId)) next.delete(itemId);
      else next.set(itemId, { quantity: null, notes: '' });
      return next;
    });
  }

  isItemSelected(itemId: string): boolean {
    return this.selectedEquipment().has(itemId);
  }

  getItemQuantity(itemId: string): number | null {
    return this.selectedEquipment().get(itemId)?.quantity ?? null;
  }

  setItemQuantity(itemId: string, value: string): void {
    const num = value === '' ? null : Number(value);
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      const entry = next.get(itemId);
      if (entry) next.set(itemId, { ...entry, quantity: num });
      return next;
    });
  }

  getItemNotes(itemId: string): string {
    return this.selectedEquipment().get(itemId)?.notes ?? '';
  }

  setItemNotes(itemId: string, value: string): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      const entry = next.get(itemId);
      if (entry) next.set(itemId, { ...entry, notes: value });
      return next;
    });
  }

  /** Select every item in a category (pre-fills with qty=null for the user). */
  selectAllInCategory(cat: EquipmentCategory): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      for (const item of this.filterCategoryItems(cat)) {
        if (!next.has(item.id)) next.set(item.id, { quantity: null, notes: '' });
      }
      return next;
    });
  }

  /** Remove every item in a category from selection. */
  clearCategory(cat: EquipmentCategory): void {
    this.selectedEquipment.update((map) => {
      const next = new Map(map);
      for (const item of cat.items) next.delete(item.id);
      return next;
    });
  }

  /** Items of a category matching the current global search. */
  filterCategoryItems(cat: EquipmentCategory): EquipmentItem[] {
    const q = this.equipmentSearch().toLowerCase().trim();
    if (!q) return cat.items;
    return cat.items.filter(
      (it) =>
        it.nameUa.toLowerCase().includes(q) ||
        it.nameEn.toLowerCase().includes(q),
    );
  }

  /** Count of matching items per category — used in the header badge. */
  categoryMatchCount(cat: EquipmentCategory): number {
    return this.filterCategoryItems(cat).length;
  }

  /** Count of selected items in a category — used in the header badge. */
  categorySelectedCount(cat: EquipmentCategory): number {
    const sel = this.selectedEquipment();
    return cat.items.filter((it) => sel.has(it.id)).length;
  }

  /** Total selected items count (shown in sticky header). */
  totalSelectedCount(): number {
    return this.selectedEquipment().size;
  }

  onEquipmentSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.equipmentSearch.set(val);
  }

  /** Lookup helper used by the review block. */
  getEquipmentItem(itemId: string): EquipmentItem | undefined {
    return this.itemsMap.get(itemId);
  }


  /** Phone digits helper — accepts only digits, max 10. */
  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = digits;
    this.form.get('headPhoneDigits')?.setValue(digits, { emitEvent: false });
  }

// 8 entries now. Index 5 (pumps) has no required fields.
  private stepFields: string[][] = [
    ['location', 'organizationName', 'headName', 'headPhoneDigits', 'email'],
    ['objectName', 'dependentPopulation', 'replacementReason'],
    [], // borehole
    [], // tower
    [], // purification
    [], // pumps (NEW)
    [], // equipment
    [], // review
  ];

  ngOnInit(): void {
    this.loadCatalog();
    if (this.mode === 'edit' && this.initialData) {
      Promise.resolve().then(() => {
        this.patchFromInitialData(this.initialData!);
      });
    }
  }

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

  // array-based section checks.
  isBoreholeFilled(): boolean {
    return this.boreholesArray.length > 0;
  }
  isWaterTowerFilled(): boolean {
    return this.towersArray.length > 0;
  }
  isPurificationFilled(): boolean {
    return this.purificationsArray.length > 0;
  }
  // new — pumps section.
  isPumpFilled(): boolean {
    return this.pumpsArray.length > 0;
  }
  hasEquipmentItems(): boolean {
    for (const entry of this.selectedEquipment().values()) {
      if (entry.quantity && entry.quantity > 0) return true;
    }
    return false;
  }
  hasAnySectionFilled(): boolean {
    return (
      this.isBoreholeFilled() ||
      this.isWaterTowerFilled() ||
      this.isPurificationFilled() ||
      this.isPumpFilled() ||
      this.hasEquipmentItems()
    );
  }

  /** Array of selected items with valid qty — used in submit and review. */
  getFilledEquipmentEntries(): Array<{
    itemId: string;
    quantity: number;
    notes: string;
  }> {
    const out: Array<{ itemId: string; quantity: number; notes: string }> = [];
    for (const [itemId, entry] of this.selectedEquipment().entries()) {
      if (entry.quantity && entry.quantity > 0) {
        out.push({ itemId, quantity: entry.quantity, notes: entry.notes });
      }
    }
    return out;
  }

  // label helpers now accept the value as param — works for any index in a FormArray.
  getBoreholeWorkTypeLabel(value: string | null | undefined): string {
    if (!value) return '---';
    const m: Record<string, [string, string]> = {
      new_drilling: ['Буріння нової', 'New drilling'],
      repair_cleaning: ['Ремонт (чистка)', 'Repair (cleaning)'],
      new_near_existing: ['Нова поруч з існуючою', 'New near existing'],
    };
    return m[value] ? (this.isUa ? m[value][0] : m[value][1]) : '---';
  }
  getTowerTypeLabel(value: string | null | undefined): string {
    if (!value) return '---';
    const m: Record<string, [string, string]> = {
      vbr_15: ['ВБР-15 (15 м³)', 'VBR-15 (15 m³)'],
      vbr_25: ['ВБР-25 (25 м³)', 'VBR-25 (25 m³)'],
      vbr_50: ['ВБР-50 (50 м³)', 'VBR-50 (50 m³)'],
      vbr_over_50: ['ВБР понад 50 м³', 'VBR over 50 m³'],
    };
    return m[value] ? (this.isUa ? m[value][0] : m[value][1]) : '---';
  }
  getTowerHeightLabel(
    height: string | null | undefined,
    customHeight: number | null | undefined,
  ): string {
    if (!height) return '---';
    if (height === 'over_25') {
      return customHeight
        ? `${customHeight} m`
        : this.isUa
          ? 'Понад 25 м'
          : 'Over 25 m';
    }
    return `${height} m`;
  }
  getPumpPurposeLabel(value: PumpPurpose | null | undefined): string {
    if (!value) return '---';
    const labels = PUMP_PURPOSE_LABELS[value];
    return this.isUa ? labels.ua : labels.en;
  }

  /** Used by template for the AbstractControl type narrowing (no-op). */
  asFg(c: AbstractControl): FormGroup {
    return c as FormGroup;
  }

  isOptionalStep(): boolean {
    return this.steps[this.currentStep()]?.optional ?? false;
  }
  goToStep(s: number): void {
    if (s < this.currentStep()) this.currentStep.set(s);
  }
  nextStep(): void {
    if (this.validateCurrentStep()) {
      // clear invalid banner when moving forward.
      this.stepInvalid.set(false);
      this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
    }
  }
  skipStep(): void {
    this.currentStep.update((s) => Math.min(s + 1, this.steps.length - 1));
  }
  prevStep(): void {
    // clear invalid banner when navigating back.
    this.stepInvalid.set(false);
    this.currentStep.update((s) => Math.max(s - 1, 0));
  }

  /**
   * Mark all required fields of the current step as touched so validation
   * errors become visible. Also track the latest validation result for the
   * UI banner (see `stepInvalid`).
   */
  private validateCurrentStep(): boolean {
    const fields = this.stepFields[this.currentStep()];
    if (!fields.length) {
      this.stepInvalid.set(false);
      return true;
    }
    let valid = true;
    for (const f of fields) {
      const c = this.form.get(f);
      if (c) {
        c.markAsTouched();
        if ('controls' in c) {
          (c as FormGroup).markAllAsTouched();
        }
        if (c.invalid) valid = false;
      }
    }
    this.stepInvalid.set(!valid);
    return valid;
  }

  showError(f: string): boolean {
    const c = this.form.get(f);
    return !!(c && c.invalid && c.touched);
  }

  // ══════════════════════════════════════════════════════════════
  // NEW: hydrate form state from existing record (edit mode)
  // ══════════════════════════════════════════════════════════════
  private patchFromInitialData(d: WashFormDetail): void {
    // Reconstruct location object from flat fields. Empty strings keep
    // LocationSelector happy (it expects a populated object).
    this.form.patchValue({
      location: {
        regionUa: d.region,
        regionEn: d.regionEn,
        districtUa: d.district,
        districtEn: d.districtEn,
        communityUa: d.community,
        communityEn: d.communityEn,
        communityCode: d.communityCode,
        settlementUa: d.settlement ?? '',
        settlementEn: d.settlementEn ?? '',
        settlementCode: d.settlementCode ?? '',
      },
      organizationName: d.organizationName,
      headName: d.headName,
      headPhoneDigits: d.headPhone?.startsWith('+38')
        ? d.headPhone.slice(3)
        : d.headPhone ?? '',
      email: d.email,
      objectName: d.objectName,
      dependentPopulation: d.dependentPopulation,
      socialFacilities: d.socialFacilities ?? '',
      installationDeadline: d.installationDeadline ?? '',
      replacementReason: d.replacementReason,
    });

    // Repopulate FormArrays — clear() then push fresh groups.
    this.boreholesArray.clear();
    for (const b of d.boreholes ?? []) {
      const fg = this.createBoreholeGroup();
      fg.patchValue({
        workType: b.workType,
        expectedFlowRate: b.expectedFlowRate,
        hasAquiferInfo: b.hasAquiferInfo ?? false,
        existingDepth: b.existingDepth,
        existingDebit: b.existingDebit,
        hasDesignInfo: b.hasDesignInfo ?? false,
        hasPassport: b.hasPassport ?? false,
        oldLocation: b.oldLocation ?? '',
        notes: b.notes ?? '',
      });
      this.boreholesArray.push(fg);
    }

    this.towersArray.clear();
    for (const t of d.towers ?? []) {
      const fg = this.createTowerGroup();
      fg.patchValue({
        towerType: t.towerType,
        towerHeight: t.towerHeight,
        customHeight: t.customHeight,
        hasFoundation: t.hasFoundation,
        isFoundationSuitable: t.isFoundationSuitable,
        needsFoundationReconstruction: t.needsFoundationReconstruction,
        canSelfReconstruct: t.canSelfReconstruct,
        canProvideCrane: t.canProvideCrane,
        notes: t.notes ?? '',
      });
      this.towersArray.push(fg);
    }

    this.purificationsArray.clear();
    for (const p of d.purifications ?? []) {
      const fg = this.createPurificationGroup();
      fg.patchValue({
        hasRoom: p.hasRoom,
        hasTemperatureControl: p.hasTemperatureControl,
        hasWaterInletDrainage: p.hasWaterInletDrainage,
        hasPowerSupply: p.hasPowerSupply,
        canMaintainSystem: p.canMaintainSystem,
        willingToProvideWater: p.willingToProvideWater,
        notes: p.notes ?? '',
      });
      this.purificationsArray.push(fg);
    }

    this.pumpsArray.clear();
    for (const p of d.pumps ?? []) {
      const fg = this.createPumpGroup();
      fg.patchValue({
        purpose: p.purpose,
        purposeOther: p.purposeOther ?? '',
        brand: p.brand ?? '',
        model: p.model ?? '',
        powerKw: p.powerKw,
        flowRateM3h: p.flowRateM3h,
        headM: p.headM,
        diameterInches: p.diameterInches,
        voltage: p.voltage ?? '',
        phases: p.phases,
        quantity: p.quantity,
        notes: p.notes ?? '',
      });
      this.pumpsArray.push(fg);
    }

    // Equipment items → selectedEquipment Map. Сoerce quantity to number — backend returns NUMERIC as string
    const map = new Map<string, { quantity: number | null; notes: string }>();
    for (const it of d.items ?? []) {
      map.set(it.equipmentItemId, {
        quantity: it.quantity != null ? Number(it.quantity) : null,
        notes: it.notes ?? '',
      });
    }
    this.selectedEquipment.set(map);
  }

  // branch by mode — emit in edit, POST in create
  onSubmit(): void {
    if (this.submitting() || this.externalSaving || !this.hasAnySectionFilled()) return;

    const payload = this.buildPayload();

    if (this.mode === 'edit') {
      // Parent owns the PATCH /full call and any error/loading UX.
      this.saved.emit(payload);
      return;
    }

    // create mode — public submit (existing behaviour)
    this.submitting.set(true);
    this.submitError.set(false);
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

// extracted from old onSubmit — same logic, both modes use it
  private buildPayload(): CreateWashFormPayload {
    const v = this.form.value;
    const loc: LocationValue | null = v.location;

    const payload: CreateWashFormPayload = {
      region: loc?.regionUa ?? '',
      regionEn: loc?.regionEn ?? '',
      district: loc?.districtUa ?? '',
      districtEn: loc?.districtEn ?? '',
      community: loc?.communityUa ?? '',
      communityEn: loc?.communityEn ?? '',
      communityCode: loc?.communityCode ?? '',
      settlement: loc?.settlementUa || undefined,
      settlementEn: loc?.settlementEn || undefined,
      settlementCode: loc?.settlementCode || undefined,
      organizationName: v.organizationName,
      headName: v.headName,
      headPhone: `+38${v.headPhoneDigits}`,
      email: v.email,
      objectName: v.objectName,
      dependentPopulation: v.dependentPopulation,
      socialFacilities: v.socialFacilities || undefined,
      installationDeadline: v.installationDeadline || undefined,
      replacementReason: v.replacementReason,
    };

    // edit-mode replace-semantics — always send arrays (even if empty)
    // so backend can clear sections the user removed. In create mode we
    // optimise by sending only non-empty arrays.
    const sendEmpty = this.mode === 'edit';

    if (this.boreholesArray.length || sendEmpty) {
      payload.boreholes = this.boreholesArray.controls.map((c, idx): CreateBoreholePayload => {
        const bh = c.value;
        return {
          workType: bh.workType,
          expectedFlowRate: bh.expectedFlowRate,
          ...(bh.workType === 'new_near_existing'
            ? {
              hasAquiferInfo: bh.hasAquiferInfo ?? false,
              existingDepth: bh.existingDepth || undefined,
              existingDebit: bh.existingDebit || undefined,
              hasDesignInfo: bh.hasDesignInfo ?? false,
              hasPassport: bh.hasPassport ?? false,
              oldLocation: bh.oldLocation || undefined,
            }
            : {}),
          ...(bh.notes ? { notes: bh.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    if (this.towersArray.length || sendEmpty) {
      payload.towers = this.towersArray.controls.map((c, idx): CreateTowerPayload => {
        const wt = c.value;
        return {
          towerType: wt.towerType,
          towerHeight: wt.towerHeight,
          hasFoundation: wt.hasFoundation ?? false,
          isFoundationSuitable: wt.isFoundationSuitable ?? false,
          needsFoundationReconstruction: wt.needsFoundationReconstruction ?? false,
          canSelfReconstruct: wt.canSelfReconstruct ?? false,
          canProvideCrane: wt.canProvideCrane ?? false,
          ...(wt.towerHeight === 'over_25' && wt.customHeight
            ? { customHeight: wt.customHeight }
            : {}),
          ...(wt.notes ? { notes: wt.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    if (this.purificationsArray.length || sendEmpty) {
      payload.purifications = this.purificationsArray.controls.map(
        (c, idx): CreatePurificationPayload => {
          const ps = c.value;
          return {
            hasRoom: ps.hasRoom ?? false,
            hasTemperatureControl: ps.hasTemperatureControl ?? false,
            hasWaterInletDrainage: ps.hasWaterInletDrainage ?? false,
            hasPowerSupply: ps.hasPowerSupply ?? false,
            canMaintainSystem: ps.canMaintainSystem ?? false,
            willingToProvideWater: ps.willingToProvideWater ?? false,
            ...(ps.notes ? { notes: ps.notes } : {}),
            sortOrder: idx,
          };
        },
      );
    }

    if (this.pumpsArray.length || sendEmpty) {
      payload.pumps = this.pumpsArray.controls.map((c, idx): CreatePumpPayload => {
        const p = c.value;
        return {
          purpose: p.purpose,
          ...(p.purpose === 'other' && p.purposeOther ? { purposeOther: p.purposeOther } : {}),
          ...(p.brand ? { brand: p.brand } : {}),
          ...(p.model ? { model: p.model } : {}),
          ...(p.powerKw != null ? { powerKw: Number(p.powerKw) } : {}),
          ...(p.flowRateM3h != null ? { flowRateM3h: Number(p.flowRateM3h) } : {}),
          ...(p.headM != null ? { headM: Number(p.headM) } : {}),
          ...(p.diameterInches != null ? { diameterInches: Number(p.diameterInches) } : {}),
          ...(p.voltage ? { voltage: p.voltage } : {}),
          ...(p.phases != null ? { phases: Number(p.phases) } : {}),
          quantity: p.quantity ?? 1,
          ...(p.notes ? { notes: p.notes } : {}),
          sortOrder: idx,
        };
      });
    }

    const filled = this.getFilledEquipmentEntries();
    if (filled.length || sendEmpty) {
      payload.items = filled.map((e, idx) => ({
        equipmentItemId: e.itemId,
        quantity: e.quantity,
        ...(e.notes ? { notes: e.notes } : {}),
        sortOrder: idx,
      }));
    }

    return payload;
  }

// cancel button handler (edit mode only)
  onCancel(): void {
    this.cancelled.emit();
  }








  resetForm(): void {
    this.form.reset();
    this.boreholesArray.clear();
    this.towersArray.clear();
    this.purificationsArray.clear();
    this.pumpsArray.clear();
    this.selectedEquipment.set(new Map());
    this.expandedCategories.set(new Set());
    this.equipmentSearch.set('');
    this.stepInvalid.set(false);
    this.currentStep.set(0);
    this.submitted.set(false);
    this.submitError.set(false);
  }
}

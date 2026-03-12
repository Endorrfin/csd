import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-wash-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <h1>{{ isUa ? 'Форма оцінки потреб WASH' : 'WASH Needs Assessment Form' }}</h1>

    @if (submitted) {
      <div class="success">
        {{ isUa ? 'Заявку успішно подано!' : 'Form submitted successfully!' }}
      </div>
    } @else {
      <form (ngSubmit)="onSubmit()" class="wash-form">
        <label>{{ isUa ? "Ім'я заявника" : 'Applicant name' }} *
          <input [(ngModel)]="form.applicantName" name="applicantName" required />
        </label>

        <label>{{ isUa ? 'Телефон' : 'Phone' }} *
          <input [(ngModel)]="form.applicantPhone" name="applicantPhone" required />
        </label>

        <label>Email
          <input type="email" [(ngModel)]="form.applicantEmail" name="applicantEmail" />
        </label>

        <label>{{ isUa ? 'Організація' : 'Organization' }} *
          <input [(ngModel)]="form.organizationName" name="organizationName" required />
        </label>

        <label>{{ isUa ? 'Область' : 'Region' }} *
          <input [(ngModel)]="form.region" name="region" required />
        </label>

        <label>{{ isUa ? 'Район' : 'District' }} *
          <input [(ngModel)]="form.district" name="district" required />
        </label>

        <label>{{ isUa ? 'Населений пункт' : 'Settlement' }} *
          <input [(ngModel)]="form.settlement" name="settlement" required />
        </label>

        <label>{{ isUa ? 'Тип потреби' : 'Need type' }} *
          <select [(ngModel)]="form.needType" name="needType" required>
            <option value="borehole_drilling">{{ isUa ? 'Буріння свердловин' : 'Borehole drilling' }}</option>
            <option value="water_tower">{{ isUa ? 'Водонапірна башта' : 'Water tower' }}</option>
            <option value="pipes_valves_fittings">{{ isUa ? 'Труби, клапани' : 'Pipes, valves, fittings' }}</option>
            <option value="pumps_equipment">{{ isUa ? 'Насоси' : 'Pumps & equipment' }}</option>
            <option value="purification_system">{{ isUa ? 'Система очищення' : 'Purification system' }}</option>
            <option value="water_tanks">{{ isUa ? 'Резервуари для води' : 'Water tanks' }}</option>
            <option value="bottled_water_hygiene">{{ isUa ? 'Бутильована вода та гігієна' : 'Bottled water & hygiene' }}</option>
            <option value="solar_power_plant">{{ isUa ? 'Сонячна електростанція' : 'Solar power plant' }}</option>
            <option value="wash_rooms_rehabilitation">{{ isUa ? 'Реабілітація WASH кімнат' : 'WASH rooms rehabilitation' }}</option>
          </select>
        </label>

        <label>{{ isUa ? 'Опис потреби' : 'Description' }} *
          <textarea [(ngModel)]="form.description" name="description" rows="4" required></textarea>
        </label>

        <label>{{ isUa ? 'Кількість бенефіціарів' : 'Beneficiaries count' }}
          <input type="number" [(ngModel)]="form.beneficiariesCount" name="beneficiariesCount" />
        </label>

        <button type="submit">{{ isUa ? 'Подати заявку' : 'Submit' }}</button>
      </form>
    }
  `,
  styles: [`
    .wash-form label {
      display: block;
      margin-bottom: 1rem;
      font-weight: 500;
    }
    .wash-form input,
    .wash-form select,
    .wash-form textarea {
      display: block;
      width: 100%;
      padding: 0.5rem;
      margin-top: 0.25rem;
      border: 1px solid #cbd5e0;
      border-radius: 4px;
    }
    .wash-form button {
      background: #1a365d;
      color: white;
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }
    .success {
      background: #f0fff4;
      color: #276749;
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      font-size: 1.25rem;
    }
  `],
})
export class WashFormComponent {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  submitted = false;
  get isUa() { return (this.translate.currentLang || 'ua') === 'ua'; }

  form: any = {
    applicantName: '',
    applicantPhone: '',
    applicantEmail: '',
    organizationName: '',
    region: '',
    district: '',
    settlement: '',
    needType: 'borehole_drilling',
    description: '',
    beneficiariesCount: null,
  };

  onSubmit() {
    const body = { ...this.form };
    if (!body.beneficiariesCount) delete body.beneficiariesCount;
    if (!body.applicantEmail) delete body.applicantEmail;

    this.api.post('needs-forms/wash', body).subscribe({
      next: () => (this.submitted = true),
      error: (err) => console.error('Submit error:', err),
    });
  }
}

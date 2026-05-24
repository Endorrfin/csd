import { Component, inject, Input, OnInit, OnDestroy, signal, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Subscription } from 'rxjs';
import { LocationService } from '../../services/location.service';
import {
  RegionRaw,
  DistrictRaw,
  CommunityRaw,
  SettlementRaw,
  LocationValue,
  EMPTY_LOCATION,
} from '../../interfaces/location.interfaces';

@Component({
  selector: 'app-location-selector',
  standalone: true,
  imports: [CommonModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => LocationSelectorComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => LocationSelectorComponent),
      multi: true,
    },
  ],
  template: `
    @if (loading()) {
      <div class="loc-loading">{{ isUa ? 'Завантаження...' : 'Loading...' }}</div>
    } @else {
      <div class="loc-grid">
        <!-- Region -->
        <div class="loc-field">
          <label for="loc-region">
            {{ isUa ? 'Область' : 'Region' }}
            @if (required) {
              <span class="loc-req">*</span>
            }
          </label>
          <select id="loc-region" (change)="onRegionChange($event)" [disabled]="isDisabled">
            <option value="-1" [selected]="selectedRegionIdx() === -1">
              {{ isUa ? '-- Оберіть область --' : '-- Select region --' }}
            </option>
            @for (r of regions(); track r.ua; let i = $index) {
              <option [value]="i" [selected]="selectedRegionIdx() === i">
                {{ isUa ? r.ua : r.en }}
              </option>
            }
          </select>
        </div>

        <!-- District -->
        <div class="loc-field">
          <label for="loc-district">{{ isUa ? 'Район' : 'District' }}</label>
          <select
            id="loc-district"
            (change)="onDistrictChange($event)"
            [disabled]="isDisabled || selectedRegionIdx() < 0"
          >
            <option value="-1" [selected]="selectedDistrictIdx() === -1">
              {{ isUa ? '-- Оберіть район --' : '-- Select district --' }}
            </option>
            @for (d of districts(); track d.ua; let i = $index) {
              <option [value]="i" [selected]="selectedDistrictIdx() === i">
                {{ isUa ? d.ua : d.en }}
              </option>
            }
          </select>
        </div>

        <!-- Community -->
        <div class="loc-field">
          <label for="loc-community">{{ isUa ? 'Громада' : 'Community' }}</label>
          <select
            id="loc-community"
            (change)="onCommunityChange($event)"
            [disabled]="isDisabled || selectedDistrictIdx() < 0"
          >
            <option value="-1" [selected]="selectedCommunityIdx() === -1">
              {{ isUa ? '-- Оберіть громаду --' : '-- Select community --' }}
            </option>
            @for (cm of communities(); track cm.c; let i = $index) {
              <option [value]="i" [selected]="selectedCommunityIdx() === i">
                {{ isUa ? cm.ua : cm.en }}
              </option>
            }
          </select>
        </div>

        <!-- Settlement -->
        <div class="loc-field">
          <label for="loc-settlement">{{ isUa ? 'Населений пункт' : 'Settlement' }}</label>
          <select
            id="loc-settlement"
            (change)="onSettlementChange($event)"
            [disabled]="isDisabled || selectedCommunityIdx() < 0"
          >
            <option value="-1" [selected]="selectedSettlementIdx() === -1">
              {{ isUa ? '-- Оберіть населений пункт --' : '-- Select settlement --' }}
            </option>
            @for (s of settlements(); track s.c; let i = $index) {
              <option [value]="i" [selected]="selectedSettlementIdx() === i">
                {{ isUa ? s.ua : s.en }}
              </option>
            }
          </select>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .loc-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }
      .loc-field {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
      }
      .loc-field label {
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
      }
      .loc-req {
        color: #e53e3e;
      }
      .loc-field select {
        padding: 0.55rem 0.75rem;
        border: 1px solid #cbd5e0;
        border-radius: 6px;
        font-size: 0.9rem;
        background: #fff;
        transition: border-color 0.15s;
      }
      .loc-field select:focus {
        outline: none;
        border-color: #2b6cb0;
        box-shadow: 0 0 0 3px rgba(43, 108, 176, 0.1);
      }
      .loc-field select:disabled {
        background: #f1f5f9;
        color: #94a3b8;
        cursor: not-allowed;
      }
      .loc-loading {
        text-align: center;
        padding: 1rem;
        color: #64748b;
        font-size: 0.9rem;
      }
      @media (max-width: 640px) {
        .loc-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class LocationSelectorComponent
  implements OnInit, OnDestroy, ControlValueAccessor, Validator
{
  private readonly locationService = inject(LocationService);
  private sub?: Subscription;

  /** Whether the parent language is Ukrainian */
  @Input() isUa = true;

  /** Show asterisk on region label */
  @Input() required = false;

  /* ── State ── */
  loading = signal(true);
  regions = signal<RegionRaw[]>([]);
  districts = signal<DistrictRaw[]>([]);
  communities = signal<CommunityRaw[]>([]);
  settlements = signal<SettlementRaw[]>([]);

  selectedRegionIdx = signal(-1);
  selectedDistrictIdx = signal(-1);
  selectedCommunityIdx = signal(-1);
  selectedSettlementIdx = signal(-1);

  isDisabled = false;

  /* ── CVA callbacks ── */
  private onChange: (val: LocationValue | null) => void = () => {};
  private onTouched: () => void = () => {};
  private pendingValue: LocationValue | null = null;

  ngOnInit(): void {
    this.sub = this.locationService.getRegions().subscribe({
      next: (data) => {
        this.regions.set(data);
        this.loading.set(false);
        if (this.pendingValue) {
          this.restoreFromValue(this.pendingValue, data);
          this.pendingValue = null;
        }
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  /* ── Cascading handlers ── */

  onRegionChange(event: Event): void {
    const idx = +(event.target as HTMLSelectElement).value;
    this.selectedRegionIdx.set(idx);
    this.selectedDistrictIdx.set(-1);
    this.selectedCommunityIdx.set(-1);
    this.selectedSettlementIdx.set(-1);
    this.communities.set([]);
    this.settlements.set([]);

    if (idx >= 0) {
      this.districts.set(this.regions()[idx].d);
    } else {
      this.districts.set([]);
    }
    this.emitValue();
  }

  onDistrictChange(event: Event): void {
    const idx = +(event.target as HTMLSelectElement).value;
    this.selectedDistrictIdx.set(idx);
    this.selectedCommunityIdx.set(-1);
    this.selectedSettlementIdx.set(-1);
    this.settlements.set([]);

    if (idx >= 0) {
      this.communities.set(this.districts()[idx].cm);
    } else {
      this.communities.set([]);
    }
    this.emitValue();
  }

  onCommunityChange(event: Event): void {
    const idx = +(event.target as HTMLSelectElement).value;
    this.selectedCommunityIdx.set(idx);
    this.selectedSettlementIdx.set(-1);

    if (idx >= 0) {
      this.settlements.set(this.communities()[idx].s);
    } else {
      this.settlements.set([]);
    }
    this.emitValue();
  }

  onSettlementChange(event: Event): void {
    const idx = +(event.target as HTMLSelectElement).value;
    this.selectedSettlementIdx.set(idx);
    this.emitValue();
  }

  /* ── Build & emit value ── */

  private emitValue(): void {
    this.onTouched();
    const ri = this.selectedRegionIdx();
    if (ri < 0) {
      this.onChange(null);
      return;
    }

    const region = this.regions()[ri];
    const val: LocationValue = { ...EMPTY_LOCATION, regionUa: region.ua, regionEn: region.en };

    const di = this.selectedDistrictIdx();
    if (di >= 0) {
      const district = this.districts()[di];
      val.districtUa = district.ua;
      val.districtEn = district.en;
    }

    const ci = this.selectedCommunityIdx();
    if (ci >= 0) {
      const community = this.communities()[ci];
      val.communityUa = community.ua;
      val.communityEn = community.en;
      val.communityCode = community.c;
    }

    const si = this.selectedSettlementIdx();
    if (si >= 0) {
      const settlement = this.settlements()[si];
      val.settlementUa = settlement.ua;
      val.settlementEn = settlement.en;
      val.settlementCode = settlement.c;
    }

    this.onChange(val);
  }

  /* ── ControlValueAccessor ── */

  writeValue(val: LocationValue | null): void {
    if (!val || !val.regionUa) {
      this.pendingValue = null;
      this.resetSelections();
      return;
    }

    const regs = this.regions();
    if (regs.length) {
      // Data already loaded — restore immediately
      this.restoreFromValue(val, regs);
    } else {
      // Data not yet loaded — defer; ngOnInit will apply once regions arrive
      this.pendingValue = val;
    }
  }

  registerOnChange(fn: (val: LocationValue | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(disabled: boolean): void {
    this.isDisabled = disabled;
  }

  /* ── Validator ── */

  validate(_control: AbstractControl): ValidationErrors | null {
    // Validation is opt-in via parent Validators.required on the FormControl
    return null;
  }

  /* ── Helpers ── */

  private resetSelections(): void {
    this.selectedRegionIdx.set(-1);
    this.selectedDistrictIdx.set(-1);
    this.selectedCommunityIdx.set(-1);
    this.selectedSettlementIdx.set(-1);
    this.districts.set([]);
    this.communities.set([]);
    this.settlements.set([]);
  }

  private restoreFromValue(val: LocationValue, regs: RegionRaw[]): void {
    const ri = regs.findIndex((r) => r.ua === val.regionUa);
    if (ri < 0) {
      this.resetSelections();
      return;
    }

    this.selectedRegionIdx.set(ri);
    this.districts.set(regs[ri].d);

    if (val.districtUa) {
      const di = regs[ri].d.findIndex((d) => d.ua === val.districtUa);
      if (di >= 0) {
        this.selectedDistrictIdx.set(di);
        this.communities.set(regs[ri].d[di].cm);

        if (val.communityCode) {
          const ci = regs[ri].d[di].cm.findIndex((cm) => cm.c === val.communityCode);
          if (ci >= 0) {
            this.selectedCommunityIdx.set(ci);
            this.settlements.set(regs[ri].d[di].cm[ci].s);

            if (val.settlementCode) {
              const si = regs[ri].d[di].cm[ci].s.findIndex((s) => s.c === val.settlementCode);
              if (si >= 0) this.selectedSettlementIdx.set(si);
            }
          }
        }
      }
    }
  }
}

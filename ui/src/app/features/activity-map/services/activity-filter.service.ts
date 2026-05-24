import { Injectable, computed, inject, signal } from '@angular/core';
import { Activity, CategoryId, LocalizedText, TypeId } from '../activity-map.interfaces';
import { ActivityDataService } from './activity-data.service';

export interface SettlementGroup {
  key: string;
  name: LocalizedText;
  count: number;
  lat: number | null;
  lng: number | null;
  activities: Activity[];
}

@Injectable({ providedIn: 'root' })
export class ActivityFilterService {
  private readonly dataService = inject(ActivityDataService);

  private readonly _enabledTypes = signal<Set<TypeId>>(new Set());
  private readonly _expandedTypes = signal<Set<TypeId>>(new Set());
  private readonly _expandedCategories = signal<Set<CategoryId>>(new Set<CategoryId>(['wash']));
  private readonly _selectedSettlementKey = signal<string | null>(null);
  private readonly _mobileDrawerOpen = signal(false);

  readonly enabledTypes = this._enabledTypes.asReadonly();
  readonly expandedTypes = this._expandedTypes.asReadonly();
  readonly expandedCategories = this._expandedCategories.asReadonly();
  readonly selectedSettlementKey = this._selectedSettlementKey.asReadonly();
  readonly mobileDrawerOpen = this._mobileDrawerOpen.asReadonly();

  readonly visibleActivities = computed<Activity[]>(() => {
    const enabled = this._enabledTypes();
    return this.dataService.activities().filter((a) => enabled.has(a.typeId));
  });

  settlementsForType(typeId: TypeId): SettlementGroup[] {
    const groups = new Map<string, SettlementGroup>();
    for (const a of this.dataService.activities()) {
      if (a.typeId !== typeId) continue;
      const settlementUk = a.location.settlement?.uk ?? '—';
      const settlementEn = a.location.settlement?.en ?? settlementUk;
      const key = `${typeId}::${settlementUk}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
        existing.activities.push(a);
      } else {
        groups.set(key, {
          key,
          name: { uk: settlementUk, en: settlementEn },
          count: 1,
          lat: a.location.coordinates?.lat ?? null,
          lng: a.location.coordinates?.lng ?? null,
          activities: [a],
        });
      }
    }
    return [...groups.values()].sort((x, y) => x.name.uk.localeCompare(y.name.uk, 'uk'));
  }

  enableAllTypes(): void {
    const data = this.dataService.data();
    if (!data) return;
    const all = new Set<TypeId>(Object.keys(data.types) as TypeId[]);
    this._enabledTypes.set(all);
  }

  toggleType(typeId: TypeId): void {
    const next = new Set(this._enabledTypes());
    if (next.has(typeId)) next.delete(typeId);
    else next.add(typeId);
    this._enabledTypes.set(next);
  }

  toggleExpandedType(typeId: TypeId): void {
    const next = new Set(this._expandedTypes());
    if (next.has(typeId)) {
      next.delete(typeId);
    } else {
      next.add(typeId);
      const enabled = new Set(this._enabledTypes());
      enabled.add(typeId);
      this._enabledTypes.set(enabled);
    }
    this._expandedTypes.set(next);
  }

  toggleExpandedCategory(categoryId: CategoryId): void {
    const next = new Set(this._expandedCategories());
    if (next.has(categoryId)) next.delete(categoryId);
    else next.add(categoryId);
    this._expandedCategories.set(next);
  }

  selectSettlement(key: string | null): void {
    this._selectedSettlementKey.set(key);
  }

  setMobileDrawerOpen(open: boolean): void {
    this._mobileDrawerOpen.set(open);
  }

  toggleMobileDrawer(): void {
    this._mobileDrawerOpen.update((v) => !v);
  }

  /**
   * NEW (Step 7): triggered when a marker on the map is clicked.
   * Expands the matching category and type in the sidebar, then highlights the settlement.
   * Does NOT open the mobile drawer — user keeps the map visible to explore other markers.
   */
  selectFromMap(settlementName: string, typeId: TypeId): void {
    const data = this.dataService.data();
    if (!data) return;

    const meta = data.types[typeId];
    if (!meta) return;

    // 1. Expand the parent category (additive — doesn't collapse other categories)
    const cats = new Set(this._expandedCategories());
    cats.add(meta.categoryId);
    this._expandedCategories.set(cats);

    // 2. Expand the specific type (additive — doesn't collapse other types)
    const types = new Set(this._expandedTypes());
    types.add(typeId);
    this._expandedTypes.set(types);

    // 3. Ensure the type is also enabled (otherwise the marker shouldn't have been visible
    //    to be clicked — but defensive code).
    const enabled = new Set(this._enabledTypes());
    enabled.add(typeId);
    this._enabledTypes.set(enabled);

    // 4. Highlight the settlement.
    this._selectedSettlementKey.set(`${typeId}::${settlementName}`);

    // On desktop the drawer logic is irrelevant — sidebar is always visible.
    this._mobileDrawerOpen.set(true);
  }
}

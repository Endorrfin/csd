/// <reference types="leaflet.markercluster" />
import { Injectable } from '@angular/core';
import type * as L from 'leaflet';
import {
  Activity,
  ActivityMapData,
  CategoryId,
  LocalizedText,
  TypeId,
} from '../activity-map.interfaces';
import { SettlementGroup } from './activity-filter.service';

/** Settlement aggregate keyed by rounded coordinates — many activities → one marker. */
export interface MapPoint {
  key: string;
  lat: number;
  lng: number;
  settlement: LocalizedText | null;
  activities: Activity[];
  typeIds: Set<TypeId>;
  dominantCategory: CategoryId | null;
}

const CATEGORY_COLORS: Record<CategoryId, string> = {
  wash: '#3182ce',
  recovery: '#ed8936',
};
const MIXED_COLOR = '#4a5568';

@Injectable({ providedIn: 'root' })
export class ActivityMapService {
  buildMapPoints(activities: Activity[], data: ActivityMapData | null): MapPoint[] {
    if (!data) return [];
    const points = new Map<string, MapPoint>();
    for (const a of activities) {
      const c = a.location.coordinates;
      if (!c) continue;
      const key = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
      const cat = data.types[a.typeId]?.categoryId ?? null;
      const existing = points.get(key);
      if (existing) {
        existing.activities.push(a);
        existing.typeIds.add(a.typeId);
        if (cat && existing.dominantCategory && existing.dominantCategory !== cat) {
          existing.dominantCategory = null;
        }
      } else {
        points.set(key, {
          key,
          lat: c.lat,
          lng: c.lng,
          settlement: a.location.settlement,
          activities: [a],
          typeIds: new Set<TypeId>([a.typeId]),
          dominantCategory: cat,
        });
      }
    }
    return [...points.values()];
  }

  findPointForSettlement(points: MapPoint[], group: SettlementGroup): MapPoint | null {
    if (group.lat === null || group.lng === null) return null;
    const targetKey = `${group.lat.toFixed(4)},${group.lng.toFixed(4)}`;
    return points.find((p) => p.key === targetKey) ?? null;
  }

  createMarkerIcon(LL: typeof L, point: MapPoint, data: ActivityMapData): L.DivIcon {
    const total = point.activities.length;
    const typesCount = point.typeIds.size;
    const color = point.dominantCategory ? CATEGORY_COLORS[point.dominantCategory] : MIXED_COLOR;

    let inner: string;
    if (typesCount === 1) {
      const onlyType = [...point.typeIds][0];
      const meta = data.types[onlyType];
      inner = `
        <div class="amk__icon-wrap" style="background:${color}">
          <img src="/assets/icons/activities/${meta.icon}" alt="" class="amk__icon" />
        </div>`;
    } else {
      inner = `<div class="amk__dot" style="background:${color}"></div>`;
    }

    const badge = total > 1 ? `<span class="amk__badge">${total}</span>` : '';

    return LL.divIcon({
      className: 'amk',
      html: `<div class="amk__pin">${inner}${badge}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -34],
    });
  }

  createClusterIcon(LL: typeof L, cluster: L.MarkerCluster): L.DivIcon {
    const count = cluster.getChildCount();
    const sizeClass = count < 10 ? 'sm' : count < 50 ? 'md' : 'lg';
    return LL.divIcon({
      className: `amc amc--${sizeClass}`,
      html: `<div class="amc__inner"><span>${count}</span></div>`,
      iconSize: [44, 44],
    });
  }

  buildPopupHtml(point: MapPoint, data: ActivityMapData, lang: 'uk' | 'en'): string {
    const pick = (t: LocalizedText | null | undefined) => (t ? (t[lang] ?? t.uk) : '');
    const settlementName = pick(point.settlement) || '—';
    const items = point.activities
      .map((a) => {
        const meta = data.types[a.typeId];
        const typeLabel = pick(meta.label);

        // (Step 7+): stacked metadata, always-English labels per user request.
        const fields: string[] = [];
        if (a.completedAt) {
          fields.push(
            `<div class="amp__field"><span class="amp__key">Completed:</span> ${a.completedAt}</div>`,
          );
        }
        if (a.beneficiaries) {
          fields.push(
            `<div class="amp__field"><span class="amp__key">Beneficiaries:</span> ${a.beneficiaries}</div>`,
          );
        }
        if (a.donor) {
          fields.push(
            `<div class="amp__field"><span class="amp__key">Donor:</span> ${this.escapeHtml(a.donor)}</div>`,
          );
        }

        return `
        <li class="amp__item">
          <img src="/assets/icons/activities/${meta.icon}" alt="" class="amp__icon" />
          <div class="amp__body">
            <div class="amp__type">${typeLabel}</div>
            ${fields.join('')}
          </div>
        </li>`;
      })
      .join('');
    return `
    <div class="amp">
      <h3 class="amp__title">${settlementName}</h3>
      <ul class="amp__list">${items}</ul>
    </div>`;
  }

  /**
   * Minimal HTML escape for user-facing string fields injected into innerHTML.
   * Type labels and settlement names already come from a controlled JSON source,
   * but `donor` is free-form text from the spreadsheet — escape it defensively.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

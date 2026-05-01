/// <reference types="leaflet.markercluster" />
import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type * as Leaflet from 'leaflet';
import { ActivityDataService } from '../../services/activity-data.service';
import { ActivityFilterService } from '../../services/activity-filter.service';
import { ActivityMapService, MapPoint } from '../../services/activity-map.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="map-view">
      <div #mapContainer class="map-view__canvas"></div>
      @if (!ready() && isBrowser) {
        <div class="map-view__loader">{{ 'common.loading' | translate }}</div>
      }
      @if (loadError(); as err) {
        <div class="map-view__error">
          {{ 'ACTIVITY_MAP.MAP_LOAD_ERROR' | translate }}: {{ err }}
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        position: relative;
      }
      .map-view {
        width: 100%;
        height: 100%;
        position: relative;
      }
      .map-view__canvas {
        width: 100%;
        height: 100%;
        background: #e2e8f0;
      }
      .map-view__loader,
      .map-view__error {
        position: absolute;
        top: 1rem;
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        font-size: 0.875rem;
        z-index: 1000;
      }
      .map-view__error {
        background: #fff5f5;
        color: #c53030;
      }
    `,
    `
      :host ::ng-deep .amk {
        background: transparent !important;
        border: none !important;
      }
      :host ::ng-deep .amk__pin {
        position: relative;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      :host ::ng-deep .amk__icon-wrap {
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        border: 2px solid #fff;
      }
      :host ::ng-deep .amk__icon {
        width: 18px;
        height: 18px;
        transform: rotate(45deg);
        filter: brightness(0) invert(1);
      }
      :host ::ng-deep .amk__dot {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      }
      :host ::ng-deep .amk__badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        background: #fff;
        color: #1a365d;
        font-size: 11px;
        font-weight: 700;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
    `,
    `
      :host ::ng-deep .amc {
        background: transparent !important;
        border: none !important;
      }
      :host ::ng-deep .amc__inner {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-weight: 700;
        font-size: 14px;
        border: 3px solid #fff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
      }
      :host ::ng-deep .amc--sm .amc__inner {
        background: #3182ce;
      }
      :host ::ng-deep .amc--md .amc__inner {
        background: #2c5282;
        font-size: 15px;
      }
      :host ::ng-deep .amc--lg .amc__inner {
        background: #1a365d;
        font-size: 16px;
      }
    `,
    `
      :host ::ng-deep .amp {
        min-width: 220px;
        
        :host ::ng-deep .amp__field {
          font-size: 0.75rem;
          color: #4a5568;
          margin-top: 2px;
        }
        :host ::ng-deep .amp__key {
          color: #718096;
          font-weight: 500;
          margin-right: 0.25rem;
        }
      }
      :host ::ng-deep .amp__title {
        margin: 0 0 0.5rem;
        font-size: 1rem;
        color: #1a365d;
      }
      :host ::ng-deep .amp__list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 240px;
        overflow-y: auto;
      }
      :host ::ng-deep .amp__item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.375rem 0;
        border-bottom: 1px solid #edf2f7;
      }
      :host ::ng-deep .amp__item:last-child {
        border-bottom: none;
      }
      :host ::ng-deep .amp__icon {
        width: 22px;
        height: 22px;
        flex-shrink: 0;
      }
      :host ::ng-deep .amp__type {
        font-size: 0.875rem;
        font-weight: 500;
        color: #2d3748;
      }
    `,
  ],
})
export class MapViewComponent {
  @ViewChild('mapContainer', { static: true })
  private mapContainerRef!: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  protected readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly dataService = inject(ActivityDataService);
  private readonly filter = inject(ActivityFilterService);
  private readonly mapHelper = inject(ActivityMapService);
  private readonly translate = inject(TranslateService);

  protected readonly ready = signal(false);
  protected readonly loadError = signal<string | null>(null);

  private map: Leaflet.Map | null = null;
  private clusterGroup: Leaflet.MarkerClusterGroup | null = null;
  private markerByPointKey = new Map<string, Leaflet.Marker>();
  private didInitialFit = false;

  /**
   * Runtime Leaflet — comes from <script> tag in index.html (window.L).
   * Bypasses bundler entirely; UMD plugins like markercluster work reliably.
   */
  private get L(): typeof Leaflet {
    return (globalThis as unknown as { L: typeof Leaflet }).L;
  }

  private readonly allPoints = computed(() =>
    this.mapHelper.buildMapPoints(this.dataService.activities(), this.dataService.data()),
  );
  private readonly visiblePoints = computed(() =>
    this.mapHelper.buildMapPoints(this.filter.visibleActivities(), this.dataService.data()),
  );

  constructor() {
    afterNextRender(() => {
      try {
        this.initLeaflet();
        this.ready.set(true);
        this.refreshMarkers();
      } catch (e) {
        this.loadError.set(e instanceof Error ? e.message : String(e));
      }
    });

    effect(() => {
      this.visiblePoints();
      if (this.ready()) {
        this.refreshMarkers();
      }
    });

    effect(() => {
      const key = this.filter.selectedSettlementKey();
      if (!key || !this.ready()) return;
      this.flyToSettlementKey(key);
    });
  }

  private initLeaflet(): void {
    const L = this.L;
    if (!L) {
      throw new Error('Leaflet not loaded — check <script> tags in index.html');
    }
    if (typeof L.markerClusterGroup !== 'function') {
      throw new Error('leaflet.markercluster plugin not loaded — check <script> tags in index.html');
    }

    const container = this.mapContainerRef.nativeElement;

    this.map = L.map(container, {
      center: [49.5, 35.5],
      zoom: 7,
      preferCanvas: false,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.clusterGroup = L.markerClusterGroup({
      iconCreateFunction: (cluster: Leaflet.MarkerCluster) =>
        this.mapHelper.createClusterIcon(L, cluster),
      showCoverageOnHover: false,
      maxClusterRadius: 60,
    });
    this.map.addLayer(this.clusterGroup);
  }

  private refreshMarkers(): void {
    if (!this.map || !this.clusterGroup) return;
    const L = this.L;
    const data = this.dataService.data();
    if (!data) return;

    this.clusterGroup.clearLayers();
    this.markerByPointKey.clear();

    const points = this.visiblePoints();
    const lang = (this.translate.currentLang === 'en' ? 'en' : 'uk') as 'uk' | 'en';

    for (const point of points) {
      const icon = this.mapHelper.createMarkerIcon(L, point, data);
      const marker = L.marker([point.lat, point.lng], { icon });
      const popupHtml = this.mapHelper.buildPopupHtml(point, data, lang);
      marker.bindPopup(popupHtml, { maxWidth: 320 });

      // CHANGED (Step 7): on marker click, sync sidebar state.
      // Use the dominant typeId — first activity at this point (== first row in source data).
      marker.on('click', () => {
        const settlementName = point.settlement?.uk ?? '';
        const dominantTypeId = point.activities[0]?.typeId;
        if (settlementName && dominantTypeId) {
          this.filter.selectFromMap(settlementName, dominantTypeId);
        }
      });

      this.markerByPointKey.set(point.key, marker);
      this.clusterGroup.addLayer(marker);
    }

    if (
      points.length > 0 &&
      this.markerByPointKey.size === points.length &&
      !this.didInitialFit
    ) {
      this.fitBoundsToPoints(points);
      this.didInitialFit = true;
    }
  }

  private fitBoundsToPoints(points: MapPoint[]): void {
    if (!this.map || points.length === 0) return;
    const L = this.L;
    const latLngs = points.map((p) => L.latLng(p.lat, p.lng));
    const bounds = L.latLngBounds(latLngs);
    this.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }

  private flyToSettlementKey(settlementKey: string): void {
    if (!this.map) return;
    const all = this.allPoints();
    const settlementName = settlementKey.split('::')[1];
    if (!settlementName) return;
    const point = all.find((p) => p.settlement?.uk === settlementName);
    if (!point) return;
    this.map.flyTo([point.lat, point.lng], 13, { duration: 0.8 });
    const marker = this.markerByPointKey.get(point.key);
    if (marker) {
      setTimeout(() => marker.openPopup(), 850);
    }
  }
}

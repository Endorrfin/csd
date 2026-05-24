import { Injectable, computed, inject } from '@angular/core';
import { ActivityDataService } from '../../activity-map/services/activity-data.service';

/**
 * Aggregates impact metrics from activities.json.
 * Reuses ActivityDataService to avoid a duplicate HTTP fetch — the same
 * dataset feeds both the Activity Map and the home stats block.
 *
 * All computed counts return 0 until data loads. Consumers must call
 * ensureLoaded() once (typically in component ngOnInit).
 *
 * NOTE: cross-feature import (home → activity-map). If a third consumer
 * appears, consider promoting ActivityDataService to core/services.
 */
@Injectable({ providedIn: 'root' })
export class ImpactStatsService {
  private readonly data = inject(ActivityDataService);

  // Idempotent: subsequent calls are no-ops because data() is non-null
  // after first successful load, and loading() guards concurrent calls.
  ensureLoaded(): void {
    if (!this.data.data() && !this.data.loading()) {
      this.data.load().subscribe();
    }
  }

  /** Total activities count (one row per activity). */
  readonly worksCount = computed(() => this.data.activities().length);

  /**
   * Unique locations: composite key `settlement.uk + ":" + institution.name.uk`.
   * - Same settlement with two different institutions = 2 locations.
   * - Same settlement, no institution, multiple activities = 1 location.
   * - Different settlements with same institution name (rare) = 2 locations.
   */
  readonly locationsCount = computed(() => {
    const set = new Set<string>();
    for (const a of this.data.activities()) {
      const settlement = a.location.settlement?.uk ?? '';
      const institution = a.location.institution?.name.uk ?? '';
      set.add(`${settlement}:${institution}`);
    }
    return set.size;
  });

  /** Unique regions by location.region.uk. Empty regions are excluded. */
  readonly regionsCount = computed(() => {
    const set = new Set<string>();
    for (const a of this.data.activities()) {
      const region = a.location.region?.uk;
      if (region) set.add(region);
    }
    return set.size;
  });

  /** Unique donor names. Activities without a donor are excluded. */
  readonly donorsCount = computed(() => {
    const set = new Set<string>();
    for (const a of this.data.activities()) {
      if (a.donor) set.add(a.donor);
    }
    return set.size;
  });

  /** Convenience accessor for all four metrics in a single object. */
  readonly allStats = computed(() => ({
    works: this.worksCount(),
    locations: this.locationsCount(),
    regions: this.regionsCount(),
    donors: this.donorsCount(),
  }));
}

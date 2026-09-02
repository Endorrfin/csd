import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPTY, Observable, catchError, tap } from 'rxjs';
import { Activity, ActivityMapData, TypeId } from '../activity-map.interfaces';

@Injectable({ providedIn: 'root' })
export class ActivityDataService {
  private readonly http = inject(HttpClient);

  private readonly _data = signal<ActivityMapData | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  readonly data = this._data.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  readonly activities = computed<Activity[]>(() => this._data()?.activities ?? []);
  readonly totalCount = computed(() => this.activities().length);

  /** Counts per typeId — used by sidebar in Step 5. */
  readonly countsByType = computed<Record<TypeId, number>>(() => {
    const counts = {} as Record<TypeId, number>;
    for (const a of this.activities()) {
      counts[a.typeId] = (counts[a.typeId] ?? 0) + 1;
    }
    return counts;
  });

  load(): Observable<ActivityMapData> {
    this._loading.set(true);
    this._error.set(null);
    return this.http.get<ActivityMapData>('/assets/data/activities.json').pipe(
      tap({
        next: (data) => {
          this._data.set(data);
          this._loading.set(false);
        },
        error: (err) => {
          this._error.set(err?.message ?? 'Failed to load activities');
          this._loading.set(false);
        },
      }),
      // the failure is already modelled as `error()` state. Letting it
      // ALSO reach subscribers made it an unhandled rejection - both call sites
      // (ImpactStatsService, ActivityMap) use a bare .subscribe() - which kills
      // the SSR process and turns every page into a 502. Complete instead.
      catchError(() => EMPTY),
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { RegionRaw } from '../interfaces/location.interfaces';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);

  /** Cached observable — loads JSON once, shares across subscribers */
  private readonly regions$: Observable<RegionRaw[]> = this.http
    .get<RegionRaw[]>('/assets/data/locations.json')
    .pipe(shareReplay(1));

  getRegions(): Observable<RegionRaw[]> {
    return this.regions$;
  }
}

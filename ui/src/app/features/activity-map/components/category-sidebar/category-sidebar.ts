import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  QueryList,
  ViewChildren,
  computed,
  effect,
  inject,
} from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  ActivityCategory,
  ActivityTypeMeta,
  CategoryId,
  Lang,
  LocalizedText,
  TypeId,
} from '../../activity-map.interfaces';
import { ActivityDataService } from '../../services/activity-data.service';
import {
  ActivityFilterService,
  SettlementGroup,
} from '../../services/activity-filter.service';

interface CategoryView {
  id: CategoryId;
  label: LocalizedText;
  emoji: string;
  totalCount: number;
  types: TypeView[];
}

interface TypeView {
  id: TypeId;
  meta: ActivityTypeMeta;
  count: number;
}

@Component({
  selector: 'app-category-sidebar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <aside class="sidebar" [class.sidebar--open]="filter.mobileDrawerOpen()">
      <header class="sidebar__header">
        <h2>{{ 'ACTIVITY_MAP.SIDEBAR.TITLE' | translate }}</h2>
        <button
          type="button"
          class="sidebar__close"
          (click)="filter.setMobileDrawerOpen(false)"
          [attr.aria-label]="'common.close' | translate"
        >
          ✕
        </button>
      </header>

      @for (cat of categoryViews(); track cat.id) {
        <section class="cat">
          <button
            type="button"
            class="cat__head"
            (click)="filter.toggleExpandedCategory(cat.id)"
            [attr.aria-expanded]="isCategoryExpanded(cat.id)"
          >
            <span
              class="cat__chevron"
              [class.cat__chevron--open]="isCategoryExpanded(cat.id)"
              aria-hidden="true"
              >▶</span
            >
            <span class="cat__emoji" aria-hidden="true">{{ cat.emoji }}</span>
            <span class="cat__title">{{ pick(cat.label) }}</span>
            <span class="cat__count">{{ cat.totalCount }}</span>
          </button>

          @if (isCategoryExpanded(cat.id)) {
            <ul class="types">
              @for (type of cat.types; track type.id) {
                <li class="type" [class.type--disabled]="!isTypeEnabled(type.id)">
                  <div class="type__row">
                    <input
                      type="checkbox"
                      class="type__check"
                      [id]="'chk-' + type.id"
                      [checked]="isTypeEnabled(type.id)"
                      (change)="filter.toggleType(type.id)"
                    />
                    <button
                      type="button"
                      class="type__body"
                      (click)="filter.toggleExpandedType(type.id)"
                      [attr.aria-expanded]="isTypeExpanded(type.id)"
                    >
                      <span
                        class="type__chevron"
                        [class.type__chevron--open]="isTypeExpanded(type.id)"
                        aria-hidden="true"
                        >▶</span
                      >
                      <img
                        class="type__icon"
                        [src]="'/assets/icons/activities/' + type.meta.icon"
                        [alt]="''"
                        aria-hidden="true"
                      />
                      <span class="type__label">{{ pick(type.meta.label) }}</span>
                      <span class="type__count">{{ type.count }}</span>
                    </button>
                  </div>

                  @if (isTypeExpanded(type.id)) {
                    <ul class="settlements">
                      @for (s of filter.settlementsForType(type.id); track s.key) {
                        <li
                          class="settlement"
                          [class.settlement--selected]="
                            filter.selectedSettlementKey() === s.key
                          "
                          [attr.data-settlement-key]="s.key"
                        >
                          <button
                            #settlementBtn
                            type="button"
                            class="settlement__btn"
                            (click)="onSettlementClick(s)"
                            [disabled]="s.lat === null"
                            [title]="
                              s.lat === null
                                ? ('ACTIVITY_MAP.SIDEBAR.NO_COORDS' | translate)
                                : ''
                            "
                          >
                            <span class="settlement__name">{{ pick(s.name) }}</span>
                            <span class="settlement__count">{{ s.count }}</span>
                          </button>
                        </li>
                      }
                    </ul>
                  }
                </li>
              }
            </ul>
          }
        </section>
      }
    </aside>

    @if (filter.mobileDrawerOpen()) {
      <div
        class="sidebar__overlay"
        (click)="filter.setMobileDrawerOpen(false)"
      ></div>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }

      .sidebar {
        width: 320px;
        flex-shrink: 0;
        background: #fff;
        border-right: 1px solid #e2e8f0;
        overflow-y: auto;
        padding: 1rem 0.5rem;
      }
      .sidebar__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 0.5rem 0.75rem;
      }
      .sidebar__header h2 {
        margin: 0;
        font-size: 1rem;
        color: #1a365d;
      }
      .sidebar__close {
        display: none;
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        color: #4a5568;
      }
      .sidebar__overlay {
        display: none;
      }

      .cat {
        margin-bottom: 0.25rem;
      }
      .cat__head {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        font-size: 0.95rem;
        font-weight: 600;
        color: #1a365d;
        border-radius: 6px;
      }
      .cat__head:hover {
        background: #edf2f7;
      }
      .cat__chevron {
        display: inline-block;
        transition: transform 0.2s;
        font-size: 0.7rem;
        width: 1em;
      }
      .cat__chevron--open {
        transform: rotate(90deg);
      }
      .cat__title {
        flex: 1;
      }
      .cat__count {
        background: #e2e8f0;
        color: #2d3748;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 0.125rem 0.5rem;
        border-radius: 999px;
      }

      .types {
        list-style: none;
        margin: 0 0 0.5rem;
        padding: 0;
      }
      .type {
        margin-bottom: 0.125rem;
      }
      .type--disabled .type__label,
      .type--disabled .type__count {
        opacity: 0.45;
      }
      .type__row {
        display: flex;
        align-items: stretch;
        gap: 0.25rem;
        padding-left: 0.75rem;
      }
      .type__check {
        margin: 0;
        align-self: center;
        cursor: pointer;
      }
      .type__body {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        font-size: 0.875rem;
        color: #2d3748;
        border-radius: 6px;
      }
      .type__body:hover {
        background: #edf2f7;
      }
      .type__chevron {
        display: inline-block;
        transition: transform 0.2s;
        font-size: 0.65rem;
        width: 0.9em;
        color: #718096;
      }
      .type__chevron--open {
        transform: rotate(90deg);
      }
      .type__icon {
        width: 20px;
        height: 20px;
        flex-shrink: 0;
        object-fit: contain;
      }
      .type__label {
        flex: 1;
      }
      .type__count {
        font-variant-numeric: tabular-nums;
        color: #718096;
        font-size: 0.8125rem;
      }

      .settlements {
        list-style: none;
        margin: 0.125rem 0 0.25rem;
        padding: 0 0 0 2.5rem;
        border-left: 2px solid #e2e8f0;
        margin-left: 1.25rem;
      }
      .settlement__btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.5rem;
        padding: 0.375rem 0.5rem;
        background: none;
        border: none;
        cursor: pointer;
        text-align: left;
        font-size: 0.8125rem;
        color: #4a5568;
        border-radius: 4px;
      }
      .settlement__btn:hover:not(:disabled) {
        background: #edf2f7;
        color: #1a365d;
      }
      .settlement__btn:disabled {
        cursor: not-allowed;
        color: #a0aec0;
      }
      .settlement--selected .settlement__btn {
        background: #bee3f8;
        color: #1a365d;
        font-weight: 500;
      }
      .settlement__count {
        font-variant-numeric: tabular-nums;
        font-size: 0.75rem;
        color: #718096;
      }

      @media (max-width: 1023px) {
        .sidebar {
          position: fixed;
          top: 64px;
          left: -100%;
          width: min(320px, 85vw);
          height: calc(100dvh - 64px);
          z-index: 1100;
          transition: left 0.3s ease;
          box-shadow: 2px 0 12px rgba(0, 0, 0, 0.08);
        }
        .sidebar--open {
          left: 0;
        }
        .sidebar__close {
          display: block;
        }
        .sidebar__overlay {
          display: block;
          position: fixed;
          inset: 64px 0 0 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1099;
        }
      }
    `,
  ],
})
export class CategorySidebarComponent implements AfterViewInit {
  readonly filter = inject(ActivityFilterService);
  private readonly dataService = inject(ActivityDataService);
  private readonly translate = inject(TranslateService);

  // CHANGED (Step 7): query all settlement buttons to enable auto-scroll on selection.
  @ViewChildren('settlementBtn')
  private settlementBtns!: QueryList<ElementRef<HTMLButtonElement>>;

  readonly categoryViews = computed<CategoryView[]>(() => {
    const data = this.dataService.data();
    if (!data) return [];

    const counts = this.dataService.countsByType();
    const emojiMap: Record<CategoryId, string> = {
      wash: '💧',
      recovery: '🏗️',
    };

    return data.categories.map<CategoryView>((cat: ActivityCategory) => {
      const types: TypeView[] = (
        Object.entries(data.types) as [TypeId, ActivityTypeMeta][]
      )
        .filter(([, meta]) => meta.categoryId === cat.id)
        .map<TypeView>(([id, meta]) => ({
          id,
          meta,
          count: counts[id] ?? 0,
        }))
        .filter((t) => t.count > 0);

      const totalCount = types.reduce((sum, t) => sum + t.count, 0);
      return {
        id: cat.id,
        label: cat.label,
        emoji: emojiMap[cat.id] ?? '',
        totalCount,
        types,
      };
    });
  });

  constructor() {
    // (Step 7): when selection changes (from map click), scroll the matching
    // settlement button into view. Deferred via setTimeout to wait for DOM after
    // category/type expand renders the new <li>.
    effect(() => {
      const key = this.filter.selectedSettlementKey();
      if (!key) return;
      setTimeout(() => this.scrollSelectedIntoView(key), 50);
    });
  }

  ngAfterViewInit(): void {
    // No-op — kept for ViewChildren initialization.
  }

  private scrollSelectedIntoView(_key: string): void {
    // Find the <li> with matching data-settlement-key and scroll its button into view.
    const host = (this.settlementBtns?.first?.nativeElement?.closest('aside.sidebar')
      ?? null) as HTMLElement | null;
    if (!host) return;
    const selected = host.querySelector<HTMLElement>('.settlement--selected .settlement__btn');
    if (!selected) return;
    selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  isCategoryExpanded(id: CategoryId): boolean {
    return this.filter.expandedCategories().has(id);
  }

  isTypeEnabled(id: TypeId): boolean {
    return this.filter.enabledTypes().has(id);
  }

  isTypeExpanded(id: TypeId): boolean {
    return this.filter.expandedTypes().has(id);
  }

  pick(text: LocalizedText | null | undefined): string {
    if (!text) return '';
    const lang = (this.translate.currentLang || 'ua') as Lang;
    const key: 'uk' | 'en' = lang === 'en' ? 'en' : 'uk';
    return text[key] ?? text.uk;
  }

  onSettlementClick(s: SettlementGroup): void {
    if (s.lat === null) return;
    this.filter.selectSettlement(s.key);
    if (this.filter.mobileDrawerOpen()) {
      this.filter.setMobileDrawerOpen(false);
    }
  }
}

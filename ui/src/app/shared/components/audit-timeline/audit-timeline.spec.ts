// === ADDED: spec 003 — unit tests for the status history component ===
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../environments/environment';
import { LanguageService } from '../../../core/services/language.service';
import { AuditEntry, AuditTimelineComponent } from './audit-timeline';

const ID = '3b0c1f0e-6f0a-4c36-9a53-0a7a3f7a9a11';
const URL_OF = (type: string, id = ID) => `${environment.apiUrl}/api/audit-log/${type}/${id}`;

const UA = {
  common: { loading: 'Завантаження...' },
  complaint: { status: { new: 'Нова', closed: 'Закрито' } },
  auditTimeline: {
    title: 'Історія змін',
    empty: 'Історія записується лише з моменту запуску цієї функції.',
    error: 'Не вдалося завантажити історію.',
    retry: 'Спробувати ще раз',
    actor: 'Користувач',
    publicSubmission: 'Публічне подання',
    notesChanged: 'Змінено примітки менеджера',
    notesAlsoChanged: 'Також змінено примітки менеджера',
    initialStatus: 'Початковий статус',
    statusAtDeletion: 'Статус на момент видалення',
    action: {
      created: 'Створено',
      status_changed: 'Зміна статусу',
      updated: 'Оновлено',
      deleted: 'Видалено',
    },
  },
};
const EN = {
  common: { loading: 'Loading...' },
  complaint: { status: { new: 'New', closed: 'Closed' } },
  auditTimeline: {
    title: 'History',
    empty: 'History is recorded only from the release of this feature.',
    error: 'Could not load the history.',
    retry: 'Try again',
    actor: 'User',
    publicSubmission: 'Public submission',
    notesChanged: 'Manager notes changed',
    notesAlsoChanged: 'Manager notes also changed',
    initialStatus: 'Initial status',
    statusAtDeletion: 'Status at deletion',
    action: {
      created: 'Created',
      status_changed: 'Status changed',
      updated: 'Updated',
      deleted: 'Deleted',
    },
  },
};

const entry = (over: Partial<AuditEntry>): AuditEntry => ({
  id: 'e1',
  action: 'status_changed',
  oldValue: 'new',
  newValue: 'closed',
  changedByEmail: 'manager@test.local',
  createdAt: '2026-10-16T10:00:00.000Z',
  details: null,
  ...over,
});

function setup(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTranslateService({ fallbackLang: 'ua' }),
      { provide: PLATFORM_ID, useValue: platform },
    ],
  });
  const translate = TestBed.inject(TranslateService);
  translate.setTranslation('ua', UA);
  translate.setTranslation('en', EN);
  translate.use('ua');

  const fixture = TestBed.createComponent(AuditTimelineComponent);
  fixture.componentRef.setInput('entityType', 'complaint');
  fixture.componentRef.setInput('entityId', ID);
  return { fixture, http: TestBed.inject(HttpTestingController) };
}

async function settle(fixture: ComponentFixture<AuditTimelineComponent>) {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

const text = (f: ComponentFixture<AuditTimelineComponent>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('AuditTimelineComponent', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('requests the history of exactly this record, once', async () => {
    const { fixture, http } = setup();
    await settle(fixture);

    const req = http.expectOne(URL_OF('complaint'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('shows a loading state while the request is in flight', async () => {
    const { fixture, http } = setup();
    await settle(fixture);

    expect(text(fixture)).toContain('Завантаження...');
    http.expectOne(URL_OF('complaint')).flush([]);
  });

  it('renders entries with the localised status labels used elsewhere in admin', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([entry({})]);
    await settle(fixture);

    const t = text(fixture);
    expect(t).toContain('Зміна статусу');
    expect(t).toContain('Нова');
    expect(t).toContain('Закрито');
    expect(t).toContain('manager@test.local');
  });

  it('follows the language switch', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([entry({})]);
    await settle(fixture);

    TestBed.inject(LanguageService).setLang('en');
    await settle(fixture);

    const t = text(fixture);
    expect(t).toContain('Status changed');
    expect(t).toContain('New');
    expect(t).toContain('Closed');
    expect(t).not.toContain('Зміна статусу');
  });

  it('falls back to the raw value for a status it has no label for', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([entry({ newValue: 'mystery_status' })]);
    await settle(fixture);

    expect(text(fixture)).toContain('mystery_status');
  });

  it('shows the empty state, which says history exists only from the release', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([]);
    await settle(fixture);

    expect(text(fixture)).toContain('лише з моменту запуску');
  });

  it('describes created / deleted / notes entries without any note text', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([
      entry({
        id: 'a',
        action: 'deleted',
        oldValue: null,
        newValue: null,
        details: { status: 'closed' },
      }),
      entry({
        id: 'b',
        action: 'updated',
        oldValue: null,
        newValue: null,
        details: { notesChanged: true },
      }),
      entry({
        id: 'c',
        action: 'created',
        oldValue: null,
        newValue: null,
        details: { status: 'new' },
      }),
      entry({ id: 'd', details: { notesChanged: true } }),
    ]);
    await settle(fixture);

    const t = text(fixture);
    expect(t).toContain('Статус на момент видалення: Закрито');
    expect(t).toContain('Початковий статус: Нова');
    expect(t).toContain('Змінено примітки менеджера');
    expect(t).toContain('Також змінено примітки менеджера');
  });

  it('labels an entry without an actor as a public submission', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([entry({ changedByEmail: null })]);
    await settle(fixture);

    expect(text(fixture)).toContain('Публічне подання');
  });

  it('renders values as text, never as HTML', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    http.expectOne(URL_OF('complaint')).flush([
      entry({
        changedByEmail: '<img src=x onerror=alert(1)>@evil.test',
        newValue: '<b>bold</b>',
      }),
    ]);
    await settle(fixture);

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('b')).toBeNull();
    expect(text(fixture)).toContain('<img src=x onerror=alert(1)>@evil.test');
  });

  describe('failure is contained to this section (AC23)', () => {
    it('shows an error with a retry, and a retry reloads', async () => {
      const { fixture, http } = setup();
      await settle(fixture);
      http
        .expectOne(URL_OF('complaint'))
        .flush('boom', { status: 500, statusText: 'Server Error' });
      await settle(fixture);

      expect(text(fixture)).toContain('Не вдалося завантажити історію.');
      const retry = (fixture.nativeElement as HTMLElement).querySelector(
        'button.audit__retry',
      ) as HTMLButtonElement;
      expect(retry).not.toBeNull();

      retry.click();
      await settle(fixture);
      http.expectOne(URL_OF('complaint')).flush([entry({})]);
      await settle(fixture);

      expect(text(fixture)).toContain('Зміна статусу');
      expect(text(fixture)).not.toContain('Не вдалося завантажити історію.');
    });

    it('does not throw into the host when the request fails', async () => {
      const { fixture, http } = setup();
      await settle(fixture);

      expect(() =>
        http.expectOne(URL_OF('complaint')).error(new ProgressEvent('error')),
      ).not.toThrow();
      await settle(fixture);
      expect(text(fixture)).toContain('Не вдалося завантажити історію.');
    });
  });

  it('cancels the previous request when the record changes, so a stale answer cannot win', async () => {
    const { fixture, http } = setup();
    await settle(fixture);
    const first = http.expectOne(URL_OF('complaint'));

    const other = '4c1d2a1f-7a1b-4d47-8b64-1b8b4f8bb222';
    fixture.componentRef.setInput('entityId', other);
    await settle(fixture);

    expect(first.cancelled).toBe(true);
    http.expectOne(URL_OF('complaint', other)).flush([entry({ id: 'new-record' })]);
    await settle(fixture);
    expect(text(fixture)).toContain('Зміна статусу');
  });

  it('makes no request during server-side rendering', async () => {
    const { fixture, http } = setup('server');
    await settle(fixture);

    http.expectNone(() => true);
  });
});

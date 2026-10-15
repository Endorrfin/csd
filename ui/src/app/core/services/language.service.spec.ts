import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LANG_STORAGE_KEY, LanguageService } from './language.service';

// CHANGED: covers persistence + <html lang> sync of LanguageService
describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideTranslateService({ fallbackLang: 'ua' })],
    });
    TestBed.inject(TranslateService).use('ua');
  });

  it('setLang switches the language and persists it', () => {
    const svc = TestBed.inject(LanguageService);
    svc.setLang('en');
    expect(svc.lang()).toBe('en');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('en');
    expect(svc.readSaved()).toBe('en');
  });

  it('readSaved ignores missing and invalid values', () => {
    const svc = TestBed.inject(LanguageService);
    expect(svc.readSaved()).toBeNull();
    localStorage.setItem(LANG_STORAGE_KEY, 'fr');
    expect(svc.readSaved()).toBeNull();
  });

  it('keeps <html lang> in step with the active language', () => {
    const svc = TestBed.inject(LanguageService);
    TestBed.tick();
    expect(document.documentElement.getAttribute('lang')).toBe('uk');
    svc.setLang('en');
    TestBed.tick();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});

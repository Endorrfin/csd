import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { environment } from '../../../environments/environment';
import { InquiryFormComponent } from './inquiry-form';

const ENDPOINT = `${environment.apiUrl}/api/inquiries`;

// Full control set the FormGroup expects (setValue requires every key)
interface FormValue {
  reason: string;
  reasonOther: string;
  name: string;
  email: string;
  phone: string;
  messengerType: string;
  messengerHandle: string;
  preferredLang: string;
  message: string;
  consent: boolean;
}

interface ExposedCmp {
  form: {
    setValue: (v: FormValue) => void;
    get: (name: string) => { value: unknown } | null;
  };
  submit: () => void;
  submitted: () => boolean;
  onEmailBlur: () => void;
}

const base: FormValue = {
  reason: '',
  reasonOther: '',
  name: '',
  email: '',
  phone: '',
  messengerType: '',
  messengerHandle: '',
  preferredLang: 'ua',
  message: '',
  consent: false,
};

describe('InquiryFormComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InquiryFormComponent],
      providers: [
        provideHttpClient(withFetch()),
        provideHttpClientTesting(),
        provideTranslateService({ fallbackLang: 'ua' }),
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should create', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not submit while the form is invalid', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    (fixture.componentInstance as unknown as ExposedCmp).submit();
    httpMock.expectNone(ENDPOINT);
  });

  it('does not submit when no contact method is provided', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    const cmp = fixture.componentInstance as unknown as ExposedCmp;

    cmp.form.setValue({
      ...base,
      reason: 'general',
      message: 'Hello',
      // no email / phone / messenger → atLeastOneContact fails
    });
    cmp.submit();

    httpMock.expectNone(ENDPOINT);
  });

  it('posts a trimmed payload via email and reports success', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    const cmp = fixture.componentInstance as unknown as ExposedCmp;

    cmp.form.setValue({
      ...base,
      reason: 'general',
      name: '  Olha  ',
      // Validators.email rejects surrounding whitespace, so email is kept clean;
      // name/message still exercise the trim in the payload builder.
      email: 'olha@example.com',
      phone: '0501234567',
      preferredLang: 'ua',
      message: '  Hello there  ',
      consent: true,
    });
    cmp.submit();

    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      reason: 'general',
      name: 'Olha',
      email: 'olha@example.com',
      phone: '+380501234567',
      preferredLang: 'ua',
      message: 'Hello there',
      consent: true,
    });

    req.flush({ id: 'uuid-1' });
    expect(cmp.submitted()).toBe(true);
  });

  it('trims a pasted email on blur so it passes validation and submits', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    const cmp = fixture.componentInstance as unknown as ExposedCmp;

    cmp.form.setValue({
      ...base,
      reason: 'general',
      email: '  olha@example.com  ',
      preferredLang: 'ua',
      message: 'Hello',
    });
    cmp.onEmailBlur();
    expect(cmp.form.get('email')?.value).toBe('olha@example.com');

    cmp.submit();
    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.body).toEqual({
      reason: 'general',
      email: 'olha@example.com',
      preferredLang: 'ua',
      message: 'Hello',
      consent: false,
    });
    req.flush({ id: 'uuid-3' });
  });

  it('accepts a messenger-only contact and includes reasonOther for "other"', () => {
    const fixture = TestBed.createComponent(InquiryFormComponent);
    const cmp = fixture.componentInstance as unknown as ExposedCmp;

    cmp.form.setValue({
      ...base,
      reason: 'other',
      reasonOther: 'Research collaboration',
      messengerType: 'telegram',
      messengerHandle: '@olha',
      preferredLang: 'en',
      message: 'Hi',
      consent: false,
    });
    cmp.submit();

    const req = httpMock.expectOne(ENDPOINT);
    expect(req.request.body).toEqual({
      reason: 'other',
      reasonOther: 'Research collaboration',
      messengerType: 'telegram',
      messengerHandle: '@olha',
      preferredLang: 'en',
      message: 'Hi',
      consent: false,
    });
    req.flush({ id: 'uuid-2' });
  });
});

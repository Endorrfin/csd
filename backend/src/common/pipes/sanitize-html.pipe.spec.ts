// backend/src/common/pipes/sanitize-html.pipe.spec.ts
// regression tests for SanitizeHtmlPipe (audit P0-2).
// The <xmp> case is the critical advisory in sanitize-html <=2.17.3: content of
// disallowed raw-text tags leaked into the output unescaped (parser differential),
// bypassing the allowlist → stored XSS. Fixed in sanitize-html 2.17.5.
import { SanitizeHtmlPipe } from './sanitize-html.pipe';

describe('SanitizeHtmlPipe', () => {
  let pipe: SanitizeHtmlPipe;

  beforeEach(() => {
    pipe = new SanitizeHtmlPipe();
  });

  /** Run a single HTML string through one of the pipe's guarded DTO fields. */
  const sanitize = (html: string): string => {
    const result = pipe.transform({ descriptionUa: html }) as {
      descriptionUa: string;
    };
    return result.descriptionUa;
  };

  it('keeps allowed Quill formatting', () => {
    expect(sanitize('<p>Привіт <strong>світ</strong></p>')).toBe(
      '<p>Привіт <strong>світ</strong></p>',
    );
  });

  it('strips <script> entirely', () => {
    expect(sanitize('<p>a</p><script>alert(1)</script>')).toBe('<p>a</p>');
  });

  it('drops <xmp> raw-text passthrough payload (regression, sanitize-html >=2.17.5)', () => {
    expect(sanitize('<p>ok</p><xmp><img src=x onerror=alert(1)></xmp>')).toBe(
      '<p>ok</p>',
    );
    expect(sanitize('<xmp><script>alert(1)</script></xmp>')).toBe('');
  });

  it('forces safe rel/target on links and strips javascript: hrefs', () => {
    expect(sanitize('<a href="https://x.org">x</a>')).toBe(
      '<a href="https://x.org" rel="noopener noreferrer" target="_blank">x</a>',
    );
    expect(sanitize('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a rel="noopener noreferrer" target="_blank">x</a>',
    );
  });

  it('leaves fields outside HTML_FIELDS and non-object values untouched', () => {
    expect(pipe.transform({ titleUa: '<script>x</script>' })).toEqual({
      titleUa: '<script>x</script>',
    });
    expect(pipe.transform('plain')).toBe('plain');
    expect(pipe.transform(null)).toBeNull();
  });
});

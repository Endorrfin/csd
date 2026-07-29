import { Injectable, PipeTransform } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitizes HTML coming from rich-text editors (Quill) before persistence.
 *
 * Defence in depth: the frontend already sanitizes via Angular's DomSanitizer,
 * but a compromised manager account (or a direct API call) could still POST
 * arbitrary HTML. This pipe enforces the same allow-list on the server boundary.
 *
 * Implementation note: uses `sanitize-html` (pure Node, no jsdom) — works on
 * AWS Lambda out of the box. The previous attempt with `isomorphic-dompurify`
 * pulled jsdom → @exodus/bytes (ESM), which crashed Lambda cold-start with
 * ERR_REQUIRE_ESM.
 *
 * CHANGED: `sanitize-html` is PINNED to an exact 2.17.5 in package.json — do
 * not float it. 2.17.6 bumped htmlparser2 ^10 -> ^12, which is ESM-only, and
 * AWS's managed nodejs22.x runtime is built WITHOUT require(esm) support (it
 * cannot be re-enabled via NODE_OPTIONS). That took production down with
 * ERR_REQUIRE_ESM at cold start — 502 on every route, exactly like the earlier
 * isomorphic-dompurify attempt. Plain Node 22.12+ hides the bug locally and in
 * CI, so `npm run check:cjs` runs with --no-experimental-require-module.
 * The jest configs additionally carry a `transformIgnorePatterns` exception
 * plus tsconfig.spec.json; do NOT drop those without re-checking cold start.
 *
 * Keep `allowedTags` in sync with `ui/src/app/shared/config/quill.config.ts`.
 */
@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  private static readonly OPTIONS: sanitizeHtml.IOptions = {
    allowedTags: [
      'p',
      'br',
      'span',
      'strong',
      'b',
      'em',
      'i',
      'u',
      'ol',
      'ul',
      'li',
      'h1',
      'h2',
      'h3',
      'a',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      li: ['data-list'], // Quill v2 list marker
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    // Force safe link attributes on every <a>
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer',
        target: '_blank',
      }),
    },
  };

  /**
   * Fields across DTOs that carry HTML and need sanitization.
   * Any field name listed here is scrubbed if present on the incoming DTO.
   */
  private static readonly HTML_FIELDS = [
    'shortDescriptionUa',
    'shortDescriptionEn',
    'detailedDescriptionUa',
    'detailedDescriptionEn',
    'descriptionUa',
    'descriptionEn',
    'requirementsUa',
    'requirementsEn',
  ];

  transform(value: unknown): unknown {
    if (!value || typeof value !== 'object') {
      return value;
    }

    const dto = value as Record<string, unknown>;

    for (const key of SanitizeHtmlPipe.HTML_FIELDS) {
      const v = dto[key];
      if (typeof v === 'string' && v.length > 0) {
        dto[key] = sanitizeHtml(v, SanitizeHtmlPipe.OPTIONS);
      }
    }

    return dto;
  }
}

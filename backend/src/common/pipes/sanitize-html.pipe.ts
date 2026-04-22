import { Injectable, PipeTransform } from '@nestjs/common';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML coming from rich-text editors (Quill) before persistence.
 *
 * Defence in depth: frontend already sanitizes via Angular's DomSanitizer,
 * but a compromised manager account could still POST arbitrary HTML.
 * This pipe enforces the same allow-list on the server boundary.
 *
 * Keep the ALLOWED_TAGS list in sync with `ui/src/app/shared/config/quill.config.ts`.
 */
@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  private static readonly CONFIG = {
    ALLOWED_TAGS: [
      'p', 'br', 'span',
      'strong', 'b', 'em', 'i', 'u',
      'ol', 'ul', 'li',
      'h1', 'h2', 'h3',
      'a',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'data-list'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  };

  /**
   * The list of fields (across all DTOs) that should be sanitized.
   * Any field listed here with a string value will be cleaned in-place.
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
        dto[key] = DOMPurify.sanitize(v, SanitizeHtmlPipe.CONFIG);
      }
    }

    return dto;
  }
}

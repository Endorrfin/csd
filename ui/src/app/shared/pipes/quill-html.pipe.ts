// path: ui/src/app/shared/pipes/quill-html.pipe.ts
import { inject, PLATFORM_ID, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';

@Pipe({ name: 'quillHtml', standalone: true, pure: true })
export class QuillHtmlPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);

  transform(html: string | null | undefined): SafeHtml {
    if (!html) return '';

    const clean = isPlatformBrowser(this.platformId)
      ? this.normalizeBrowser(html)
      : this.normalizeSsr(html);

    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }

  private normalizeBrowser(html: string): string {
    const root = document.createElement('div');
    root.innerHTML = html;

    // replace &nbsp; (U+00A0) with regular spaces in all text nodes.
    // Quill v2 serializes every space as &nbsp; — without this, "word&nbsp;word"
    // is one unbreakable token, forcing overflow-wrap: break-word to split
    // mid-character instead of at the word boundary.
    this.normalizeNbsp(root);

    root.querySelectorAll('ol, ul').forEach((list) => {
      this.normalizeList(list as HTMLElement);
    });

    return root.innerHTML;
  }

  // Walk all text nodes and replace non-breaking spaces with regular spaces.
  private normalizeNbsp(root: HTMLElement): void {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    // eslint-disable-next-line no-cond-assign
    while ((node = walker.nextNode() as Text | null)) {
      if (node.nodeValue?.includes('\u00A0')) {
        node.nodeValue = node.nodeValue.replace(/\u00A0/g, ' ');
      }
    }
  }

  private normalizeList(list: HTMLElement): void {
    const items = Array.from(list.children) as HTMLElement[];
    const hasQuillItems = items.some((el) => el.hasAttribute('data-list'));
    if (!hasQuillItems) return;

    const fragment = document.createDocumentFragment();
    let currentContainer: HTMLElement | null = null;
    let currentTag: string | null = null;

    for (const item of items) {
      const listType = item.getAttribute('data-list') ?? 'bullet';
      const targetTag = listType === 'ordered' ? 'ol' : 'ul';

      if (targetTag !== currentTag) {
        currentContainer = document.createElement(targetTag);
        currentTag = targetTag;
        fragment.appendChild(currentContainer);
      }

      const li = document.createElement('li');
      li.innerHTML = item.innerHTML;
      currentContainer!.appendChild(li);
    }

    list.replaceWith(fragment);
  }

  private normalizeSsr(html: string): string {
    return html
      .replace(/&nbsp;/g, ' ')  // [ADDED] same fix for SSR path
      .replace(/<li data-list="bullet">/g, '<li>')
      .replace(/<li data-list="ordered">/g, '<li>');
  }
}

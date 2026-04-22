import type { QuillModules } from 'ngx-quill';
/**
 * Shared Quill editor configuration.
 *
 * Keep in sync with backend SanitizeHtmlPipe allow-list — any tag produced by
 * the toolbar below must also pass the server-side DOMPurify filter.
 */
export const QUILL_MODULES: QuillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ header: [1, 2, 3, false] }],
    ['link'],
    ['clean'],
  ],
};

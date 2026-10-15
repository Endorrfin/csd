import { formatCompletedAt } from './activity-map.service';

// CHANGED: popup date formatting
describe('formatCompletedAt', () => {
  it('formats YYYY-MM in both languages', () => {
    expect(formatCompletedAt('2024-06', 'uk')).toBe('червень 2024');
    expect(formatCompletedAt('2024-06', 'en')).toBe('June 2024');
  });

  it('returns anything that is not YYYY-MM unchanged', () => {
    expect(formatCompletedAt('2024-13', 'en')).toBe('2024-13');
    expect(formatCompletedAt('Q2 2024', 'uk')).toBe('Q2 2024');
    expect(formatCompletedAt('2024-06-15', 'en')).toBe('2024-06-15');
  });
});

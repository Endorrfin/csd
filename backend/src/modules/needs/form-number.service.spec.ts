// === ADDED: PR-1 tracking-number generator spec ===
import { EntityManager } from 'typeorm';
import { FormNumberService } from './form-number.service';

describe('FormNumberService', () => {
  const service = new FormNumberService();
  const year = new Date().getFullYear();

  const managerWith = (updateResult: unknown): EntityManager =>
    ({
      query: jest
        .fn()
        // 1st call: INSERT … ON CONFLICT DO NOTHING
        .mockResolvedValueOnce([])
        // 2nd call: UPDATE … RETURNING
        .mockResolvedValueOnce(updateResult),
    }) as unknown as EntityManager;

  it('formats CSD-<prefix>-<year>-<%04d> from the returned counter', async () => {
    // pg driver shape: [rows, rowCount]
    const manager = managerWith([[{ lastValue: 42 }], 1]);
    await expect(
      service.nextTrackingNumber(manager, 'recovery', 'R'),
    ).resolves.toBe(`CSD-R-${year}-0042`);
  });

  it('pads small counters to 4 digits and supports the flat-array driver shape', async () => {
    const manager = managerWith([{ lastValue: '7' }]);
    await expect(
      service.nextTrackingNumber(manager, 'recovery', 'R'),
    ).resolves.toBe(`CSD-R-${year}-0007`);
  });

  it('does not pad counters beyond 4 digits', async () => {
    const manager = managerWith([[{ lastValue: 12345 }], 1]);
    await expect(
      service.nextTrackingNumber(manager, 'winterization', 'W'),
    ).resolves.toBe(`CSD-W-${year}-12345`);
  });

  it('ensures the sequence row exists before incrementing (INSERT then UPDATE)', async () => {
    const manager = managerWith([[{ lastValue: 1 }], 1]);
    await service.nextTrackingNumber(manager, 'recovery', 'R');

    const calls = (manager.query as jest.Mock).mock.calls as [
      string,
      unknown[],
    ][];
    expect(calls).toHaveLength(2);
    expect(calls[0][0]).toContain('INSERT INTO "form_number_sequences"');
    expect(calls[0][0]).toContain('ON CONFLICT');
    expect(calls[1][0]).toContain('UPDATE "form_number_sequences"');
    expect(calls[1][0]).toContain('RETURNING');
    expect(calls[0][1]).toEqual(['recovery', year]);
  });
});

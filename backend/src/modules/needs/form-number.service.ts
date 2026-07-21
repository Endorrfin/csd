// === ADDED: PR-1 shared tracking-number generator (CSD-R-2026-0042) ===
import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Per-(formType, year) counter backed by form_number_sequences.
 *
 * Concurrency: the caller passes the EntityManager of an OPEN transaction.
 * `INSERT … ON CONFLICT DO NOTHING` guarantees the row exists, then
 * `UPDATE … RETURNING` takes a row-level lock — two parallel Lambda
 * invocations serialize on that lock and can never mint the same number.
 * Numbers are gap-free within a year unless the enclosing tx rolls back.
 */
@Injectable()
export class FormNumberService {
  async nextTrackingNumber(
    manager: EntityManager,
    formType: string,
    prefixLetter: string,
  ): Promise<string> {
    const year = new Date().getFullYear();

    await manager.query(
      `INSERT INTO "form_number_sequences" ("formType", "year", "lastValue")
       VALUES ($1, $2, 0)
       ON CONFLICT ("formType", "year") DO NOTHING`,
      [formType, year],
    );

    // pg driver returns [rows, rowCount] for UPDATE…RETURNING via query();
    // normalize both shapes defensively (typed via the query<T> generic —
    // an `as` assertion here gets auto-stripped by the type-checked lint fix).
    type CounterRow = { lastValue: number | string };
    const rows = await manager.query<Array<CounterRow | CounterRow[]>>(
      `UPDATE "form_number_sequences"
       SET "lastValue" = "lastValue" + 1
       WHERE "formType" = $1 AND "year" = $2
       RETURNING "lastValue"`,
      [formType, year],
    );

    const head = rows[0];
    const first: CounterRow = Array.isArray(head) ? head[0] : head;
    const lastValue = Number(first.lastValue);

    return `CSD-${prefixLetter}-${year}-${String(lastValue).padStart(4, '0')}`;
  }
}

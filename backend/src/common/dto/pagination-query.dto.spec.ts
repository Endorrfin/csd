import 'reflect-metadata'; // decorators need it; loaded globally by Nest in prod, not in isolated specs
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

const toDto = (obj: object): PaginationQueryDto =>
  plainToInstance(PaginationQueryDto, obj);
const errorProps = (obj: object): string[] =>
  validateSync(toDto(obj)).map((e) => e.property);

describe('PaginationQueryDto validation', () => {
  it('applies defaults (page=1, limit=20, sort=desc) when nothing is provided', () => {
    const dto = toDto({});
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.sort).toBe('desc');
    expect(errorProps({})).toEqual([]);
  });

  it('coerces numeric strings and accepts a valid sort', () => {
    const dto = toDto({ page: '2', limit: '50', sort: 'asc' });
    expect(dto.page).toBe(2); // @Type(() => Number) coercion
    expect(dto.limit).toBe(50);
    expect(dto.sort).toBe('asc');
    expect(errorProps({ page: '2', limit: '50', sort: 'asc' })).toEqual([]);
  });

  it('rejects an unknown sort value', () => {
    expect(errorProps({ sort: 'sideways' })).toContain('sort');
  });

  it('rejects limit greater than 100', () => {
    expect(errorProps({ limit: '999' })).toContain('limit');
  });

  it('rejects page below 1', () => {
    expect(errorProps({ page: '0' })).toContain('page');
  });
});

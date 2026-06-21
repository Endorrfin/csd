import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { TestimonialService } from './testimonial.service';
import { Testimonial } from './entities/testimonial.entity';
import { AdminTestimonialQueryDto } from './dto/admin-query.dto';

// Chainable QueryBuilder stub — only the methods findAllForAdmin calls
const qbMock = () => ({
  orderBy: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[{ id: 't1' }], 1]),
});

const repoMock = () => ({
  createQueryBuilder: jest.fn(),
});

// Build the input through the real DTO so default coercion (1/20/desc) is exercised
const buildQuery = (obj: object): AdminTestimonialQueryDto =>
  plainToInstance(AdminTestimonialQueryDto, obj);

describe('TestimonialService.findAllForAdmin', () => {
  let service: TestimonialService;
  let repo: ReturnType<typeof repoMock>;
  let qb: ReturnType<typeof qbMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestimonialService,
        { provide: getRepositoryToken(Testimonial), useFactory: repoMock },
      ],
    }).compile();

    service = module.get(TestimonialService);
    repo = module.get(getRepositoryToken(Testimonial));
    qb = qbMock();
    repo.createQueryBuilder.mockReturnValue(qb);
  });

  it('uses defaults (page=1, limit=20, sort=desc) and keeps the response shape', async () => {
    const result = await service.findAllForAdmin(buildQuery({}));

    expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'DESC');
    expect(qb.skip).toHaveBeenCalledWith(0);
    expect(qb.take).toHaveBeenCalledWith(20);
    expect(result).toEqual({
      data: [{ id: 't1' }],
      total: 1,
      page: 1,
      limit: 20,
    });
  });

  it('flips ordering to ASC when sort=asc', async () => {
    await service.findAllForAdmin(buildQuery({ sort: 'asc' }));

    expect(qb.orderBy).toHaveBeenCalledWith('t.createdAt', 'ASC');
  });

  it('computes skip/take from page and limit', async () => {
    await service.findAllForAdmin(buildQuery({ page: 2, limit: 5 }));

    expect(qb.skip).toHaveBeenCalledWith(5);
    expect(qb.take).toHaveBeenCalledWith(5);
  });

  // Invalid sort / limit>100 are rejected at the DTO layer (see
  // common/dto/pagination-query.dto.spec.ts) and turned into HTTP 400 by the
  // global ValidationPipe — findAllForAdmin only ever receives a validated DTO.
});

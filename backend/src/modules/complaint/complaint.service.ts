import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './entities/complaint.entity';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly repo: Repository<Complaint>,
  ) {}

  // Manager+: all complaints
  findAll(): Promise<Complaint[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Complaint> {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Complaint ${id} not found`);
    return record;
  }

  async create(dto: CreateComplaintDto): Promise<Complaint> {
    const entity = this.repo.create({
      ...dto,
      // Historical date or current timestamp
      submittedAt: dto.submittedAt ? new Date(dto.submittedAt) : new Date(),
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateComplaintDto): Promise<Complaint> {
    await this.findById(id);
    await this.repo.update(id, dto);
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.repo.delete(id);
  }
}

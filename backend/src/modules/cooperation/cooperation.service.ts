import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cooperation, CooperationType } from './entities/cooperation.entity';
import { CreateCooperationDto } from './dto/create-cooperation.dto';
import { UpdateCooperationDto } from './dto/update-cooperation.dto';

@Injectable()
export class CooperationService {
  constructor(
    @InjectRepository(Cooperation)
    private readonly cooperationRepository: Repository<Cooperation>,
  ) {}

  // Filter by type (vacancy/tender/initiative)
  findPublishedByType(type: CooperationType): Promise<Cooperation[]> {
    return this.cooperationRepository.find({
      where: { type, isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAllPublished(): Promise<Cooperation[]> {
    return this.cooperationRepository.find({
      where: { isPublished: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Cooperation> {
    const item = await this.cooperationRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Cooperation item not found');
    }
    return item;
  }

  create(dto: CreateCooperationDto): Promise<Cooperation> {
    const item = this.cooperationRepository.create(dto);
    return this.cooperationRepository.save(item);
  }

  async update(id: string, dto: UpdateCooperationDto): Promise<Cooperation> {
    const item = await this.findById(id);
    Object.assign(item, dto);
    return this.cooperationRepository.save(item);
  }

  async remove(id: string): Promise<void> {
    const item = await this.findById(id);
    await this.cooperationRepository.remove(item);
  }
}

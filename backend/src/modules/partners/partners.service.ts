import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepository: Repository<Partner>,
  ) {}

  findAllActive(): Promise<Partner[]> {
    return this.partnerRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC' },
    });
  }

  findAll(): Promise<Partner[]> {
    return this.partnerRepository.find({ order: { sortOrder: 'ASC' } });
  }

  async findById(id: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({ where: { id } });
    if (!partner) {
      throw new NotFoundException(`Partner not found`);
    }
    return partner;
  }

  create(dto: CreatePartnerDto): Promise<Partner> {
    const partner = this.partnerRepository.create(dto);
    return this.partnerRepository.save(partner);
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findById(id);
    Object.assign(partner, dto);
    return this.partnerRepository.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.findById(id);
    await this.partnerRepository.remove(partner);
  }
}

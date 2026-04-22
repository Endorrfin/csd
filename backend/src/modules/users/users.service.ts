// backend/src/modules/users/users.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const user = this.usersRepo.create(data);
    return this.usersRepo.save(user);
  }

  // ── Password reset methods ──

  async setResetToken(
    userId: string,
    resetToken: string,
    resetTokenExpiry: Date,
  ): Promise<void> {
    await this.usersRepo.update(userId, { resetToken, resetTokenExpiry });
  }

  async findByResetToken(token: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect([
        'user.resetToken',
        'user.resetTokenExpiry',
        'user.passwordHash',
      ])
      .where('user.resetToken = :token', { token })
      .getOne();
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    });
  }

  // ── User management (added) ──

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async updateRole(userId: string, role: UserRole): Promise<User> {
    await this.usersRepo.update(userId, { role });
    return this.usersRepo.findOneOrFail({ where: { id: userId } });
  }
}

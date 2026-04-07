// backend/src/modules/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { User } from '../users/entities/user.entity';

/** Reset token validity period */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    return this.generateToken(user);
  }

  async login(user: User): Promise<{ accessToken: string }> {
    return this.generateToken(user);
  }

  // ── Password reset ──

  /**
   * Generate a reset token and log it (dev) or send email (prod).
   * Always returns the same message to prevent email enumeration.
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.usersService.setResetToken(user.id, resetToken, resetTokenExpiry);

      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:4200');
      const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

      // TODO: Replace with EmailService when SMTP is configured
      this.logger.log(`\n🔑 Password reset link for ${email}:\n${resetLink}\n`);
    }

    // Same response whether user exists or not (prevents email enumeration)
    return { message: 'If the email exists, a reset link has been sent.' };
  }

  /**
   * Validate token and set new password.
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken(token);

    if (!user || !user.resetTokenExpiry) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.resetTokenExpiry < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, passwordHash);

    return { message: 'Password has been reset successfully.' };
  }

  private generateToken(user: User): { accessToken: string } {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return { accessToken: this.jwtService.sign(payload) };
  }
}

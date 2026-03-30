import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string; user: AuthUser }> {
    const user = await this.validateUser(dto.email, dto.password);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: this.resolveCompanyId(user),
      branchId: user.branchId || null,
      taskPermissions: user.taskPermissions || [],
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.toAuthUser(user),
    };
  }

  async me(userId: string): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: ['branch'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  async uploadMyPhoto(
    userId: string,
    file?: { buffer?: Buffer; originalname?: string; mimetype?: string },
    request?: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> },
  ): Promise<AuthUser> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Image file is required');
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true }, relations: ['branch'] });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const ext = this.resolveImageExtension(file.originalname || '', mime);
    const fileName = `${Date.now()}-${randomUUID()}${ext}`;
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const relativeDir = `user-profiles/${year}/${month}`;
    const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
    const uploadDir = join(uploadsRoot, relativeDir);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, fileName), file.buffer);

    user.photoUrl = this.buildPublicAssetUrl(request, `/uploads/${relativeDir}/${fileName}`);
    await this.userRepo.save(user);
    return this.toAuthUser(user);
  }

  private async validateUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail, isActive: true },
      relations: ['branch'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let passwordMatches = false;
    try {
      passwordMatches = await bcrypt.compare(password, user.passwordHash);
    } catch {
      passwordMatches = false;
    }

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: this.resolveCompanyId(user),
      branchId: user.branchId || null,
      photoUrl: user.photoUrl || null,
      taskPermissions: user.taskPermissions || [],
    };
  }

  private resolveCompanyId(user: User): string | null {
    return user.companyId || user.branch?.companyId || null;
  }

  private resolveImageExtension(originalName: string, mimeType: string): string {
    const byName = extname((originalName || '').trim().toLowerCase());
    if (byName && ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(byName)) {
      return byName;
    }
    if (mimeType.includes('png')) return '.png';
    if (mimeType.includes('webp')) return '.webp';
    if (mimeType.includes('gif')) return '.gif';
    return '.jpg';
  }

  private buildPublicAssetUrl(
    request: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> } | undefined,
    relativePath: string,
  ): string {
    const normalizedRelative = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const envBase = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
    if (envBase) {
      const normalizedBase = envBase.endsWith('/api') ? envBase.slice(0, -4) : envBase;
      return `${normalizedBase}${normalizedRelative}`;
    }
    if (!request) {
      return normalizedRelative;
    }
    const forwardedProto = request.headers?.['x-forwarded-proto'];
    const protocol = request.protocol || (typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : '') || 'http';
    const host = request.get?.('host') || '';
    if (!host) {
      return normalizedRelative;
    }
    return `${protocol}://${host}${normalizedRelative}`;
  }
}

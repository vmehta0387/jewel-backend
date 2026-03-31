import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';

@Injectable()
export class AuthService {
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;

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
      user: await this.toAuthUser(user),
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
    const day = String(now.getDate()).padStart(2, '0');
    const relativeDir = `user-profiles/${year}/${month}/${day}`;

    const s3Config = this.getS3Client();
    if (s3Config) {
      const { client, bucket } = s3Config;
      const key = `${relativeDir}/${fileName}`;
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: mime || 'image/jpeg',
        }),
      );
      user.photoUrl = `s3://${bucket}/${key}`;
    } else {
      const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
      const uploadDir = join(uploadsRoot, relativeDir);
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, fileName), file.buffer);
      user.photoUrl = this.buildPublicAssetUrl(request, `/uploads/${relativeDir}/${fileName}`);
    }

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

  private async toAuthUser(user: User): Promise<AuthUser> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: this.resolveCompanyId(user),
      branchId: user.branchId || null,
      photoUrl: await this.resolvePhotoUrl(user.photoUrl || null),
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

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private getS3Config(): {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  } | null {
    const bucket = this.optionalText(process.env.AWS_S3_BUCKET);
    const region = this.optionalText(process.env.AWS_REGION);
    const accessKeyId = this.optionalText(process.env.AWS_ACCESS_KEY_ID) || this.optionalText(process.env.AWS_ACCESS_KEY);
    const secretAccessKey =
      this.optionalText(process.env.AWS_SECRET_ACCESS_KEY) || this.optionalText(process.env.AWS_SECRET_KEY);

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return { bucket, region, accessKeyId, secretAccessKey };
  }

  private getS3Client(): { client: S3Client; bucket: string } | null {
    const config = this.getS3Config();
    if (!config) {
      return null;
    }

    if (!this.s3Client) {
      const endpoint = this.optionalText(process.env.AWS_S3_ENDPOINT);
      this.s3Client = new S3Client({
        region: config.region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }

    return { client: this.s3Client, bucket: config.bucket };
  }

  private getSignedUrlExpiresIn(): number {
    const raw = this.optionalText(process.env.AWS_S3_SIGNED_URL_EXPIRES);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return 21600;
  }

  private getSignedUrlCacheKey(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  private getCachedSignedUrl(bucket: string, key: string): string | null {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    const cached = this.signedUrlCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() >= cached.expiresAt - this.signedUrlCacheSkewMs) {
      this.signedUrlCache.delete(cacheKey);
      return null;
    }
    return cached.url;
  }

  private setCachedSignedUrl(bucket: string, key: string, url: string, expiresInSeconds: number): void {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    this.signedUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });
    if (this.signedUrlCache.size > 2000) {
      const now = Date.now();
      for (const [entryKey, entry] of this.signedUrlCache.entries()) {
        if (entry.expiresAt <= now || this.signedUrlCache.size > 1600) {
          this.signedUrlCache.delete(entryKey);
        }
      }
    }
  }

  private parseS3KeyFromUrl(value: string, bucket: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('s3://')) {
      const withoutScheme = trimmed.slice(5);
      const [bucketName, ...rest] = withoutScheme.split('/');
      if (!bucketName || rest.length === 0) return null;
      if (bucketName !== bucket) return null;
      return rest.join('/');
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const host = parsedUrl.hostname;
    const path = parsedUrl.pathname.replace(/^\/+/, '');

    if (host.startsWith(`${bucket}.s3`)) {
      return path || null;
    }

    if (host.startsWith('s3') && path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1) || null;
    }

    return null;
  }

  private async resolvePhotoUrl(value: string | null): Promise<string | null> {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const s3Config = this.getS3Client();
    if (!s3Config) {
      return trimmed;
    }

    const { client, bucket } = s3Config;
    const key = this.parseS3KeyFromUrl(trimmed, bucket);
    if (!key) {
      return trimmed;
    }

    const cached = this.getCachedSignedUrl(bucket, key);
    if (cached) {
      return cached;
    }
    const expiresIn = this.getSignedUrlExpiresIn();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn });
    this.setCachedSignedUrl(bucket, key, url, expiresIn);
    return url;
  }
}

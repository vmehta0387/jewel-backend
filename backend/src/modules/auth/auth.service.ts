import { BadRequestException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
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
import { UserPermissionAction } from '../permissions/entities/user-permission-action.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { HelpRequest } from './entities/help-request.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { LoginClientPlatform, LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { HelpRequestDto } from './dto/help-request.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthUser, JwtPayload } from './interfaces/auth-user.interface';
import { getLegacySpiffPermissions } from './legacy-spiff-permissions';

@Injectable()
export class AuthService implements OnModuleInit {
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserPermissionAction)
    private readonly userPermissionActionRepo: Repository<UserPermissionAction>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(HelpRequest)
    private readonly helpRequestRepo: Repository<HelpRequest>,
    private readonly jwtService: JwtService,
  ) { }

  async onModuleInit() {
    await this.ensureHelpRequestsTable();
  }

  private async ensureHelpRequestsTable() {
    try {
      await this.helpRequestRepo.query(`
        CREATE TABLE IF NOT EXISTS help_requests (
          id VARCHAR(36) NOT NULL,
          contact_info VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          status VARCHAR(40) NOT NULL DEFAULT 'OPEN',
          client_platform VARCHAR(40) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          INDEX idx_help_requests_status_created (status, created_at)
        )
      `);
    } catch {
      // App startup should not fail if the table was already created with a compatible schema.
    }
  }

  async createHelpRequest(dto: HelpRequestDto): Promise<{ success: true; message: string }> {
    const contactInfo = this.optionalText(dto.contactInfo);
    const message = this.optionalText(dto.message);
    if (!contactInfo) {
      throw new BadRequestException('Email or mobile number is required');
    }
    if (!message) {
      throw new BadRequestException('Please enter your help message');
    }

    const request = this.helpRequestRepo.create({
      contactInfo,
      message,
      status: 'OPEN',
      clientPlatform: dto.clientPlatform || LoginClientPlatform.MOBILE_APP,
    });
    await this.helpRequestRepo.save(request);

    return {
      success: true,
      message: 'We received your request. Administration will connect and respond to you shortly.',
    };
  }

  async signup(dto: SignupDto): Promise<{ success: true; message: string }> {
    if (dto.clientPlatform !== LoginClientPlatform.MOBILE_APP) {
      throw new BadRequestException('Signup is only available from the mobile app');
    }

    const rawSignupCompanyId = this.optionalText(process.env.MOBILE_SIGNUP_COMPANY_ID);
    const rawSignupBranchId = this.optionalText(process.env.MOBILE_SIGNUP_BRANCH_ID);
    const signupCompanyId = rawSignupCompanyId ? Number(rawSignupCompanyId) : null;
    const signupBranchId = rawSignupBranchId ? Number(rawSignupBranchId) : null;
    if (!signupCompanyId || !signupBranchId || Number.isNaN(signupCompanyId) || Number.isNaN(signupBranchId)) {
      throw new BadRequestException('Mobile signup company and branch are not configured correctly');
    }

    const [company, branch] = await Promise.all([
      this.companyRepo.findOne({ where: { id: signupCompanyId, isActive: true } }),
      this.branchRepo.findOne({ where: { id: signupBranchId, isActive: true } }),
    ]);
    if (!company) {
      throw new BadRequestException('Mobile signup company not found');
    }
    if (!branch || branch.companyId !== company.id) {
      throw new BadRequestException('Mobile signup branch not found for the configured company');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (existingUser) {
      if (!existingUser.isActive) {
        if (!existingUser.lastSeenAt) {
          throw new BadRequestException('Registration is already submitted for this email and is waiting for administrator approval.');
        }
        throw new BadRequestException('This email was previously deleted by the user and cannot be used again. Please use another name and email to create a new account.');
      }
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: normalizedEmail,
      passwordHash,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      role: UserRole.SALES_REP,
      companyId: company.id,
      branchId: branch.id,
      company,
      branch,
      phone: dto.phone?.trim() || null,
      isActive: false,
      taskPermissions: [
        TaskPermission.DESIGN_ENTRIES,
        TaskPermission.ORDER_ENTRIES,
        TaskPermission.VIEW_REPORTS,
      ],
    });

    await this.userRepo.save(user);

    return {
      success: true,
      message: 'Registration submitted successfully. Login access will be enabled shortly after administrator approval.',
    };
  }

  getMobileConfig() {
    return {
      status: true,
      current_version: {
        android: process.env.MOBILE_ANDROID_VERSION || '1.0.0',
        ios: process.env.MOBILE_IOS_VERSION || '1.0.0',
        by_pass: process.env.MOBILE_VERSION_BYPASS === 'true',
      },
      signup: process.env.MOBILE_SIGNUP_ENABLED === 'true',
    };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: AuthUser }> {
    const user = await this.validateUser(dto.email, dto.password);
    this.assertLoginRoleAccess(user, dto.clientPlatform);
    user.lastSeenAt = new Date();
    await this.userRepo.save(user);
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

  async deactivateMyAccount(userId: number): Promise<{ success: true }> {
    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    user.isActive = false;
    user.lastSeenAt = new Date();
    await this.userRepo.save(user);
    return { success: true };
  }

  private assertLoginRoleAccess(user: User, clientPlatform?: LoginClientPlatform): void {
    if (!clientPlatform) {
      return;
    }

    if (clientPlatform === LoginClientPlatform.MOBILE_APP) {
      const mobileAllowedRoles: UserRole[] = [
        UserRole.SALES_REP,
        UserRole.BRANCH_MANAGER,
      ];
      if (!mobileAllowedRoles.includes(user.role)) {
        throw new UnauthorizedException('This role is not allowed in the mobile app');
      }
      return;
    }

    if (clientPlatform === LoginClientPlatform.ADMIN_PORTAL) {
      const adminAllowedRoles: UserRole[] = [
        UserRole.SUPER_ADMIN,
        UserRole.INTERNAL_REP,
        UserRole.COMPANY_ADMIN,
      ];
      if (!adminAllowedRoles.includes(user.role)) {
        throw new UnauthorizedException('This role is not allowed in the admin portal');
      }
    }
  }

  async me(userId: number): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: ['branch', 'company'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.toAuthUser(user);
  }

  async uploadMyPhoto(
    userId: number,
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

    const user = await this.userRepo.findOne({ where: { id: userId, isActive: true }, relations: ['branch', 'company'] });
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

  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: userId, isActive: true },
      relations: ['branch', 'company'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (dto.password) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Incorrect current password');
      }
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await this.userRepo.findOne({ where: { email: normalizedEmail } });
        if (existing) {
          throw new BadRequestException('Email address is already in use');
        }
        user.email = normalizedEmail;
      }
    }

    if (dto.firstName !== undefined) {
      user.firstName = dto.firstName.trim();
    }
    if (dto.lastName !== undefined) {
      user.lastName = dto.lastName.trim();
    }
    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim();
    }
    if (dto.photoUrl !== undefined) {
      user.photoUrl = dto.photoUrl;
    }

    await this.userRepo.save(user);
    return this.toAuthUser(user);
  }

  private async validateUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
      relations: ['branch', 'company'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive && !user.lastSeenAt) {
      throw new UnauthorizedException('Your registration is pending administrator approval. Login access will be enabled shortly.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account was deleted and no longer exists in the application. Please create a new account with a different email.');
    }
    if (user.companyId && user.company && !user.company.isActive) {
      throw new UnauthorizedException('Company account is temporarily disabled. Please contact the Administrator.');
    }
    if (user.branchId && user.branch && !user.branch.isActive) {
      throw new UnauthorizedException('Branch account is temporarily disabled. Please contact the Administrator.');
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
      userHandle: user.userHandle || null,
      role: user.role,
      companyId: this.resolveCompanyId(user),
      branchId: user.branchId || null,
      photoUrl: await this.resolvePhotoUrl(user.photoUrl || null),
      phone: user.phone || null,
      taskPermissions: user.taskPermissions || [],
      detailedPermissions: await this.getDetailedPermissions(user),
      companyName: user.company?.companyName || null,
      branchName: user.branch?.name || null,
    };
  }

  private async getDetailedPermissions(user: User) {
    try {
      const rows = await this.userPermissionActionRepo.find({
        where: { userId: user.id },
        order: { actionKey: 'ASC' },
      });
      return rows.map((row) => ({
        actionKey: row.actionKey,
        dataScope: row.dataScope,
      }));
    } catch (error) {
      const code = (error as { code?: string })?.code;
      const message = String((error as { message?: string })?.message || '').toLowerCase();
      if (code === 'ER_NO_SUCH_TABLE' || message.includes('user_permission_actions')) {
        return getLegacySpiffPermissions(user);
      }
      throw error;
    }
  }

  private resolveCompanyId(user: User): number | null {
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

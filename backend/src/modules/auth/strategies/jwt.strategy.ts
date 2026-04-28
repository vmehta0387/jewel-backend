import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AuthUser, JwtPayload } from '../interfaces/auth-user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private static readonly LAST_SEEN_WRITE_THROTTLE_MS = 60 * 1000;
  private static readonly lastSeenWriteByUser = new Map<string, number>();

  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'change_me',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
      relations: ['branch'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const now = Date.now();
    const prevWrite = JwtStrategy.lastSeenWriteByUser.get(user.id) || 0;
    if (now - prevWrite >= JwtStrategy.LAST_SEEN_WRITE_THROTTLE_MS) {
      JwtStrategy.lastSeenWriteByUser.set(user.id, now);
      void this.userRepo.update(user.id, { lastSeenAt: new Date(now) });
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      companyId: user.companyId || user.branch?.companyId || null,
      branchId: user.branchId || null,
      photoUrl: user.photoUrl || null,
      taskPermissions: user.taskPermissions || [],
    };
  }
}

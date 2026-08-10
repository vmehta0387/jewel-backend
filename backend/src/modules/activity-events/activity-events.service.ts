import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  FindActivityEventsQueryDto,
  RecordActivityEventDto,
  RecordActivityEventsBatchDto,
} from './dto/activity-event.dto';
import { ActivityEvent } from './entities/activity-event.entity';

const SENSITIVE_KEY_PATTERN = /(password|token|secret|otp|pin|authorization|cookie|credential|api[-_]?key)/i;
const MAX_STRING_LENGTH = 2000;
const MAX_JSON_DEPTH = 6;
const MAX_JSON_KEYS = 200;

@Injectable()
export class ActivityEventsService {
  constructor(
    @InjectRepository(ActivityEvent)
    private readonly activityEventRepo: Repository<ActivityEvent>,
  ) {}

  async recordBatch(dto: RecordActivityEventsBatchDto, requester: AuthUser, headerDeviceId?: string) {
    if (!dto.events?.length) {
      return { success: true, saved: 0 };
    }

    const rows = dto.events.map((event) => this.toActivityEvent(event, requester, headerDeviceId));
    await this.activityEventRepo.insert(rows);
    return { success: true, saved: rows.length };
  }

  async findAll(query: FindActivityEventsQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 25;
    const skip = (page - 1) * limit;

    const qb = this.activityEventRepo
      .createQueryBuilder('activityEvent')
      .orderBy('activityEvent.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.userId) {
      qb.andWhere('activityEvent.user_id = :userId', { userId: query.userId });
    }

    if (query.from) {
      qb.andWhere('activityEvent.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to) {
      qb.andWhere('activityEvent.created_at <= :to', { to: new Date(query.to) });
    }

    if (query.module?.trim()) {
      qb.andWhere('activityEvent.module = :module', { module: query.module.trim() });
    }

    if (query.event?.trim()) {
      qb.andWhere('activityEvent.event = :event', { event: query.event.trim() });
    }

    if (query.deviceId?.trim()) {
      qb.andWhere('activityEvent.device_id = :deviceId', { deviceId: query.deviceId.trim() });
    }

    if (query.entityType?.trim()) {
      qb.andWhere('activityEvent.entity_type = :entityType', { entityType: query.entityType.trim() });
    }

    if (query.entityId?.trim()) {
      qb.andWhere('activityEvent.entity_id = :entityId', { entityId: query.entityId.trim() });
    }

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private toActivityEvent(event: RecordActivityEventDto, requester: AuthUser, headerDeviceId?: string) {
    const module = this.requiredText(event.module, 'module', 80);
    const eventName = this.requiredText(event.event, 'event', 120);

    return this.activityEventRepo.create({
      id: this.validClientId(event.id) || randomUUID(),
      userId: requester.id,
      deviceId: this.optionalText(event.deviceId || headerDeviceId, 120),
      module,
      event: eventName,
      screen: this.optionalText(event.screen, 120),
      entityType: this.optionalText(event.entityType, 80),
      entityId: this.optionalText(event.entityId, 120),
      changes: this.sanitizeJson(event.changes) as ActivityEvent['changes'],
      data: this.sanitizeJson(event.data) as ActivityEvent['data'],
      createdAt: this.parseCreatedAt(event.createdAt),
    });
  }

  private parseCreatedAt(value?: string) {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private validClientId(value?: string) {
    const normalized = this.optionalText(value, 36);
    if (!normalized) return null;
    return /^[a-zA-Z0-9_-]{6,36}$/.test(normalized) ? normalized : null;
  }

  private requiredText(value: unknown, field: string, maxLength: number) {
    const normalized = this.optionalText(value, maxLength);
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private optionalText(value: unknown, maxLength: number) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    return normalized.slice(0, maxLength);
  }

  private sanitizeJson(value: unknown, depth = 0, keyCount = { count: 0 }): unknown {
    if (value === null || value === undefined) return null;
    if (depth > MAX_JSON_DEPTH) return '[truncated]';
    if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
      return value.slice(0, MAX_JSON_KEYS).map((item) => this.sanitizeJson(item, depth + 1, keyCount));
    }

    if (typeof value === 'object') {
      const output: Record<string, unknown> = {};
      for (const [key, rawValue] of Object.entries(value as Record<string, unknown>)) {
        if (keyCount.count >= MAX_JSON_KEYS) break;
        keyCount.count += 1;
        const safeKey = key.slice(0, 120);
        output[safeKey] = SENSITIVE_KEY_PATTERN.test(key)
          ? '[hidden]'
          : this.sanitizeJson(rawValue, depth + 1, keyCount);
      }
      return output;
    }

    return String(value).slice(0, MAX_STRING_LENGTH);
  }
}

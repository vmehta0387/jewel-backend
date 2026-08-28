import { Transform, Type } from 'class-transformer';
import { UserRole } from '../../../common/enums/user-role.enum';
import { IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type NotificationSectionFilter = 'ALERTS' | 'UPDATES';

const parseBooleanQuery = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  return false;
};

export class FindNotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  unreadOnly?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALERTS', 'UPDATES'])
  section?: NotificationSectionFilter;
}

export class MarkNotificationReadDto {
  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  isRead?: boolean = true;
}

export class MarkAllNotificationsReadDto {
  @IsOptional()
  @IsUUID()
  beforeId?: string;
}

export class RegisterPushDeviceDto {
  @IsString()
  expoPushToken!: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class UnregisterPushDeviceDto {
  @IsString()
  expoPushToken!: string;
}

export class SendCustomNotificationDto {
  @IsString()
  title!: string;

  @IsString()
  message!: string;

  @IsIn(['GENERAL', 'ORDER', 'DESIGN'])
  activityType!: 'GENERAL' | 'ORDER' | 'DESIGN';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  activityRecordId?: number;

  @IsOptional()
  @IsIn(['P0', 'P1', 'P2'])
  priority?: 'P0' | 'P1' | 'P2';

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  channelInApp?: boolean = true;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  channelPush?: boolean = false;

  @IsOptional()
  @IsIn(['ALL', 'FILTERED', 'SELECTED'])
  targetMode?: 'ALL' | 'FILTERED' | 'SELECTED' = 'ALL';

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @IsString()
  userSearch?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  selectedUserIds?: number[];
}


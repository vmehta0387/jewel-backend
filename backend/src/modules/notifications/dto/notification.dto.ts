import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export type NotificationSectionFilter = 'ALERTS' | 'UPDATES';

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
  @Type(() => Boolean)
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
  @Type(() => Boolean)
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

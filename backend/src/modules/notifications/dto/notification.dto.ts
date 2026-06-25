import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

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

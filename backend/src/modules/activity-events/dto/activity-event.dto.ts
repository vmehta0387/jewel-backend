import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class ActivityEventChangeDto {
  @IsString()
  field!: string;

  @Allow()
  oldValue?: unknown;

  @Allow()
  newValue?: unknown;
}

export class RecordActivityEventDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsOptional()
  userId?: number;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsString()
  module!: string;

  @IsString()
  event!: string;

  @IsOptional()
  @IsString()
  screen?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ActivityEventChangeDto)
  changes?: ActivityEventChangeDto[];

  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}

export class RecordActivityEventsBatchDto {
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RecordActivityEventDto)
  events!: RecordActivityEventDto[];
}

export class FindActivityEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entityId?: number;
}

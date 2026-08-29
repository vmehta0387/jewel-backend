import { Transform, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { EmailTemplateStatus } from '../entities/email-template.entity';

const parseBooleanQuery = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  return false;
};

export class FindEmailTemplatesQueryDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
  status?: EmailTemplateStatus;

  @IsOptional()
  @IsString()
  actionType?: string;
}

export class SaveEmailTemplateDto {
  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  category!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  preheader?: string | null;

  @IsString()
  html!: string;

  @IsOptional()
  @IsString()
  text?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredVariables?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionalVariables?: string[];

  @IsOptional()
  @IsIn(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'])
  status?: EmailTemplateStatus;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateEmailTemplateDto extends SaveEmailTemplateDto {}

export class SaveEmailTemplateActionDto {
  @IsString()
  actionType!: string;

  @IsNumber()
  templateId!: number;

  @IsOptional()
  @IsString()
  recipientRole?: string | null;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  priority?: number;

  @IsOptional()
  @Transform(({ value }) => parseBooleanQuery(value))
  @IsBoolean()
  isActive?: boolean;
}

export class PreviewEmailTemplateDto {
  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
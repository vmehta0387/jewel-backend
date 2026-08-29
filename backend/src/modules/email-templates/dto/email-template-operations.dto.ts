import { IsEmail, IsObject, IsOptional, IsString } from 'class-validator';

export class CloneEmailTemplateDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

export class TestSendEmailTemplateDto {
  @IsEmail()
  to!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, unknown>;
}
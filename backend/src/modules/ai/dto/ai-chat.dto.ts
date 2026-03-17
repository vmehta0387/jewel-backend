import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class DesignChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsUUID()
  companyId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number;
}

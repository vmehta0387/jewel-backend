import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { SpiffClaimStatus } from '../enums/spiff-claim-status.enum';

export enum SpiffLeaderboardScope {
  MY_BRANCH = 'MY_BRANCH',
  MY_COMPANY = 'MY_COMPANY',
  GLOBAL = 'GLOBAL',
}

export enum SpiffLeaderboardPeriod {
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ALL_TIME = 'ALL_TIME',
}

export enum ClaimReviewAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  HOLD = 'HOLD',
}

export class SpiffLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(SpiffLeaderboardScope)
  scope?: SpiffLeaderboardScope;

  @IsOptional()
  @IsEnum(SpiffLeaderboardPeriod)
  period?: SpiffLeaderboardPeriod;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  repLimit?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 1 || value === '1') return true;
    if (typeof value === 'string') {
      return value.trim().toLowerCase() === 'true';
    }
    return false;
  })
  @IsBoolean()
  includeGlobalReps?: boolean;
}

export class FindSpiffClaimsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(SpiffClaimStatus)
  status?: SpiffClaimStatus;
}

export class CreateSpiffClaimDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  requestedPoints: number;

  @IsString()
  giftCardType: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReviewSpiffClaimDto {
  @IsEnum(ClaimReviewAction)
  action: ClaimReviewAction;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FulfillSpiffClaimDto {
  @IsString()
  rewardLink: string;

  @IsOptional()
  @IsString()
  note?: string;
}
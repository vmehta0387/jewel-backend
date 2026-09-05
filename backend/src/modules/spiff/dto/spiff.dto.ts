import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
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

export type SpiffPointAdjustmentAction = 'ADD' | 'REMOVE' | 'REDEEM';

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

  @IsOptional()
  @IsString()
  q?: string;
}

export class FindSpiffActivityQueryDto {
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
}

export class CreateSpiffClaimDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsIn(['ADD', 'REMOVE', 'REDEEM'])
  action?: SpiffPointAdjustmentAction;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  requestedPoints: number;

  @IsOptional()
  @IsString()
  giftCardType?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSpiffPointAdjustmentDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsIn(['ADD', 'REMOVE', 'REDEEM'])
  action: SpiffPointAdjustmentAction;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  points: number;

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
  @IsOptional()
  @IsString()
  rewardLink: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSpiffConfigDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  pointsPerDollar?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  orderValuePerPoint?: number;
}

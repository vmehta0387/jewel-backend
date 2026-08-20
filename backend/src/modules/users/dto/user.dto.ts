import { IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { UserRole } from '../../../common/enums/user-role.enum';
import { PermissionDataScope } from '../../permissions/entities/user-permission-action.entity';

export class FindUsersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)

  role?: UserRole;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  companyId?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  branchId?: number;
}

export class CheckUserHandleQueryDto {
  @IsString()
  userHandle: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  excludeUserId?: number;
}

export class UserPermissionActionDto {
  @IsString()
  actionKey: string;

  @IsOptional()
  @IsEnum(PermissionDataScope)
  dataScope?: PermissionDataScope;
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  userHandle?: string | null;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsInt()
  companyId?: number | null;

  @IsOptional()
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPermission, { each: true })
  taskPermissions?: TaskPermission[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionActionDto)
  detailedPermissions?: UserPermissionActionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  userHandle?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsInt()
  companyId?: number | null;

  @IsOptional()
  @IsInt()
  branchId?: number | null;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string | null;

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPermission, { each: true })
  taskPermissions?: TaskPermission[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionActionDto)
  detailedPermissions?: UserPermissionActionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserStatusDto {
  @IsBoolean()
  isActive: boolean;
}

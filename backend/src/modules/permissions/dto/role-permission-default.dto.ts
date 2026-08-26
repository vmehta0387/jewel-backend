import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { TaskPermission } from '../../../common/enums/task-permission.enum';
import { PermissionDataScope } from '../entities/user-permission-action.entity';

export class RoleDefaultPermissionActionDto {
  @IsString()
  actionKey: string;

  @IsOptional()
  @IsEnum(PermissionDataScope)
  dataScope?: PermissionDataScope;
}

export class UpdateRolePermissionDefaultDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(TaskPermission, { each: true })
  taskPermissions?: TaskPermission[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDefaultPermissionActionDto)
  detailedPermissions?: RoleDefaultPermissionActionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
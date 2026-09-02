import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PermissionAction } from './entities/permission-action.entity';
import { PermissionModule as PermissionModuleEntity } from './entities/permission-module.entity';
import { RoleDefaultPermissionAction } from './entities/role-default-permission-action.entity';
import { RolePermissionDefault } from './entities/role-permission-default.entity';
import { User } from '../users/entities/user.entity';
import { UserPermissionAction } from './entities/user-permission-action.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([
    PermissionModuleEntity,
    PermissionAction,
    RolePermissionDefault,
    RoleDefaultPermissionAction,
    User,
    UserPermissionAction,
  ]), AuthModule],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}

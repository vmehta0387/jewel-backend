import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { BranchEmployeesController } from './branch-employees.controller';
import { AuthModule } from '../auth/auth.module';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PermissionModule as PermissionModuleEntity } from '../permissions/entities/permission-module.entity';
import { PermissionAction } from '../permissions/entities/permission-action.entity';
import { UserPermissionAction } from '../permissions/entities/user-permission-action.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Company, Branch, PermissionModuleEntity, PermissionAction, UserPermissionAction]),
    AuthModule,
    NotificationsModule,
  ],
  controllers: [UsersController, BranchEmployeesController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

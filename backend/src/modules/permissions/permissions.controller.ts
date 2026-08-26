import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { UserRole } from '../../common/enums/user-role.enum';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateRolePermissionDefaultDto } from './dto/role-permission-default.dto';
import { PermissionsService } from './permissions.service';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('matrix')
  getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Get('role-defaults')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  listRoleDefaults() {
    return this.permissionsService.listRoleDefaults();
  }

  @Get('role-defaults/:role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  getRoleDefault(@Param('role') role: UserRole) {
    return this.permissionsService.getRoleDefault(role);
  }

  @Put('role-defaults/:role')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  updateRoleDefault(@Param('role') role: UserRole, @Body() dto: UpdateRolePermissionDefaultDto) {
    return this.permissionsService.upsertRoleDefault(role, dto);
  }
}
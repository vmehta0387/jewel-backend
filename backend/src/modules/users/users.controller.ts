import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { CreateUserDto, FindUsersQueryDto, UpdateUserDto, UpdateUserStatusDto } from './dto/user.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard)
@Roles(UserRole.SUPER_ADMIN)
@TaskPermissions(TaskPermission.USER_MANAGEMENT)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: FindUsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto.isActive);
  }
}

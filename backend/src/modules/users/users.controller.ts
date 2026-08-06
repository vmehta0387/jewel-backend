import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import {
  CheckUserHandleQueryDto,
  CreateUserDto,
  FindUsersQueryDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from './dto/user.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard, ActionPermissionsGuard)
@TaskPermissions(TaskPermission.USER_MANAGEMENT)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.view')
  findAll(@Query() query: FindUsersQueryDto, @Request() req: { user: AuthUser }) {
    return this.usersService.findAll(query, req.user);
  }

  @Get('lookup')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.INTERNAL_REP,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.SALES_REP,
  )
  @TaskPermissions()
  @ActionPermissions()
  findLookup(@Query() query: FindUsersQueryDto, @Request() req: { user: AuthUser }) {
    return this.usersService.findLookup(query, req.user);
  }

  @Get('user-handle/check')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @AnyActionPermissions('user.view', 'user.create', 'user.edit')
  checkUserHandle(@Query() query: CheckUserHandleQueryDto) {
    return this.usersService.checkUserHandleAvailability(query);
  }

  @Get('export/template')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('user.import')
  async downloadImportTemplate() {
    const file = await this.usersService.generateImportTemplate();
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get('export')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('user.import')
  async exportUsers(@Query() query: FindUsersQueryDto, @Request() req: { user: AuthUser }) {
    const file = await this.usersService.exportUsers(query, req.user);
    return new StreamableFile(file.buffer, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Post('import')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('user.import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  importUsers(@UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    return this.usersService.importUsers(file);
  }

  @Post('upload-photo')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.edit')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadPhoto(
    @UploadedFile() file: { buffer?: Buffer; originalname?: string; mimetype?: string },
    @Request() req: { protocol?: string; get?: (name: string) => string | undefined; headers?: Record<string, string | string[] | undefined> },
  ) {
    return this.usersService.uploadPhoto(file, req);
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.view')
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.usersService.findOne(id, req.user);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.create')
  create(@Body() dto: CreateUserDto, @Request() req: { user: AuthUser }) {
    return this.usersService.create(dto, req.user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.edit')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: { user: AuthUser }) {
    return this.usersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.COMPANY_ADMIN)
  @ActionPermissions('user.status_update')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto, @Request() req: { user: AuthUser }) {
    return this.usersService.updateStatus(id, dto.isActive, req.user);
  }
}

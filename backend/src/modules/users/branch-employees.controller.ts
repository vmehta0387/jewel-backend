import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  CreateBranchEmployeeDto,
  UpdateBranchEmployeeDto,
  UpdateBranchEmployeeStatusDto,
} from './dto/branch-employee.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.BRANCH_MANAGER, UserRole.COMPANY_ADMIN)
@Controller('branch-employees')
export class BranchEmployeesController {
  constructor(private readonly usersService: UsersService) {}

  @Get('branches')
  findBranches(@Request() req: { user: AuthUser }) {
    return this.usersService.findBranchEmployeeBranches(req.user);
  }

  @Get()
  findAll(@Request() req: { user: AuthUser }) {
    return this.usersService.findBranchEmployees(req.user);
  }

  @Post()
  create(@Body() dto: CreateBranchEmployeeDto, @Request() req: { user: AuthUser }) {
    return this.usersService.createBranchEmployee(dto, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchEmployeeDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.usersService.updateBranchEmployee(id, dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBranchEmployeeStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.usersService.updateBranchEmployeeStatus(id, dto.isActive, req.user);
  }
}

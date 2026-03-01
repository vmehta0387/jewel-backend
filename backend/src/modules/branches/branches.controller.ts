import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { BranchPricingSlabDto, CreateBranchDto, UpdateBranchDto, UpdateBranchStatusDto } from './dto/branch.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_REP)
  findAll(
    @Request() req: { user: AuthUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('companyId') companyId?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
  ) {
    return this.branchesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      companyId,
      status,
      country,
      city,
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_REP)
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.branchesService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateBranchStatusDto) {
    return this.branchesService.updateStatus(id, dto.isActive);
  }

  @Post(':id/pricing-slabs')
  @Roles(UserRole.SUPER_ADMIN)
  updatePricingSlabs(@Param('id') id: string, @Body() slabs: BranchPricingSlabDto[]) {
    return this.branchesService.updatePricingSlabs(id, slabs);
  }
}

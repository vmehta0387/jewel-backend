import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto, UpdateCompanyStatusDto, PricingSlabDto } from './dto/company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@UseGuards(JwtAuthGuard, RolesGuard, ActionPermissionsGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('company.create')
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_REP, UserRole.COMPANY_ADMIN)
  @ActionPermissions('company.view')
  findAll(
    @Request() req: { user: AuthUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('country') country?: string,
    @Query('city') city?: string,
    @Query('accountManagerId') accountManagerId?: number,
    @Query('pricingMode') pricingMode?: string,
  ) {
    return this.companiesService.findAll(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
      search,
      status,
      country,
      city,
      accountManagerId,
      pricingMode,
      req.user,
    );
  }

  @Get('lookup')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.INTERNAL_REP,
    UserRole.COMPANY_ADMIN,
    UserRole.BRANCH_MANAGER,
    UserRole.SALES_REP,
  )
  @ActionPermissions()
  findLookup(
    @Request() req: { user: AuthUser },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.companiesService.findLookup(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 200,
      search,
      status,
      req.user,
    );
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.INTERNAL_REP, UserRole.COMPANY_ADMIN)
  @ActionPermissions('company.view')
  findOne(@Param('id') id: number, @Request() req: { user: AuthUser }) {
    return this.companiesService.findOne(id, req.user);
  }

  @Put(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('company.edit')
  update(@Param('id') id: number, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('company.status_update')
  updateStatus(@Param('id') id: number, @Body() dto: UpdateCompanyStatusDto) {
    return this.companiesService.updateStatus(id, dto.isActive);
  }

  @Post(':id/pricing-slabs')
  @Roles(UserRole.SUPER_ADMIN)
  @ActionPermissions('pricing.company.update')
  updatePricingSlabs(@Param('id') id: number, @Body() slabs: PricingSlabDto[]) {
    return this.companiesService.updatePricingSlabs(id, slabs);
  }
}

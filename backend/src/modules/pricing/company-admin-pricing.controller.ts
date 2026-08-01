import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PricingService } from './pricing.service';
import {
  UpdateCompanyAdminBranchPricingDto,
  UpdateCompanyAdminCompanyPricingDto,
} from './dto/company-admin-pricing.dto';

@UseGuards(JwtAuthGuard, RolesGuard, ActionPermissionsGuard)
@Roles(UserRole.COMPANY_ADMIN, UserRole.BRANCH_MANAGER)
@Controller('pricing/company-admin')
export class CompanyAdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('settings')
  @ActionPermissions()
  getPricingSettings(@Request() req: { user: AuthUser }) {
    return this.pricingService.getCompanyAdminPricingSettings(req.user);
  }

  @Put('company')
  @AnyActionPermissions('pricing.company.update', 'mobile.pricing.company.update')
  updateCompanyPricing(
    @Body() dto: UpdateCompanyAdminCompanyPricingDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateCompanyAdminCompanyPricing(req.user, dto);
  }

  @Put('branches/:branchId')
  @AnyActionPermissions('pricing.branch.update', 'mobile.pricing.branch.update')
  updateBranchPricing(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateCompanyAdminBranchPricingDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateCompanyAdminBranchPricing(req.user, branchId, dto);
  }
}

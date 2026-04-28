import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PricingService } from './pricing.service';
import {
  UpdateCompanyAdminBranchPricingDto,
  UpdateCompanyAdminCompanyPricingDto,
} from './dto/company-admin-pricing.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.COMPANY_ADMIN)
@Controller('pricing/company-admin')
export class CompanyAdminPricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('settings')
  getPricingSettings(@Request() req: { user: AuthUser }) {
    return this.pricingService.getCompanyAdminPricingSettings(req.user);
  }

  @Put('company')
  updateCompanyPricing(
    @Body() dto: UpdateCompanyAdminCompanyPricingDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateCompanyAdminCompanyPricing(req.user, dto);
  }

  @Put('branches/:branchId')
  updateBranchPricing(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateCompanyAdminBranchPricingDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateCompanyAdminBranchPricing(req.user, branchId, dto);
  }
}

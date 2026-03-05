import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  CreateGlobalBasePriceDto,
  FindGlobalBasePricesQueryDto,
  FindGlobalBasePriceReferenceOptionsQueryDto,
  UpdateGlobalBasePriceDto,
  UpdateGlobalBasePriceStatusDto,
} from './dto/pricing.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard)
@Roles(UserRole.SUPER_ADMIN)
@TaskPermissions(TaskPermission.PRICING_CONFIGURATION)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('base-prices')
  findGlobalBasePrices(@Query() query: FindGlobalBasePricesQueryDto) {
    return this.pricingService.findGlobalBasePrices(query);
  }

  @Get('base-prices/reference-options')
  findGlobalBasePriceReferenceOptions(
    @Query() query: FindGlobalBasePriceReferenceOptionsQueryDto,
  ) {
    return this.pricingService.findGlobalBasePriceReferenceOptions(query);
  }

  @Post('base-prices')
  createGlobalBasePrice(
    @Body() dto: CreateGlobalBasePriceDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.createGlobalBasePrice(dto, req.user);
  }

  @Put('base-prices/:id')
  updateGlobalBasePrice(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalBasePriceDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateGlobalBasePrice(id, dto, req.user);
  }

  @Patch('base-prices/:id/status')
  updateGlobalBasePriceStatus(
    @Param('id') id: string,
    @Body() dto: UpdateGlobalBasePriceStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.pricingService.updateGlobalBasePriceStatus(id, dto.isActive, req.user);
  }

  @Post('base-prices/recalculate-designs')
  recalculateDesignsFromGlobalBasePrices() {
    return this.pricingService.recalculateDesignsFromGlobalBasePrices();
  }
}

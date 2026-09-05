import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, StreamableFile, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import {
  CreateOrderDto,
  FindPurchaseOrderUsageQueryDto,
  FindOrdersQueryDto,
  UpdateOrderActiveStatusDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard, ActionPermissionsGuard)
@TaskPermissions()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @TaskPermissions()
  findAll(@Query() query: FindOrdersQueryDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.findAll(query, req.user);
  }

  @Get('next-order-no')
  getNextOrderNumber() {
    return this.ordersService.getNextOrderNumber();
  }

  @Get('po-usage')
  getPurchaseOrderUsage(
    @Query() query: FindPurchaseOrderUsageQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.getPurchaseOrderUsage(query, req.user);
  }

  @Get('price-preview')
  getPricePreview(
    @Request() req: { user: AuthUser },
    @Query('designId') designId?: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!designId || !companyId || !branchId) {
      if (req.user.role === UserRole.SUPER_ADMIN) {
        return { baseCost: 0, companyMultiplier: 1, companyPrice: 0, branchMultiplier: 1, finalPrice: 0 };
      }
      return req.user.role === UserRole.COMPANY_ADMIN
        ? { branchMultiplier: 1, branchMultiplierSource: 'BRANCH_DEFAULT', branchCost: 0, finalPrice: 0 }
        : { finalPrice: 0 };
    }
    return this.ordersService.getPricePreview({ designId: Number(designId), companyId: Number(companyId), branchId: Number(branchId) }, req.user);
  }

  @Get('summary')
  getSummary(@Request() req: { user: AuthUser }) {
    return this.ordersService.getSummary(req.user);
  }

  @Get('period-summary')
  getPeriodSummary(@Request() req: { user: AuthUser }) {
    return this.ordersService.getPeriodSummary(req.user);
  }

  @Get('trends')
  getTrends(@Request() req: { user: AuthUser }) {
    return this.ordersService.getTrends(req.user);
  }

  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    const file = await this.ordersService.generateOrderPdf(Number(id), req.user);
    return new StreamableFile(file.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${file.fileName}"`,
    });
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.ordersService.getHistory(Number(id), req.user);
  }

  @Get(':id')
  @TaskPermissions()
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.ordersService.findOne(Number(id), req.user);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.create(dto, req.user);
  }

  @Put(':id')
  @ActionPermissions('order.edit')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.update(Number(id), dto, req.user);
  }

  @Patch(':id/status')
  @AnyActionPermissions('order.status_update', 'mobile.order.status_update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.update(Number(id), dto, req.user);
  }

  @Patch(':id/active')
  @ActionPermissions('order.edit')
  updateActiveStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderActiveStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.updateActiveStatus(Number(id), dto.isActive, req.user);
  }
}

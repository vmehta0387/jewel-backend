import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { ActionPermissionsGuard } from '../auth/guards/action-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { ActionPermissions, AnyActionPermissions } from '../auth/decorators/action-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  CreateOrderDto,
  FindPurchaseOrderUsageQueryDto,
  FindOrdersQueryDto,
  UpdateOrderActiveStatusDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard, ActionPermissionsGuard)
@TaskPermissions(TaskPermission.ORDER_ENTRIES)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @TaskPermissions()
  @AnyActionPermissions('order.view', 'mobile.order.view', 'mobile.dashboard.quick_actions.orders.view')
  findAll(@Query() query: FindOrdersQueryDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.findAll(query, req.user);
  }

  @Get('next-order-no')
  getNextOrderNumber() {
    return this.ordersService.getNextOrderNumber();
  }

  @Get('po-usage')
  @TaskPermissions()
  @AnyActionPermissions('order.view', 'mobile.order.view')
  getPurchaseOrderUsage(
    @Query() query: FindPurchaseOrderUsageQueryDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.getPurchaseOrderUsage(query, req.user);
  }

  @Get('price-preview')
  @TaskPermissions()
  @AnyActionPermissions('order.price_preview', 'mobile.order.price_preview')
  getPricePreview(
    @Request() req: { user: AuthUser },
    @Query('designId') designId?: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!designId || !companyId || !branchId) {
      return { baseCost: 0, companyMultiplier: 1, companyPrice: 0, branchMultiplier: 1, finalPrice: 0 };
    }
    return this.ordersService.getPricePreview({ designId, companyId, branchId }, req.user);
  }

  @Get('summary')
  @TaskPermissions()
  @AnyActionPermissions('order.view', 'mobile.order.view', 'mobile.dashboard.totals.view', 'mobile.dashboard.pipeline.view')
  getSummary(@Request() req: { user: AuthUser }) {
    return this.ordersService.getSummary(req.user);
  }

  @Get('trends')
  @TaskPermissions()
  @AnyActionPermissions('order.view', 'mobile.order.view', 'mobile.dashboard.pipeline.view')
  getTrends(@Request() req: { user: AuthUser }) {
    return this.ordersService.getTrends(req.user);
  }

  @Get(':id')
  @TaskPermissions()
  @AnyActionPermissions('order.view', 'mobile.order.view')
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.ordersService.findOne(id, req.user);
  }

  @Post()
  @TaskPermissions()
  @AnyActionPermissions('order.create', 'mobile.order.create')
  create(@Body() dto: CreateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.create(dto, req.user);
  }

  @Put(':id')
  @TaskPermissions()
  @AnyActionPermissions('order.edit', 'mobile.order.edit')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @TaskPermissions()
  @ActionPermissions('order.status_update')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.update(id, { status: dto.status }, req.user);
  }

  @Patch(':id/active')
  @TaskPermissions()
  @AnyActionPermissions('order.status_update', 'mobile.order.status_update')
  updateActiveStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderActiveStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.updateActiveStatus(id, dto.isActive, req.user);
  }
}

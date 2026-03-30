import { Body, Controller, Get, Param, Patch, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TaskPermissionsGuard } from '../auth/guards/task-permissions.guard';
import { TaskPermissions } from '../auth/decorators/task-permissions.decorator';
import { TaskPermission } from '../../common/enums/task-permission.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import {
  CreateOrderDto,
  FindOrdersQueryDto,
  UpdateOrderActiveStatusDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from './dto/order.dto';

@UseGuards(JwtAuthGuard, RolesGuard, TaskPermissionsGuard)
@TaskPermissions(TaskPermission.ORDER_ENTRIES)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: FindOrdersQueryDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.findAll(query, req.user);
  }

  @Get('next-order-no')
  getNextOrderNumber() {
    return this.ordersService.getNextOrderNumber();
  }

  @Get('price-preview')
  getPricePreview(
    @Query('designId') designId?: string,
    @Query('companyId') companyId?: string,
    @Query('branchId') branchId?: string,
  ) {
    if (!designId || !companyId || !branchId) {
      return { baseCost: 0, companyMultiplier: 1, branchMultiplier: 1, finalPrice: 0 };
    }
    return this.ordersService.getPricePreview({ designId, companyId, branchId });
  }

  @Get('summary')
  getSummary(@Request() req: { user: AuthUser }) {
    return this.ordersService.getSummary(req.user);
  }

  @Get('trends')
  getTrends(@Request() req: { user: AuthUser }) {
    return this.ordersService.getTrends(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: AuthUser }) {
    return this.ordersService.findOne(id, req.user);
  }

  @Post()
  create(@Body() dto: CreateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.create(dto, req.user);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOrderDto, @Request() req: { user: AuthUser }) {
    return this.ordersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.update(id, { status: dto.status }, req.user);
  }

  @Patch(':id/active')
  updateActiveStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderActiveStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.ordersService.updateActiveStatus(id, dto.isActive, req.user);
  }
}

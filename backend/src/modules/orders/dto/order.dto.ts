import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { OrderStatus } from '../../../common/enums/order-status.enum';

export class CreateOrderDto {
  @IsNumber()
  companyId: number;

  @IsNumber()
  branchId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  designId: number;

  @IsOptional()
  @IsNumber()
  salesRepId?: number;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['QUOTE', 'ORDER'])
  orderType?: 'QUOTE' | 'ORDER';

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shipDate?: string;

  @IsOptional()
  @IsIn(['UPS', 'FED_EX', 'HAND_DELIVERY', 'OTHER'])
  shipVia?: 'UPS' | 'FED_EX' | 'HAND_DELIVERY' | 'OTHER';

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  designId?: number;

  @IsOptional()
  @IsNumber()
  salesRepId?: number;

  @IsOptional()
  @IsString()
  deliveryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  shortDescription?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  purchaseOrderNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  shipDate?: string;

  @IsOptional()
  @IsIn(['UPS', 'FED_EX', 'HAND_DELIVERY', 'OTHER'])
  shipVia?: 'UPS' | 'FED_EX' | 'HAND_DELIVERY' | 'OTHER';

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['QUOTE', 'ORDER'])
  orderType?: 'QUOTE' | 'ORDER';
}

export class FindOrdersQueryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  @IsOptional()
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE', 'ALL'])
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  designId?: number;

  @IsOptional()
  @IsNumber()
  salesRepId?: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @IsOptional()
  @IsIn(['true', 'false'])
  includeStatusCounts?: 'true' | 'false';

  @IsOptional()
  @IsIn(['FULFILLED', 'COMPLETED'])
  statusGroup?: 'FULFILLED' | 'COMPLETED';

  @IsOptional()
  @IsIn(['TODAY', 'WEEKLY', 'MONTHLY', 'ANNUALLY'])
  period?: 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'ANNUALLY';

  @IsOptional()
  @IsString()
  deliveryFrom?: string;

  @IsOptional()
  @IsString()
  deliveryTo?: string;

  @IsOptional()
  @IsString()
  createdFrom?: string;

  @IsOptional()
  @IsString()
  createdTo?: string;
}

export class FindPurchaseOrderUsageQueryDto {
  @IsNumber()
  companyId: number;

  @IsOptional()
  @IsNumber()
  branchId?: number;

  @IsString()
  purchaseOrderNumber: string;

  @IsOptional()
  @IsNumber()
  excludeOrderId?: number;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsString()
  shipDate?: string;

  @IsOptional()
  @IsIn(['UPS', 'FED_EX', 'HAND_DELIVERY', 'OTHER'])
  shipVia?: 'UPS' | 'FED_EX' | 'HAND_DELIVERY' | 'OTHER';

  @IsOptional()
  @IsString()
  trackingNo?: string;

  @IsOptional()
  @IsString()
  invoiceNo?: string;
}

export class UpdateOrderActiveStatusDto {
  @Type(() => Boolean)
  @IsBoolean()
  isActive: boolean;
}

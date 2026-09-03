import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import puppeteer from 'puppeteer';
import { Order } from './entities/order.entity';
import { OrderHistory, OrderHistoryActionType, OrderHistoryChange } from './entities/order-history.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Design } from '../products/entities/design.entity';
import { User } from '../users/entities/user.entity';
import { UserPermissionAction } from '../permissions/entities/user-permission-action.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateOrderDto, FindOrdersQueryDto, FindPurchaseOrderUsageQueryDto, UpdateOrderDto } from './dto/order.dto';
import { NotificationPriority } from '../notifications/entities/notification.entity';
import { NotificationEventsService, type NotificationChannelOptions } from '../notification-events/notification-events.service';
import { SpiffService } from '../spiff/spiff.service';
import { PricingService } from '../pricing/pricing.service';

type OrderAuditSnapshot = Record<string, unknown>;

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;

  async onModuleInit() {
    await this.ensureOrderTableColumns();
  }

  private async ensureOrderTableColumns() {
    const columns = [
      { name: 'customer_name', type: 'VARCHAR(255) NULL' },
      { name: 'customer_phone', type: 'VARCHAR(50) NULL' },
      { name: 'customer_email', type: 'VARCHAR(255) NULL' },
      { name: 'purchase_order_number', type: 'VARCHAR(120) NULL' },
      { name: 'completed_at', type: 'DATETIME NULL' },
      { name: 'ship_date', type: 'DATE NULL' },
      { name: 'ship_via', type: 'VARCHAR(50) NULL' },
      { name: 'tracking_no', type: 'VARCHAR(120) NULL' },
      { name: 'invoice_no', type: 'VARCHAR(120) NULL' },
      { name: 'selected_options', type: 'JSON NULL' },
      { name: 'base_cost_snapshot', type: 'DECIMAL(12,2) NULL' },
      { name: 'company_cost_snapshot', type: 'DECIMAL(12,2) NULL' },
      { name: 'company_multiplier_snapshot', type: 'DECIMAL(5,2) NULL' },
      { name: 'branch_cost_snapshot', type: 'DECIMAL(12,2) NULL' },
      { name: 'branch_multiplier_snapshot', type: 'DECIMAL(5,2) NULL' },
      { name: 'effective_multiplier_snapshot', type: 'DECIMAL(5,2) NULL' },
      { name: 'selling_price_snapshot', type: 'DECIMAL(12,2) NULL' },
    ];
    for (const col of columns) {
      try {
        await this.orderRepo.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
      } catch {
        // Ignored if column already exists
      }
    }
    await this.ensureOrderHistoryTable();
  }

  private async ensureOrderHistoryTable() {
    try {
      await this.orderRepo.query(`
        CREATE TABLE IF NOT EXISTS order_history (
          id int(11) NOT NULL AUTO_INCREMENT,
          order_id int(11) NOT NULL,
          action_type varchar(50) NOT NULL,
          summary text NOT NULL,
          changes json NULL,
          performed_by int(11) NULL,
          performed_by_name varchar(255) NULL,
          performed_by_role varchar(50) NULL,
          metadata json NULL,
          performed_at datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          INDEX idx_order_history_order_id (order_id),
          INDEX idx_order_history_performed_by (performed_by),
          INDEX idx_order_history_performed_at (performed_at),
          CONSTRAINT fk_order_history_order_id FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          CONSTRAINT fk_order_history_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
    } catch (error: any) {
      this.logger.warn(`Unable to ensure order_history table: ${error?.message || error}`);
    }
  }

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderHistory) private readonly orderHistoryRepo: Repository<OrderHistory>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Design) private readonly designRepo: Repository<Design>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(UserPermissionAction) private readonly userPermissionActionRepo: Repository<UserPermissionAction>,
    private readonly spiffService: SpiffService,
    private readonly notificationEventsService: NotificationEventsService,
    private readonly pricingService: PricingService,
  ) {}

  async getNextOrderNumber(): Promise<{ orderNumber: string }> {
    const raw = await this.orderRepo
      .createQueryBuilder('order')
      .select('MAX(CAST(SUBSTRING(order.orderNumber, 4) AS UNSIGNED))', 'maxSeq')
      .where("order.orderNumber REGEXP '^OR-[0-9]+$'")
      .getRawOne<{ maxSeq: string | null }>();

    const currentMax = Number.parseInt(raw?.maxSeq || '0', 10);
    const next = Number.isFinite(currentMax) ? currentMax + 1 : 1;
    return { orderNumber: `OR-${String(next).padStart(4, '0')}` };
  }

  async getPurchaseOrderUsage(query: FindPurchaseOrderUsageQueryDto, requester: AuthUser) {
    const purchaseOrderNumber = query.purchaseOrderNumber?.trim();
    if (!purchaseOrderNumber) {
      return { count: 0, orders: [] };
    }

    try {
      const scope = this.resolveScope(requester, query.companyId, query.branchId);
      if (!scope.companyId) {
        throw new BadRequestException('Company is required');
      }

      const qb = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.design', 'design')
        .where('order.companyId = :companyId', { companyId: scope.companyId })
        .andWhere('LOWER(TRIM(order.purchaseOrderNumber)) = :purchaseOrderNumber', {
          purchaseOrderNumber: purchaseOrderNumber.toLowerCase(),
        })
        .orderBy('order.createdAt', 'DESC')
        .take(10);

      if (query.excludeOrderId) {
        qb.andWhere('order.id != :excludeOrderId', { excludeOrderId: query.excludeOrderId });
      }

      const [orders, count] = await qb.getManyAndCount();
      return {
        count,
        orders: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          designNo: order.design?.designNo ?? null,
          customerName: order.customerName,
          createdAt: order.createdAt,
        })),
      };
    } catch (error: any) {
      this.logger.warn(`getPurchaseOrderUsage error: ${error?.message || error}`);
      return { count: 0, orders: [] };
    }
  }

  async findAll(query: FindOrdersQueryDto, requester: AuthUser) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const qb = this.createOrderReadQuery();

    this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.andWhere('order.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.andWhere('order.isActive = :isActive', { isActive: false });
    }

    if (query.designId) {
      qb.andWhere('order.designId = :designId', { designId: query.designId });
    }

    if (query.salesRepId) {
      qb.andWhere('order.salesRepId = :salesRepId', { salesRepId: query.salesRepId });
    }

    if (query.deliveryFrom?.trim()) {
      qb.andWhere('DATE(order.deliveryDate) >= :deliveryFrom', {
        deliveryFrom: query.deliveryFrom.trim(),
      });
    }

    if (query.deliveryTo?.trim()) {
      qb.andWhere('DATE(order.deliveryDate) <= :deliveryTo', {
        deliveryTo: query.deliveryTo.trim(),
      });
    }

    if (query.createdFrom?.trim()) {
      qb.andWhere('DATE(order.createdAt) >= :createdFrom', {
        createdFrom: query.createdFrom.trim(),
      });
    }

    if (query.createdTo?.trim()) {
      qb.andWhere('DATE(order.createdAt) <= :createdTo', {
        createdTo: query.createdTo.trim(),
      });
    }

    if (query.completedFrom?.trim()) {
      qb.andWhere('DATE(order.completedAt) >= :completedFrom', {
        completedFrom: query.completedFrom.trim(),
      });
    }

    if (query.completedTo?.trim()) {
      qb.andWhere('DATE(order.completedAt) <= :completedTo', {
        completedTo: query.completedTo.trim(),
      });
    }

    this.applyCreatedPeriodFilter(qb, query.period);

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(order.orderNumber LIKE :search OR design.designNo LIKE :search OR design.designName LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search OR salesRep.firstName LIKE :search OR salesRep.lastName LIKE :search OR salesRep.email LIKE :search OR order.customerName LIKE :search OR order.customerPhone LIKE :search OR order.customerEmail LIKE :search OR order.purchaseOrderNumber LIKE :search)',
        { search },
      );
    }

    const statusCounts = query.includeStatusCounts === 'true'
      ? await this.getOrderStatusCounts(qb)
      : undefined;

    if (query.orderStatus) {
      qb.andWhere('order.status = :orderStatus', { orderStatus: query.orderStatus });
    }

    if (query.statusGroup === 'FULFILLED') {
      qb.andWhere('order.status IN (:...fulfilledStatuses)', {
        fulfilledStatuses: [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.COMPLETED],
      });
    } else if (query.statusGroup === 'COMPLETED') {
      qb.andWhere('order.status = :completedStatus', { completedStatus: OrderStatus.COMPLETED });
    } else if (query.statusGroup === 'NON_COMPLETED') {
      qb.andWhere('order.status IN (:...nonCompletedStatuses)', {
        nonCompletedStatuses: [OrderStatus.QUOTE, OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION],
      });
    }

    const totalAmountRaw = await qb
      .clone()
      .select('COALESCE(SUM(order.price), 0)', 'totalAmount')
      .getRawOne<{ totalAmount: string | number | null }>();

    const { entities, raw } = await qb
      .orderBy('order.createdAt', 'DESC')
      .offset(skip)
      .limit(limit)
      .getRawAndEntities();
    const total = await qb.clone().offset(undefined).limit(undefined).getCount();
    const enriched = await this.buildOrderReadRows(entities, raw, requester, false);

    return {
      data: enriched,
      total,
      totalAmount: this.roundMoney(this.toNumber(totalAmountRaw?.totalAmount)),
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      ...(statusCounts ? { statusCounts } : {}),
    };
  }

  async findOne(id: number, requester: AuthUser) {
    const qb = this.createOrderReadQuery().where('order.id = :id', { id });
    this.applyScopeFilter(qb, requester);

    const { entities, raw } = await qb.getRawAndEntities();
    const order = entities[0];
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return (await this.buildOrderReadRows([order], raw, requester, true))[0];
  }

  private createOrderReadQuery(): SelectQueryBuilder<Order> {
    return this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.company', 'company')
      .leftJoinAndSelect('order.branch', 'branch')
      .leftJoinAndSelect('branch.branchManager', 'branchManager')
      .leftJoinAndSelect('order.design', 'design')
      .leftJoinAndSelect('order.salesRep', 'salesRep')
      .addSelect('company.companyName', 'read_companyName')
      .addSelect('branch.name', 'read_branchName')
      .addSelect('design.designNo', 'read_designNo')
      .addSelect('design.designName', 'read_designName')
      .addSelect('design.version', 'read_designVersion')
      .addSelect('salesRep.email', 'read_salesRepEmail')
      .addSelect('salesRep.role', 'read_assignedUserRole')
      .addSelect("NULLIF(TRIM(CONCAT(COALESCE(salesRep.firstName, ''), ' ', COALESCE(salesRep.lastName, ''))), '')", 'read_salesRepName')
      .addSelect("NULLIF(TRIM(CONCAT(COALESCE(branchManager.firstName, ''), ' ', COALESCE(branchManager.lastName, ''))), '')", 'read_branchManagerName');
  }

  private async buildOrderReadRows(
    orders: Order[],
    rawRows: Record<string, unknown>[],
    requester: AuthUser,
    includePricingMultipliers: boolean,
  ) {
    const rawById = new Map(rawRows.map((row) => [Number(row.order_id), row]));
    return Promise.all(
      orders.map(async (order) => {
        const {
          baseCostSnapshot,
          companyCostSnapshot,
          companyMultiplierSnapshot,
          branchCostSnapshot,
          branchMultiplierSnapshot,
          effectiveMultiplierSnapshot,
          sellingPriceSnapshot,
          company,
          branch,
          design,
          salesRep,
          ...safeOrder
        } = order;
        const raw = rawById.get(Number(order.id)) || {};
        const primaryImage = Array.isArray(order.design?.imageUrls)
          ? order.design!.imageUrls.find((url) => typeof url === 'string' && url.trim().length > 0) || null
          : null;
        const designImageUrl = await this.resolveOrderDesignImageUrl(primaryImage);
        const salesRepName = this.optionalText(raw.read_salesRepName) || this.optionalText(raw.read_salesRepEmail);
        const assignedUserRole = this.optionalText(raw.read_assignedUserRole) || UserRole.SALES_REP;
        const branchManagerName = this.optionalText(raw.read_branchManagerName) || this.optionalText(order.branch?.branchManager?.email);

        return {
          ...safeOrder,
          ...(requester.role === UserRole.SUPER_ADMIN
            ? {
                baseCostSnapshot,
                companyCostSnapshot,
                branchCostSnapshot,
                sellingPriceSnapshot,
                ...(includePricingMultipliers
                  ? { companyMultiplierSnapshot, branchMultiplierSnapshot, effectiveMultiplierSnapshot }
                  : {}),
              }
            : requester.role === UserRole.COMPANY_ADMIN
              ? {
                  branchCostSnapshot,
                  sellingPriceSnapshot,
                  ...(includePricingMultipliers ? { branchMultiplierSnapshot } : {}),
                }
            : {}),
          companyName: this.optionalText(raw.read_companyName),
          branchName: this.optionalText(raw.read_branchName),
          designNo: this.optionalText(raw.read_designNo),
          designName: this.optionalText(raw.read_designName),
          designVersion: this.optionalText(raw.read_designVersion),
          company: company ? { id: company.id, companyName: company.companyName } : null,
          branch: branch ? { id: branch.id, name: branch.name, companyId: branch.companyId } : null,
          design: design
            ? { id: design.id, designNo: design.designNo, designName: design.designName, version: design.version }
            : null,
          salesRep: salesRep
            ? { id: salesRep.id, firstName: salesRep.firstName, lastName: salesRep.lastName, email: salesRep.email, role: salesRep.role }
            : null,
          costPrice: await this.resolveVisibleCostPrice(order, requester),
          salesRepName,
          salesRepEmail: this.optionalText(raw.read_salesRepEmail),
          assignedUserId: order.salesRepId,
          assignedUserName: salesRepName,
          assignedUserRole,
          branchManagerName,
          designImageUrl,
        };
      }),
    );
  }

  async generateOrderPdf(id: number, requester: AuthUser): Promise<{ buffer: Buffer; fileName: string }> {
    const order = await this.findOne(Number(id), requester) as unknown as Order & {
      companyName?: string | null;
      branchName?: string | null;
      designNo?: string | null;
      designName?: string | null;
      salesRepName?: string | null;
      salesRepEmail?: string | null;
    };
    const orderNo = this.optionalText(order.orderNumber) || 'order';
    const safeOrderNo = orderNo.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'order';
    return {
      buffer: await this.buildOrderSummaryPdf(order),
      fileName: `${safeOrderNo}-summary.pdf`,
    };
  }

  async create(dto: CreateOrderDto, requester: AuthUser) {
    const requestedBranchId = dto.branchId || requester.branchId || null;
    const branch = requestedBranchId
      ? await this.branchRepo.findOne({ where: { id: requestedBranchId } })
      : null;
    if (requestedBranchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }

    const requestedCompanyId = dto.companyId || requester.companyId || null;
    const effectiveCompanyId = branch?.companyId || requestedCompanyId;
    const effectiveBranchId = branch?.id || requestedBranchId;

    if (!effectiveCompanyId) {
      throw new BadRequestException('Company is required');
    }
    if (!effectiveBranchId) {
      throw new BadRequestException('Branch is required');
    }

    if (effectiveCompanyId) {
      const company = await this.companyRepo.findOne({ where: { id: effectiveCompanyId } });
      if (!company) {
        throw new BadRequestException('Selected company not found');
      }
    }

    let design: Design | null = null;
    if (dto.designId) {
      design = await this.designRepo.findOne({ where: { id: dto.designId } });
      if (!design) {
        throw new NotFoundException('Design not found');
      }
      this.assertDesignScope(design, requester, {
        companyId: effectiveCompanyId,
        branchId: effectiveBranchId,
      });
    }

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: effectiveCompanyId ?? undefined,
      branchId: effectiveBranchId ?? undefined,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const assignedUserRole = dto.salesRepId
        ? 'SALES_REP'
        : dto.assignedUserRole;
      const selectedSalesRep = await this.resolveCreateOrderSalesRep(dto.salesRepId, requester, {
        companyId: effectiveCompanyId,
        branchId: effectiveBranchId,
      }, assignedUserRole);
      const { orderNumber } = await this.getNextOrderNumber();
      const requestedStatus = dto.orderType === 'ORDER' ? undefined : dto.status;
      const createStatusUser = requester.role === UserRole.BRANCH_MANAGER ? requester : selectedSalesRep || requester;
      const computedStatus = await this.resolveCreateStatus(requestedStatus, createStatusUser);
      if (!this.isAutoApprovedCreateStatus(computedStatus, createStatusUser)) {
        await this.assertOrderStatusChangeAllowed({ status: OrderStatus.QUOTE, salesRepId: selectedSalesRep?.id || requester.id }, requester, computedStatus);
      }
      const shippingFields = {
        shipDate: dto.shipDate?.trim() || null,
        shipVia: dto.shipVia?.trim() || null,
        trackingNo: dto.trackingNo?.trim() || null,
        invoiceNo: dto.invoiceNo?.trim() || null,
      };
      if (computedStatus === OrderStatus.COMPLETED) {
        this.assertCompletedShippingFields(shippingFields);
      }
      const order = this.orderRepo.create({
        orderNumber,
        companyId: effectiveCompanyId ?? null,
        branchId: effectiveBranchId ?? null,
        designId: dto.designId != null ? dto.designId : null,
        salesRepId: selectedSalesRep?.id || requester.id,
        deliveryDate: this.normalizeFutureDeliveryDate(dto.deliveryDate, new Date(), { defaultOffsetDays: 28 }),
        quantity: dto.quantity ?? 1,
        price: dto.price !== undefined ? this.roundMoney(this.toNumber(dto.price)) : pricing.finalPrice,
        baseCostSnapshot: this.roundMoney(pricing.baseCost),
        companyCostSnapshot: this.roundMoney(pricing.companyPrice),
        companyMultiplierSnapshot: this.roundMultiplierForSnapshot(pricing.companyMultiplier),
        branchCostSnapshot: this.roundMoney(pricing.finalPrice),
        branchMultiplierSnapshot: this.roundMultiplierForSnapshot(pricing.branchMultiplier),
        effectiveMultiplierSnapshot: this.roundMultiplierForSnapshot(pricing.effectiveMultiplier),
        shortDescription: dto.shortDescription?.trim() || null,
        selectedOptions: this.normalizeSelectedOptions(dto.selectedOptions),
        customerName: dto.customerName?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        customerEmail: dto.customerEmail?.trim() || null,
        purchaseOrderNumber: dto.purchaseOrderNumber?.trim() || null,
        notes: dto.notes?.trim() || null,
        status: computedStatus,
        completedAt: computedStatus === OrderStatus.COMPLETED ? new Date() : null,
        ...shippingFields,
        isActive: true,
      });
      order.sellingPriceSnapshot = this.roundMoney(order.price);

      try {
        const saved = await this.orderRepo.save(order);
        await this.recordOrderHistory(saved, 'ADD', requester, [], `Order ${saved.orderNumber} was created`);
        await this.safeTrackOrderCreated(saved);
        await this.safeNotifyOrderCreated(saved, requester);
        return this.findOne(saved.id, requester);
      } catch (error: any) {
        const isDuplicate =
          error?.code === 'ER_DUP_ENTRY' ||
          String(error?.message || '').includes('Duplicate entry');
        if (isDuplicate && attempt < 2) {
          continue;
        }

        const isBadField =
          error?.code === 'ER_BAD_FIELD_ERROR' ||
          String(error?.message || '').includes('Unknown column');

        if (isBadField && attempt < 2) {
          this.logger.warn('Detected missing order column in DB, attempting auto column patch...');
          await this.ensureOrderTableColumns();
          continue;
        }

        this.logger.error(`Failed to create order (attempt ${attempt + 1}): ${error?.message || error}`, error?.stack);
        throw new BadRequestException(error?.message || 'Unable to create order. Please try again.');
      }
    }

    throw new BadRequestException('Unable to generate unique order number. Please retry.');
  }

  private async resolveCreateOrderSalesRep(
    salesRepId: number | undefined,
    requester: AuthUser,
    scope: { companyId: number | null; branchId: number | null },
    assignedUserRole?: 'SALES_REP' | 'BRANCH_MANAGER',
  ): Promise<User | null> {
    if (salesRepId) {
      const expectedRole = assignedUserRole === 'BRANCH_MANAGER'
        ? UserRole.BRANCH_MANAGER
        : UserRole.SALES_REP;
      return this.resolveOrderSalesRep(salesRepId, scope, expectedRole);
    }

    if (requester.role === UserRole.SALES_REP || requester.role === UserRole.BRANCH_MANAGER) {
      return this.resolveOrderSalesRep(requester.id, scope, requester.role);
    }

    throw new BadRequestException('An assigned Sales Rep or Branch Manager is required');
  }
  private async resolveOrderSalesRep(
    salesRepId: number | undefined,
    scope: { companyId: number | null; branchId: number | null },
    assignedUserRole: UserRole.SALES_REP | UserRole.BRANCH_MANAGER = UserRole.SALES_REP,
  ): Promise<User | null> {
    const normalizedSalesRepId = salesRepId;

    const salesRep = await this.userRepo.findOne({ where: { id: normalizedSalesRepId } });
    if (!salesRep || salesRep.role !== assignedUserRole || !salesRep.isActive) {
      throw new BadRequestException(`Selected ${assignedUserRole === UserRole.BRANCH_MANAGER ? 'branch manager' : 'sales rep'} not found`);
    }
    if (scope.companyId && salesRep.companyId !== scope.companyId) {
      throw new BadRequestException('Selected user does not belong to the selected company');
    }
    if (scope.branchId && salesRep.branchId !== scope.branchId) {
      throw new BadRequestException('Selected user does not belong to the selected branch');
    }
    return salesRep;
  }

  private async resolveCreateStatus(requestedStatus: OrderStatus | undefined, requester: AuthUser | User): Promise<OrderStatus> {
    if (requestedStatus === OrderStatus.QUOTE) {
      return OrderStatus.QUOTE;
    }

    if (requestedStatus) {
      return requestedStatus;
    }

    if (requester.role === UserRole.SALES_REP || requester.role === UserRole.BRANCH_MANAGER) {
      return await this.hasAutoApprovalPermission(requester.id)
        ? OrderStatus.APPROVED
        : OrderStatus.PENDING_APPROVAL;
    }

    if (this.isOrderApprover(requester)) {
      return OrderStatus.APPROVED;
    }

    return OrderStatus.QUOTE;
  }

  private isAutoApprovedCreateStatus(status: OrderStatus, user: Pick<AuthUser | User, 'role'>): boolean {
    return status === OrderStatus.APPROVED
      && (user.role === UserRole.SALES_REP || user.role === UserRole.BRANCH_MANAGER);
  }

  private async hasAutoApprovalPermission(userId: number | string): Promise<boolean> {
    return this.hasOrderActionPermission(userId, 'order.require_approval');
  }

  private async hasMobileStatusUpdatePermission(userId: number | string): Promise<boolean> {
    return this.hasOrderActionPermission(userId, 'mobile.order.status_update');
  }

  private async hasOrderActionPermission(userId: number | string, actionKey: string): Promise<boolean> {
    const row = await this.userPermissionActionRepo.findOne({
      where: {
        userId: Number(userId),
        actionKey,
      },
      select: ['id'],
    });
    return Boolean(row);
  }

  private async assertOrderActionPermission(requester: AuthUser, actionKey: string): Promise<void> {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (!await this.hasOrderActionPermission(requester.id, actionKey)) {
      throw new ForbiddenException(`Missing required permission: ${actionKey}`);
    }
  }

  async update(id: number, dto: UpdateOrderDto, requester: AuthUser) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['company', 'branch', 'branch.branchManager', 'design', 'salesRep'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = order.status;
    const beforeSnapshot = this.getOrderAuditSnapshot(order);
    const hasStatusChange = this.hasOrderStatusChange(dto, order.status);
    const hasDetailChanges = this.hasOrderDetailChanges(dto, hasStatusChange);
    if (hasDetailChanges) {
      await this.assertOrderActionPermission(requester, 'order.edit');
      this.assertOrderEditable(order, requester);
    }
    if (hasStatusChange) {
      await this.assertOrderActionPermission(requester, 'order.status_update');
    }
    const requestedBranchId = dto.branchId !== undefined
      ? dto.branchId
      : order.branchId || requester.branchId || null;
    const branch = requestedBranchId
      ? await this.branchRepo.findOne({ where: { id: requestedBranchId } })
      : null;
    if (requestedBranchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }

    const requestedCompanyId = dto.companyId !== undefined
      ? dto.companyId
      : order.companyId || requester.companyId || null;
    const effectiveCompanyId = branch?.companyId || requestedCompanyId;
    const effectiveBranchId = branch?.id || requestedBranchId;

    let company: Company | null = null;
    if (effectiveCompanyId) {
      company = await this.companyRepo.findOne({ where: { id: effectiveCompanyId } });
      if (!company) {
        throw new BadRequestException('Selected company not found');
      }
    }

    let design: Design | null = null;
    if (dto.designId) {
      design = await this.designRepo.findOne({ where: { id: dto.designId } });
      if (!design) {
        throw new NotFoundException('Design not found');
      }
      this.assertDesignScope(design, requester, {
        companyId: effectiveCompanyId,
        branchId: effectiveBranchId,
      });
      order.designId = dto.designId != null ? dto.designId : null;
    } else if (order.designId) {
      design = await this.designRepo.findOne({ where: { id: order.designId } });
      if (design) {
        this.assertDesignScope(design, requester, {
          companyId: effectiveCompanyId,
          branchId: effectiveBranchId,
        });
      }
    }

    if (dto.companyId !== undefined || dto.branchId !== undefined) {
      order.companyId = effectiveCompanyId ?? null;
      order.company = company;
    }
    if (dto.branchId !== undefined) {
      order.branchId = effectiveBranchId ?? null;
      order.branch = branch;
    }
    if (dto.salesRepId !== undefined) {
      const assignedUserRole = dto.salesRepId
        ? 'SALES_REP'
        : dto.assignedUserRole;
      const selectedSalesRep = await this.resolveCreateOrderSalesRep(dto.salesRepId, requester, {
        companyId: effectiveCompanyId,
        branchId: effectiveBranchId,
      }, assignedUserRole);
      order.salesRepId = selectedSalesRep?.id || null;
      order.salesRep = selectedSalesRep;
    }
    if (dto.deliveryDate !== undefined) {
      order.deliveryDate = this.normalizeFutureDeliveryDate(dto.deliveryDate, order.createdAt);
    }
    if (dto.quantity !== undefined) {
      order.quantity = dto.quantity;
    }
    const pricing = await this.calculateOrderPrice({
      design,
      companyId: order.companyId != null ? order.companyId : undefined,
      branchId: order.branchId != null ? order.branchId : undefined,
    });
    order.price = dto.price !== undefined ? this.roundMoney(this.toNumber(dto.price)) : pricing.finalPrice;
    if (dto.shortDescription !== undefined) {
      order.shortDescription = dto.shortDescription?.trim() || null;
    }
    if (dto.selectedOptions !== undefined) {
      order.selectedOptions = this.normalizeSelectedOptions(dto.selectedOptions);
    }
    if (dto.customerName !== undefined) {
      order.customerName = dto.customerName?.trim() || null;
    }
    if (dto.customerPhone !== undefined) {
      order.customerPhone = dto.customerPhone?.trim() || null;
    }
    if (dto.customerEmail !== undefined) {
      order.customerEmail = dto.customerEmail?.trim() || null;
    }
    if (dto.purchaseOrderNumber !== undefined) {
      order.purchaseOrderNumber = dto.purchaseOrderNumber?.trim() || null;
    }
    if (dto.notes !== undefined) {
      order.notes = dto.notes?.trim() || null;
    }
    if (dto.shipDate !== undefined) {
      order.shipDate = dto.shipDate?.trim() || null;
    }
    if (dto.shipVia !== undefined) {
      order.shipVia = dto.shipVia?.trim() || null;
    }
    if (dto.trackingNo !== undefined) {
      order.trackingNo = dto.trackingNo?.trim() || null;
    }
    if (dto.invoiceNo !== undefined) {
      order.invoiceNo = dto.invoiceNo?.trim() || null;
    }
    if (dto.orderType === 'QUOTE') {
      await this.assertOrderStatusChangeAllowed(order, requester, OrderStatus.QUOTE);
      order.status = OrderStatus.QUOTE;
      order.completedAt = null;
    } else if (dto.orderType === 'ORDER' && order.status === OrderStatus.QUOTE) {
      const selectedSalesRep = order.salesRepId
        ? await this.userRepo.findOne({ where: { id: order.salesRepId } })
        : null;
      const createStatusUser = requester.role === UserRole.BRANCH_MANAGER ? requester : selectedSalesRep || requester;
      const nextStatus = await this.resolveCreateStatus(undefined, createStatusUser);
      if (!this.isAutoApprovedCreateStatus(nextStatus, createStatusUser)) {
        await this.assertOrderStatusChangeAllowed(order, requester, nextStatus);
      }
      order.status = nextStatus;
      order.completedAt = order.status === OrderStatus.COMPLETED ? new Date() : null;
    } else if (dto.status !== undefined) {
      await this.assertOrderStatusChangeAllowed(order, requester, dto.status);
      if (dto.status === OrderStatus.COMPLETED) {
        this.assertCompletedShippingFields(order);
      }
      order.status = dto.status;
      if (dto.status === OrderStatus.COMPLETED && previousStatus !== OrderStatus.COMPLETED) {
        order.completedAt = new Date();
      } else if (dto.status !== OrderStatus.COMPLETED) {
        order.completedAt = null;
      }
    }

    try {
      const saved = await this.orderRepo.save(order);
      await this.recordOrderUpdateHistory(saved, beforeSnapshot, requester);
      await this.safeTrackOrderTransition(saved, previousStatus);
      await this.safeNotifyOrderTransition(saved, previousStatus, requester);
      return this.findOne(saved.id, requester);
    } catch (error: any) {
      const isBadField =
        error?.code === 'ER_BAD_FIELD_ERROR' ||
        String(error?.message || '').includes('Unknown column');
      if (isBadField) {
        this.logger.warn('Detected missing order column on update, running column patch...');
        await this.ensureOrderTableColumns();
        const saved = await this.orderRepo.save(order);
        await this.recordOrderUpdateHistory(saved, beforeSnapshot, requester);
        await this.safeTrackOrderTransition(saved, previousStatus);
        await this.safeNotifyOrderTransition(saved, previousStatus, requester);
        return this.findOne(saved.id, requester);
      }
      this.logger.error(`Failed to update order: ${error?.message || error}`, error?.stack);
      throw new BadRequestException(error?.message || 'Unable to update order.');
    }
  }

  async getPricePreview(params: { designId: number; companyId: number; branchId: number }, requester: AuthUser) {
    const design = await this.designRepo.findOne({ where: { id: params.designId } });
    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const branchId = params.branchId || requester.branchId || undefined;
    const branch = branchId
      ? await this.branchRepo.findOne({ where: { id: branchId } })
      : null;
    if (branchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }
    const effectiveCompanyId = branch?.companyId || params.companyId || requester.companyId || undefined;
    this.assertDesignScope(design, requester, {
      companyId: effectiveCompanyId || null,
      branchId: branch?.id || branchId || null,
    });

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: effectiveCompanyId,
      branchId: branch?.id || branchId,
    });

    if (requester.role === UserRole.SUPER_ADMIN) {
      return pricing;
    }
    if (requester.role === UserRole.COMPANY_ADMIN) {
      return {
        branchMultiplier: pricing.branchMultiplier,
        branchMultiplierSource: pricing.branchMultiplierSource,
        branchCost: pricing.finalPrice,
        finalPrice: pricing.finalPrice,
      };
    }
    return { finalPrice: pricing.finalPrice };
  }

  async updateActiveStatus(id: number, isActive: boolean, requester: AuthUser) {
    const qb = this.createOrderReadQuery().where('order.id = :id', { id });
    this.applyScopeFilter(qb, requester);
    const order = await qb.getOne();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertOrderEditable(order, requester);
    const beforeSnapshot = this.getOrderAuditSnapshot(order);
    order.isActive = isActive;
    const saved = await this.orderRepo.save(order);
    await this.recordOrderUpdateHistory(saved, beforeSnapshot, requester);
    return this.findOne(saved.id, requester);
  }

  async getHistory(id: number, requester: AuthUser) {
    if (!this.isPowerOrderUser(requester)) {
      throw new ForbiddenException('Only internal reps and super admin can view order history');
    }

    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    this.assertReadScope(order, requester);

    const history = await this.orderHistoryRepo.find({
      where: { orderId: id },
      order: { performedAt: 'DESC' },
      take: 200,
    });
    return this.withResolvedHistoryNames(history);
  }

  private async withResolvedHistoryNames(history: OrderHistory[]): Promise<OrderHistory[]> {
    const collectIds = (field: 'companyId' | 'branchId' | 'salesRepId') =>
      Array.from(new Set(
        history.flatMap((row) => (row.changes || []))
          .filter((change) => change.field === field)
          .flatMap((change) => [change.oldValue, change.newValue])
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ));

    const [companies, branches, salesReps] = await Promise.all([
      this.companyRepo.find({ where: { id: In(collectIds('companyId')) } }),
      this.branchRepo.find({ where: { id: In(collectIds('branchId')) } }),
      this.userRepo.find({ where: { id: In(collectIds('salesRepId')) } }),
    ]);
    const companyNames = new Map(companies.map((company) => [company.id, company.companyName]));
    const branchNames = new Map(branches.map((branch) => [branch.id, branch.name]));
    const salesRepNames = new Map(salesReps.map((salesRep) => {
      const name = `${salesRep.firstName || ''} ${salesRep.lastName || ''}`.trim();
      return [salesRep.id, name || salesRep.email || String(salesRep.id)];
    }));
    const referenceFields = {
      companyId: { label: 'Company', names: companyNames },
      branchId: { label: 'Branch', names: branchNames },
      salesRepId: { label: 'Sales Rep', names: salesRepNames },
    } as const;

    return history.map((row) => ({
      ...row,
      changes: row.changes?.map((change) => {
        const reference = referenceFields[change.field as keyof typeof referenceFields];
        if (!reference) return change;
        const resolveName = (value: unknown) => reference.names.get(Number(value)) || value;
        return {
          field: reference.label,
          oldValue: resolveName(change.oldValue),
          newValue: resolveName(change.newValue),
        };
      }) || null,
    }));
  }

  async getSummary(requester: AuthUser) {
    const baseQuery = this.orderRepo.createQueryBuilder('order');
    this.applyScopeFilter(baseQuery, requester);
    baseQuery.andWhere('order.isActive = :isActive', { isActive: true });

    const completedStatus = OrderStatus.COMPLETED;
    const nonCompletedStatuses = [OrderStatus.QUOTE, OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION];

    const todayRange = 'CURRENT_DATE AND order.createdAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)';
    const yesterdayRange = 'DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) AND order.createdAt < CURRENT_DATE';
    const weekStart = 'DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY)';
    const weekEnd = 'DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)';
    const completedTodayRange = 'CURRENT_DATE AND order.completedAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)';
    const completedYesterdayRange = 'DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) AND order.completedAt < CURRENT_DATE';
    const completedThisMonthRange = "DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND order.completedAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)";
    const completedLastMonthRange = "DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH) AND order.completedAt < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01')";

    const summaryRow = await baseQuery.clone()
      .select('COUNT(CASE WHEN order.status IN (:...nonCompletedStatuses) THEN 1 END)', 'activeOrders')
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.createdAt >= ${todayRange} THEN 1 ELSE 0 END), 0)`,
        'ordersReceivedToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.createdAt >= ${yesterdayRange} THEN 1 ELSE 0 END), 0)`,
        'ordersReceivedYesterday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.deliveryDate IS NOT NULL AND DATE(order.deliveryDate) = CURRENT_DATE THEN 1 ELSE 0 END), 0)`,
        'ordersDueToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${weekStart} AND order.completedAt < ${weekEnd} THEN order.price ELSE 0 END), 0)`,
        'salesThisWeek',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedTodayRange} THEN order.price ELSE 0 END), 0)`,
        'salesToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedYesterdayRange} THEN order.price ELSE 0 END), 0)`,
        'salesYesterday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedThisMonthRange} THEN order.price ELSE 0 END), 0)`,
        'salesThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedLastMonthRange} THEN order.price ELSE 0 END), 0)`,
        'salesLastMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedTodayRange} THEN 1 ELSE 0 END), 0)`,
        'ordersToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus AND order.completedAt >= ${completedThisMonthRange} THEN 1 ELSE 0 END), 0)`,
        'ordersThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status = :completedStatus THEN order.price ELSE 0 END), 0)`,
        'branchRevenueTotal',
      )
      .addSelect(`SUM(CASE WHEN order.status = :quoteStatus THEN 1 ELSE 0 END)`, 'quoteCount')
      .addSelect(`SUM(CASE WHEN order.status = :pendingStatus THEN 1 ELSE 0 END)`, 'pendingCount')
      .addSelect(`SUM(CASE WHEN order.status = :approvedStatus THEN 1 ELSE 0 END)`, 'approvedCount')
      .addSelect(`SUM(CASE WHEN order.status = :productionStatus THEN 1 ELSE 0 END)`, 'productionCount')
      .addSelect(`SUM(CASE WHEN order.status = :completedStatus THEN 1 ELSE 0 END)`, 'completedCount')
      .addSelect(`SUM(CASE WHEN order.status = :cancelledStatus THEN 1 ELSE 0 END)`, 'cancelledCount')
      .setParameters({
        quoteStatus: OrderStatus.QUOTE,
        pendingStatus: OrderStatus.PENDING_APPROVAL,
        approvedStatus: OrderStatus.APPROVED,
        productionStatus: OrderStatus.IN_PRODUCTION,
        completedStatus,
        nonCompletedStatuses,
        cancelledStatus: OrderStatus.CANCELLED,
      })
      .getRawOne();

    const activeOrders = this.toNumber(summaryRow?.activeOrders ?? 0);
    const ordersReceivedToday = this.toNumber(summaryRow?.ordersReceivedToday ?? 0);
    const ordersReceivedYesterday = this.toNumber(summaryRow?.ordersReceivedYesterday ?? 0);
    const ordersDueToday = this.toNumber(summaryRow?.ordersDueToday ?? 0);
    const salesThisWeek = this.toNumber(summaryRow?.salesThisWeek ?? 0);
    const salesToday = this.toNumber(summaryRow?.salesToday ?? 0);
    const salesYesterday = this.toNumber(summaryRow?.salesYesterday ?? 0);
    const salesThisMonth = this.toNumber(summaryRow?.salesThisMonth ?? 0);
    const salesLastMonth = this.toNumber(summaryRow?.salesLastMonth ?? 0);
    const ordersToday = this.toNumber(summaryRow?.ordersToday ?? 0);
    const ordersThisMonth = this.toNumber(summaryRow?.ordersThisMonth ?? 0);
    const branchRevenueTotal = this.toNumber(summaryRow?.branchRevenueTotal ?? 0);

    const pipeline = {
      pending: this.toNumber(summaryRow?.pendingCount ?? 0) + this.toNumber(summaryRow?.quoteCount ?? 0),
      approved: this.toNumber(summaryRow?.approvedCount ?? 0),
      inProduction: this.toNumber(summaryRow?.productionCount ?? 0),
      completed: this.toNumber(summaryRow?.completedCount ?? 0),
      cancelled: this.toNumber(summaryRow?.cancelledCount ?? 0),
    };
    const pendingApprovalOrders = this.toNumber(summaryRow?.pendingCount ?? 0);

    let branchSalesRepCount = 0;
    if (requester.role === UserRole.BRANCH_MANAGER && requester.companyId && requester.branchId) {
      branchSalesRepCount = await this.userRepo
        .createQueryBuilder('user')
        .where('user.companyId = :companyId', { companyId: requester.companyId })
        .andWhere('user.branchId = :branchId', { branchId: requester.branchId })
        .andWhere('user.role = :role', { role: UserRole.SALES_REP })
        .andWhere('user.isActive = :isActive', { isActive: true })
        .getCount();
    }

    const calcTrend = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    return {
      activeOrders,
      ordersReceivedToday,
      ordersDueToday,
      salesThisWeek: this.roundMoney(salesThisWeek),
      salesToday,
      todayTrend: calcTrend(salesToday, salesYesterday),
      salesThisMonth,
      monthlyTrend: calcTrend(salesThisMonth, salesLastMonth),
      ordersToday,
      ordersThisMonth,
      receivedTrend: calcTrend(ordersReceivedToday, ordersReceivedYesterday),
      pipeline,
      branchRevenueTotal,
      branchSalesRepCount,
      pendingApprovalOrders,
    };
  }
  async getPeriodSummary(requester: AuthUser) {
    const fulfilledStatuses = [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.COMPLETED];
    const countExpr = (condition: string) =>
      `COALESCE(SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END), 0)`;
    const amountExpr = (condition: string) =>
      `COALESCE(SUM(CASE WHEN ${condition} THEN order.price ELSE 0 END), 0)`;
    const periods = {
      today: 'order.createdAt >= CURRENT_DATE AND order.createdAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)',
      weekly:
        'order.createdAt >= DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY) AND order.createdAt < DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)',
      monthly:
        "order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)",
      annually:
        "order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-01-01'), INTERVAL 1 YEAR)",
    };
    const fulfilledCondition = 'order.status IN (:...fulfilledStatuses)';

    const qb = this.orderRepo.createQueryBuilder('order');
    this.applyScopeFilter(qb, requester);

    const row = await qb
      .andWhere('order.isActive = :isActive', { isActive: true })
      .select(countExpr(`${fulfilledCondition} AND ${periods.today}`), 'todayCount')
      .addSelect(amountExpr(`${fulfilledCondition} AND ${periods.today}`), 'todayAmount')
      .addSelect(countExpr(`${fulfilledCondition} AND ${periods.weekly}`), 'weeklyCount')
      .addSelect(amountExpr(`${fulfilledCondition} AND ${periods.weekly}`), 'weeklyAmount')
      .addSelect(countExpr(`${fulfilledCondition} AND ${periods.monthly}`), 'monthlyCount')
      .addSelect(amountExpr(`${fulfilledCondition} AND ${periods.monthly}`), 'monthlyAmount')
      .addSelect(countExpr(`${fulfilledCondition} AND ${periods.annually}`), 'annuallyCount')
      .addSelect(amountExpr(`${fulfilledCondition} AND ${periods.annually}`), 'annuallyAmount')
      .setParameter('fulfilledStatuses', fulfilledStatuses)
      .getRawOne<Record<string, string | number | null>>();

    const read = (key: string) => this.toNumber(row?.[key] ?? 0);
    return {
      today: { count: read('todayCount'), totalAmount: this.roundMoney(read('todayAmount')) },
      weekly: { count: read('weeklyCount'), totalAmount: this.roundMoney(read('weeklyAmount')) },
      monthly: { count: read('monthlyCount'), totalAmount: this.roundMoney(read('monthlyAmount')) },
      annually: { count: read('annuallyCount'), totalAmount: this.roundMoney(read('annuallyAmount')) },
    };
  }

  async getTrends(requester: AuthUser) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const nonCompletedStatuses = [OrderStatus.QUOTE, OrderStatus.PENDING_APPROVAL, OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION];

    const ordersQb = this.orderRepo
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', {
        startDate,
        endDate,
      })
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere('order.status IN (:...nonCompletedStatuses)', { nonCompletedStatuses })
      .groupBy('date')
      .orderBy('date', 'ASC');

    this.applyScopeFilter(ordersQb, requester);

    const salesQb = this.orderRepo
      .createQueryBuilder('order')
      .select('DATE(order.completedAt)', 'date')
      .addSelect('SUM(order.price)', 'sales')
      .where('order.completedAt >= :startDate AND order.completedAt <= :endDate', {
        startDate,
        endDate,
      })
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere('order.status = :completedStatus', { completedStatus: OrderStatus.COMPLETED })
      .groupBy('date')
      .orderBy('date', 'ASC');

    this.applyScopeFilter(salesQb, requester);

    const [orderRows, salesRows] = await Promise.all([ordersQb.getRawMany(), salesQb.getRawMany()]);
    const byDate = new Map<string, { orders: number; sales: number }>();
    const readDateKey = (raw: unknown) => {
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
      if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
        const parsed = new Date(trimmed);
        if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
      }
      return '';
    };

    orderRows.forEach((row: any) => {
      const dateKey = readDateKey(row.date);
      if (!dateKey) return;
      const current = byDate.get(dateKey) || { orders: 0, sales: 0 };
      current.orders = this.toNumber(row.orders);
      byDate.set(dateKey, current);
    });

    salesRows.forEach((row: any) => {
      const dateKey = readDateKey(row.date);
      if (!dateKey) return;
      const current = byDate.get(dateKey) || { orders: 0, sales: 0 };
      current.sales = this.toNumber(row.sales);
      byDate.set(dateKey, current);
    });

    const points = [];
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const found = byDate.get(key) || { orders: 0, sales: 0 };
      points.push({
        date: key,
        orders: found.orders,
        sales: this.roundMoney(found.sales),
      });
    }

    return { points };
  }
  private resolveScope(requester: AuthUser, companyId?: number, branchId?: number) {
    const normalizedCompanyId = companyId;
    const normalizedBranchId = branchId;

    if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
      return { companyId: normalizedCompanyId || null, branchId: normalizedBranchId || null };
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (normalizedCompanyId && normalizedCompanyId !== requester.companyId) {
      throw new ForbiddenException('You cannot access another company data');
    }

    if (requester.branchId) {
      if (normalizedBranchId && normalizedBranchId !== requester.branchId) {
        throw new ForbiddenException('You cannot access another branch data');
      }
      return { companyId: requester.companyId, branchId: requester.branchId };
    }

    return { companyId: requester.companyId, branchId: normalizedBranchId || null };
  }

  private applyScopeFilter(qb: any, requester: AuthUser, companyId?: number, branchId?: number): void {
    const normalizedCompanyId = companyId;
    const normalizedBranchId = branchId;

    if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
      if (normalizedCompanyId) {
        qb.andWhere('order.companyId = :companyId', { companyId: normalizedCompanyId });
      }
      if (normalizedBranchId) {
        qb.andWhere('order.branchId = :branchId', { branchId: normalizedBranchId });
      }
      return;
    }

    if (!requester.companyId) {
      qb.andWhere('1 = 0');
      return;
    }

    qb.andWhere('order.companyId = :scopeCompanyId', { scopeCompanyId: requester.companyId });

    if (requester.branchId) {
      qb.andWhere('order.branchId = :scopeBranchId', {
        scopeBranchId: requester.branchId,
      });
    }

    if (!requester.branchId && normalizedBranchId) {
      qb.andWhere('order.branchId = :scopeBranchId', { scopeBranchId: normalizedBranchId });
    }

    if (requester.role === UserRole.SALES_REP) {
      qb.andWhere('order.salesRepId = :scopeSalesRepId', { scopeSalesRepId: requester.id });
    }
  }

  private async getOrderStatusCounts(qb: any): Promise<Partial<Record<OrderStatus, number>>> {
    const rows = await qb
      .clone()
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany() as Array<{ status: OrderStatus; count: string | number }>;

    return rows.reduce((acc: Partial<Record<OrderStatus, number>>, row) => {
      if (row.status) {
        acc[row.status] = this.toNumber(row.count);
      }
      return acc;
    }, {});
  }

  private applyCreatedPeriodFilter(
    qb: any,
    period?: 'TODAY' | 'WEEKLY' | 'MONTHLY' | 'ANNUALLY',
  ): void {
    if (period === 'TODAY') {
      qb.andWhere('order.createdAt >= CURRENT_DATE AND order.createdAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)');
      return;
    }
    if (period === 'WEEKLY') {
      qb.andWhere(
        'order.createdAt >= DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY) AND order.createdAt < DATE_ADD(DATE_SUB(CURRENT_DATE, INTERVAL WEEKDAY(CURRENT_DATE) DAY), INTERVAL 7 DAY)',
      );
      return;
    }
    if (period === 'MONTHLY') {
      qb.andWhere(
        "order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH)",
      );
      return;
    }
    if (period === 'ANNUALLY') {
      qb.andWhere(
        "order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-01-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-01-01'), INTERVAL 1 YEAR)",
      );
    }
  }

  private async buildOrderSummaryPdf(order: Order & Record<string, any>): Promise<Buffer> {
    const browser = await puppeteer.launch({
      executablePath: this.optionalText(process.env.PUPPETEER_EXECUTABLE_PATH) || undefined,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(this.buildOrderSummaryHtml(order), { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private buildOrderSummaryHtml(order: Order & Record<string, any>): string {
    const money = this.formatPdfMoney(order.price);
    const designLabel = this.optionalText(order.designName) || this.optionalText(order.design?.designName)
      || this.optionalText(order.designNo) || this.optionalText(order.design?.designNo) || '-';
    const itemDetails = this.splitPdfLines(order.shortDescription, 90);
    const notes = this.optionalText(order.notes);
    const html = (value: unknown) => this.escapeHtml(this.optionalText(value) || '-');
    const detailRows = itemDetails.map((row) => `<div>${this.escapeHtml(row)}</div>`).join('');

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #241b16;
      background: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.35;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 18mm 15mm 14mm;
      display: flex;
      flex-direction: column;
    }
    .brand-bar {
      height: 20mm;
      padding: 5mm 7mm;
      color: #fff;
      background: #1d1713;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.4px; }
    .doc-title { text-align: right; }
    .doc-title strong { display: block; font-size: 18px; }
    .doc-title span { display: block; margin-top: 2px; color: #d9c8b5; font-size: 10px; }
    .order-head {
      margin-top: 9mm;
      padding-bottom: 6mm;
      border-bottom: 1px solid #ddcfc0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10mm;
    }
    .order-no { font-size: 18px; font-weight: 800; }
    .status {
      min-width: 38mm;
      padding: 3mm 5mm;
      text-align: center;
      color: #6d451f;
      background: #fff7e8;
      border: 1px solid #d8bd8f;
      font-weight: 800;
    }
    .grid {
      margin-top: 8mm;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8mm;
    }
    .panel {
      min-height: 31mm;
      padding: 6mm;
      background: #fbf8f4;
      border: 1px solid #e5d8ca;
    }
    .section-title {
      margin: 0 0 4mm;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm 9mm;
    }
    .fields.single { grid-template-columns: 1fr; }
    .label {
      color: #7f7165;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .value {
      margin-top: 1mm;
      min-width: 0;
      overflow-wrap: anywhere;
      font-size: 11px;
      font-weight: 700;
    }
    .items { margin-top: 10mm; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th {
      padding: 3mm;
      color: #7b6f63;
      border-bottom: 1px solid #dfd2c4;
      font-size: 9px;
      text-align: left;
      text-transform: uppercase;
    }
    td {
      padding: 4.5mm 3mm;
      border-bottom: 1px solid #eee4da;
      vertical-align: top;
    }
    .item-name { font-size: 13px; font-weight: 800; }
    .item-detail {
      margin-top: 2mm;
      color: #4b423b;
      font-size: 10px;
      overflow-wrap: anywhere;
    }
    .qty { width: 22mm; text-align: center; font-weight: 800; }
    .amount { width: 33mm; text-align: right; font-size: 13px; font-weight: 800; }
    .notes {
      margin-top: 9mm;
      padding: 5mm 6mm;
      background: #fcfaf6;
      border: 1px solid #e5d8ca;
    }
    .notes-text {
      margin-top: 2mm;
      color: #4b423b;
      overflow-wrap: anywhere;
    }
    .total-row {
      margin-top: 16mm;
      display: flex;
      justify-content: flex-end;
    }
    .total-box {
      width: 68mm;
      padding: 6mm 7mm;
      background: #fff7e8;
      border: 1px solid #d8bd8f;
    }
    .total-label {
      color: #6d451f;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .total-amount {
      margin-top: 1mm;
      font-size: 22px;
      font-weight: 900;
    }
    .footer {
      margin-top: auto;
      padding-top: 5mm;
      color: #756c63;
      border-top: 1px solid #dfd2c4;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="brand-bar">
      <div class="brand">BLITZ NYC</div>
      <div class="doc-title">
        <strong>Order Summary</strong>
        <span>Generated ${html(this.formatPdfDate(new Date()))}</span>
      </div>
    </section>

    <section class="order-head">
      <div class="order-no">ORDER # ${html(order.orderNumber)}</div>
      <div class="status">${html(this.formatPdfStatus(order.status))}</div>
    </section>

    <section class="grid">
      <div class="panel">
        <h2 class="section-title">Client</h2>
        <div class="fields single">
          <div><div class="label">Name</div><div class="value">${html(order.customerName)}</div></div>
          <div><div class="label">Phone</div><div class="value">${html(order.customerPhone)}</div></div>
          <div><div class="label">Email</div><div class="value">${html(order.customerEmail)}</div></div>
        </div>
      </div>
      <div class="panel">
        <h2 class="section-title">Order Details</h2>
        <div class="fields">
          <div><div class="label">Created</div><div class="value">${html(this.formatPdfDate(order.createdAt))}</div></div>
          <div><div class="label">Purchase Order</div><div class="value">${html(order.purchaseOrderNumber)}</div></div>
          <div><div class="label">Company</div><div class="value">${html(order.companyName || order.company?.companyName)}</div></div>
          <div><div class="label">Branch</div><div class="value">${html(order.branchName || order.branch?.name)}</div></div>
        </div>
      </div>
    </section>

    <section class="items">
      <h2 class="section-title">Order Item</h2>
      <table>
        <thead>
          <tr>
            <th>Design</th>
            <th class="qty">Qty</th>
            <th class="amount">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div class="item-name">${html(designLabel)}</div>
              <div class="item-detail">${detailRows}</div>
            </td>
            <td class="qty">${html(order.quantity || 1)}</td>
            <td class="amount">${html(money)}</td>
          </tr>
        </tbody>
      </table>
    </section>

    ${notes ? `<section class="notes">
      <h2 class="section-title">Notes</h2>
      <div class="notes-text">${this.escapeHtml(notes)}</div>
    </section>` : ''}

    <section class="total-row">
      <div class="total-box">
        <div class="total-label">Total Amount</div>
        <div class="total-amount">${html(money)}</div>
      </div>
    </section>

    <footer class="footer">This document was generated by Blitz NYC.</footer>
  </main>
</body>
</html>`;
  }

  private splitPdfLines(value?: string | null, maxLength = 80): string[] {
    const parts = this.optionalText(value)?.replace(/\s*\|\s*/g, ' - ').split(/\s+-\s+/) || [];
    const normalized = parts.map((part) => part.trim()).filter(Boolean);
    if (!normalized.length) return ['Details: -'];
    return normalized.flatMap((part) => {
      const words = part.split(/\s+/);
      const lines: string[] = [];
      let current = '';
      words.forEach((word) => {
        const next = current ? `${current} ${word}` : word;
        if (next.length > maxLength && current) {
          lines.push(current);
          current = word;
        } else {
          current = next;
        }
      });
      if (current) lines.push(current);
      return lines;
    });
  }

  private escapePdfText(value: string): string {
    return this.normalizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private normalizePdfText(value: string): string {
    return String(value || '')
      .replace(/[–—]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private wrapPdfText(value?: string | null, maxLength = 80): string[] {
    const clean = this.normalizePdfText(this.optionalText(value) || '-').replace(/\s+/g, ' ').trim();
    const words = clean.split(' ');
    const lines: string[] = [];
    let current = '';
    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });
    if (current) lines.push(current);
    return lines;
  }

  private formatPdfMoney(value: unknown): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(this.toNumber(value));
  }

  private formatPdfDate(value?: Date | string | null): string {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return safeDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatPdfStatus(value?: string | null): string {
    const status = String(value || '').replace(/_/g, ' ').trim().toLowerCase();
    return status ? status.replace(/\b\w/g, (char) => char.toUpperCase()) : '-';
  }

  private assertReadScope(order: Order, requester: AuthUser): void {
    if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
      return;
    }

    if (!requester.companyId) {
      throw new NotFoundException('Order not found');
    }

    if (order.companyId && String(order.companyId) !== String(requester.companyId)) {
      throw new NotFoundException('Order not found');
    }

    if (requester.branchId && String(order.branchId) !== String(requester.branchId)) {
      throw new NotFoundException('Order not found');
    }

    if (requester.role === UserRole.SALES_REP && String(order.salesRepId) !== String(requester.id)) {
      throw new NotFoundException('Order not found');
    }
  }

  private isPowerOrderUser(requester: Pick<AuthUser, 'role'>): boolean {
    return requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP;
  }

  private isSuperAdmin(requester: Pick<AuthUser, 'role'>): boolean {
    return requester.role === UserRole.SUPER_ADMIN;
  }

  private isOrderApprover(requester: Pick<AuthUser, 'role'>): boolean {
    return [
      UserRole.COMPANY_ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.INTERNAL_REP,
    ].includes(requester.role);
  }

  private assertOrderEditable(order: Pick<Order, 'status'>, requester: AuthUser): void {
    if (order.status === OrderStatus.CANCELLED) {
      throw new ForbiddenException('Cancelled orders cannot be changed');
    }

    const lockedStatuses = [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.COMPLETED];
    if (lockedStatuses.includes(order.status) && !this.isPowerOrderUser(requester)) {
      throw new ForbiddenException('Only internal reps and super admin can edit orders in this status');
    }
    if (order.status === OrderStatus.COMPLETED && !this.isSuperAdmin(requester)) {
      throw new ForbiddenException('Only super admin can edit completed orders');
    }
  }

  private async assertOrderStatusChangeAllowed(
    order: Pick<Order, 'status' | 'salesRepId'>,
    requester: AuthUser,
    nextStatus: OrderStatus,
  ): Promise<void> {
    if (order.status === nextStatus) {
      if (order.status === OrderStatus.CANCELLED) {
        throw new ForbiddenException('Cancelled orders cannot be changed');
      }
      return;
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new ForbiddenException('Cancelled orders are final and cannot be changed');
    }

    if ([OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.COMPLETED].includes(order.status) && !this.isPowerOrderUser(requester)) {
      throw new ForbiddenException('Only internal reps and super admin can change this order status');
    }
    if (order.status === OrderStatus.COMPLETED && !this.isSuperAdmin(requester)) {
      throw new ForbiddenException('Only super admin can change completed orders');
    }

    const branchManagerCanUpdateStatus = requester.role === UserRole.BRANCH_MANAGER
      && await this.hasMobileStatusUpdatePermission(requester.id);

    if (nextStatus === OrderStatus.APPROVED && !this.isOrderApprover(requester) && !branchManagerCanUpdateStatus) {
      throw new ForbiddenException('Only permitted branch managers, company admins, internal reps and super admin can approve orders');
    }

    if ([OrderStatus.IN_PRODUCTION, OrderStatus.COMPLETED].includes(nextStatus) && !this.isPowerOrderUser(requester)) {
      throw new ForbiddenException('Only internal reps and super admin can move orders to production or completed');
    }

    if (nextStatus === OrderStatus.CANCELLED && !this.canCancelOrder(order, requester, branchManagerCanUpdateStatus)) {
      throw new ForbiddenException('You are not allowed to cancel this order');
    }
  }

  private canCancelOrder(order: Pick<Order, 'status' | 'salesRepId'>, requester: AuthUser, branchManagerCanUpdateStatus = false): boolean {
    if (this.isPowerOrderUser(requester) || this.isOrderApprover(requester) || branchManagerCanUpdateStatus) {
      return true;
    }
    return requester.role === UserRole.SALES_REP
      && String(order.salesRepId) === String(requester.id)
      && [OrderStatus.QUOTE, OrderStatus.PENDING_APPROVAL].includes(order.status);
  }

  private hasOrderDetailChanges(dto: UpdateOrderDto, isStatusChange = false): boolean {
    const fields = [
      'companyId',
      'branchId',
      'designId',
      'salesRepId',
      'assignedUserRole',
      'deliveryDate',
      'quantity',
      'price',
      'shortDescription',
      'selectedOptions',
      'customerName',
      'customerPhone',
      'customerEmail',
      'purchaseOrderNumber',
      'notes',
    ];
    if (!isStatusChange) {
      fields.push('shipDate', 'shipVia', 'trackingNo', 'invoiceNo');
    }
    return fields.some((field) => (dto as Record<string, unknown>)[field] !== undefined);
  }

  private hasOrderStatusChange(dto: UpdateOrderDto, currentStatus: OrderStatus): boolean {
    if (dto.status !== undefined) {
      return dto.status !== currentStatus;
    }
    return (dto.orderType === 'QUOTE' && currentStatus !== OrderStatus.QUOTE)
      || (dto.orderType === 'ORDER' && currentStatus === OrderStatus.QUOTE);
  }

  private assertCompletedShippingFields(order: Pick<Order, 'shipDate' | 'shipVia' | 'trackingNo' | 'invoiceNo'>): void {
    if (!order.shipDate || !order.shipVia || !order.trackingNo || !order.invoiceNo) {
      throw new BadRequestException('Ship date, ship via, tracking no. and invoice no. are required to complete an order');
    }
  }

  private getOrderAuditSnapshot(order: Partial<Order>): OrderAuditSnapshot {
    return {
      companyId: order.companyId ?? null,
      branchId: order.branchId ?? null,
      designId: order.designId ?? null,
      salesRepId: order.salesRepId ?? null,
      deliveryDate: order.deliveryDate ?? null,
      quantity: order.quantity ?? null,
      price: this.normalizeAuditValue(order.price),
      shortDescription: order.shortDescription ?? null,
      selectedOptions: this.normalizeSelectedOptions(order.selectedOptions),
      customerName: order.customerName ?? null,
      customerPhone: order.customerPhone ?? null,
      customerEmail: order.customerEmail ?? null,
      purchaseOrderNumber: order.purchaseOrderNumber ?? null,
      status: order.status ?? null,
      isActive: order.isActive ?? null,
      notes: order.notes ?? null,
      completedAt: this.normalizeAuditValue(order.completedAt),
      shipDate: order.shipDate ?? null,
      shipVia: order.shipVia ?? null,
      trackingNo: order.trackingNo ?? null,
      invoiceNo: order.invoiceNo ?? null,
    };
  }

  private buildOrderChanges(before: OrderAuditSnapshot, after: OrderAuditSnapshot): OrderHistoryChange[] {
    return Object.keys(after)
      .filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null))
      .map((field) => ({
        field,
        oldValue: before[field] ?? null,
        newValue: after[field] ?? null,
      }));
  }

  private normalizeAuditValue(value: unknown): unknown {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string' && value !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return value ?? null;
  }

  private async recordOrderUpdateHistory(order: Order, beforeSnapshot: OrderAuditSnapshot, requester: AuthUser): Promise<void> {
    const afterSnapshot = this.getOrderAuditSnapshot(order);
    const changes = this.buildOrderChanges(beforeSnapshot, afterSnapshot);
    if (!changes.length) {
      return;
    }

    const statusChange = changes.find((change) => change.field === 'status');
    const isActiveChange = changes.length === 1 && changes[0].field === 'isActive';
    const actionType: OrderHistoryActionType = isActiveChange && afterSnapshot.isActive === false
      ? 'SUSPEND'
      : isActiveChange && afterSnapshot.isActive === true
        ? 'RESUME'
        : afterSnapshot.status === OrderStatus.CANCELLED
      ? 'CANCEL'
      : statusChange
        ? 'STATUS_CHANGE'
        : 'EDIT';

    await this.recordOrderHistory(
      order,
      actionType,
      requester,
      changes,
      this.buildOrderHistorySummary(order, actionType, changes),
    );
  }

  private async recordOrderHistory(
    order: Pick<Order, 'id' | 'orderNumber'>,
    actionType: OrderHistoryActionType,
    requester: AuthUser,
    changes: OrderHistoryChange[],
    summary: string,
    metadata: Record<string, unknown> | null = null,
  ): Promise<void> {
    try {
      await this.orderHistoryRepo.save(this.orderHistoryRepo.create({
        orderId: order.id,
        actionType,
        summary,
        changes: changes.length ? changes : null,
        performedBy: requester.id,
        performedByName: this.getRequesterDisplayName(requester),
        performedByRole: requester.role,
        metadata,
      }));
    } catch (error: any) {
      this.logger.warn(`Order history skipped for order ${order.id}: ${error?.message || error}`);
    }
  }

  private buildOrderHistorySummary(order: Pick<Order, 'orderNumber'>, actionType: OrderHistoryActionType, changes: OrderHistoryChange[]): string {
    const statusChange = changes.find((change) => change.field === 'status');
    if (actionType === 'CANCEL') {
      return `Order ${order.orderNumber} was cancelled`;
    }
    if (actionType === 'SUSPEND') {
      return `Order ${order.orderNumber} was suspended`;
    }
    if (actionType === 'RESUME') {
      return `Order ${order.orderNumber} was resumed`;
    }
    if (actionType === 'STATUS_CHANGE' && statusChange) {
      return `Order ${order.orderNumber} status changed from ${statusChange.oldValue || '-'} to ${statusChange.newValue || '-'}`;
    }
    return `Order ${order.orderNumber} was edited`;
  }

  private getRequesterDisplayName(requester: AuthUser): string {
    const name = `${requester.firstName || ''} ${requester.lastName || ''}`.trim();
    return name || requester.email || String(requester.id);
  }

  private assertDesignScope(design: Design, requester: AuthUser, scope: { companyId: number | null; branchId: number | null }) {
    if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
      return;
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (design.companyId && String(design.companyId) !== String(requester.companyId)) {
      throw new ForbiddenException('You cannot access another company data');
    }

    if (scope.companyId && design.companyId && String(design.companyId) !== String(scope.companyId)) {
      throw new BadRequestException('Design does not belong to the selected company');
    }

    if (scope.branchId && design.branchId && String(design.branchId) !== String(scope.branchId)) {
      throw new BadRequestException('Design does not belong to the selected branch');
    }
  }

  private async calculateOrderPrice(params: {
    design: Design | null;
    companyId?: number;
    branchId?: number;
  }): Promise<{
    baseCost: number;
    companyMultiplier: number;
    companyPrice: number;
    branchMultiplier: number;
    effectiveMultiplier: number;
    pricingSource: 'COMPANY' | 'BRANCH';
    companyMultiplierSource: 'COLLECTION_OVERRIDE' | 'COMPANY_SLAB' | 'COMPANY_DEFAULT';
    branchMultiplierSource: 'BRANCH_SLAB' | 'BRANCH_DEFAULT';
    finalPrice: number;
  }> {
    return this.pricingService.calculateDesignRetailPrice(params);
  }

  private async resolveVisibleCostPrice(order: Order, requester: AuthUser): Promise<number | null> {
    if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
      if (order.baseCostSnapshot !== null && order.baseCostSnapshot !== undefined) {
        return this.roundMoney(this.toNumber(order.baseCostSnapshot));
      }
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (order.branchCostSnapshot !== null && order.branchCostSnapshot !== undefined) {
        return this.roundMoney(this.toNumber(order.branchCostSnapshot));
      }
    }

    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (order.branchCostSnapshot !== null && order.branchCostSnapshot !== undefined) {
        return this.roundMoney(this.toNumber(order.branchCostSnapshot));
      }
    }

    if (!order.design) return null;

    try {
      const pricing = await this.calculateOrderPrice({
        design: order.design,
        companyId: order.companyId != null ? order.companyId : undefined,
        branchId: order.branchId != null ? order.branchId : undefined,
      });

      if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.INTERNAL_REP) {
        return this.roundMoney(pricing.baseCost);
      }

      if (requester.role === UserRole.COMPANY_ADMIN) {
        return pricing.finalPrice;
      }

      if (requester.role === UserRole.BRANCH_MANAGER) {
        return pricing.finalPrice;
      }
    } catch (error: any) {
      this.logger.warn(`Order ${order.id} cost price skipped: ${error?.message || error}`);
    }

    return null;
  }
  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private roundMultiplierForSnapshot(value: unknown): number {
    return Number(this.toNumber(value).toFixed(2));
  }

  private normalizeFutureDeliveryDate(
    value?: string | null,
    minDate?: Date,
    options: { defaultOffsetDays?: number } = {},
  ): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      if (options.defaultOffsetDays === undefined) {
        return null;
      }
      const baseDate = minDate ? new Date(minDate) : new Date();
      baseDate.setHours(0, 0, 0, 0);
      baseDate.setDate(baseDate.getDate() + options.defaultOffsetDays);
      return this.formatDateOnly(baseDate);
    }

    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const dmyMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);

    let year = 0;
    let month = 0;
    let day = 0;

    if (isoMatch) {
      year = Number.parseInt(isoMatch[1], 10);
      month = Number.parseInt(isoMatch[2], 10);
      day = Number.parseInt(isoMatch[3], 10);
    } else if (dmyMatch) {
      day = Number.parseInt(dmyMatch[1], 10);
      month = Number.parseInt(dmyMatch[2], 10);
      year = Number.parseInt(dmyMatch[3], 10);
    } else {
      throw new BadRequestException('Expected delivery date must be in YYYY-MM-DD format');
    }

    const parsed = new Date(year, month - 1, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      throw new BadRequestException('Invalid delivery date');
    }

    parsed.setHours(0, 0, 0, 0);
    const minimumDate = minDate ? new Date(minDate) : new Date();
    minimumDate.setHours(0, 0, 0, 0);
    minimumDate.setDate(minimumDate.getDate() + 14);

    if (parsed.getTime() < minimumDate.getTime()) {
      throw new BadRequestException('Expected delivery date cannot be within 2 weeks of order creation date');
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private formatDateOnly(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private roundMoney(value: number): number {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }

  private getSalesRepDisplayName(order: Order): string | null {
    const firstName = order.salesRep?.firstName?.trim() ?? '';
    const lastName = order.salesRep?.lastName?.trim() ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    return order.salesRep?.email?.trim() || null;
  }

  private getBranchManagerDisplayName(order: Order): string | null {
    const firstName = order.branch?.branchManager?.firstName?.trim() ?? '';
    const lastName = order.branch?.branchManager?.lastName?.trim() ?? '';
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;
    return order.branch?.branchManager?.email?.trim() || null;
  }

  private normalizeSelectedOptions(value: unknown): Record<string, { id: number | null; label: string }> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    const normalized: Record<string, { id: number | null; label: string }> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return;
      const option = raw as { id?: unknown; label?: unknown; value?: unknown; name?: unknown };
      const label = String(option.label ?? option.value ?? option.name ?? '').trim();
      if (!label) return;
      const numericId = Number(option.id);
      normalized[key] = {
        id: option.id !== undefined && option.id !== null && option.id !== '' && Number.isFinite(numericId) ? numericId : null,
        label,
      };
    });

    return Object.keys(normalized).length ? normalized : null;
  }
  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private getS3Config(): {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  } | null {
    const bucket = this.optionalText(process.env.AWS_S3_BUCKET);
    const region = this.optionalText(process.env.AWS_REGION);
    const accessKeyId = this.optionalText(process.env.AWS_ACCESS_KEY_ID) || this.optionalText(process.env.AWS_ACCESS_KEY);
    const secretAccessKey =
      this.optionalText(process.env.AWS_SECRET_ACCESS_KEY) || this.optionalText(process.env.AWS_SECRET_KEY);

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return null;
    }

    return { bucket, region, accessKeyId, secretAccessKey };
  }

  private getS3Client(): { client: S3Client; bucket: string; region: string } | null {
    const config = this.getS3Config();
    if (!config) return null;

    if (!this.s3Client) {
      const endpoint = this.optionalText(process.env.AWS_S3_ENDPOINT);
      this.s3Client = new S3Client({
        region: config.region,
        endpoint: endpoint || undefined,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      });
    }

    return { client: this.s3Client, bucket: config.bucket, region: config.region };
  }

  private getSignedUrlExpiresIn(): number {
    const raw = this.optionalText(process.env.AWS_S3_SIGNED_URL_EXPIRES);
    const parsed = raw ? Number.parseInt(raw, 10) : NaN;
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 21600;
  }

  private getSignedUrlCacheKey(bucket: string, key: string): string {
    return `${bucket}/${key}`;
  }

  private getCachedSignedUrl(bucket: string, key: string): string | null {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    const cached = this.signedUrlCache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() >= cached.expiresAt - this.signedUrlCacheSkewMs) {
      this.signedUrlCache.delete(cacheKey);
      return null;
    }
    return cached.url;
  }

  private setCachedSignedUrl(bucket: string, key: string, url: string, expiresInSeconds: number): void {
    const cacheKey = this.getSignedUrlCacheKey(bucket, key);
    this.signedUrlCache.set(cacheKey, {
      url,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    });
    if (this.signedUrlCache.size > 3000) {
      const now = Date.now();
      for (const [entryKey, entry] of this.signedUrlCache.entries()) {
        if (entry.expiresAt <= now || this.signedUrlCache.size > 2500) {
          this.signedUrlCache.delete(entryKey);
        }
      }
    }
  }

  private parseS3KeyFromUrl(value: string, bucket: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('s3://')) {
      const withoutScheme = trimmed.slice(5);
      const [bucketName, ...rest] = withoutScheme.split('/');
      if (!bucketName || rest.length === 0) return null;
      if (bucketName !== bucket) return null;
      return rest.join('/');
    }

    let parsedUrl: URL | null = null;
    try {
      parsedUrl = new URL(trimmed);
    } catch {
      return null;
    }

    const host = parsedUrl.hostname;
    const path = parsedUrl.pathname.replace(/^\/+/, '');

    if (host.startsWith(`${bucket}.s3`)) {
      return path || null;
    }

    if (host.startsWith('s3') && path.startsWith(`${bucket}/`)) {
      return path.slice(bucket.length + 1) || null;
    }

    return null;
  }

  private async createSignedUrl(client: S3Client, bucket: string, key: string): Promise<string> {
    const cached = this.getCachedSignedUrl(bucket, key);
    if (cached) {
      return cached;
    }
    const expiresIn = this.getSignedUrlExpiresIn();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(client, command, { expiresIn });
    this.setCachedSignedUrl(bucket, key, url, expiresIn);
    return url;
  }

  private async resolveOrderDesignImageUrl(value: string | null): Promise<string | null> {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    const s3Config = this.getS3Client();
    if (!s3Config) return trimmed;

    const { client, bucket } = s3Config;
    const key = this.parseS3KeyFromUrl(trimmed, bucket);
    if (!key) return trimmed;

    try {
      return await this.createSignedUrl(client, bucket, key);
    } catch {
      return null;
    }
  }

  private async safeTrackOrderCreated(order: Order): Promise<void> {
    try {
      await this.spiffService.handleOrderCreated(order);
    } catch (error: any) {
      this.logger.warn(
        `SPIFF tracking skipped for new order ${order?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async safeTrackOrderTransition(
    order: Order,
    previousStatus: OrderStatus | string | undefined,
  ): Promise<void> {
    try {
      await this.spiffService.handleOrderStatusTransition(order, previousStatus);
    } catch (error: any) {
      this.logger.warn(
        `SPIFF transition tracking skipped for order ${order?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private orderNotificationChannelsForRecipient(requester: AuthUser, recipientUserId?: number | null): NotificationChannelOptions {
    const isSelfRecipient = recipientUserId != null && String(recipientUserId) === String(requester.id);
    return {
      inApp: true,
      push: !isSelfRecipient,
      email: true,
    };
  }

  private async notifyOrderApprovalRequiredWithoutSelfPush(
    approverIds: number[],
    input: Parameters<NotificationEventsService['notifyOrderApprovalRequired']>[1],
    requester: AuthUser,
  ): Promise<void> {
    const requesterId = String(requester.id);
    const selfApproverIds = approverIds.filter((id) => String(id) === requesterId);
    const otherApproverIds = approverIds.filter((id) => String(id) !== requesterId);

    if (otherApproverIds.length) {
      await this.notificationEventsService.notifyOrderApprovalRequired(otherApproverIds, input, { inApp: true, push: true, email: true });
    }

    if (selfApproverIds.length) {
      await this.notificationEventsService.notifyOrderApprovalRequired(selfApproverIds, input, { inApp: true, push: false, email: true });
    }
  }
  private async safeNotifyOrderCreated(order: Order, requester: AuthUser): Promise<void> {
    try {
      const context = await this.loadOrderNotificationContext(order.id);
      if (!context) return;

      const orderLabel = context.orderNumber || 'order';
      const designLabel = context.design?.designName || context.design?.designNo || 'design';
      const salesRepName = this.getSalesRepDisplayName(context) || 'A sales rep';

      if (context.salesRepId) {
        await this.notificationEventsService.notifyOrderSubmitted({
          userId: context.salesRepId,
          companyId: context.companyId ?? null,
          branchId: context.branchId ?? null,
          priority: NotificationPriority.P1,
          title: `Order ${orderLabel} submitted`,
          message:
            context.status === OrderStatus.PENDING_APPROVAL
              ? `Your order ${orderLabel} for ${designLabel} was submitted for approval.`
              : `Your order ${orderLabel} for ${designLabel} was submitted successfully.`,
          entityType: 'ORDER',
          entityId: context.id,
          actionUrl: `/orders/${context.id}`,
          metadata: {
            orderId: context.id,
            orderNumber: context.orderNumber,
            status: context.status,
            designNo: context.design?.designNo ?? null,
            updatedByUserId: requester.id,
            requesterUserId: requester.id,
          },
        }, this.orderNotificationChannelsForRecipient(requester, context.salesRepId));
      }

      if (context.status === OrderStatus.PENDING_APPROVAL) {
        const approverIds = await this.getApproverUserIdsForOrder(context, [context.salesRepId != null ? context.salesRepId : null]);
        if (approverIds.length) {
          await this.notifyOrderApprovalRequiredWithoutSelfPush(approverIds, {
            companyId: context.companyId ?? null,
            branchId: context.branchId ?? null,
            priority: NotificationPriority.P0,
            title: `Approval needed for ${orderLabel}`,
            message: `${salesRepName} submitted ${orderLabel} for approval.`,
            entityType: 'ORDER',
            entityId: context.id,
            actionUrl: `/orders/${context.id}`,
            metadata: {
              orderId: context.id,
              orderNumber: context.orderNumber,
              status: context.status,
              designNo: context.design?.designNo ?? null,
              updatedByUserId: requester.id,
              requesterUserId: requester.id,
            },
          }, requester);
        }
      }
    } catch (error: any) {
      this.logger.warn(
        `Order notification skipped for new order ${order?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async safeNotifyOrderTransition(
    order: Order,
    previousStatus: OrderStatus | string | undefined,
    requester: AuthUser,
  ): Promise<void> {
    try {
      const previous = this.normalizeOrderStatus(previousStatus);
      const context = await this.loadOrderNotificationContext(order.id);
      if (!context) return;

      const current = this.normalizeOrderStatus(context.status);
      if (current === previous) return;

      const orderLabel = context.orderNumber || 'order';
      const designLabel = context.design?.designName || context.design?.designNo || 'design';
      const salesRepName = this.getSalesRepDisplayName(context) || 'A sales rep';
      const metadata = {
        orderId: context.id,
        orderNumber: context.orderNumber,
        status: current,
        previousStatus: previous,
        designNo: context.design?.designNo ?? null,
      };

      if (current === OrderStatus.PENDING_APPROVAL) {
        const approverIds = await this.getApproverUserIdsForOrder(context, [context.salesRepId]);
        if (approverIds.length) {
          await this.notifyOrderApprovalRequiredWithoutSelfPush(approverIds, {
            companyId: context.companyId,
            branchId: context.branchId,
            priority: NotificationPriority.P0,
            title: `Approval needed for ${orderLabel}`,
            message: `${salesRepName} moved ${orderLabel} back to pending approval.`,
            entityType: 'ORDER',
            entityId: context.id,
            actionUrl: `/orders/${context.id}`,
            metadata,
          }, requester);
        }
      }

      if (!context.salesRepId) return;

      const transitionMessages: Partial<Record<OrderStatus, { type: string; priority: NotificationPriority; title: string; message: string }>> = {
        [OrderStatus.APPROVED]: {
          type: 'ORDER_APPROVED',
          priority: NotificationPriority.P0,
          title: `Order ${orderLabel} approved`,
          message: `${orderLabel} for ${designLabel} was approved.`,
        },
        [OrderStatus.IN_PRODUCTION]: {
          type: 'ORDER_IN_PRODUCTION',
          priority: NotificationPriority.P2,
          title: `${orderLabel} moved to production`,
          message: `${orderLabel} for ${designLabel} is now in production.`,
        },
        [OrderStatus.COMPLETED]: {
          type: 'ORDER_COMPLETED',
          priority: context.trackingNo ? NotificationPriority.P1 : NotificationPriority.P2,
          title: context.trackingNo ? `${orderLabel} shipped` : `${orderLabel} completed`,
          message: context.trackingNo
            ? `Tracking is available for ${orderLabel}.`
            : `${orderLabel} for ${designLabel} is complete.`,
        },
        [OrderStatus.CANCELLED]: {
          type: 'ORDER_CANCELLED',
          priority: NotificationPriority.P0,
          title: `${orderLabel} cancelled`,
          message: `${orderLabel} for ${designLabel} was cancelled.`,
        },
      };

      const transition = transitionMessages[current];
      if (!transition) return;

      await this.notifyOrderTransitionByV1Status(context, transition, metadata, requester);
    } catch (error: any) {
      this.logger.warn(
        `Order transition notification skipped for order ${order?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }
  private async notifyOrderTransitionByV1Status(
    context: Order,
    transition: { type: string; priority: NotificationPriority; title: string; message: string },
    metadata: Record<string, unknown>,
    requester: AuthUser,
  ): Promise<void> {
    const input = {
      userId: context.salesRepId as number,
      companyId: context.companyId ?? null,
      branchId: context.branchId ?? null,
      priority: transition.priority,
      title: transition.title,
      message: transition.message,
      entityType: 'ORDER',
      entityId: context.id,
      actionUrl: `/orders/${context.id}`,
      metadata: {
        ...metadata,
        updatedByUserId: requester.id,
      },
    };

    if (transition.type === 'ORDER_IN_PRODUCTION') {
      await this.notificationEventsService.notifyOrderInProduction(input, this.orderNotificationChannelsForRecipient(requester, context.salesRepId));
      return;
    }

    if (transition.type === 'ORDER_CANCELLED') {
      await this.notificationEventsService.notifyOrderCancelled(input, this.orderNotificationChannelsForRecipient(requester, context.salesRepId));
      return;
    }

    if (transition.type === 'ORDER_COMPLETED' && context.trackingNo) {
      await this.notificationEventsService.notifyOrderShipped({
        ...input,
        title: `${context.orderNumber || 'Order'} shipped`,
        message: `Tracking is available for ${context.orderNumber || 'your order'}.`,
      }, this.orderNotificationChannelsForRecipient(requester, context.salesRepId));
      return;
    }

    await this.notificationEventsService.notifyOrderStatusChanged({
      ...input,
      type: transition.type,
    }, this.orderNotificationChannelsForRecipient(requester, context.salesRepId));
  }
  private async loadOrderNotificationContext(orderId: number): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['company', 'branch', 'branch.branchManager', 'design', 'salesRep'],
    });
  }

  private async getApproverUserIdsForOrder(order: Order, excludeIds: Array<number | null | undefined> = []): Promise<number[]> {
    const excluded = new Set(
      excludeIds.filter((value): value is number => typeof value === 'number')
    );
    const ids = new Set<number>();

    const branchManagerId = order.branch?.branchManager?.id;
    if (branchManagerId && !excluded.has(branchManagerId)) {
      ids.add(branchManagerId);
    }

    if (order.branchId) {
      const branchManagers = await this.userRepo.find({
        where: {
          branchId: order.branchId,
          role: UserRole.BRANCH_MANAGER,
          isActive: true,
        },
        select: ['id'],
      });

      branchManagers.forEach((user) => {
        const userId = user.id;
        if (userId && !excluded.has(userId)) {
          ids.add(userId);
        }
      });
    }

    if (order.companyId) {
      const companyAdmins = await this.userRepo.find({
        where: {
          companyId: order.companyId,
          role: UserRole.COMPANY_ADMIN,
          isActive: true,
        },
        select: ['id'],
      });

      companyAdmins.forEach((user) => {
        const userId = user.id;
        if (userId && !excluded.has(userId)) {
          ids.add(userId);
        }
      });
    }

    return Array.from(ids);
  }

  private normalizeOrderStatus(value: OrderStatus | string | undefined | null): OrderStatus {
    const normalized = String(value || '').trim().toUpperCase();
    if (Object.values(OrderStatus).includes(normalized as OrderStatus)) {
      return normalized as OrderStatus;
    }
    return OrderStatus.QUOTE;
  }
}

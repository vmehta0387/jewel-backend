import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Order } from './entities/order.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Design } from '../products/entities/design.entity';
import { User } from '../users/entities/user.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateOrderDto, FindOrdersQueryDto, FindPurchaseOrderUsageQueryDto, UpdateOrderDto } from './dto/order.dto';
import { NotificationPriority } from '../notifications/entities/notification.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { SpiffService } from '../spiff/spiff.service';
import { PricingService } from '../pricing/pricing.service';

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
    ];
    for (const col of columns) {
      try {
        await this.orderRepo.query(`ALTER TABLE orders ADD COLUMN ${col.name} ${col.type}`);
      } catch {
        // Ignored if column already exists
      }
    }
  }

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Design) private readonly designRepo: Repository<Design>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly spiffService: SpiffService,
    private readonly notificationsService: NotificationsService,
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
      if (!scope.companyId || !scope.branchId) {
        throw new BadRequestException('Company and branch are required');
      }

      const qb = this.orderRepo
        .createQueryBuilder('order')
        .leftJoinAndSelect('order.design', 'design')
        .where('order.companyId = :companyId', { companyId: scope.companyId })
        .andWhere('order.branchId = :branchId', { branchId: scope.branchId })
        .andWhere('LOWER(TRIM(order.purchaseOrderNumber)) = :purchaseOrderNumber', {
          purchaseOrderNumber: purchaseOrderNumber.toLowerCase(),
        })
        .orderBy('order.createdAt', 'DESC')
        .take(10);

      if (query.excludeOrderId?.trim()) {
        qb.andWhere('order.id != :excludeOrderId', { excludeOrderId: query.excludeOrderId.trim() });
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

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.company', 'company')
      .leftJoinAndSelect('order.branch', 'branch')
      .leftJoinAndSelect('branch.branchManager', 'branchManager')
      .leftJoinAndSelect('order.design', 'design')
      .leftJoinAndSelect('order.salesRep', 'salesRep');

    this.applyScopeFilter(qb, requester, query.companyId, query.branchId);

    const status = query.status || 'ACTIVE';
    if (status === 'ACTIVE') {
      qb.andWhere('order.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.andWhere('order.isActive = :isActive', { isActive: false });
    }

    if (query.orderStatus) {
      qb.andWhere('order.status = :orderStatus', { orderStatus: query.orderStatus });
    }

    if (query.statusGroup === 'FULFILLED') {
      qb.andWhere('order.status IN (:...fulfilledStatuses)', {
        fulfilledStatuses: [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED],
      });
    }

    if (query.designId) {
      qb.andWhere('order.designId = :designId', { designId: query.designId });
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

    this.applyCreatedPeriodFilter(qb, query.period);

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(order.orderNumber LIKE :search OR design.designNo LIKE :search OR design.designName LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search OR order.customerName LIKE :search OR order.customerPhone LIKE :search OR order.customerEmail LIKE :search OR order.purchaseOrderNumber LIKE :search)',
        { search },
      );
    }

    const totalAmountRaw = await qb
      .clone()
      .select('COALESCE(SUM(order.price), 0)', 'totalAmount')
      .getRawOne<{ totalAmount: string | number | null }>();

    const [data, total] = await qb
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    const enriched = await Promise.all(
      data.map(async (order) => {
        const primaryImage = Array.isArray(order.design?.imageUrls)
          ? order.design!.imageUrls.find((url) => typeof url === 'string' && url.trim().length > 0) || null
          : null;
        const designImageUrl = await this.resolveOrderDesignImageUrl(primaryImage);

        return {
          ...order,
          companyName: order.company?.companyName ?? null,
          branchName: order.branch?.name ?? null,
          designNo: order.design?.designNo ?? null,
          designName: order.design?.designName ?? null,
          designVersion: order.design?.version ?? null,
          costPrice: await this.resolveVisibleCostPrice(order, requester),
          salesRepName: this.getSalesRepDisplayName(order),
          salesRepEmail: order.salesRep?.email ?? null,
          branchManagerName: this.getBranchManagerDisplayName(order),
          designImageUrl,
        };
      }),
    );

    return {
      data: enriched,
      total,
      totalAmount: this.roundMoney(this.toNumber(totalAmountRaw?.totalAmount)),
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, requester: AuthUser) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['company', 'branch', 'branch.branchManager', 'design', 'salesRep'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertReadScope(order, requester);
    const primaryImage = Array.isArray(order.design?.imageUrls)
      ? order.design!.imageUrls.find((url) => typeof url === 'string' && url.trim().length > 0) || null
      : null;
    const designImageUrl = await this.resolveOrderDesignImageUrl(primaryImage);

    return {
      ...order,
      companyName: order.company?.companyName ?? null,
      branchName: order.branch?.name ?? null,
      designNo: order.design?.designNo ?? null,
      designName: order.design?.designName ?? null,
      designVersion: order.design?.version ?? null,
      costPrice: await this.resolveVisibleCostPrice(order, requester),
      salesRepName: this.getSalesRepDisplayName(order),
      salesRepEmail: order.salesRep?.email ?? null,
      branchManagerName: this.getBranchManagerDisplayName(order),
      designImageUrl,
    };
  }

  async generateOrderPdf(id: string, requester: AuthUser): Promise<{ buffer: Buffer; fileName: string }> {
    const order = await this.findOne(id, requester) as unknown as Order & {
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
      buffer: this.buildOrderSummaryPdf(order),
      fileName: `${safeOrderNo}-summary.pdf`,
    };
  }

  async create(dto: CreateOrderDto, requester: AuthUser) {
    const requestedBranchId = dto.branchId?.trim() || requester.branchId || null;
    const branch = requestedBranchId
      ? await this.branchRepo.findOne({ where: { id: requestedBranchId } })
      : null;
    if (requestedBranchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }

    const requestedCompanyId = dto.companyId?.trim() || requester.companyId || null;
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
    }

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: effectiveCompanyId ?? undefined,
      branchId: effectiveBranchId ?? undefined,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { orderNumber } = await this.getNextOrderNumber();
      const computedStatus = this.resolveCreateStatus(dto.status, requester);
      const order = this.orderRepo.create({
        orderNumber,
        companyId: effectiveCompanyId ?? null,
        branchId: effectiveBranchId ?? null,
        designId: dto.designId ?? null,
        salesRepId: requester.id,
        deliveryDate: this.normalizeFutureDeliveryDate(dto.deliveryDate, new Date()),
        quantity: dto.quantity ?? 1,
        price: dto.price !== undefined ? this.roundMoney(this.toNumber(dto.price)) : pricing.finalPrice,
        shortDescription: dto.shortDescription?.trim() || null,
        customerName: dto.customerName?.trim() || null,
        customerPhone: dto.customerPhone?.trim() || null,
        customerEmail: dto.customerEmail?.trim() || null,
        purchaseOrderNumber: dto.purchaseOrderNumber?.trim() || null,
        notes: dto.notes?.trim() || null,
        status: computedStatus,
        completedAt: computedStatus === OrderStatus.COMPLETED ? new Date() : null,
        isActive: true,
      });

      try {
        const saved = await this.orderRepo.save(order);
        await this.safeTrackOrderCreated(saved);
        await this.safeNotifyOrderCreated(saved, requester);
        return saved;
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

  private doesSalesRepRequireApproval(requester: AuthUser): boolean {
    if (!requester.detailedPermissions || requester.detailedPermissions.length === 0) {
      return true;
    }
    return requester.detailedPermissions.some(
      (permission) => permission.actionKey === 'order.require_approval',
    );
  }

  private resolveCreateStatus(requestedStatus: OrderStatus | undefined, requester: AuthUser): OrderStatus {
    if (requestedStatus === OrderStatus.QUOTE) {
      return OrderStatus.QUOTE;
    }

    if (requester.role === UserRole.SALES_REP) {
      const requiresApproval = this.doesSalesRepRequireApproval(requester);
      if (requiresApproval) {
        return requestedStatus ?? OrderStatus.PENDING_APPROVAL;
      }
      return OrderStatus.IN_PRODUCTION;
    }

    if (requester.role === UserRole.BRANCH_MANAGER) {
      return requestedStatus ?? OrderStatus.APPROVED;
    }

    return requestedStatus ?? OrderStatus.QUOTE;
  }

  async update(id: string, dto: UpdateOrderDto, requester: AuthUser) {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['company', 'branch', 'branch.branchManager', 'design', 'salesRep'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = order.status;
    const requestedBranchId = dto.branchId?.trim() || order.branchId || requester.branchId || null;
    const branch = requestedBranchId
      ? await this.branchRepo.findOne({ where: { id: requestedBranchId } })
      : null;
    if (requestedBranchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }

    const requestedCompanyId = dto.companyId?.trim() || order.companyId || requester.companyId || null;
    const effectiveCompanyId = branch?.companyId || requestedCompanyId;
    const effectiveBranchId = branch?.id || requestedBranchId;

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
      order.designId = dto.designId;
    } else if (order.designId) {
      design = await this.designRepo.findOne({ where: { id: order.designId } });
    }

    if (dto.companyId !== undefined || branch) {
      order.companyId = effectiveCompanyId ?? null;
    }
    if (dto.branchId !== undefined || branch) {
      order.branchId = effectiveBranchId ?? null;
    }
    if (dto.deliveryDate !== undefined) {
      order.deliveryDate = this.normalizeFutureDeliveryDate(dto.deliveryDate, order.createdAt);
    }
    if (dto.quantity !== undefined) {
      order.quantity = dto.quantity;
    }
    const pricing = await this.calculateOrderPrice({
      design,
      companyId: order.companyId ?? undefined,
      branchId: order.branchId ?? undefined,
    });
    order.price = dto.price !== undefined ? this.roundMoney(this.toNumber(dto.price)) : pricing.finalPrice;
    if (dto.shortDescription !== undefined) {
      order.shortDescription = dto.shortDescription?.trim() || null;
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
    if (dto.status !== undefined) {
      order.status = dto.status;
      if (dto.status === OrderStatus.COMPLETED && previousStatus !== OrderStatus.COMPLETED) {
        order.completedAt = new Date();
      } else if (dto.status !== OrderStatus.COMPLETED) {
        order.completedAt = null;
      }
    }

    try {
      const saved = await this.orderRepo.save(order);
      await this.safeTrackOrderTransition(saved, previousStatus);
      await this.safeNotifyOrderTransition(saved, previousStatus, requester);
      return saved;
    } catch (error: any) {
      const isBadField =
        error?.code === 'ER_BAD_FIELD_ERROR' ||
        String(error?.message || '').includes('Unknown column');
      if (isBadField) {
        this.logger.warn('Detected missing order column on update, running column patch...');
        await this.ensureOrderTableColumns();
        const saved = await this.orderRepo.save(order);
        await this.safeTrackOrderTransition(saved, previousStatus);
        await this.safeNotifyOrderTransition(saved, previousStatus, requester);
        return saved;
      }
      this.logger.error(`Failed to update order: ${error?.message || error}`, error?.stack);
      throw new BadRequestException(error?.message || 'Unable to update order.');
    }
  }

  async getPricePreview(params: { designId: string; companyId: string; branchId: string }, requester: AuthUser) {
    const design = await this.designRepo.findOne({ where: { id: params.designId } });
    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const branchId = params.branchId?.trim() || requester.branchId || undefined;
    const branch = branchId
      ? await this.branchRepo.findOne({ where: { id: branchId } })
      : null;
    if (branchId && !branch) {
      throw new BadRequestException('Selected branch not found');
    }
    const effectiveCompanyId = branch?.companyId || params.companyId?.trim() || requester.companyId || undefined;

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: effectiveCompanyId,
      branchId: branch?.id || branchId,
    });

    return pricing;
  }

  async updateActiveStatus(id: string, isActive: boolean, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    this.assertApprovedOrderEditable(order, requester);
    order.isActive = isActive;
    return this.orderRepo.save(order);
  }

  async getSummary(requester: AuthUser) {
    const baseQuery = this.orderRepo.createQueryBuilder('order');
    this.applyScopeFilter(baseQuery, requester);
    baseQuery.andWhere('order.isActive = :isActive', { isActive: true });

    const fulfilledStatuses = [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED];

    // Dashboard placed-order totals exclude quotes/pending/cancelled and use the
    // order creation date, so a shipped order created today is counted today.
    const summaryRow = await baseQuery.clone()
      .select('COUNT(*)', 'activeOrders')
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= CURRENT_DATE AND order.createdAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) THEN order.price ELSE 0 END), 0)`,
        'salesToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) AND order.createdAt < CURRENT_DATE THEN order.price ELSE 0 END), 0)`,
        'salesYesterday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH) THEN order.price ELSE 0 END), 0)`,
        'salesThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= DATE_SUB(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH) AND order.createdAt < DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') THEN order.price ELSE 0 END), 0)`,
        'salesLastMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= CURRENT_DATE AND order.createdAt < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) THEN 1 ELSE 0 END), 0)`,
        'ordersToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) AND order.createdAt >= DATE_FORMAT(CURRENT_DATE, '%Y-%m-01') AND order.createdAt < DATE_ADD(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), INTERVAL 1 MONTH) THEN 1 ELSE 0 END), 0)`,
        'ordersThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN order.status IN (:...fulfilledStatuses) THEN order.price ELSE 0 END), 0)`,
        'branchRevenueTotal',
      )
      .addSelect(`SUM(CASE WHEN order.status = :quoteStatus THEN 1 ELSE 0 END)`, 'quoteCount')
      .addSelect(`SUM(CASE WHEN order.status = :pendingStatus THEN 1 ELSE 0 END)`, 'pendingCount')
      .addSelect(`SUM(CASE WHEN order.status = :approvedStatus THEN 1 ELSE 0 END)`, 'approvedCount')
      .addSelect(`SUM(CASE WHEN order.status = :productionStatus THEN 1 ELSE 0 END)`, 'productionCount')
      .addSelect(`SUM(CASE WHEN order.status = :shippedStatus THEN 1 ELSE 0 END)`, 'shippedCount')
      .addSelect(`SUM(CASE WHEN order.status = :completedStatus THEN 1 ELSE 0 END)`, 'completedCount')
      .addSelect(`SUM(CASE WHEN order.status = :cancelledStatus THEN 1 ELSE 0 END)`, 'cancelledCount')
      .setParameters({
        quoteStatus: OrderStatus.QUOTE,
        pendingStatus: OrderStatus.PENDING_APPROVAL,
        approvedStatus: OrderStatus.APPROVED,
        productionStatus: OrderStatus.IN_PRODUCTION,
        shippedStatus: OrderStatus.SHIPPED,
        fulfilledStatuses,
        completedStatus: OrderStatus.COMPLETED,
        cancelledStatus: OrderStatus.CANCELLED,
      })
      .getRawOne();

    const activeOrders = this.toNumber(summaryRow?.activeOrders ?? 0);
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
      shipped: this.toNumber(summaryRow?.shippedCount ?? 0),
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
      salesToday,
      todayTrend: calcTrend(salesToday, salesYesterday),
      salesThisMonth,
      monthlyTrend: calcTrend(salesThisMonth, salesLastMonth),
      ordersToday,
      ordersThisMonth,
      pipeline,
      branchRevenueTotal,
      branchSalesRepCount,
      pendingApprovalOrders,
    };
  }

  async getPeriodSummary(requester: AuthUser) {
    const fulfilledStatuses = [OrderStatus.APPROVED, OrderStatus.IN_PRODUCTION, OrderStatus.SHIPPED];
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

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .select('DATE(order.completedAt)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.price)', 'sales')
      .where('order.completedAt >= :startDate AND order.completedAt <= :endDate', {
        startDate,
        endDate,
      })
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere('order.status = :completedStatus', { completedStatus: OrderStatus.COMPLETED })
      .groupBy('date')
      .orderBy('date', 'ASC');

    this.applyScopeFilter(qb, requester);

    const rows = await qb.getRawMany();
    const byDate = new Map<string, { orders: number; sales: number }>();
    rows.forEach((row: any) => {
      const raw = row.date;
      let dateKey = '';
      if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
        dateKey = raw.toISOString().slice(0, 10);
      } else if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
          dateKey = trimmed.slice(0, 10);
        } else {
          const parsed = new Date(trimmed);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey = parsed.toISOString().slice(0, 10);
          }
        }
      }

      if (!dateKey) {
        return;
      }
      byDate.set(dateKey, {
        orders: this.toNumber(row.orders),
        sales: this.toNumber(row.sales),
      });
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

  private resolveScope(requester: AuthUser, companyId?: string, branchId?: string) {
    const normalizedCompanyId = companyId?.trim();
    const normalizedBranchId = branchId?.trim();

    if (requester.role === UserRole.SUPER_ADMIN) {
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

  private applyScopeFilter(qb: any, requester: AuthUser, companyId?: string, branchId?: string): void {
    const normalizedCompanyId = companyId?.trim();
    const normalizedBranchId = branchId?.trim();

    if (requester.role === UserRole.SUPER_ADMIN) {
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

  private buildOrderSummaryPdf(order: Order & Record<string, any>): Buffer {
    const lines: string[] = [];
    const push = (text = '', x = 40, size = 10, font = 'F1') => lines.push(`${font}|${size}|${x}|${text}`);
    const itemDetails = this.splitPdfLines(order.shortDescription, 78);
    const money = this.formatPdfMoney(order.price);
    const designLabel = this.optionalText(order.designName) || this.optionalText(order.design?.designName)
      || this.optionalText(order.designNo) || this.optionalText(order.design?.designNo) || '-';

    push('BLITZ NYC', 40, 22, 'F2');
    push('Order Summary', 390, 18, 'F2');
    push(`Generated ${this.formatPdfDate(new Date())}`, 390, 9);
    push('');
    push(`Order #: ${this.optionalText(order.orderNumber) || '-'}`, 40, 12, 'F2');
    push(`Status: ${this.formatPdfStatus(order.status)}`, 300, 12, 'F2');
    push(`Created: ${this.formatPdfDate(order.createdAt)}`, 40, 10);
    push(`Company: ${this.optionalText(order.companyName) || this.optionalText(order.company?.companyName) || '-'}`, 40, 10);
    push(`Branch: ${this.optionalText(order.branchName) || this.optionalText(order.branch?.name) || '-'}`, 300, 10);
    push('');
    push('Client', 40, 13, 'F2');
    push(`Name: ${this.optionalText(order.customerName) || '-'}`);
    push(`Phone: ${this.optionalText(order.customerPhone) || '-'}`);
    push(`Email: ${this.optionalText(order.customerEmail) || '-'}`);
    push('');
    push('Order References', 40, 13, 'F2');
    push(`Purchase Order: ${this.optionalText(order.purchaseOrderNumber) || '-'}`);
    push(`Sales Rep: ${this.optionalText(order.salesRepName) || this.optionalText(order.salesRepEmail) || '-'}`);
    push('');
    push('Order Item', 40, 13, 'F2');
    push(`Design: ${designLabel}`, 40, 11, 'F2');
    itemDetails.forEach((line) => push(line));
    if (order.notes) push(`Notes: ${this.optionalText(order.notes)}`);
    push('');
    push(`Quantity: ${order.quantity || 1}`, 40, 11, 'F2');
    push(`Total Amount: ${money}`, 300, 14, 'F2');
    push('');
    push('This document was generated by Blitz NYC.', 40, 9);

    return this.renderSimplePdf(lines);
  }

  private renderSimplePdf(rows: string[]): Buffer {
    const commands: string[] = [
      '0.96 0.94 0.91 rg 0 792 595 50 re f',
      '0.70 0.49 0.25 RG 40 786 m 555 786 l S',
    ];
    let y = 806;
    rows.forEach((row) => {
      if (!row) {
        y -= 12;
        return;
      }
      const [font, sizeText, xText, ...parts] = row.split('|');
      const size = Number(sizeText) || 10;
      const x = Number(xText) || 40;
      y -= size + 6;
      commands.push(`BT /${font} ${size} Tf ${x} ${y} Td (${this.escapePdfText(parts.join('|'))}) Tj ET`);
    });
    commands.push('0.86 0.80 0.73 RG 40 80 m 555 80 l S');

    const content = commands.join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
      `<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    objects.forEach((obj, index) => {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
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
    return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
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
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!requester.companyId) {
      throw new NotFoundException('Order not found');
    }

    if (order.companyId && order.companyId !== requester.companyId) {
      throw new NotFoundException('Order not found');
    }

    if (requester.branchId && order.branchId !== requester.branchId) {
      throw new NotFoundException('Order not found');
    }

    if (requester.role === UserRole.SALES_REP && order.salesRepId !== requester.id) {
      throw new NotFoundException('Order not found');
    }
  }

  private assertApprovedOrderEditable(order: Pick<Order, 'status'>, requester: AuthUser): void {
    if (order.status === OrderStatus.APPROVED && requester.role !== UserRole.BRANCH_MANAGER) {
      throw new ForbiddenException('Only branch managers can edit approved orders');
    }
  }

  private assertDesignScope(design: Design, requester: AuthUser, scope: { companyId: string | null; branchId: string | null }) {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (design.companyId && design.companyId !== requester.companyId) {
      throw new ForbiddenException('You cannot access another company data');
    }

    if (scope.companyId && design.companyId && design.companyId !== scope.companyId) {
      throw new BadRequestException('Design does not belong to the selected company');
    }

    if (scope.branchId && design.branchId && design.branchId !== scope.branchId) {
      throw new BadRequestException('Design does not belong to the selected branch');
    }
  }

  private async calculateOrderPrice(params: {
    design: Design | null;
    companyId?: string;
    branchId?: string;
  }): Promise<{
    baseCost: number;
    companyMultiplier: number;
    companyPrice: number;
    branchMultiplier: number;
    effectiveMultiplier: number;
    pricingSource: 'COMPANY' | 'BRANCH';
    finalPrice: number;
  }> {
    return this.pricingService.calculateDesignRetailPrice(params);
  }

  private async resolveVisibleCostPrice(order: Order, requester: AuthUser): Promise<number | null> {
    if (!order.design) return null;

    const pricing = await this.calculateOrderPrice({
      design: order.design,
      companyId: order.companyId ?? undefined,
      branchId: order.branchId ?? undefined,
    });

    if (requester.role === UserRole.SUPER_ADMIN) {
      return this.roundMoney(pricing.baseCost);
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      return pricing.companyPrice;
    }

    if (requester.role === UserRole.BRANCH_MANAGER) {
      return pricing.finalPrice;
    }

    return null;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private normalizeFutureDeliveryDate(value?: string | null, minDate?: Date): string | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
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
      throw new BadRequestException('Delivery date must be in YYYY-MM-DD format');
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

    if (parsed.getTime() < minimumDate.getTime()) {
      throw new BadRequestException('Delivery date cannot be before order creation date');
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

  private async safeNotifyOrderCreated(order: Order, requester: AuthUser): Promise<void> {
    try {
      const context = await this.loadOrderNotificationContext(order.id);
      if (!context) return;

      const orderLabel = context.orderNumber || 'order';
      const designLabel = context.design?.designName || context.design?.designNo || 'design';
      const salesRepName = this.getSalesRepDisplayName(context) || 'A sales rep';

      if (context.salesRepId) {
        await this.notificationsService.createForUser({
          userId: context.salesRepId,
          companyId: context.companyId,
          branchId: context.branchId,
          type: 'ORDER_CREATED',
          priority: NotificationPriority.P2,
          title: `Order ${orderLabel} created`,
          message:
            context.status === OrderStatus.PENDING_APPROVAL
              ? `Your order ${orderLabel} for ${designLabel} was submitted for approval.`
              : `Your order ${orderLabel} for ${designLabel} was created successfully.`,
          entityType: 'ORDER',
          entityId: context.id,
          actionUrl: `/orders/${context.id}`,
          channelPush: true,
          metadata: {
            orderId: context.id,
            orderNumber: context.orderNumber,
            status: context.status,
            designNo: context.design?.designNo ?? null,
          },
        });
      }

      if (context.status === OrderStatus.PENDING_APPROVAL) {
        const approverIds = await this.getApproverUserIdsForOrder(context, [context.salesRepId]);
        if (approverIds.length) {
          await this.notificationsService.createForUsers(approverIds, {
            companyId: context.companyId,
            branchId: context.branchId,
            type: 'ORDER_APPROVAL_REQUIRED',
            priority: NotificationPriority.P1,
            title: `Approval needed for ${orderLabel}`,
            message: `${salesRepName} submitted ${orderLabel} for approval.`,
            entityType: 'ORDER',
            entityId: context.id,
            actionUrl: `/orders/${context.id}`,
            channelPush: true,
            metadata: {
              orderId: context.id,
              orderNumber: context.orderNumber,
              status: context.status,
              designNo: context.design?.designNo ?? null,
            },
          });
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
          await this.notificationsService.createForUsers(approverIds, {
            companyId: context.companyId,
            branchId: context.branchId,
            type: 'ORDER_APPROVAL_REQUIRED',
            priority: NotificationPriority.P1,
            title: `Approval needed for ${orderLabel}`,
            message: `${salesRepName} moved ${orderLabel} back to pending approval.`,
            entityType: 'ORDER',
            entityId: context.id,
            actionUrl: `/orders/${context.id}`,
            channelPush: true,
            metadata,
          });
        }
      }

      if (!context.salesRepId) return;

      const transitionMessages: Partial<Record<OrderStatus, { type: string; priority: NotificationPriority; title: string; message: string }>> = {
        [OrderStatus.APPROVED]: {
          type: 'ORDER_APPROVED',
          priority: NotificationPriority.P1,
          title: `Order ${orderLabel} approved`,
          message: `${orderLabel} for ${designLabel} was approved.`,
        },
        [OrderStatus.IN_PRODUCTION]: {
          type: 'ORDER_IN_PRODUCTION',
          priority: NotificationPriority.P2,
          title: `${orderLabel} moved to production`,
          message: `${orderLabel} for ${designLabel} is now in production.`,
        },
        [OrderStatus.SHIPPED]: {
          type: 'ORDER_SHIPPED',
          priority: NotificationPriority.P1,
          title: `${orderLabel} shipped`,
          message: `${orderLabel} for ${designLabel} has been shipped.`,
        },
        [OrderStatus.COMPLETED]: {
          type: 'ORDER_COMPLETED',
          priority: NotificationPriority.P2,
          title: `${orderLabel} completed`,
          message: `${orderLabel} for ${designLabel} is complete.`,
        },
        [OrderStatus.CANCELLED]: {
          type: 'ORDER_CANCELLED',
          priority: NotificationPriority.P1,
          title: `${orderLabel} cancelled`,
          message: `${orderLabel} for ${designLabel} was cancelled.`,
        },
      };

      const transition = transitionMessages[current];
      if (!transition) return;

      await this.notificationsService.createForUser({
        userId: context.salesRepId,
        companyId: context.companyId,
        branchId: context.branchId,
        type: transition.type,
        priority: transition.priority,
        title: transition.title,
        message: transition.message,
        entityType: 'ORDER',
        entityId: context.id,
        actionUrl: `/orders/${context.id}`,
        channelPush: true,
        metadata: {
          ...metadata,
          updatedByUserId: requester.id,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `Order transition notification skipped for order ${order?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async loadOrderNotificationContext(orderId: string): Promise<Order | null> {
    return this.orderRepo.findOne({
      where: { id: orderId },
      relations: ['company', 'branch', 'branch.branchManager', 'design', 'salesRep'],
    });
  }

  private async getApproverUserIdsForOrder(order: Order, excludeIds: Array<string | null | undefined> = []): Promise<string[]> {
    const excluded = new Set(
      excludeIds.map((value) => String(value || '').trim()).filter((value) => value.length > 0),
    );
    const ids = new Set<string>();

    const branchManagerId = String(order.branch?.branchManager?.id || '').trim();
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
        const userId = String(user.id || '').trim();
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
        const userId = String(user.id || '').trim();
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

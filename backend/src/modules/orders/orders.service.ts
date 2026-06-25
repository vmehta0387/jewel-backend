import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { CreateOrderDto, FindOrdersQueryDto, UpdateOrderDto } from './dto/order.dto';
import { SpiffService } from '../spiff/spiff.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private s3Client: S3Client | null = null;
  private signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
  private readonly signedUrlCacheSkewMs = 2 * 60 * 1000;

  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Design) private readonly designRepo: Repository<Design>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly spiffService: SpiffService,
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
      .leftJoinAndSelect('order.salesRep', 'salesRep')
      .orderBy('order.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

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

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        '(order.orderNumber LIKE :search OR design.designNo LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search OR order.customerName LIKE :search OR order.customerPhone LIKE :search OR order.customerEmail LIKE :search OR order.purchaseOrderNumber LIKE :search)',
        { search },
      );
    }

    const [data, total] = await qb.getManyAndCount();
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
          designVersion: order.design?.version ?? null,
          costPrice: order.design ? this.roundMoney(this.toNumber(order.design.totalValue ?? 0)) : null,
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
      designVersion: order.design?.version ?? null,
      costPrice: order.design ? this.roundMoney(this.toNumber(order.design.totalValue ?? 0)) : null,
      salesRepName: this.getSalesRepDisplayName(order),
      salesRepEmail: order.salesRep?.email ?? null,
      branchManagerName: this.getBranchManagerDisplayName(order),
      designImageUrl,
    };
  }

  async create(dto: CreateOrderDto, requester: AuthUser) {
    const scope = this.resolveScope(requester, dto.companyId, dto.branchId);

    if (!scope.companyId) {
      throw new BadRequestException('Company is required');
    }
    if (!scope.branchId) {
      throw new BadRequestException('Branch is required');
    }

    if (scope.companyId) {
      const company = await this.companyRepo.findOne({ where: { id: scope.companyId } });
      if (!company) {
        throw new BadRequestException('Selected company not found');
      }
    }

    if (scope.branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: scope.branchId } });
      if (!branch) {
        throw new BadRequestException('Selected branch not found');
      }
      if (scope.companyId && branch.companyId !== scope.companyId) {
        throw new BadRequestException('Selected branch does not belong to the company');
      }
    }

    let design: Design | null = null;
    if (dto.designId) {
      design = await this.designRepo.findOne({ where: { id: dto.designId } });
      if (!design) {
        throw new NotFoundException('Design not found');
      }
      this.assertDesignScope(design, requester, scope);
    }

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: scope.companyId ?? undefined,
      branchId: scope.branchId ?? undefined,
    });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { orderNumber } = await this.getNextOrderNumber();
      const computedStatus = this.resolveCreateStatus(dto.status, requester.role);
      const order = this.orderRepo.create({
        orderNumber,
        companyId: scope.companyId ?? null,
        branchId: scope.branchId ?? null,
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
        isActive: true,
      });

      try {
        const saved = await this.orderRepo.save(order);
        await this.safeTrackOrderCreated(saved);
        return saved;
      } catch (error: any) {
        const isDuplicate =
          error?.code === 'ER_DUP_ENTRY' ||
          String(error?.message || '').includes('Duplicate entry');
        if (isDuplicate && attempt < 2) {
          continue;
        }
        throw error;
      }
    }

    throw new BadRequestException('Unable to generate unique order number. Please retry.');
  }

  private resolveCreateStatus(requestedStatus: OrderStatus | undefined, role: UserRole): OrderStatus {
    if (role === UserRole.SALES_REP) {
      return requestedStatus ?? OrderStatus.PENDING_APPROVAL;
    }

    if (role === UserRole.BRANCH_MANAGER) {
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
    this.assertReadScope(order, requester);

    const previousStatus = order.status;
    const scope = this.resolveScope(requester, dto.companyId ?? order.companyId ?? undefined, dto.branchId ?? order.branchId ?? undefined);

    if (dto.companyId !== undefined && scope.companyId) {
      const company = await this.companyRepo.findOne({ where: { id: scope.companyId } });
      if (!company) {
        throw new BadRequestException('Selected company not found');
      }
    }

    if (dto.branchId !== undefined && scope.branchId) {
      const branch = await this.branchRepo.findOne({ where: { id: scope.branchId } });
      if (!branch) {
        throw new BadRequestException('Selected branch not found');
      }
      if (scope.companyId && branch.companyId !== scope.companyId) {
        throw new BadRequestException('Selected branch does not belong to the company');
      }
    }

    let design: Design | null = null;
    if (dto.designId) {
      design = await this.designRepo.findOne({ where: { id: dto.designId } });
      if (!design) {
        throw new NotFoundException('Design not found');
      }
      this.assertDesignScope(design, requester, scope);
      order.designId = dto.designId;
    } else if (order.designId) {
      design = await this.designRepo.findOne({ where: { id: order.designId } });
    }

    if (dto.companyId !== undefined) {
      order.companyId = scope.companyId ?? null;
    }
    if (dto.branchId !== undefined) {
      order.branchId = scope.branchId ?? null;
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
    }

    const saved = await this.orderRepo.save(order);
    await this.safeTrackOrderTransition(saved, previousStatus);
    return saved;
  }

  async getPricePreview(params: { designId: string; companyId: string; branchId: string }) {
    const design = await this.designRepo.findOne({ where: { id: params.designId } });
    if (!design) {
      throw new NotFoundException('Design not found');
    }

    const pricing = await this.calculateOrderPrice({
      design,
      companyId: params.companyId,
      branchId: params.branchId,
    });

    return pricing;
  }

  async updateActiveStatus(id: string, isActive: boolean, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    order.isActive = isActive;
    return this.orderRepo.save(order);
  }

  async getSummary(requester: AuthUser) {
    const baseQuery = this.orderRepo.createQueryBuilder('order');
    this.applyScopeFilter(baseQuery, requester);
    baseQuery.andWhere('order.isActive = :isActive', { isActive: true });

    // Active Orders
    const activeOrders = await baseQuery.clone().getCount();

    // NOTE:
    // Use DB date boundaries (CURDATE/CURRENT_DATE) instead of JS Date ranges to avoid
    // server-timezone drift causing wrong "today/monthly" values.
    const summaryRow = await baseQuery.clone()
      .select(
        `COALESCE(SUM(CASE WHEN DATE(order.createdAt) = CURRENT_DATE THEN order.price ELSE 0 END), 0)`,
        'salesToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN DATE(order.createdAt) = DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY) THEN order.price ELSE 0 END), 0)`,
        'salesYesterday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN YEAR(order.createdAt) = YEAR(CURRENT_DATE) AND MONTH(order.createdAt) = MONTH(CURRENT_DATE) THEN order.price ELSE 0 END), 0)`,
        'salesThisMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN YEAR(order.createdAt) = YEAR(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) AND MONTH(order.createdAt) = MONTH(DATE_SUB(CURRENT_DATE, INTERVAL 1 MONTH)) THEN order.price ELSE 0 END), 0)`,
        'salesLastMonth',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN DATE(order.createdAt) = CURRENT_DATE THEN 1 ELSE 0 END), 0)`,
        'ordersToday',
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN YEAR(order.createdAt) = YEAR(CURRENT_DATE) AND MONTH(order.createdAt) = MONTH(CURRENT_DATE) THEN 1 ELSE 0 END), 0)`,
        'ordersThisMonth',
      )
      .getRawOne();

    const salesToday = this.toNumber(summaryRow?.salesToday ?? 0);
    const salesYesterday = this.toNumber(summaryRow?.salesYesterday ?? 0);
    const salesThisMonth = this.toNumber(summaryRow?.salesThisMonth ?? 0);
    const salesLastMonth = this.toNumber(summaryRow?.salesLastMonth ?? 0);
    const ordersToday = this.toNumber(summaryRow?.ordersToday ?? 0);
    const ordersThisMonth = this.toNumber(summaryRow?.ordersThisMonth ?? 0);
    const branchRevenueTotal = await baseQuery
      .clone()
      .select('COALESCE(SUM(order.price), 0)', 'branchRevenueTotal')
      .getRawOne()
      .then((row) => this.toNumber(row?.branchRevenueTotal ?? 0));
    const statusRows = await baseQuery
      .clone()
      .select('order.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const statusCounts = new Map<string, number>();
    for (const row of statusRows ?? []) {
      const key = String(row?.status ?? '').toUpperCase();
      if (!key) continue;
      statusCounts.set(key, this.toNumber(row?.count ?? 0));
    }

    const pipeline = {
      pending: (statusCounts.get('PENDING_APPROVAL') || 0) + (statusCounts.get('QUOTE') || 0),
      approved: statusCounts.get('APPROVED') || 0,
      inProduction: statusCounts.get('IN_PRODUCTION') || 0,
      shipped: statusCounts.get('SHIPPED') || 0,
      completed: statusCounts.get('COMPLETED') || 0,
      cancelled: statusCounts.get('CANCELLED') || 0,
    };
    const pendingApprovalOrders = statusCounts.get('PENDING_APPROVAL') || 0;

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

  async getTrends(requester: AuthUser) {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);

    const qb = this.orderRepo
      .createQueryBuilder('order')
      .select('DATE(order.createdAt)', 'date')
      .addSelect('COUNT(*)', 'orders')
      .addSelect('SUM(order.price)', 'sales')
      .where('order.createdAt >= :startDate AND order.createdAt <= :endDate', {
        startDate,
        endDate,
      })
      .andWhere('order.isActive = :isActive', { isActive: true })
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
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (normalizedCompanyId && normalizedCompanyId !== requester.companyId) {
      throw new ForbiddenException('You cannot access another company data');
    }

    qb.andWhere('order.companyId = :scopeCompanyId', { scopeCompanyId: requester.companyId });

    if (requester.branchId) {
      if (normalizedBranchId && normalizedBranchId !== requester.branchId) {
        throw new ForbiddenException('You cannot access another branch data');
      }
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

  private assertReadScope(order: Order, requester: AuthUser): void {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (!requester.companyId) {
      throw new ForbiddenException('User is not assigned to a company');
    }

    if (order.companyId && order.companyId !== requester.companyId) {
      throw new ForbiddenException('You cannot access another company data');
    }

    if (requester.branchId && order.branchId !== requester.branchId) {
      throw new ForbiddenException('You cannot access another branch data');
    }

    if (requester.role === UserRole.SALES_REP && order.salesRepId !== requester.id) {
      throw new ForbiddenException('You cannot access another sales order');
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
  }): Promise<{ baseCost: number; companyMultiplier: number; branchMultiplier: number; finalPrice: number }> {
    const baseCost = this.toNumber(params.design?.totalValue ?? 0);

    let companyMultiplier = 1;
    let branchMultiplier = 1;

    if (params.companyId) {
      companyMultiplier = await this.resolveCompanyMultiplier(params.companyId, baseCost, params.design?.collection || undefined);
    }

    if (params.branchId) {
      branchMultiplier = await this.resolveBranchMultiplier(params.branchId, baseCost);
    }

    const finalPrice = this.roundMoney(baseCost * companyMultiplier * branchMultiplier);
    return { baseCost, companyMultiplier, branchMultiplier, finalPrice };
  }

  private async resolveCompanyMultiplier(companyId: string, baseCost: number, collection?: string): Promise<number> {
    const company = await this.companyRepo.findOne({
      where: { id: companyId },
      relations: ['pricingSlabs', 'collectionPricingOverrides'],
    });
    if (!company) {
      throw new BadRequestException('Selected company not found');
    }

    if (company.enableCollectionPricing && collection) {
      const override = company.collectionPricingOverrides?.find(
        (row) => row.isActive && row.collectionType === collection,
      );
      if (override) {
        return this.toNumber(override.multiplier) || 1;
      }
    }

    if (company.enableSlabPricing) {
      const slab = company.pricingSlabs?.find(
        (row) => row.isActive && baseCost >= this.toNumber(row.minCost) && baseCost <= this.toNumber(row.maxCost),
      );
      if (slab) {
        return this.toNumber(slab.multiplier) || 1;
      }
    }

    return this.toNumber(company.defaultMultiplier) || 1;
  }

  private async resolveBranchMultiplier(branchId: string, baseCost: number): Promise<number> {
    const branch = await this.branchRepo.findOne({
      where: { id: branchId },
      relations: ['pricingSlabs'],
    });
    if (!branch) {
      throw new BadRequestException('Selected branch not found');
    }

    if (branch.enableSlabPricing) {
      const slab = branch.pricingSlabs?.find(
        (row) => row.isActive && baseCost >= this.toNumber(row.minCost) && baseCost <= this.toNumber(row.maxCost),
      );
      if (slab) {
        return this.toNumber(slab.multiplier) || 1;
      }
    }

    return this.toNumber(branch.branchMultiplier) || 1;
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
}

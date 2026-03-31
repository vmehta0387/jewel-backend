import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Design } from '../products/entities/design.entity';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateOrderDto, FindOrdersQueryDto, UpdateOrderDto } from './dto/order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Design) private readonly designRepo: Repository<Design>,
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
      .leftJoinAndSelect('order.design', 'design')
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
        '(order.orderNumber LIKE :search OR design.designNo LIKE :search OR company.companyName LIKE :search OR branch.name LIKE :search)',
        { search },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    const enriched = data.map((order) => ({
      ...order,
      companyName: order.company?.companyName ?? null,
      branchName: order.branch?.name ?? null,
      designNo: order.design?.designNo ?? null,
      designVersion: order.design?.version ?? null,
    }));

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
      relations: ['company', 'branch', 'design'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    this.assertReadScope(order, requester);
    return order;
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
        deliveryDate: dto.deliveryDate?.trim() || null,
        quantity: dto.quantity ?? 1,
        price: pricing.finalPrice,
        shortDescription: dto.shortDescription?.trim() || null,
        notes: dto.notes?.trim() || null,
        status: computedStatus,
        isActive: true,
      });

      try {
        return await this.orderRepo.save(order);
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
      return OrderStatus.PENDING_APPROVAL;
    }

    if (role === UserRole.BRANCH_MANAGER) {
      return requestedStatus ?? OrderStatus.APPROVED;
    }

    return requestedStatus ?? OrderStatus.QUOTE;
  }

  async update(id: string, dto: UpdateOrderDto, requester: AuthUser) {
    const order = await this.findOne(id, requester);
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
      order.deliveryDate = dto.deliveryDate?.trim() || null;
    }
    if (dto.quantity !== undefined) {
      order.quantity = dto.quantity;
    }
    const pricing = await this.calculateOrderPrice({
      design,
      companyId: order.companyId ?? undefined,
      branchId: order.branchId ?? undefined,
    });
    order.price = pricing.finalPrice;
    if (dto.shortDescription !== undefined) {
      order.shortDescription = dto.shortDescription?.trim() || null;
    }
    if (dto.notes !== undefined) {
      order.notes = dto.notes?.trim() || null;
    }
    if (dto.status !== undefined) {
      order.status = dto.status;
    }

    return this.orderRepo.save(order);
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
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(now);
    const weekday = startOfWeek.getDay(); // 0 Sunday
    const diff = (weekday + 6) % 7; // Monday start
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const baseQuery = this.orderRepo.createQueryBuilder('order');
    this.applyScopeFilter(baseQuery, requester);

    const activeOrders = await baseQuery.clone()
      .andWhere('order.isActive = :isActive', { isActive: true })
      .getCount();

    const ordersReceivedToday = await baseQuery.clone()
      .andWhere('order.createdAt >= :startToday AND order.createdAt <= :endToday', {
        startToday: startOfToday,
        endToday: endOfToday,
      })
      .getCount();

    const ordersDueToday = await baseQuery.clone()
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere('order.deliveryDate >= :startToday AND order.deliveryDate <= :endToday', {
        startToday: startOfToday,
        endToday: endOfToday,
      })
      .getCount();

    const salesThisWeekRow = await baseQuery.clone()
      .select('SUM(order.price)', 'total')
      .andWhere('order.isActive = :isActive', { isActive: true })
      .andWhere('order.createdAt >= :startOfWeek', { startOfWeek })
      .getRawOne();

    const salesThisWeek = this.toNumber(salesThisWeekRow?.total ?? 0);

    return {
      activeOrders,
      ordersReceivedToday,
      ordersDueToday,
      salesThisWeek,
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
      qb.andWhere('(order.branchId = :scopeBranchId OR order.branchId IS NULL)', {
        scopeBranchId: requester.branchId,
      });
      return;
    }

    if (normalizedBranchId) {
      qb.andWhere('order.branchId = :scopeBranchId', { scopeBranchId: normalizedBranchId });
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

    if (requester.branchId && order.branchId && order.branchId !== requester.branchId) {
      throw new ForbiddenException('You cannot access another branch data');
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

  private roundMoney(value: number): number {
    return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
  }
}

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
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `JB${yy}${mm}`;

    const last = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.orderNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('order.orderNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (last?.orderNumber) {
      const match = new RegExp(`^${prefix}(\\d+)$`).exec(last.orderNumber.trim().toUpperCase());
      if (match) {
        const parsed = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsed)) {
          seq = parsed + 1;
        }
      }
    }

    const orderNumber = `${prefix}${String(seq).padStart(3, '0')}`;
    return { orderNumber };
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

    const { orderNumber } = await this.getNextOrderNumber();

    const order = this.orderRepo.create({
      orderNumber,
      companyId: scope.companyId ?? null,
      branchId: scope.branchId ?? null,
      designId: dto.designId ?? null,
      salesRepId: requester.id,
      deliveryDate: dto.deliveryDate?.trim() || null,
      quantity: dto.quantity ?? 1,
      price: dto.price ?? 0,
      shortDescription: dto.shortDescription?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: OrderStatus.QUOTE,
      isActive: true,
    });

    return this.orderRepo.save(order);
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

    if (dto.designId) {
      const design = await this.designRepo.findOne({ where: { id: dto.designId } });
      if (!design) {
        throw new NotFoundException('Design not found');
      }
      this.assertDesignScope(design, requester, scope);
      order.designId = dto.designId;
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
    if (dto.price !== undefined) {
      order.price = dto.price;
    }
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

  async updateActiveStatus(id: string, isActive: boolean, requester: AuthUser) {
    const order = await this.findOne(id, requester);
    order.isActive = isActive;
    return this.orderRepo.save(order);
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
}

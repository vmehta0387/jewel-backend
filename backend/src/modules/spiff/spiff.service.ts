import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { GiftogramService } from './giftogram.service';
import { NotificationPriority } from '../notifications/entities/notification.entity';
import { NotificationEventsService } from '../notification-events/notification-events.service';
import { SpiffPointLedger } from './entities/spiff-point-ledger.entity';
import { SpiffRedemptionClaim } from './entities/spiff-redemption-claim.entity';
import { SpiffSetting } from './entities/spiff-setting.entity';
import { SpiffClaimStatus } from './enums/spiff-claim-status.enum';
import { SpiffLedgerEvent } from './enums/spiff-ledger-event.enum';
import {
  ClaimReviewAction,
  CreateSpiffClaimDto,
  CreateSpiffPointAdjustmentDto,
  FindSpiffActivityQueryDto,
  FindSpiffClaimsQueryDto,
  FulfillSpiffClaimDto,
  ReviewSpiffClaimDto,
  SpiffPointAdjustmentAction,
  SpiffLeaderboardPeriod,
  SpiffLeaderboardQueryDto,
  SpiffLeaderboardScope,
  UpdateSpiffConfigDto,
} from './dto/spiff.dto';

type WalletSummary = {
  totalEarnedPoints: number;
  unlockedPoints: number;
  lockedPoints: number;
  committedPoints: number;
  availablePoints: number;
  fulfilledClaimedPoints: number;
};

@Injectable()
export class SpiffService {
  private static readonly SETTINGS_KEY_POINTS_PER_DOLLAR = 'POINTS_PER_DOLLAR';
  private readonly logger = new Logger(SpiffService.name);
  private readonly activeLedgerOrderCondition =
    '(ledger.orderId IS NULL OR ord.id IS NULL OR ord.status != :spiffCancelledStatus)';

  constructor(
    @InjectRepository(SpiffPointLedger)
    private readonly ledgerRepo: Repository<SpiffPointLedger>,
    @InjectRepository(SpiffRedemptionClaim)
    private readonly claimRepo: Repository<SpiffRedemptionClaim>,
    @InjectRepository(SpiffSetting)
    private readonly settingRepo: Repository<SpiffSetting>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly giftogramService: GiftogramService,
    private readonly notificationEventsService: NotificationEventsService,
  ) { }

  async getConfig() {
    const pointsPerDollar = await this.getPointsPerDollar();
    return {
      minRedeemPoints: this.getMinRedeemPoints(),
      pointsPerDollar,
      conversionDisplay: `${pointsPerDollar} points = $1`,
      giftCardOptions: this.getGiftCardOptions(),
      giftbitConfigured: this.giftogramService.isConfigured(),
      giftogramConfigured: this.giftogramService.isConfigured(),
      autoFulfill: this.isAutoFulfillEnabled(),
    };
  }

  async updateConfig(dto: UpdateSpiffConfigDto, requester: AuthUser) {
    const normalizedPointsPerDollar = Math.max(1, Math.floor(Number(dto.pointsPerDollar || 0)));
    if (!Number.isFinite(normalizedPointsPerDollar)) {
      throw new BadRequestException('pointsPerDollar must be a valid positive integer');
    }

    await this.upsertSetting(
      SpiffService.SETTINGS_KEY_POINTS_PER_DOLLAR,
      String(normalizedPointsPerDollar),
      requester.id,
    );

    return this.getConfig();
  }

  async getMySummary(requester: AuthUser) {
    const wallet = await this.computeWallet(requester.id);
    const claimStats = await this.claimRepo
      .createQueryBuilder('claim')
      .select('COUNT(*)', 'totalClaims')
      .addSelect(
        'COALESCE(SUM(CASE WHEN claim.status IN (:...pendingStatuses) THEN 1 ELSE 0 END), 0)',
        'pendingClaims',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN claim.status = :fulfilledStatus THEN 1 ELSE 0 END), 0)',
        'fulfilledClaims',
      )
      .addSelect('MAX(claim.createdAt)', 'lastClaimAt')
      .where('claim.userId = :userId', { userId: requester.id })
      .setParameters({
        pendingStatuses: [
          SpiffClaimStatus.PENDING_REVIEW,
          SpiffClaimStatus.HOLD,
          SpiffClaimStatus.APPROVED,
        ],
        fulfilledStatus: SpiffClaimStatus.FULFILLED,
      })
      .getRawOne();

    const tier = this.resolveTier(wallet.totalEarnedPoints);
    return {
      wallet,
      tier,
      stats: {
        totalClaims: this.toNumber(claimStats?.totalClaims),
        pendingClaims: this.toNumber(claimStats?.pendingClaims),
        fulfilledClaims: this.toNumber(claimStats?.fulfilledClaims),
        lastClaimAt: claimStats?.lastClaimAt || null,
      },
      config: await this.getConfig(),
    };
  }

  async getLeaderboard(query: SpiffLeaderboardQueryDto, requester: AuthUser) {
    const period = query.period || SpiffLeaderboardPeriod.MONTHLY;
    const scope = this.resolveLeaderboardScope(query.scope, requester);
    const limit = Math.max(1, Math.min(Number(query.limit || 10), 100));
    const repLimit = Math.max(1, Math.min(Number(query.repLimit || 25), 100));
    const includeGlobalReps = Boolean(query.includeGlobalReps);
    const periodRange = this.resolvePeriodRange(period);

    if (scope === SpiffLeaderboardScope.GLOBAL) {
      this.assertGlobalLeaderboardAccess(requester);
      const companyPointsQb = this.ledgerRepo
        .createQueryBuilder('ledger')
        .select('ledger.companyId', 'companyId')
        .addSelect('COALESCE(SUM(ledger.points), 0)', 'points')
        .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
        .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
        .where('ledger.companyId IS NOT NULL')
        .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
        .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED });

      if (periodRange.startDate) {
        companyPointsQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
      }

      companyPointsQb.groupBy('ledger.companyId').orderBy('points', 'DESC');
      const companyPointRows = await companyPointsQb.getRawMany();
      const companyIds = Array.from(
        new Set(
          companyPointRows
            .map((row) => this.toPositiveIntOrNull(row.companyId))
            .filter((id): id is number => id !== null),
        ),
      );

      const companies = companyIds.length
        ? await this.companyRepo.find({ where: { id: In(companyIds) } })
        : [];
      const companyById = new Map(companies.map((company) => [Number(company.id), company]));

      const companyOrdersAgg = new Map<number, { totalOrders: number; totalGmv: number }>();
      if (companyIds.length > 0) {
        const companyOrdersQb = this.orderRepo
          .createQueryBuilder('ord')
          .select('ord.companyId', 'companyId')
          .addSelect('COUNT(*)', 'totalOrders')
          .addSelect('COALESCE(SUM(ord.price), 0)', 'totalGmv')
          .where('ord.companyId IN (:...companyIds)', { companyIds })
          .andWhere('ord.isActive = :isActive', { isActive: true });

        if (periodRange.startDate) {
          companyOrdersQb.andWhere('ord.createdAt >= :startDate', { startDate: periodRange.startDate });
        }

        companyOrdersQb.groupBy('ord.companyId');
        const companyOrderRows = await companyOrdersQb.getRawMany();
        companyOrderRows.forEach((row) => {
          const companyId = this.toPositiveIntOrNull(row.companyId);
          if (companyId === null) return;
          companyOrdersAgg.set(companyId, {
            totalOrders: this.toNumber(row.totalOrders),
            totalGmv: this.roundMoney(this.toNumber(row.totalGmv)),
          });
        });
      }

      const topRepByCompany = new Map<number, { userId: number; points: number }>();
      if (companyIds.length > 0) {
        const topRepQb = this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('ledger.companyId', 'companyId')
          .addSelect('ledger.userId', 'userId')
          .addSelect('COALESCE(SUM(ledger.points), 0)', 'points')
          .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
          .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
          .where('ledger.companyId IN (:...companyIds)', { companyIds })
          .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
          .andWhere('ledger.userId IS NOT NULL')
          .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED })
          .groupBy('ledger.companyId')
          .addGroupBy('ledger.userId')
          .orderBy('ledger.companyId', 'ASC')
          .addOrderBy('points', 'DESC');

        if (periodRange.startDate) {
          topRepQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
        }

        const topRepRows = await topRepQb.getRawMany();
        for (const row of topRepRows) {
          const companyId = this.toPositiveIntOrNull(row.companyId);
          const userId = this.toPositiveIntOrNull(row.userId);
          if (companyId === null || userId === null || topRepByCompany.has(companyId)) {
            continue;
          }
          topRepByCompany.set(companyId, {
            userId,
            points: this.toNumber(row.points),
          });
        }
      }

      const topRepUserIds = Array.from(
        new Set(Array.from(topRepByCompany.values()).map((item) => item.userId)),
      );
      const topRepUsers = topRepUserIds.length
        ? await this.userRepo.find({ where: { id: In(topRepUserIds) } })
        : [];
      const topRepUserById = new Map(topRepUsers.map((user) => [Number(user.id), user]));

      const entries = companyPointRows.slice(0, limit).map((row, index) => {
        const companyId = this.toPositiveIntOrNull(row.companyId);
        const responseCompanyId = String(row.companyId || '').trim();
        const company = companyId === null ? null : companyById.get(companyId);
        const orderAgg = companyId === null
          ? { totalOrders: 0, totalGmv: 0 }
          : companyOrdersAgg.get(companyId) || { totalOrders: 0, totalGmv: 0 };
        const topRepInfo = companyId === null ? null : topRepByCompany.get(companyId);
        const topRepUser = topRepInfo ? topRepUserById.get(topRepInfo.userId) : null;
        return {
          rank: index + 1,
          entityId: responseCompanyId,
          name: company?.companyName || 'Unknown company',
          subtitle: company?.companyCode || null,
          points: this.toNumber(row.points),
          totalOrders: orderAgg.totalOrders,
          totalGmv: orderAgg.totalGmv,
          topRepName: this.getSpiffUserDisplayName(topRepUser),
          topRepPoints: topRepInfo?.points || 0,
        };
      });

      let globalRepEntries: Array<{
        rank: number;
        userId: string;
        name: string;
        companyName: string | null;
        role: string | null;
        points: number;
      }> = [];

      if (includeGlobalReps) {
        const globalRepQb = this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('ledger.userId', 'userId')
          .addSelect('COALESCE(SUM(ledger.points), 0)', 'points')
          .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
          .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
          .where('ledger.userId IS NOT NULL')
          .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
          .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED })
          .groupBy('ledger.userId')
          .orderBy('points', 'DESC');

        if (periodRange.startDate) {
          globalRepQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
        }

        const globalRepRows = await globalRepQb.getRawMany();
        const repUserIds = Array.from(
          new Set(
            globalRepRows
              .slice(0, repLimit)
              .map((row) => this.toPositiveIntOrNull(row.userId))
              .filter((id): id is number => id !== null),
          ),
        );
        const repUsers = repUserIds.length
          ? await this.userRepo.find({ where: { id: In(repUserIds) } })
          : [];
        const repUserById = new Map(repUsers.map((user) => [Number(user.id), user]));

        const repCompanyIds = Array.from(
          new Set(
            repUsers
              .map((user) => this.toPositiveIntOrNull(user.companyId))
              .filter((id): id is number => id !== null),
          ),
        );
        const repCompanies = repCompanyIds.length
          ? await this.companyRepo.find({ where: { id: In(repCompanyIds) } })
          : [];
        const repCompanyById = new Map(repCompanies.map((company) => [Number(company.id), company]));

        globalRepEntries = globalRepRows.slice(0, repLimit).map((row, index) => {
          const userId = this.toPositiveIntOrNull(row.userId);
          const responseUserId = String(row.userId || '').trim();
          const repUser = userId === null ? null : repUserById.get(userId);
          const repCompany = repUser?.companyId ? repCompanyById.get(repUser.companyId) : null;

          return {
            rank: index + 1,
            userId: responseUserId,
            name: this.getSpiffUserDisplayName(repUser) || 'Unknown rep',
            companyName: repCompany?.companyName || null,
            role: repUser?.role || null,
            points: this.toNumber(row.points),
          };
        });
      }

      return {
        scope,
        period,
        entries,
        globalRepEntries,
      };
    }

    const qb = this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('ledger.userId', 'userId')
      .addSelect('COALESCE(SUM(ledger.points), 0)', 'points')
      .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
      .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
      .where('ledger.userId IS NOT NULL')
      .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
      .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED });

    if (periodRange.startDate) {
      qb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
    }

    if (scope === SpiffLeaderboardScope.MY_BRANCH) {
      const branchId = requester.branchId;
      if (!branchId) {
        throw new BadRequestException('Branch scope is not available for this user');
      }
      qb.andWhere('ledger.branchId = :branchId', { branchId });
    }

    if (scope === SpiffLeaderboardScope.MY_COMPANY) {
      if (requester.role === UserRole.INTERNAL_REP) {
        const managedCompanyIds = await this.getInternalRepManagedCompanyIds(requester.id);
        if (managedCompanyIds.length === 0) {
          qb.andWhere('1 = 0');
        } else {
          qb.andWhere('ledger.companyId IN (:...managedCompanyIds)', { managedCompanyIds });
        }
      } else {
      const companyId = requester.companyId;
      if (!companyId) {
        throw new BadRequestException('Company scope is not available for this user');
      }
      qb.andWhere('ledger.companyId = :companyId', { companyId });
      }
    }

    qb.groupBy('ledger.userId').orderBy('points', 'DESC');

    const rows = await qb.getRawMany();
    const userIds = rows
      .map((row) => this.toPositiveIntOrNull(row.userId))
      .filter((id): id is number => id !== null);
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userById = new Map(users.map((user) => [Number(user.id), user]));

    const entries = rows.slice(0, limit).map((row, index) => {
      const userId = this.toPositiveIntOrNull(row.userId);
      const responseUserId = String(row.userId || '').trim();
      const user = userId === null ? null : userById.get(userId);
      return {
        rank: index + 1,
        entityId: responseUserId,
        name: this.getSpiffUserDisplayName(user) || 'Unknown rep',
        subtitle: user?.role || null,
        points: this.toNumber(row.points),
      };
    });

    const myIndex = rows.findIndex((row) => this.toPositiveIntOrNull(row.userId) === requester.id);
    const myRank = myIndex >= 0
      ? {
        rank: myIndex + 1,
        points: this.toNumber(rows[myIndex]?.points),
      }
      : null;

    return {
      scope,
      period,
      entries,
      myRank,
    };
  }

  async findClaims(query: FindSpiffClaimsQueryDto, requester: AuthUser) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(Number(query.limit || 20), 100));
    const skip = (page - 1) * limit;
    const search = this.optionalText(query.q);

    const qb = this.claimRepo
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.user', 'user')
      .leftJoinAndSelect('claim.company', 'company')
      .leftJoinAndSelect('claim.branch', 'branch')
      .leftJoinAndSelect('claim.approvedBy', 'approvedBy')
      .orderBy('claim.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('claim.status = :status', { status: query.status });
    }

    if (search) {
      const like = `%${search}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('claim.claimNumber LIKE :like', { like })
            .orWhere('claim.giftCardType LIKE :like', { like })
            .orWhere('user.firstName LIKE :like', { like })
            .orWhere('user.lastName LIKE :like', { like })
            .orWhere('user.userHandle LIKE :like', { like })
            .orWhere('user.email LIKE :like', { like })
            .orWhere('company.companyName LIKE :like', { like })
            .orWhere('branch.name LIKE :like', { like });
        }),
      );
    }

    if (this.canManageClaims(requester)) {
      if (requester.role === UserRole.COMPANY_ADMIN) {
        if (!requester.companyId) {
          throw new ForbiddenException('Company admin must be assigned to a company');
        }
        qb.andWhere('claim.companyId = :companyId', { companyId: requester.companyId });
      } else if (requester.role === UserRole.BRANCH_MANAGER) {
        if (!requester.branchId) {
          throw new ForbiddenException('Branch manager must be assigned to a branch');
        }
        qb.andWhere('claim.branchId = :branchId', { branchId: requester.branchId });
      } else if (requester.role === UserRole.INTERNAL_REP) {
        const managedCompanyIds = await this.getInternalRepManagedCompanyIds(requester.id);
        if (managedCompanyIds.length === 0) {
          qb.andWhere('claim.userId = :requesterId', { requesterId: requester.id });
        } else {
          qb.andWhere('(claim.companyId IN (:...managedCompanyIds) OR claim.userId = :requesterId)', {
            managedCompanyIds,
            requesterId: requester.id,
          });
        }
      }
    } else {
      qb.andWhere('claim.userId = :userId', { userId: requester.id });
    }

    const [rows, total] = await qb.getManyAndCount();

    return {
      data: rows.map((claim) => this.serializeClaim(claim)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findActivity(query: FindSpiffActivityQueryDto, requester: AuthUser) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(Number(query.limit || 30), 100));
    const take = page * limit;

    const earnedQb = this.ledgerRepo
      .createQueryBuilder('ledger')
      .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
      .leftJoin(User, 'user', 'user.id = ledger.userId')
      .leftJoin(Company, 'company', 'company.id = ledger.companyId')
      .leftJoin(Branch, 'branch', 'branch.id = ledger.branchId')
      .select(
        `CASE WHEN ledger.eventType = :spiffCancelReversalEvent THEN ledger.id ELSE COALESCE(ledger.orderId, ledger.id) END`,
        'groupId',
      )
      .addSelect('ledger.orderId', 'orderId')
      .addSelect('MAX(ledger.createdAt)', 'createdAt')
      .addSelect('COALESCE(SUM(ledger.points), 0)', 'points')
      .addSelect('GROUP_CONCAT(DISTINCT ledger.eventType)', 'eventTypes')
      .addSelect("MAX(JSON_UNQUOTE(JSON_EXTRACT(ledger.metadata, '$.action')))", 'manualAction')
      .addSelect('MAX(ledger.note)', 'note')
      .addSelect('ord.orderNumber', 'orderNumber')
      .addSelect('ord.price', 'orderAmount')
      .addSelect('ord.status', 'orderStatus')
      .addSelect('company.companyName', 'companyName')
      .addSelect('branch.name', 'branchName')
      .where('ledger.points != 0')
      .setParameter('spiffCancelReversalEvent', SpiffLedgerEvent.ORDER_CANCELLED_REVERSAL)
      .groupBy(
        `CASE WHEN ledger.eventType = :spiffCancelReversalEvent THEN ledger.id ELSE COALESCE(ledger.orderId, ledger.id) END`,
      )
      .addGroupBy('ledger.orderId')
      .addGroupBy('ord.orderNumber')
      .addGroupBy('ord.price')
      .addGroupBy('ord.status')
      .addGroupBy('company.companyName')
      .addGroupBy('branch.name')
      .orderBy('createdAt', 'DESC')
      .limit(take);

    await this.applySpiffActivityScope(earnedQb, requester, 'ledger');

    const claimsQb = this.claimRepo
      .createQueryBuilder('claim')
      .leftJoinAndSelect('claim.user', 'user')
      .leftJoinAndSelect('claim.company', 'company')
      .leftJoinAndSelect('claim.branch', 'branch')
      .leftJoinAndSelect('claim.approvedBy', 'approvedBy')
      .orderBy('claim.createdAt', 'DESC')
      .take(take);

    await this.applySpiffActivityScope(claimsQb, requester, 'claim');

    const earnedCountQb = this.ledgerRepo
      .createQueryBuilder('ledger')
      .select(
        `COUNT(DISTINCT CASE WHEN ledger.eventType = :spiffCancelReversalEvent THEN ledger.id ELSE COALESCE(ledger.orderId, ledger.id) END)`,
        'total',
      )
      .where('ledger.points != 0')
      .setParameter('spiffCancelReversalEvent', SpiffLedgerEvent.ORDER_CANCELLED_REVERSAL);
    await this.applySpiffActivityScope(earnedCountQb, requester, 'ledger');

    const claimCountQb = this.claimRepo
      .createQueryBuilder('claim')
      .select('COUNT(*)', 'total');
    await this.applySpiffActivityScope(claimCountQb, requester, 'claim');

    const [earnedRows, claimRows, earnedTotalRaw, claimTotalRaw] = await Promise.all([
      earnedQb.getRawMany(),
      claimsQb.getMany(),
      earnedCountQb.getRawOne<{ total: string | number | null }>(),
      claimCountQb.getRawOne<{ total: string | number | null }>(),
    ]);

    const earnedItems = earnedRows.map((row) => this.serializeEarnedActivity(row));
    const claimItems = claimRows.map((claim) => this.serializeClaimActivity(claim));
    const merged = [...earnedItems, ...claimItems].sort((a, b) => {
      const bTime = new Date(String(b.createdAt || '')).getTime() || 0;
      const aTime = new Date(String(a.createdAt || '')).getTime() || 0;
      return bTime - aTime;
    });
    const total = this.toNumber(earnedTotalRaw?.total) + this.toNumber(claimTotalRaw?.total);
    const start = (page - 1) * limit;

    return {
      data: merged.slice(start, start + limit),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async updatePoints(dto: CreateSpiffClaimDto | CreateSpiffPointAdjustmentDto, requester: AuthUser) {
    const action = this.optionalText((dto as CreateSpiffPointAdjustmentDto).action)?.toUpperCase();
    const targetUserId = this.toPositiveIntOrNull((dto as CreateSpiffPointAdjustmentDto).userId);
    if (action || targetUserId || requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.BRANCH_MANAGER) {
      return this.applyPointUpdate(dto, requester);
    }

    return this.createRedemptionClaim(dto as CreateSpiffClaimDto, requester);
  }

  private async createRedemptionClaim(dto: CreateSpiffClaimDto, requester: AuthUser) {
    if (![UserRole.SALES_REP, UserRole.INTERNAL_REP, UserRole.COMPANY_ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sales users can create redemption claims');
    }

    const requestedPoints = this.roundPoints(this.toNumber(dto.requestedPoints || 0));
    if (!Number.isFinite(requestedPoints) || requestedPoints <= 0) {
      throw new BadRequestException('Requested points must be greater than zero');
    }

    if (requestedPoints < this.getMinRedeemPoints()) {
      throw new BadRequestException(`Minimum redemption is ${this.getMinRedeemPoints()} points`);
    }

    const pendingExisting = await this.claimRepo.findOne({
      where: {
        userId: requester.id,
        status: In([
          SpiffClaimStatus.PENDING_REVIEW,
          SpiffClaimStatus.HOLD,
          SpiffClaimStatus.APPROVED,
        ]),
      },
      order: { createdAt: 'DESC' },
    });

    if (pendingExisting) {
      throw new BadRequestException('You already have a pending redemption claim');
    }

    const wallet = await this.computeWallet(requester.id);
    if (requestedPoints > wallet.availablePoints) {
      throw new BadRequestException(
        `Insufficient available points. Available: ${wallet.availablePoints}`,
      );
    }

    const pointsPerDollar = await this.getPointsPerDollar();
    const requestedAmountCents = Math.floor((requestedPoints * 100) / pointsPerDollar);
    if (requestedAmountCents <= 0) {
      throw new BadRequestException('Requested points are too low for redemption');
    }

    const giftCardType = String(dto.giftCardType || '').trim() || this.getDefaultGiftCardLabel();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const claimNumber = await this.getNextClaimNumber();
      const claim = this.claimRepo.create({
        claimNumber,
        userId: requester.id,
        companyId: requester.companyId || null,
        branchId: requester.branchId || null,
        requestedPoints,
        requestedAmountCents,
        conversionRatePointsPerDollar: pointsPerDollar,
        giftCardType,
        note: this.optionalText(dto.note),
        status: SpiffClaimStatus.PENDING_REVIEW,
      });

      try {
        const saved = await this.claimRepo.save(claim);
        await this.safeNotifyClaimCreated(saved, requester);
        return {
          claim: this.serializeClaim(saved),
          wallet: await this.computeWallet(requester.id),
        };
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

    throw new BadRequestException('Unable to generate claim number. Please retry.');
  }

  private async applyPointUpdate(dto: CreateSpiffClaimDto | CreateSpiffPointAdjustmentDto, requester: AuthUser) {
    this.assertCanManageClaims(requester);

    const targetUserId = this.toPositiveIntOrNull((dto as CreateSpiffPointAdjustmentDto).userId);
    if (!targetUserId) {
      throw new BadRequestException('Sales rep is required');
    }

    const targetUser = await this.userRepo.findOne({
      where: { id: targetUserId },
      relations: ['company', 'branch'],
    });
    if (!targetUser || targetUser.role !== UserRole.SALES_REP) {
      throw new NotFoundException('Sales rep not found');
    }
    await this.assertUserAdjustmentScope(targetUser, requester);

    const action = String((dto as CreateSpiffPointAdjustmentDto).action || '').toUpperCase() as SpiffPointAdjustmentAction;
    const absolutePoints = this.roundPoints(
      this.toNumber((dto as CreateSpiffPointAdjustmentDto).points ?? (dto as CreateSpiffClaimDto).requestedPoints),
    );
    if (!['ADD', 'REMOVE', 'REDEEM'].includes(action)) {
      throw new BadRequestException('Action is required');
    }
    if (!Number.isFinite(absolutePoints) || absolutePoints <= 0) {
      throw new BadRequestException('Points must be greater than zero');
    }

    const walletBefore = await this.computeWallet(targetUser.id);
    const isDebitAction = action === 'REMOVE' || action === 'REDEEM';
    if (isDebitAction && absolutePoints > walletBefore.availablePoints) {
      throw new BadRequestException(
        `Insufficient available points. Available: ${walletBefore.availablePoints}`,
      );
    }

    const signedPoints = isDebitAction ? -absolutePoints : absolutePoints;
    const actorName = [requester.firstName, requester.lastName].filter(Boolean).join(' ').trim();
    const targetName = [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ').trim();
    const actionLabel = action === 'ADD' ? 'Added' : action === 'REDEEM' ? 'Redeemed' : 'Removed';
    const note = this.optionalText(dto.note) || `${actionLabel} by ${actorName || requester.email || 'admin'}`;

    const ledgerEntry = await this.createLedgerEntryIfMissing({
      userId: targetUser.id,
      companyId: targetUser.companyId || null,
      branchId: targetUser.branchId || null,
      orderId: null,
      points: signedPoints,
      eventType: SpiffLedgerEvent.MANUAL_ADJUSTMENT,
      eventKey: `manual-adjustment:${randomUUID()}`,
      note,
      metadata: {
        action,
        enteredPoints: absolutePoints,
        signedPoints,
        adjustedByUserId: requester.id,
        adjustedByName: actorName || requester.email || null,
        targetUserName: targetName || targetUser.email,
      },
    });

    if (action === 'ADD' && signedPoints > 0 && ledgerEntry) {
      await this.safeNotifySpiffPointsGiven(ledgerEntry, targetUser, requester);
    }

    return {
      adjustment: {
        userId: targetUser.id,
        action,
        points: signedPoints,
        eventType: SpiffLedgerEvent.MANUAL_ADJUSTMENT,
        note,
      },
      wallet: await this.computeWallet(targetUser.id),
    };
  }

  async getUserWallet(userId: string, requester: AuthUser): Promise<WalletSummary> {
    this.assertCanManageClaims(requester);

    const targetUserId = this.toPositiveIntOrNull(userId);
    if (!targetUserId) {
      throw new BadRequestException('Sales rep is required');
    }

    const targetUser = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!targetUser || targetUser.role !== UserRole.SALES_REP) {
      throw new NotFoundException('Sales rep not found');
    }

    await this.assertUserAdjustmentScope(targetUser, requester);
    return this.computeWallet(targetUser.id);
  }

  async reviewClaim(id: number, dto: ReviewSpiffClaimDto, requester: AuthUser) {
    this.assertCanManageClaims(requester);

    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['user', 'company', 'branch', 'approvedBy'],
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    await this.assertClaimScope(claim, requester);

    if (claim.status === SpiffClaimStatus.REJECTED) {
      throw new BadRequestException('Claim is already rejected');
    }

    const reason = this.optionalText(dto.reason);

    if (dto.action === ClaimReviewAction.REJECT) {
      if (claim.status === SpiffClaimStatus.FULFILLED) {
        throw new BadRequestException(
          'Claim is already fulfilled and cannot be rejected from this screen.',
        );
      }
      claim.status = SpiffClaimStatus.REJECTED;
      claim.reviewReason = reason || 'Rejected by reviewer';
      claim.approvedById = requester.id;
      claim.approvedAt = new Date();
      const saved = await this.claimRepo.save(claim);
      await this.safeNotifyClaimReviewed(saved, requester);
      return this.serializeClaim(saved);
    }

    if (dto.action === ClaimReviewAction.HOLD) {
      if (claim.status === SpiffClaimStatus.FULFILLED) {
        throw new BadRequestException(
          'Claim is already fulfilled and cannot be moved to hold.',
        );
      }
      claim.status = SpiffClaimStatus.HOLD;
      claim.reviewReason = reason || 'On hold';
      claim.approvedById = requester.id;
      claim.approvedAt = new Date();
      const saved = await this.claimRepo.save(claim);
      await this.safeNotifyClaimReviewed(saved, requester);
      return this.serializeClaim(saved);
    }

    if (claim.status === SpiffClaimStatus.FULFILLED) {
      throw new BadRequestException('Claim is already fulfilled');
    }

    claim.status = SpiffClaimStatus.APPROVED;
    claim.reviewReason = reason || null;
    claim.approvedById = requester.id;
    claim.approvedAt = new Date();

    if (this.isAutoFulfillEnabled() && this.giftogramService.isConfigured()) {
      try {
        const userName = [claim.user?.firstName, claim.user?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const giftogramResult = await this.giftogramService.createOrderReward({
          requestId: claim.claimNumber,
          amountCents: claim.requestedAmountCents,
          giftCardType: claim.giftCardType,
          recipientName: userName || null,
          recipientEmail: claim.user?.email || null,
          note: claim.note,
        });

        claim.giftbitRequestId = giftogramResult.requestId;
        claim.giftbitLinkUrl = giftogramResult.rewardLink;
        claim.giftbitResponse = giftogramResult.response;
        claim.status = SpiffClaimStatus.FULFILLED;
        claim.fulfilledAt = new Date();

      } catch (error: any) {
        const message = this.optionalText(String(error?.message || 'Giftogram auto fulfillment failed'));
        claim.reviewReason = [claim.reviewReason, message].filter(Boolean).join(' | ');
      }
    }

    const saved = await this.claimRepo.save(claim);
    await this.safeNotifyClaimReviewed(saved, requester);
    return this.serializeClaim(saved);
  }

  async fulfillClaim(id: number, dto: FulfillSpiffClaimDto, requester: AuthUser) {
    this.assertCanManageClaims(requester);

    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['user', 'company', 'branch', 'approvedBy'],
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    await this.assertClaimScope(claim, requester);

    if (claim.status === SpiffClaimStatus.REJECTED) {
      throw new BadRequestException('Rejected claim cannot be fulfilled');
    }

    if (claim.status === SpiffClaimStatus.FULFILLED) {
      return this.serializeClaim(claim);
    }

    const rewardLink = this.optionalText(dto.rewardLink) || claim.giftbitLinkUrl || null;

    claim.status = SpiffClaimStatus.FULFILLED;
    claim.fulfilledAt = new Date();
    claim.approvedById = requester.id;
    claim.approvedAt = claim.approvedAt || new Date();
    claim.giftbitLinkUrl = rewardLink;
    const note = this.optionalText(dto.note);
    if (note) {
      claim.reviewReason = [claim.reviewReason, note].filter(Boolean).join(' | ');
    }

    const saved = await this.claimRepo.save(claim);
    await this.safeNotifyClaimFulfilled(saved, requester);
    return this.serializeClaim(saved);
  }

  private async safeNotifyClaimCreated(claim: SpiffRedemptionClaim, requester: AuthUser): Promise<void> {
    try {
      const context = await this.loadClaimNotificationContext(claim.id);
      if (!context) return;

      const claimLabel = context.claimNumber || 'SPIFF claim';
      const requestedAmount = this.roundMoney(context.requestedAmountCents / 100);

      await this.notificationEventsService.notifySpiffClaimSubmitted({
        userId: context.userId,
        companyId: context.companyId,
        branchId: context.branchId,
        priority: NotificationPriority.P2,
        title: `${claimLabel} submitted`,
        message: `Your redemption claim ${claimLabel} for $${requestedAmount.toFixed(2)} was submitted for review.`,
        entityType: 'SPIFF_CLAIM',
        entityId: context.id,
        actionUrl: `/spiff`,
        metadata: {
          claimId: context.id,
          claimNumber: context.claimNumber,
          status: context.status,
          requestedPoints: context.requestedPoints,
          requestedAmount,
        },
      });

      const managerIds = await this.getClaimManagerUserIds(context, [requester.id, context.userId]);
      if (managerIds.length) {
        const requestorName = [context.user?.firstName, context.user?.lastName].filter(Boolean).join(' ').trim()
          || context.user?.email
          || 'A user';
        await this.notificationEventsService.notifySpiffClaimReviewRequired(managerIds, {
          companyId: context.companyId,
          branchId: context.branchId,
          priority: NotificationPriority.P1,
          title: `Review needed for ${claimLabel}`,
          message: `${requestorName} submitted ${claimLabel} for ${context.requestedPoints} points.`,
          entityType: 'SPIFF_CLAIM',
          entityId: context.id,
          actionUrl: `/spiff`,
          metadata: {
            claimId: context.id,
            claimNumber: context.claimNumber,
            status: context.status,
            requestedPoints: context.requestedPoints,
            requestedAmount,
          },
        });
      }
    } catch (error: any) {
      this.logger.warn(
        `SPIFF notification skipped for new claim ${claim?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async safeNotifyClaimReviewed(claim: SpiffRedemptionClaim, requester: AuthUser): Promise<void> {
    try {
      const context = await this.loadClaimNotificationContext(claim.id);
      if (!context) return;

      const requestedAmount = this.roundMoney(context.requestedAmountCents / 100);
      const baseMetadata = {
        claimId: context.id,
        claimNumber: context.claimNumber,
        status: context.status,
        requestedPoints: context.requestedPoints,
        requestedAmount,
        reviewedByUserId: requester.id,
      };

      const byStatus: Partial<
        Record<
          SpiffClaimStatus,
          { type: string; priority: NotificationPriority; title: string; message: string }
        >
      > = {
        [SpiffClaimStatus.REJECTED]: {
          type: 'SPIFF_CLAIM_REJECTED',
          priority: NotificationPriority.P1,
          title: `${context.claimNumber} rejected`,
          message: `Your redemption claim ${context.claimNumber} was rejected.`,
        },
        [SpiffClaimStatus.HOLD]: {
          type: 'SPIFF_CLAIM_ON_HOLD',
          priority: NotificationPriority.P1,
          title: `${context.claimNumber} on hold`,
          message: `Your redemption claim ${context.claimNumber} was placed on hold.`,
        },
        [SpiffClaimStatus.APPROVED]: {
          type: 'SPIFF_CLAIM_APPROVED',
          priority: NotificationPriority.P1,
          title: `${context.claimNumber} approved`,
          message: `Your redemption claim ${context.claimNumber} was approved.`,
        },
        [SpiffClaimStatus.FULFILLED]: {
          type: 'SPIFF_CLAIM_FULFILLED',
          priority: NotificationPriority.P1,
          title: `${context.claimNumber} fulfilled`,
          message: context.giftbitLinkUrl
            ? `Your redemption claim ${context.claimNumber} was fulfilled. Your reward link is ready.`
            : `Your redemption claim ${context.claimNumber} was fulfilled.`,
        },
      };

      const payload = byStatus[context.status];
      if (!payload) return;

      await this.notificationEventsService.notifySpiffClaimUpdated({
        userId: context.userId,
        companyId: context.companyId,
        branchId: context.branchId,
        type: payload.type,
        priority: payload.priority,
        title: payload.title,
        message: payload.message,
        entityType: 'SPIFF_CLAIM',
        entityId: context.id,
        actionUrl: `/spiff`,
        metadata: {
          ...baseMetadata,
          rewardLink: context.giftbitLinkUrl ?? null,
        },
      });

      const managerIds = await this.getClaimManagerUserIds(context, [requester.id, context.userId]);
      if (managerIds.length) {
        const requestorName = [context.user?.firstName, context.user?.lastName].filter(Boolean).join(' ').trim()
          || context.user?.email
          || 'A user';
        await this.notificationEventsService.notifySpiffClaimUpdatedForManagers(managerIds, {
          companyId: context.companyId,
          branchId: context.branchId,
          type: payload.type,
          priority: payload.priority,
          title: payload.title,
          message: `${requestorName}'s claim ${context.claimNumber} is now ${context.status.replace(/_/g, ' ').toLowerCase()}.`,
          entityType: 'SPIFF_CLAIM',
          entityId: context.id,
          actionUrl: `/spiff`,
          metadata: {
            ...baseMetadata,
            requestorName,
            rewardLink: context.giftbitLinkUrl ?? null,
          },
        });
      }
    } catch (error: any) {
      this.logger.warn(
        `SPIFF review notification skipped for claim ${claim?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async safeNotifyClaimFulfilled(claim: SpiffRedemptionClaim, requester: AuthUser): Promise<void> {
    try {
      const context = await this.loadClaimNotificationContext(claim.id);
      if (!context) return;

      await this.notificationEventsService.notifySpiffClaimUpdated({
        userId: context.userId,
        companyId: context.companyId,
        branchId: context.branchId,
        type: 'SPIFF_CLAIM_FULFILLED',
        priority: NotificationPriority.P1,
        title: `${context.claimNumber} fulfilled`,
        message: context.giftbitLinkUrl
          ? `Your redemption claim ${context.claimNumber} was fulfilled. Open the reward link to redeem it.`
          : `Your redemption claim ${context.claimNumber} was fulfilled.`,
        entityType: 'SPIFF_CLAIM',
        entityId: context.id,
        actionUrl: `/spiff`,
        metadata: {
          claimId: context.id,
          claimNumber: context.claimNumber,
          status: context.status,
          requestedPoints: context.requestedPoints,
          requestedAmount: this.roundMoney(context.requestedAmountCents / 100),
          rewardLink: context.giftbitLinkUrl ?? null,
          fulfilledByUserId: requester.id,
        },
      });

      const managerIds = await this.getClaimManagerUserIds(context, [requester.id, context.userId]);
      if (managerIds.length) {
        const requestorName = [context.user?.firstName, context.user?.lastName].filter(Boolean).join(' ').trim()
          || context.user?.email
          || 'A user';
        await this.notificationEventsService.notifySpiffClaimUpdatedForManagers(managerIds, {
          companyId: context.companyId,
          branchId: context.branchId,
          type: 'SPIFF_CLAIM_FULFILLED',
          priority: NotificationPriority.P1,
          title: `${context.claimNumber} fulfilled`,
          message: `${requestorName}'s claim ${context.claimNumber} was fulfilled.`,
          entityType: 'SPIFF_CLAIM',
          entityId: context.id,
          actionUrl: `/spiff`,
          metadata: {
            claimId: context.id,
            claimNumber: context.claimNumber,
            status: context.status,
            requestedPoints: context.requestedPoints,
            requestedAmount: this.roundMoney(context.requestedAmountCents / 100),
            requestorName,
            rewardLink: context.giftbitLinkUrl ?? null,
            fulfilledByUserId: requester.id,
          },
        });
      }
    } catch (error: any) {
      this.logger.warn(
        `SPIFF fulfill notification skipped for claim ${claim?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async loadClaimNotificationContext(claimId: number): Promise<SpiffRedemptionClaim | null> {
    return this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['user', 'company', 'branch', 'approvedBy'],
    });
  }

  private async getClaimManagerUserIds(
    claim: SpiffRedemptionClaim,
    excludeIds: Array<number | null | undefined> = [],
  ): Promise<number[]> {
    const excluded = new Set(
      excludeIds.map((value) => value || '').filter((value) => value),
    );
    const ids = new Set<number>();

    if (!claim.companyId && !claim.branchId) {
      return [];
    }

    const qb = this.userRepo
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.isActive = :isActive', { isActive: true });

    qb.andWhere(
      new Brackets((subQb) => {
        subQb.orWhere('user.role = :superAdminRole', {
          superAdminRole: UserRole.SUPER_ADMIN,
        });

        if (claim.companyId) {
          subQb.orWhere('(user.companyId = :companyId AND user.role = :companyAdminRole)', {
            companyId: claim.companyId,
            companyAdminRole: UserRole.COMPANY_ADMIN,
          });
        }

        if (claim.branchId) {
          subQb.orWhere('(user.branchId = :branchId AND user.role = :branchManagerRole)', {
            branchId: claim.branchId,
            branchManagerRole: UserRole.BRANCH_MANAGER,
          });
        }
      }),
    );

    const users = await qb.getRawMany<{ id: number }>();

    users.forEach((user) => {
      const userId = user.id;
      if (userId && !excluded.has(userId)) {
        ids.add(userId);
      }
    });

    return Array.from(ids);
  }

  async handleOrderCreated(order: Order): Promise<void> {
    if (!order?.id || !order.salesRepId) {
      return;
    }
    if (!(await this.isSpiffEarningEligible(order.salesRepId))) {
      return;
    }

    const status = this.normalizeOrderStatus(order.status);
    if (status === OrderStatus.QUOTE) {
      await this.recordQuoteCreated(order);
    }

    if (this.isPlacedStatus(status)) {
      await this.recordOrderPlacedRewards(order, false);
    }
  }

  async handleOrderStatusTransition(order: Order, previousStatus?: OrderStatus | string): Promise<void> {
    if (!order?.id || !order.salesRepId) {
      return;
    }
    if (!(await this.isSpiffEarningEligible(order.salesRepId))) {
      return;
    }

    const prev = this.normalizeOrderStatus(previousStatus);
    const current = this.normalizeOrderStatus(order.status);

    if (current === OrderStatus.CANCELLED && prev !== OrderStatus.CANCELLED) {
      await this.recordOrderCancelledReversal(order);
      return;
    }

    if (current === OrderStatus.QUOTE) {
      await this.recordQuoteCreated(order);
    }

    if (!this.isPlacedStatus(current) || this.isPlacedStatus(prev)) {
      return;
    }

    const includeFastClose = prev === OrderStatus.QUOTE && this.isFastClose(order.createdAt);
    await this.recordOrderPlacedRewards(order, includeFastClose);
  }

  private async recordQuoteCreated(order: Order): Promise<void> {
    const awardRate = await this.getUserAwardRate(order.salesRepId!);
    const awardedPoints = this.applyAwardRate(this.getQuoteCreatedPoints(), awardRate);
    await this.createLedgerEntryIfMissing({
      userId: order.salesRepId!,
      companyId: order.companyId || null,
      branchId: order.branchId || null,
      orderId: order.id,
      points: awardedPoints,
      eventType: SpiffLedgerEvent.QUOTE_CREATED,
      eventKey: `quote:${order.id}`,
      note: `Quote created (${order.orderNumber})`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        awardRate,
      },
    });
  }

  private async recordOrderPlacedRewards(order: Order, includeFastClose: boolean): Promise<void> {
    const awardRate = await this.getUserAwardRate(order.salesRepId!);
    const basePoints = this.applyAwardRate(this.getOrderPlacedBasePoints(), awardRate);
    const valueBonus = this.applyAwardRate(this.getOrderValueBonus(order.price), awardRate);

    await this.createLedgerEntryIfMissing({
      userId: order.salesRepId!,
      companyId: order.companyId || null,
      branchId: order.branchId || null,
      orderId: order.id,
      points: basePoints,
      eventType: SpiffLedgerEvent.ORDER_PLACED,
      eventKey: `order-placed:${order.id}`,
      note: `Order placed (${order.orderNumber})`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        awardRate,
      },
    });

    if (valueBonus > 0) {
      await this.createLedgerEntryIfMissing({
        userId: order.salesRepId!,
        companyId: order.companyId || null,
        branchId: order.branchId || null,
        orderId: order.id,
        points: valueBonus,
        eventType: SpiffLedgerEvent.ORDER_VALUE_BONUS,
        eventKey: `order-value-bonus:${order.id}`,
        note: `Order value bonus (${order.orderNumber})`,
        metadata: {
          orderNumber: order.orderNumber,
          price: this.toNumber(order.price),
          status: order.status,
          awardRate,
        },
      });
    }

    if (includeFastClose) {
      const fastClosePoints = this.applyAwardRate(this.getFastClosePoints(), awardRate);
      await this.createLedgerEntryIfMissing({
        userId: order.salesRepId!,
        companyId: order.companyId || null,
        branchId: order.branchId || null,
        orderId: order.id,
        points: fastClosePoints,
        eventType: SpiffLedgerEvent.FAST_CLOSE_BONUS,
        eventKey: `fast-close:${order.id}`,
        note: `Fast close bonus (${order.orderNumber})`,
        metadata: {
          orderNumber: order.orderNumber,
          status: order.status,
          awardRate,
        },
      });
    }
  }

  private async recordOrderCancelledReversal(order: Order): Promise<void> {
    const netRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('COALESCE(SUM(ledger.points), 0)', 'points')
      .where('ledger.orderId = :orderId', { orderId: order.id })
      .getRawOne<{ points: string | number | null }>();

    const netPoints = this.roundPoints(this.toNumber(netRaw?.points));
    if (netPoints <= 0) {
      return;
    }

    await this.createLedgerEntryIfMissing({
      userId: order.salesRepId!,
      companyId: order.companyId || null,
      branchId: order.branchId || null,
      orderId: order.id,
      points: -netPoints,
      eventType: SpiffLedgerEvent.ORDER_CANCELLED_REVERSAL,
      eventKey: `order-cancelled-reversal:${order.id}`,
      note: `Order cancelled - points reversed (${order.orderNumber})`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
        reversedPoints: netPoints,
      },
    });
  }

  private async createLedgerEntryIfMissing(input: {
    userId: number;
    companyId: number | null;
    branchId: number | null;
    orderId: number | null;
    points: number;
    eventType: SpiffLedgerEvent;
    eventKey: string;
    note: string;
    metadata?: Record<string, unknown>;
  }): Promise<SpiffPointLedger | null> {
    const points = this.roundPoints(this.toNumber(input.points));
    if (points === 0) {
      return null;
    }

    if (input.eventKey) {
      const exists = await this.ledgerRepo.exist({ where: { eventKey: input.eventKey } });
      if (exists) {
        return null;
      }
    }

    const row = this.ledgerRepo.create({
      userId: input.userId,
      companyId: input.companyId,
      branchId: input.branchId,
      orderId: input.orderId,
      points,
      eventType: input.eventType,
      eventKey: input.eventKey,
      note: input.note,
      metadata: input.metadata || null,
    });

    try {
      return await this.ledgerRepo.save(row);
    } catch (error: any) {
      const message = String(error?.message || '');
      const isDuplicate = error?.code === 'ER_DUP_ENTRY' || message.includes('Duplicate entry');
      const needsLegacyId = error?.code === 'ER_NO_DEFAULT_FOR_FIELD'
        || message.includes("Field 'id' doesn't have a default value");

      if (needsLegacyId) {
        (row as any).id = randomUUID();
        return await this.ledgerRepo.save(row);
      }
      if (!isDuplicate) {
        throw error;
      }
      return null;
    }
  }

  private async safeNotifySpiffPointsGiven(
    ledgerEntry: SpiffPointLedger,
    targetUser: User,
    requester: AuthUser,
  ): Promise<void> {
    try {
      const points = this.roundPoints(this.toNumber(ledgerEntry.points));
      if (points <= 0 || targetUser.role !== UserRole.SALES_REP) return;

      const actorName = [requester.firstName, requester.lastName].filter(Boolean).join(' ').trim()
        || requester.email
        || 'Admin';

      await this.notificationEventsService.notifySpiffPointsGiven({
        userId: targetUser.id,
        companyId: targetUser.companyId || null,
        branchId: targetUser.branchId || null,
        priority: NotificationPriority.P1,
        title: 'SPIFF reward received',
        message: `${actorName} gave you ${points.toLocaleString('en-US', { maximumFractionDigits: 2 })} SPIFF points.`,
        entityType: 'SPIFF_LEDGER',
        entityId: Number(ledgerEntry.id) || null,
        actionUrl: null,
        metadata: {
          ledgerId: ledgerEntry.id,
          points,
          eventType: ledgerEntry.eventType,
          adjustedByUserId: requester.id,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `SPIFF point push notification skipped for ledger ${ledgerEntry?.id || '-'}: ${error?.message || 'unknown error'}`,
      );
    }
  }

  private async computeWallet(userId: number): Promise<WalletSummary> {
    const totalEarnedRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('COALESCE(SUM(ledger.points), 0)', 'points')
      .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
      .where('ledger.userId = :userId', { userId })
      .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED })
      .getRawOne();

    const committedRaw = await this.claimRepo
      .createQueryBuilder('claim')
      .select('COALESCE(SUM(claim.requestedPoints), 0)', 'points')
      .where('claim.userId = :userId', { userId })
      .andWhere('claim.status IN (:...statuses)', {
        statuses: [
          SpiffClaimStatus.PENDING_REVIEW,
          SpiffClaimStatus.HOLD,
          SpiffClaimStatus.APPROVED,
          SpiffClaimStatus.FULFILLED,
        ],
      })
      .getRawOne();

    const fulfilledRaw = await this.claimRepo
      .createQueryBuilder('claim')
      .select('COALESCE(SUM(claim.requestedPoints), 0)', 'points')
      .where('claim.userId = :userId', { userId })
      .andWhere('claim.status = :status', { status: SpiffClaimStatus.FULFILLED })
      .getRawOne();

    const lockedRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('COALESCE(SUM(ledger.points), 0)', 'points')
      .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
      .where('ledger.userId = :userId', { userId })
      .andWhere('ledger.orderId IS NOT NULL')
      .andWhere('(ord.id IS NULL OR ord.status NOT IN (:...excludedStatuses))', {
        excludedStatuses: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
      })
      .getRawOne();

    const totalEarnedPoints = Math.max(this.toNumber(totalEarnedRaw?.points), 0);
    const lockedPoints = Math.max(this.toNumber(lockedRaw?.points), 0);
    const unlockedPoints = Math.max(totalEarnedPoints - lockedPoints, 0);
    const committedPoints = this.toNumber(committedRaw?.points);
    const availablePoints = Math.max(unlockedPoints - committedPoints, 0);
    const fulfilledClaimedPoints = this.toNumber(fulfilledRaw?.points);

    return {
      totalEarnedPoints,
      unlockedPoints,
      lockedPoints,
      committedPoints,
      availablePoints,
      fulfilledClaimedPoints,
    };
  }

  private async isSpiffEarningEligible(userId: number): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'role'],
    });
    return user?.role === UserRole.SALES_REP;
  }

  private async getUserAwardRate(userId: number): Promise<number> {
    const totalEarnedPoints = await this.getUserTotalEarnedPoints(userId);
    return this.resolveTier(totalEarnedPoints).awardRate;
  }

  private async getUserTotalEarnedPoints(userId: number): Promise<number> {
    const raw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('COALESCE(SUM(ledger.points), 0)', 'points')
      .leftJoin(Order, 'ord', 'ord.id = ledger.orderId')
      .where('ledger.userId = :userId', { userId })
      .andWhere(this.activeLedgerOrderCondition, { spiffCancelledStatus: OrderStatus.CANCELLED })
      .getRawOne();
    return Math.max(this.toNumber(raw?.points), 0);
  }

  private applyAwardRate(points: number, awardRate: number): number {
    const normalizedPoints = Math.max(0, this.roundPoints(this.toNumber(points)));
    if (normalizedPoints <= 0) {
      return 0;
    }
    const normalizedRate = Number.isFinite(awardRate) && awardRate > 0 ? awardRate : 1;
    return this.roundPoints(normalizedPoints * normalizedRate);
  }

  private resolveTier(points: number): {
    code: string;
    label: string;
    badge: string;
    minPoints: number;
    maxPoints: number | null;
    nextTierAt: number | null;
    awardRate: number;
  } {
    if (points >= 4000) {
      return {
        code: 'LEGEND',
        label: 'Legend',
        badge: '⚡',
        minPoints: 4000,
        maxPoints: null,
        nextTierAt: null,
        awardRate: this.getTierRateLegend(),
      };
    }

    if (points >= 1500) {
      return {
        code: 'ELITE',
        label: 'Elite',
        badge: '🥇',
        minPoints: 1500,
        maxPoints: 3999,
        nextTierAt: 4000,
        awardRate: this.getTierRateElite(),
      };
    }

    if (points >= 500) {
      return {
        code: 'SHARP',
        label: 'Pro',
        badge: '🥈',
        minPoints: 500,
        maxPoints: 1499,
        nextTierAt: 1500,
        awardRate: this.getTierRateSharp(),
      };
    }

    return {
      code: 'CLOSER',
      label: 'Starter',
      badge: '🥉',
      minPoints: 0,
      maxPoints: 499,
      nextTierAt: 500,
      awardRate: this.getTierRateCloser(),
    };
  }

  private resolvePeriodRange(period: SpiffLeaderboardPeriod): { startDate: Date | null } {
    const now = new Date();

    if (period === SpiffLeaderboardPeriod.ALL_TIME) {
      return { startDate: null };
    }

    if (period === SpiffLeaderboardPeriod.WEEKLY) {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return { startDate: d };
    }

    if (period === SpiffLeaderboardPeriod.QUARTERLY) {
      const quarter = Math.floor(now.getMonth() / 3);
      const d = new Date(now.getFullYear(), quarter * 3, 1);
      d.setHours(0, 0, 0, 0);
      return { startDate: d };
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    return { startDate: monthStart };
  }

  private resolveLeaderboardScope(
    requested: SpiffLeaderboardScope | undefined,
    requester: AuthUser,
  ): SpiffLeaderboardScope {
    if (requester.role === UserRole.INTERNAL_REP) {
      return SpiffLeaderboardScope.MY_COMPANY;
    }

    if (requested === SpiffLeaderboardScope.MY_BRANCH) {
      if (requester.branchId) {
        return SpiffLeaderboardScope.MY_BRANCH;
      }
      if (requester.companyId) {
        return SpiffLeaderboardScope.MY_COMPANY;
      }
      return SpiffLeaderboardScope.GLOBAL;
    }

    if (requested === SpiffLeaderboardScope.MY_COMPANY) {
      if (requester.companyId) {
        return SpiffLeaderboardScope.MY_COMPANY;
      }
      if (requester.branchId) {
        return SpiffLeaderboardScope.MY_BRANCH;
      }
      return SpiffLeaderboardScope.GLOBAL;
    }

    if (requested === SpiffLeaderboardScope.GLOBAL) {
      if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.COMPANY_ADMIN) {
        return SpiffLeaderboardScope.GLOBAL;
      }
      if (requester.branchId) {
        return SpiffLeaderboardScope.MY_BRANCH;
      }
      return SpiffLeaderboardScope.MY_COMPANY;
    }

    if (requester.role === UserRole.SUPER_ADMIN) {
      return SpiffLeaderboardScope.GLOBAL;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      return SpiffLeaderboardScope.MY_COMPANY;
    }

    return SpiffLeaderboardScope.MY_BRANCH;
  }

  private assertGlobalLeaderboardAccess(requester: AuthUser): void {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      return;
    }

    throw new ForbiddenException('Global leaderboard is only available to company admin and super admin');
  }

  private assertCanManageClaims(requester: AuthUser): void {
    if (!this.canManageClaims(requester)) {
      throw new ForbiddenException('You are not allowed to review redemption claims');
    }
  }

  private canManageClaims(requester: AuthUser): boolean {
    return (
      requester.role === UserRole.SUPER_ADMIN ||
      requester.role === UserRole.INTERNAL_REP ||
      requester.role === UserRole.COMPANY_ADMIN ||
      requester.role === UserRole.BRANCH_MANAGER
    );
  }

  private async assertClaimScope(claim: SpiffRedemptionClaim, requester: AuthUser): Promise<void> {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId || claim.companyId !== requester.companyId) {
        throw new ForbiddenException('Claim is outside your company scope');
      }
      return;
    }

    if (requester.role === UserRole.INTERNAL_REP) {
      const managedCompanyIds = await this.getInternalRepManagedCompanyIds(requester.id);
      if (claim.userId !== requester.id && (!claim.companyId || !managedCompanyIds.includes(claim.companyId))) {
        throw new ForbiddenException('Claim is outside your company scope');
      }
      return;
    }

    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (!requester.branchId || claim.branchId !== requester.branchId) {
        throw new ForbiddenException('Claim is outside your branch scope');
      }
      return;
    }

    if (claim.userId !== requester.id) {
      throw new ForbiddenException('Claim is outside your scope');
    }
  }

  private async assertUserAdjustmentScope(targetUser: User, requester: AuthUser): Promise<void> {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId || targetUser.companyId !== requester.companyId) {
        throw new ForbiddenException('Sales rep is outside your company scope');
      }
      return;
    }

    if (requester.role === UserRole.INTERNAL_REP) {
      const managedCompanyIds = await this.getInternalRepManagedCompanyIds(requester.id);
      if (!targetUser.companyId || !managedCompanyIds.includes(targetUser.companyId)) {
        throw new ForbiddenException('Sales rep is outside your company scope');
      }
      return;
    }

    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (!requester.branchId || targetUser.branchId !== requester.branchId) {
        throw new ForbiddenException('Sales rep is outside your branch scope');
      }
      return;
    }

    throw new ForbiddenException('Sales rep is outside your scope');
  }

  private async applySpiffActivityScope(qb: any, requester: AuthUser, alias: string): Promise<void> {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }
    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId) {
        throw new ForbiddenException('Company admin must be assigned to a company');
      }
      qb.andWhere(`${alias}.companyId = :activityCompanyId`, { activityCompanyId: requester.companyId });
      return;
    }
    if (requester.role === UserRole.INTERNAL_REP) {
      const managedCompanyIds = await this.getInternalRepManagedCompanyIds(requester.id);
      if (managedCompanyIds.length === 0) {
        qb.andWhere(`${alias}.userId = :activityUserId`, { activityUserId: requester.id });
      } else {
        qb.andWhere(`(${alias}.companyId IN (:...activityCompanyIds) OR ${alias}.userId = :activityUserId)`, {
          activityCompanyIds: managedCompanyIds,
          activityUserId: requester.id,
        });
      }
      return;
    }
    if (requester.role === UserRole.BRANCH_MANAGER) {
      if (!requester.branchId) {
        throw new ForbiddenException('Branch manager must be assigned to a branch');
      }
      qb.andWhere(`${alias}.branchId = :activityBranchId`, { activityBranchId: requester.branchId });
      return;
    }
    qb.andWhere(`${alias}.userId = :activityUserId`, { activityUserId: requester.id });
  }

  private async getInternalRepManagedCompanyIds(internalRepId: number): Promise<number[]> {
    const companies = await this.companyRepo.find({
      where: { accountManagerId: internalRepId },
      select: ['id'],
    });
    return companies.map((company) => company.id);
  }

  private serializeEarnedActivity(row: Record<string, unknown>) {
    const orderNumber = this.optionalText(row.orderNumber) || this.extractOrderNumberFromNote(row.note);
    const eventTypes = String(row.eventTypes || '');
    const isManualAdjustment = eventTypes
      .split(',')
      .map((event) => event.trim())
      .includes(SpiffLedgerEvent.MANUAL_ADJUSTMENT);
    const isCancellationReversal = eventTypes
      .split(',')
      .map((event) => event.trim())
      .includes(SpiffLedgerEvent.ORDER_CANCELLED_REVERSAL);
    const points = this.roundPoints(this.toNumber(row.points));
    const manualAction = this.optionalText(row.manualAction)?.toUpperCase();
    const manualTitle =
      manualAction === 'REDEEM'
        ? 'Points redeemed'
        : points < 0
          ? 'Points removed'
          : 'Points added';
    return {
      id: `earned:${String(row.groupId || row.orderId || orderNumber || row.createdAt)}`,
      type: 'EARNED',
      title: isManualAdjustment
        ? manualTitle
        : isCancellationReversal
          ? orderNumber
            ? `Order ${orderNumber} cancelled`
            : 'Order cancelled'
          : orderNumber
            ? `Order ${orderNumber}`
            : 'SPIFF points earned',
      subtitle: this.formatLedgerEvents(eventTypes),
      orderId: this.optionalText(row.orderId),
      orderNumber,
      orderStatus: this.optionalText(row.orderStatus),
      orderAmount: this.roundMoney(this.toNumber(row.orderAmount)),
      points,
      companyName: this.optionalText(row.companyName),
      branchName: this.optionalText(row.branchName),
      createdAt: row.createdAt || new Date().toISOString(),
    };
  }

  private serializeClaimActivity(claim: SpiffRedemptionClaim) {
    const serialized = this.serializeClaim(claim);
    return {
      id: `claim:${claim.id}`,
      type: 'REDEEMED',
      title: `Claim ${claim.claimNumber}`,
      subtitle: `${this.formatClaimStatus(claim.status)} - ${claim.giftCardType}`,
      claimNumber: claim.claimNumber,
      claimStatus: claim.status,
      points: -this.roundPoints(this.toNumber(claim.requestedPoints)),
      requestedPoints: this.roundPoints(this.toNumber(claim.requestedPoints)),
      requestedAmount: serialized.requestedAmount,
      giftCardType: claim.giftCardType,
      reviewReason: claim.reviewReason,
      giftbitLinkUrl: serialized.giftbitLinkUrl,
      companyName: serialized.companyName,
      branchName: serialized.branchName,
      createdAt: claim.createdAt,
      updatedAt: claim.updatedAt,
    };
  }

  private extractOrderNumberFromNote(value: unknown): string | null {
    const match = /\(([^)]+)\)/.exec(String(value || ''));
    return match?.[1]?.trim() || null;
  }

  private formatLedgerEvents(value: string): string {
    const labels = value
      .split(',')
      .map((event) => event.trim())
      .filter(Boolean)
      .map((event) => {
        if (event === SpiffLedgerEvent.ORDER_PLACED) return 'Order placed';
        if (event === SpiffLedgerEvent.ORDER_VALUE_BONUS) return 'Value bonus';
        if (event === SpiffLedgerEvent.FAST_CLOSE_BONUS) return 'Fast close bonus';
        if (event === SpiffLedgerEvent.QUOTE_CREATED) return 'Quote created';
        if (event === SpiffLedgerEvent.ORDER_CANCELLED_REVERSAL) return 'Points reversed';
        if (event === SpiffLedgerEvent.MANUAL_ADJUSTMENT) return 'Manual adjustment';
        return event.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
      });
    return labels.join(' + ') || 'Points earned';
  }

  private formatClaimStatus(value: SpiffClaimStatus): string {
    return String(value || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getSpiffUserDisplayName(user?: User | null): string | null {
    const userHandle = this.optionalText(user?.userHandle);
    if (userHandle) return userHandle;

    const firstName = this.optionalText(user?.firstName);
    if (firstName) return firstName;

    return this.optionalText(user?.email);
  }

  private serializeClaim(claim: SpiffRedemptionClaim) {
    const reviewerName = [claim.approvedBy?.firstName, claim.approvedBy?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const rewardLink = claim.giftbitLinkUrl || this.extractRewardLinkFromResponse(claim.giftbitResponse);

    return {
      ...claim,
      giftbitLinkUrl: rewardLink,
      requestedAmount: this.roundMoney(claim.requestedAmountCents / 100),
      requestorName: this.getSpiffUserDisplayName(claim.user),
      reviewerName: reviewerName || claim.approvedBy?.email || null,
      companyName: claim.company?.companyName || null,
      branchName: claim.branch?.name || null,
    };
  }

  private extractRewardLinkFromResponse(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const stack: unknown[] = [payload];
    while (stack.length) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') {
        continue;
      }

      for (const [key, value] of Object.entries(current as Record<string, unknown>)) {
        if (
          typeof value === 'string' &&
          /^https?:\/\//i.test(value) &&
          /redeem|reward|gift/i.test(key)
        ) {
          return value;
        }

        if (value && typeof value === 'object') {
          stack.push(value);
        }
      }
    }

    return null;
  }

  private async getNextClaimNumber(): Promise<string> {
    const raw = await this.claimRepo
      .createQueryBuilder('claim')
      .select('MAX(CAST(SUBSTRING(claim.claimNumber, 4) AS UNSIGNED))', 'maxSeq')
      .where("claim.claimNumber REGEXP '^SP-[0-9]+$'")
      .getRawOne<{ maxSeq: string | null }>();

    const currentMax = Number.parseInt(raw?.maxSeq || '0', 10);
    const next = Number.isFinite(currentMax) ? currentMax + 1 : 1;
    return `SP-${String(next).padStart(6, '0')}`;
  }

  private isPlacedStatus(status: OrderStatus): boolean {
    return [
      OrderStatus.PENDING_APPROVAL,
      OrderStatus.APPROVED,
      OrderStatus.IN_PRODUCTION,
      OrderStatus.COMPLETED,
    ].includes(status);
  }

  private normalizeOrderStatus(value: string | OrderStatus | undefined | null): OrderStatus {
    const normalized = String(value || '').trim().toUpperCase();
    if (Object.values(OrderStatus).includes(normalized as OrderStatus)) {
      return normalized as OrderStatus;
    }
    return OrderStatus.QUOTE;
  }

  private isFastClose(createdAt: Date | string | null | undefined): boolean {
    if (!createdAt) {
      return false;
    }

    const createdDate = createdAt instanceof Date ? createdAt : new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) {
      return false;
    }

    const diffMs = Date.now() - createdDate.getTime();
    return diffMs >= 0 && diffMs <= 24 * 60 * 60 * 1000;
  }

  private getQuoteCreatedPoints(): number {
    return this.toIntEnv(process.env.SPIFF_QUOTE_CREATED_POINTS, 5);
  }

  private getOrderPlacedBasePoints(): number {
    return this.toIntEnv(process.env.SPIFF_ORDER_PLACED_POINTS, 50);
  }

  private getOrderValuePointsPerHundred(): number {
    return this.toIntEnv(process.env.SPIFF_ORDER_VALUE_POINTS_PER_100, 1);
  }

  private getOrderValueBonus(price: number): number {
    const normalized = this.toNumber(price);
    if (normalized <= 0) {
      return 0;
    }
    return Math.floor(normalized / 100) * this.getOrderValuePointsPerHundred();
  }

  private getFastClosePoints(): number {
    return this.toIntEnv(process.env.SPIFF_FAST_CLOSE_BONUS_POINTS, 30);
  }

  private getTierRateCloser(): number {
    return this.toFloatEnv(process.env.SPIFF_TIER_RATE_CLOSER, 1);
  }

  private getTierRateSharp(): number {
    return this.toFloatEnv(process.env.SPIFF_TIER_RATE_SHARP, 1.25);
  }

  private getTierRateElite(): number {
    return this.toFloatEnv(process.env.SPIFF_TIER_RATE_ELITE, 1.5);
  }

  private getTierRateLegend(): number {
    return this.toFloatEnv(process.env.SPIFF_TIER_RATE_LEGEND, 2);
  }

  private async getPointsPerDollar(): Promise<number> {
    return this.getSettingInt(
      SpiffService.SETTINGS_KEY_POINTS_PER_DOLLAR,
      this.toIntEnv(process.env.SPIFF_POINTS_PER_DOLLAR, 100),
    );
  }

  private getMinRedeemPoints(): number {
    return this.toIntEnv(process.env.SPIFF_MIN_REDEEM_POINTS, 500);
  }

  private async getSettingInt(settingKey: string, fallback: number): Promise<number> {
    let row: SpiffSetting | null = null;
    try {
      row = await this.settingRepo.findOne({ where: { settingKey } });
    } catch (error: any) {
      if (this.isMissingSettingsTableError(error)) {
        return fallback;
      }
      throw error;
    }

    if (!row) {
      return fallback;
    }

    const parsed = Number.parseInt(String(row.settingValue || '').trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async upsertSetting(settingKey: string, settingValue: string, updatedById: number | null) {
    let existing: SpiffSetting | null = null;
    try {
      existing = await this.settingRepo.findOne({ where: { settingKey } });
    } catch (error: any) {
      if (this.isMissingSettingsTableError(error)) {
        throw new BadRequestException(
          'SPIFF settings table is missing. Run DATABASE_SPIFF_SETTINGS_UPGRADE.sql first.',
        );
      }
      throw error;
    }

    if (!existing) {
      const created = this.settingRepo.create({
        settingKey,
        settingValue,
        updatedById,
      });
      await this.settingRepo.save(created);
      return;
    }

    existing.settingValue = settingValue;
    existing.updatedById = updatedById;
    await this.settingRepo.save(existing);
  }

  private isMissingSettingsTableError(error: any): boolean {
    const code = String(error?.code || '').toUpperCase();
    const message = String(error?.message || '').toLowerCase();
    return code === 'ER_NO_SUCH_TABLE' || message.includes('spiff_system_settings') && message.includes('doesn\'t exist');
  }

  private getGiftCardOptions(): string[] {
    const parsed = String(process.env.SPIFF_GIFTCARD_OPTIONS || 'Amazon,Visa Prepaid')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return parsed.length > 0 ? parsed : ['Amazon'];
  }

  private getDefaultGiftCardLabel(): string {
    return this.optionalText(process.env.SPIFF_DEFAULT_GIFTCARD_LABEL) || 'Open Choice';
  }

  private isAutoFulfillEnabled(): boolean {
    const explicitGiftogram = this.optionalText(process.env.GIFTOGRAM_AUTO_FULFILL);
    if (explicitGiftogram !== null) {
      return /^true$/i.test(explicitGiftogram);
    }
    return /^true$/i.test(String(process.env.GIFTBIT_AUTO_FULFILL || 'false').trim());
  }

  private toIntEnv(rawValue: unknown, fallback: number): number {
    const value = Number.parseInt(String(rawValue ?? '').trim(), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private toFloatEnv(rawValue: unknown, fallback: number): number {
    const value = Number.parseFloat(String(rawValue ?? '').trim());
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toPositiveIntOrNull(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private optionalText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private roundMoney(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }

  private roundPoints(value: number): number {
    if (!Number.isFinite(value)) {
      return 0;
    }
    return Math.round(value * 100) / 100;
  }
}







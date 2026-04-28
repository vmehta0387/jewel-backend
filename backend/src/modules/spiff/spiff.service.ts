import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { GiftbitService } from './giftbit.service';
import { SpiffPointLedger } from './entities/spiff-point-ledger.entity';
import { SpiffRedemptionClaim } from './entities/spiff-redemption-claim.entity';
import { SpiffSetting } from './entities/spiff-setting.entity';
import { SpiffClaimStatus } from './enums/spiff-claim-status.enum';
import { SpiffLedgerEvent } from './enums/spiff-ledger-event.enum';
import {
  ClaimReviewAction,
  CreateSpiffClaimDto,
  FindSpiffClaimsQueryDto,
  FulfillSpiffClaimDto,
  ReviewSpiffClaimDto,
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
    private readonly giftbitService: GiftbitService,
  ) {}

  async getConfig() {
    const pointsPerDollar = await this.getPointsPerDollar();
    return {
      minRedeemPoints: this.getMinRedeemPoints(),
      pointsPerDollar,
      conversionDisplay: `${pointsPerDollar} points = $1`,
      giftCardOptions: this.getGiftCardOptions(),
      giftbitConfigured: this.giftbitService.isConfigured(),
      autoFulfill: this.isAutoFulfillEnabled(),
    };
  }

  async updateConfig(dto: UpdateSpiffConfigDto, requester: AuthUser) {
    if (requester.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admin can update SPIFF configuration');
    }

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
        .addSelect('COALESCE(SUM(CASE WHEN ledger.points > 0 THEN ledger.points ELSE 0 END), 0)', 'points')
        .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
        .where('ledger.companyId IS NOT NULL')
        .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP });

      if (periodRange.startDate) {
        companyPointsQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
      }

      companyPointsQb.groupBy('ledger.companyId').orderBy('points', 'DESC');
      const companyPointRows = await companyPointsQb.getRawMany();
      const companyIds = companyPointRows
        .map((row) => String(row.companyId || '').trim())
        .filter((id) => id.length > 0);

      const companies = companyIds.length
        ? await this.companyRepo.find({ where: { id: In(companyIds) } })
        : [];
      const companyById = new Map(companies.map((company) => [company.id, company]));

      const companyOrdersAgg = new Map<string, { totalOrders: number; totalGmv: number }>();
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
          const companyId = String(row.companyId || '').trim();
          if (!companyId) return;
          companyOrdersAgg.set(companyId, {
            totalOrders: this.toNumber(row.totalOrders),
            totalGmv: this.roundMoney(this.toNumber(row.totalGmv)),
          });
        });
      }

      const topRepByCompany = new Map<string, { userId: string; points: number }>();
      if (companyIds.length > 0) {
        const topRepQb = this.ledgerRepo
          .createQueryBuilder('ledger')
          .select('ledger.companyId', 'companyId')
          .addSelect('ledger.userId', 'userId')
          .addSelect('COALESCE(SUM(CASE WHEN ledger.points > 0 THEN ledger.points ELSE 0 END), 0)', 'points')
          .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
          .where('ledger.companyId IN (:...companyIds)', { companyIds })
          .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
          .andWhere('ledger.userId IS NOT NULL')
          .groupBy('ledger.companyId')
          .addGroupBy('ledger.userId')
          .orderBy('ledger.companyId', 'ASC')
          .addOrderBy('points', 'DESC');

        if (periodRange.startDate) {
          topRepQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
        }

        const topRepRows = await topRepQb.getRawMany();
        for (const row of topRepRows) {
          const companyId = String(row.companyId || '').trim();
          const userId = String(row.userId || '').trim();
          if (!companyId || !userId || topRepByCompany.has(companyId)) {
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
      const topRepUserById = new Map(topRepUsers.map((user) => [user.id, user]));

      const entries = companyPointRows.slice(0, limit).map((row, index) => {
        const companyId = String(row.companyId || '').trim();
        const company = companyById.get(companyId);
        const orderAgg = companyOrdersAgg.get(companyId) || { totalOrders: 0, totalGmv: 0 };
        const topRepInfo = topRepByCompany.get(companyId);
        const topRepUser = topRepInfo ? topRepUserById.get(topRepInfo.userId) : null;
        const topRepName = [topRepUser?.firstName, topRepUser?.lastName].filter(Boolean).join(' ').trim();

        return {
          rank: index + 1,
          entityId: companyId,
          name: company?.companyName || 'Unknown company',
          subtitle: company?.companyCode || null,
          points: this.toNumber(row.points),
          totalOrders: orderAgg.totalOrders,
          totalGmv: orderAgg.totalGmv,
          topRepName: topRepName || topRepUser?.email || null,
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
          .addSelect('COALESCE(SUM(CASE WHEN ledger.points > 0 THEN ledger.points ELSE 0 END), 0)', 'points')
          .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
          .where('ledger.userId IS NOT NULL')
          .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP })
          .groupBy('ledger.userId')
          .orderBy('points', 'DESC');

        if (periodRange.startDate) {
          globalRepQb.andWhere('ledger.createdAt >= :startDate', { startDate: periodRange.startDate });
        }

        const globalRepRows = await globalRepQb.getRawMany();
        const repUserIds = globalRepRows
          .slice(0, repLimit)
          .map((row) => String(row.userId || '').trim())
          .filter((id) => id.length > 0);
        const repUsers = repUserIds.length
          ? await this.userRepo.find({ where: { id: In(repUserIds) } })
          : [];
        const repUserById = new Map(repUsers.map((user) => [user.id, user]));

        const repCompanyIds = Array.from(
          new Set(repUsers.map((user) => String(user.companyId || '').trim()).filter(Boolean)),
        );
        const repCompanies = repCompanyIds.length
          ? await this.companyRepo.find({ where: { id: In(repCompanyIds) } })
          : [];
        const repCompanyById = new Map(repCompanies.map((company) => [company.id, company]));

        globalRepEntries = globalRepRows.slice(0, repLimit).map((row, index) => {
          const userId = String(row.userId || '').trim();
          const repUser = repUserById.get(userId);
          const repName = [repUser?.firstName, repUser?.lastName].filter(Boolean).join(' ').trim();
          const repCompany = repUser?.companyId ? repCompanyById.get(repUser.companyId) : null;

          return {
            rank: index + 1,
            userId,
            name: repName || repUser?.email || 'Unknown rep',
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
      .addSelect('COALESCE(SUM(CASE WHEN ledger.points > 0 THEN ledger.points ELSE 0 END), 0)', 'points')
      .innerJoin(User, 'repUser', 'repUser.id = ledger.userId')
      .where('ledger.userId IS NOT NULL')
      .andWhere('repUser.role = :spiffRepRole', { spiffRepRole: UserRole.SALES_REP });

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
      const companyId = requester.companyId;
      if (!companyId) {
        throw new BadRequestException('Company scope is not available for this user');
      }
      qb.andWhere('ledger.companyId = :companyId', { companyId });
    }

    qb.groupBy('ledger.userId').orderBy('points', 'DESC');

    const rows = await qb.getRawMany();
    const userIds = rows
      .map((row) => String(row.userId || '').trim())
      .filter((id) => id.length > 0);
    const users = userIds.length
      ? await this.userRepo.find({ where: { id: In(userIds) } })
      : [];
    const userById = new Map(users.map((user) => [user.id, user]));

    const entries = rows.slice(0, limit).map((row, index) => {
      const userId = String(row.userId || '').trim();
      const user = userById.get(userId);
      const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
      return {
        rank: index + 1,
        entityId: userId,
        name: displayName || user?.email || 'Unknown rep',
        subtitle: user?.role || null,
        points: this.toNumber(row.points),
      };
    });

    const myIndex = rows.findIndex((row) => String(row.userId || '').trim() === requester.id);
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

  async createClaim(dto: CreateSpiffClaimDto, requester: AuthUser) {
    if (![UserRole.SALES_REP, UserRole.COMPANY_ADMIN].includes(requester.role)) {
      throw new ForbiddenException('Only sales users can create redemption claims');
    }

    const requestedPoints = Math.floor(Number(dto.requestedPoints || 0));
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

  async reviewClaim(id: string, dto: ReviewSpiffClaimDto, requester: AuthUser) {
    this.assertCanManageClaims(requester);

    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['user', 'company', 'branch', 'approvedBy'],
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    this.assertClaimScope(claim, requester);

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
      return this.serializeClaim(saved);
    }

    if (claim.status === SpiffClaimStatus.FULFILLED) {
      throw new BadRequestException('Claim is already fulfilled');
    }

    claim.status = SpiffClaimStatus.APPROVED;
    claim.reviewReason = reason || null;
    claim.approvedById = requester.id;
    claim.approvedAt = new Date();

    if (this.isAutoFulfillEnabled() && this.giftbitService.isConfigured()) {
      try {
        const userName = [claim.user?.firstName, claim.user?.lastName]
          .filter(Boolean)
          .join(' ')
          .trim();

        const giftbitResult = await this.giftbitService.createDirectLinkReward({
          requestId: claim.claimNumber,
          amountCents: claim.requestedAmountCents,
          giftCardType: claim.giftCardType,
          recipientName: userName || null,
          recipientEmail: claim.user?.email || null,
          note: claim.note,
        });

        claim.giftbitRequestId = giftbitResult.requestId;
        claim.giftbitLinkUrl = giftbitResult.rewardLink;
        claim.giftbitResponse = giftbitResult.response;

        if (giftbitResult.rewardLink) {
          claim.status = SpiffClaimStatus.FULFILLED;
          claim.fulfilledAt = new Date();
        }
      } catch (error: any) {
        const message = this.optionalText(String(error?.message || 'Giftbit auto fulfillment failed'));
        claim.reviewReason = [claim.reviewReason, message].filter(Boolean).join(' | ');
      }
    }

    const saved = await this.claimRepo.save(claim);
    return this.serializeClaim(saved);
  }

  async fulfillClaim(id: string, dto: FulfillSpiffClaimDto, requester: AuthUser) {
    this.assertCanManageClaims(requester);

    const claim = await this.claimRepo.findOne({
      where: { id },
      relations: ['user', 'company', 'branch', 'approvedBy'],
    });
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    this.assertClaimScope(claim, requester);

    if (claim.status === SpiffClaimStatus.REJECTED) {
      throw new BadRequestException('Rejected claim cannot be fulfilled');
    }

    if (claim.status === SpiffClaimStatus.FULFILLED) {
      return this.serializeClaim(claim);
    }

    const rewardLink = this.optionalText(dto.rewardLink);
    if (!rewardLink) {
      throw new BadRequestException('Reward link is required');
    }

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
    return this.serializeClaim(saved);
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
    await this.createLedgerEntryIfMissing({
      userId: order.salesRepId!,
      companyId: order.companyId || null,
      branchId: order.branchId || null,
      orderId: order.id,
      points: this.getQuoteCreatedPoints(),
      eventType: SpiffLedgerEvent.QUOTE_CREATED,
      eventKey: `quote:${order.id}`,
      note: `Quote created (${order.orderNumber})`,
      metadata: {
        orderNumber: order.orderNumber,
        status: order.status,
      },
    });
  }

  private async recordOrderPlacedRewards(order: Order, includeFastClose: boolean): Promise<void> {
    const basePoints = this.getOrderPlacedBasePoints();
    const valueBonus = this.getOrderValueBonus(order.price);

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
        },
      });
    }

    if (includeFastClose) {
      await this.createLedgerEntryIfMissing({
        userId: order.salesRepId!,
        companyId: order.companyId || null,
        branchId: order.branchId || null,
        orderId: order.id,
        points: this.getFastClosePoints(),
        eventType: SpiffLedgerEvent.FAST_CLOSE_BONUS,
        eventKey: `fast-close:${order.id}`,
        note: `Fast close bonus (${order.orderNumber})`,
        metadata: {
          orderNumber: order.orderNumber,
          status: order.status,
        },
      });
    }
  }

  private async createLedgerEntryIfMissing(input: {
    userId: string;
    companyId: string | null;
    branchId: string | null;
    orderId: string | null;
    points: number;
    eventType: SpiffLedgerEvent;
    eventKey: string;
    note: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const points = Math.floor(this.toNumber(input.points));
    if (points <= 0) {
      return;
    }

    if (input.eventKey) {
      const exists = await this.ledgerRepo.exist({ where: { eventKey: input.eventKey } });
      if (exists) {
        return;
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
      await this.ledgerRepo.save(row);
    } catch (error: any) {
      const isDuplicate =
        error?.code === 'ER_DUP_ENTRY' ||
        String(error?.message || '').includes('Duplicate entry');
      if (!isDuplicate) {
        throw error;
      }
    }
  }

  private async computeWallet(userId: string): Promise<WalletSummary> {
    const totalEarnedRaw = await this.ledgerRepo
      .createQueryBuilder('ledger')
      .select('COALESCE(SUM(ledger.points), 0)', 'points')
      .where('ledger.userId = :userId', { userId })
      .andWhere('ledger.points > 0')
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
      .andWhere('ledger.points > 0')
      .andWhere('ledger.orderId IS NOT NULL')
      .andWhere('(ord.id IS NULL OR ord.status NOT IN (:...unlockStatuses))', {
        unlockStatuses: [OrderStatus.SHIPPED, OrderStatus.COMPLETED],
      })
      .getRawOne();

    const totalEarnedPoints = this.toNumber(totalEarnedRaw?.points);
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

  private async isSpiffEarningEligible(userId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'role'],
    });
    return user?.role === UserRole.SALES_REP;
  }

  private resolveTier(points: number): {
    code: string;
    label: string;
    badge: string;
    minPoints: number;
    maxPoints: number | null;
    nextTierAt: number | null;
  } {
    if (points >= 4000) {
      return {
        code: 'LEGEND',
        label: 'Legend',
        badge: '⚡',
        minPoints: 4000,
        maxPoints: null,
        nextTierAt: null,
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
      };
    }

    if (points >= 500) {
      return {
        code: 'SHARP',
        label: 'Sharp',
        badge: '🥈',
        minPoints: 500,
        maxPoints: 1499,
        nextTierAt: 1500,
      };
    }

    return {
      code: 'CLOSER',
      label: 'Closer',
      badge: '🥉',
      minPoints: 0,
      maxPoints: 499,
      nextTierAt: 500,
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
      requester.role === UserRole.COMPANY_ADMIN ||
      requester.role === UserRole.BRANCH_MANAGER
    );
  }

  private assertClaimScope(claim: SpiffRedemptionClaim, requester: AuthUser): void {
    if (requester.role === UserRole.SUPER_ADMIN) {
      return;
    }

    if (requester.role === UserRole.COMPANY_ADMIN) {
      if (!requester.companyId || claim.companyId !== requester.companyId) {
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

  private serializeClaim(claim: SpiffRedemptionClaim) {
    const requestorName = [claim.user?.firstName, claim.user?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const reviewerName = [claim.approvedBy?.firstName, claim.approvedBy?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return {
      ...claim,
      requestedAmount: this.roundMoney(claim.requestedAmountCents / 100),
      requestorName: requestorName || claim.user?.email || null,
      reviewerName: reviewerName || claim.approvedBy?.email || null,
      companyName: claim.company?.companyName || null,
      branchName: claim.branch?.name || null,
    };
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
      OrderStatus.SHIPPED,
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

  private async upsertSetting(settingKey: string, settingValue: string, updatedById: string | null) {
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
    return /^true$/i.test(String(process.env.GIFTBIT_AUTO_FULFILL || 'false').trim());
  }

  private toIntEnv(rawValue: unknown, fallback: number): number {
    const value = Number.parseInt(String(rawValue ?? '').trim(), 10);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
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
}

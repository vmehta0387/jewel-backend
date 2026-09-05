import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import {
  DesignMasterType,
  DESIGN_MASTER_TYPE_TABLE_MAP,
  MasterTableEntity,
  OverheadRuleApplyMode,
} from './entities/design-master-tables.entity';
import { FindMasterTableQueryDto, FindOneMasterTableDto, SaveMasterTableDto } from './dto/master-table.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { OVERHEAD_RULE_APPLY_MODE_NAME_BY_KEY } from './constants/overhead-rule.constants';
import { METAL_MASTER_IDS } from './constants/metal-master.constants';
import { StonePacket, StonePacketPriceIn, StoneWeightUnit } from './entities/stone-packet.entity';

type MasterEntityTarget = EntityTarget<ObjectLiteral>;
type SerializedMaster = Record<string, unknown> & {
  id: number;
  value: string;
  aliasName: string | null;
};

type DropdownMaster = {
  id: number;
  name: string;
  value: string;
  alias: string | null;
  aliasName: string | null;
  label: string;
};

const MASTER_RELATIONS: Partial<Record<DesignMasterType, string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupMaster'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupMaster'],
  [DesignMasterType.METAL_COLOR]: ['metalMaster'],
  [DesignMasterType.METAL_PURITY]: ['metalMaster'],
  [DesignMasterType.METAL_CARATAGE]: ['metalMaster', 'metalColorMaster', 'metalPurityMaster'],
  [DesignMasterType.FINDING_HEAD]: ['metalCaratageMaster'],
  [DesignMasterType.LABOR_RULE]: ['jewelryGroupMaster'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupMaster'],
};

const COMMON_WRITE_FIELDS = ['value', 'aliasName', 'scopeKey', 'description'] as const;

const TYPE_WRITE_FIELDS: Partial<Record<DesignMasterType, readonly string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupId'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupId'],
  [DesignMasterType.METAL_NAME]: ['marketPricePerOunce', 'marketPricePerGm', 'livePricePerGm'],
  [DesignMasterType.METAL_COLOR]: ['metalId'],
  [DesignMasterType.METAL_PURITY]: ['metalId', 'purityPercentage'],
  [DesignMasterType.METAL_CARATAGE]: [
    'displayColor',
    'sortOrder',
    'metalId',
    'metalColorId',
    'metalPurityId',
    'purityPercentage',
    'marketPricePerOunce',
    'marketPricePerGm',
    'livePricePerGm',
    'defaultWastagePercent',
  ],
  [DesignMasterType.VENDOR_NAME]: ['email'],
  [DesignMasterType.LABOR_RULE]: ['jewelryGroupId', 'laborApplyMode', 'flatCost', 'ratePerStone', 'ratePerGram', 'ratePerGroup'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupId', 'overheadApplyMode', 'ratePercent', 'flatAmount'],
  [DesignMasterType.FINDING_HEAD]: [
    'findingNo',
    'metalCaratageId',
    'priceIn',
    'pricePerUnit',
    'dimensions',
    'weightPerUnit',
  ],
};

const REQUIRED_FIELDS: Partial<Record<DesignMasterType, readonly string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupId'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupId'],
  [DesignMasterType.METAL_COLOR]: ['metalId'],
  [DesignMasterType.METAL_PURITY]: ['metalId'],
  [DesignMasterType.METAL_CARATAGE]: ['metalId', 'metalColorId', 'metalPurityId'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupId', 'overheadApplyMode'],
  [DesignMasterType.LABOR_RULE]: ['jewelryGroupId'],
};

const RELATION_FIELD_TYPES: Record<string, DesignMasterType> = {
  jewelryGroupId: DesignMasterType.JEWELRY_GROUP,
  metalId: DesignMasterType.METAL_NAME,
  metalColorId: DesignMasterType.METAL_COLOR,
  metalPurityId: DesignMasterType.METAL_PURITY,
  metalCaratageId: DesignMasterType.METAL_CARATAGE,
};

const MASTER_EXPORT_VALUE_HEADERS: Record<Exclude<DesignMasterType, DesignMasterType.PACKET>, string> = {
  [DesignMasterType.JEWELRY_GROUP]: 'Jewelry Group',
  [DesignMasterType.COLLECTION]: 'Collection',
  [DesignMasterType.JEWELRY_SIZE]: 'Jewelry Size',
  [DesignMasterType.TAG]: 'Tag',
  [DesignMasterType.DESIGN_STATUS]: 'Design Status',
  [DesignMasterType.STAGE]: 'Stage',
  [DesignMasterType.METAL_NAME]: 'Metal Name',
  [DesignMasterType.METAL_COLOR]: 'Metal Color',
  [DesignMasterType.METAL_PURITY]: 'Metal Purity',
  [DesignMasterType.METAL_CARATAGE]: 'Metal Caratage',
  [DesignMasterType.DIAMOND_TYPE]: 'Diamond Type',
  [DesignMasterType.DIAMOND_SPREAD]: 'Diamond Spread',
  [DesignMasterType.DIAMOND_WEIGHT]: 'Diamond Weight',
  [DesignMasterType.DIAMOND_QUALITY]: 'Diamond Quality',
  [DesignMasterType.VENDOR_NAME]: 'Vendor Name',
  [DesignMasterType.LABOR_HEAD]: 'Labor Head',
  [DesignMasterType.LABOR_RULE]: 'Labor Rule',
  [DesignMasterType.OVERHEAD_RULE]: 'Overhead Rule',
  [DesignMasterType.FINDING_HEAD]: 'Finding Head',
  [DesignMasterType.PACKET_STONE]: 'Packet Stone',
  [DesignMasterType.PACKET_SHAPE]: 'Packet Shape',
  [DesignMasterType.PACKET_SIZE]: 'Packet Size',
  [DesignMasterType.PACKET_CUT]: 'Packet Cut',
  [DesignMasterType.PACKET_COLOR]: 'Packet Color',
  [DesignMasterType.PACKET_QUALITY]: 'Packet Quality',
};
const UNIQUE_SCOPE_FIELDS: Partial<Record<DesignMasterType, readonly string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupId'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupId'],
  [DesignMasterType.METAL_COLOR]: ['metalId'],
  [DesignMasterType.METAL_PURITY]: ['metalId'],
  [DesignMasterType.METAL_CARATAGE]: ['metalId', 'metalColorId', 'metalPurityId'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupId'],
  [DesignMasterType.LABOR_RULE]: ['jewelryGroupId'],
};

@Injectable()
export class MasterTablesService {
  private static activeStatusVersion = 0;

  constructor(private readonly dataSource: DataSource) {}

  getActiveStatusVersion(): number {
    return MasterTablesService.activeStatusVersion;
  }

  private bumpActiveStatusVersion(): void {
    MasterTablesService.activeStatusVersion += 1;
  }

  async list(masterType: DesignMasterType, query: FindMasterTableQueryDto): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.listPackets(query);
    }

    const repo = this.getRepository(masterType);
    const alias = 'master';
    const qb = repo.createQueryBuilder(alias);

    for (const relation of MASTER_RELATIONS[masterType] || []) {
      qb.leftJoinAndSelect(`${alias}.${relation}`, relation);
    }

    if (query.status === 'ACTIVE' || (!query.status && !query.includeInactive)) {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: true });
    } else if (query.status === 'INACTIVE') {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: false });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where(`${alias}.value LIKE :search`, { search })
            .orWhere(`${alias}.aliasName LIKE :search`, { search })
            .orWhere(`${alias}.description LIKE :search`, { search });

          if (
            masterType === DesignMasterType.COLLECTION ||
            masterType === DesignMasterType.JEWELRY_SIZE ||
            masterType === DesignMasterType.LABOR_RULE ||
            masterType === DesignMasterType.OVERHEAD_RULE
          ) {
            where
              .orWhere('jewelryGroupMaster.value LIKE :search', { search })
              .orWhere('jewelryGroupMaster.aliasName LIKE :search', { search });
          }

          if (masterType === DesignMasterType.METAL_COLOR || masterType === DesignMasterType.METAL_PURITY) {
            where
              .orWhere('metalMaster.value LIKE :search', { search })
              .orWhere('metalMaster.aliasName LIKE :search', { search });
          }

          if (masterType === DesignMasterType.METAL_PURITY) {
            where.orWhere(`CAST(${alias}.purityPercentage AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.METAL_NAME) {
            where
              .orWhere(`CAST(${alias}.marketPricePerOunce AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.marketPricePerGm AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.livePricePerGm AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.METAL_CARATAGE) {
            where
              .orWhere('metalMaster.value LIKE :search', { search })
              .orWhere('metalMaster.aliasName LIKE :search', { search })
              .orWhere('metalColorMaster.value LIKE :search', { search })
              .orWhere('metalColorMaster.aliasName LIKE :search', { search })
              .orWhere('metalPurityMaster.value LIKE :search', { search })
              .orWhere('metalPurityMaster.aliasName LIKE :search', { search })
              .orWhere(`CAST(${alias}.purityPercentage AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.livePricePerGm AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.defaultWastagePercent AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.VENDOR_NAME) {
            where.orWhere(`${alias}.email LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.FINDING_HEAD) {
            where
              .orWhere(`${alias}.findingNo LIKE :search`, { search })
              .orWhere('metalCaratageMaster.value LIKE :search', { search })
              .orWhere('metalCaratageMaster.aliasName LIKE :search', { search })
              .orWhere(`${alias}.priceIn LIKE :search`, { search })
              .orWhere(`${alias}.dimensions LIKE :search`, { search })
              .orWhere(`CAST(${alias}.pricePerUnit AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.weightPerUnit AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.LABOR_RULE) {
            where
              .orWhere(`${alias}.laborApplyMode LIKE :search`, { search })
              .orWhere(`CAST(${alias}.flatCost AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerStone AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerGram AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerGroup AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.OVERHEAD_RULE) {
            where
              .orWhere(`${alias}.overheadApplyMode LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePercent AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.flatAmount AS CHAR) LIKE :search`, { search });
          }
        }),
      );
    }
    if (query.jewelryGroupId) {
      qb.andWhere(`${alias}.jewelryGroupId = :jewelryGroupId`, { jewelryGroupId: query.jewelryGroupId });
    }
    if (query.metalId) {
      qb.andWhere(`${alias}.metalId = :metalId`, { metalId: query.metalId });
    }

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      qb.orderBy(`CASE WHEN ${alias}.sortOrder > 0 THEN 0 ELSE 1 END`, 'ASC')
        .addOrderBy(`${alias}.sortOrder`, 'ASC')
        .addOrderBy(`${alias}.createdAt`, 'DESC');
    } else {
      qb.orderBy(`${alias}.createdAt`, 'DESC');
    }
    const rows = await qb.getMany();
    return rows.map((row) => this.serialize(row));
  }

  async dropdown(masterType: DesignMasterType, query: FindMasterTableQueryDto): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.listPackets(query);
    }

    const repo = this.getRepository(masterType);
    const alias = 'master';
    const qb = repo
      .createQueryBuilder(alias)
      .select([`${alias}.id`, `${alias}.value`, `${alias}.aliasName`]);

    if (masterType === DesignMasterType.COLLECTION || masterType === DesignMasterType.JEWELRY_SIZE) {
      qb.leftJoin(`${alias}.jewelryGroupMaster`, 'jewelryGroupMaster');
      qb.addSelect([`${alias}.jewelryGroupId`, 'jewelryGroupMaster.id', 'jewelryGroupMaster.value', 'jewelryGroupMaster.aliasName']);
    }

    if (masterType === DesignMasterType.METAL_COLOR || masterType === DesignMasterType.METAL_PURITY) {
      qb.leftJoin(`${alias}.metalMaster`, 'metalMaster');
      qb.addSelect([`${alias}.metalId`, 'metalMaster.id', 'metalMaster.value', 'metalMaster.aliasName']);
    }

    if (masterType === DesignMasterType.METAL_PURITY) {
      qb.addSelect([`${alias}.purityPercentage`]);
    }

    if (masterType === DesignMasterType.METAL_NAME) {
      qb.addSelect([
        `${alias}.marketPricePerOunce`,
        `${alias}.marketPricePerGm`,
        `${alias}.livePricePerGm`,
      ]);
    }

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      qb.leftJoin(`${alias}.metalMaster`, 'metalMaster');
      qb.leftJoin(`${alias}.metalColorMaster`, 'metalColorMaster');
      qb.leftJoin(`${alias}.metalPurityMaster`, 'metalPurityMaster');
      qb.addSelect([
        `${alias}.displayColor`,
        `${alias}.sortOrder`,
        `${alias}.metalId`,
        `${alias}.metalColorId`,
        `${alias}.metalPurityId`,
        'metalMaster.id',
        'metalMaster.value',
        'metalMaster.aliasName',
        'metalColorMaster.id',
        'metalColorMaster.value',
        'metalColorMaster.aliasName',
        'metalPurityMaster.id',
        'metalPurityMaster.value',
        'metalPurityMaster.aliasName',
        'metalPurityMaster.purityPercentage',
        `${alias}.purityPercentage`,
        `${alias}.marketPricePerOunce`,
        `${alias}.marketPricePerGm`,
        `${alias}.livePricePerGm`,
        `${alias}.defaultWastagePercent`,
      ]);
    }

    if (masterType === DesignMasterType.OVERHEAD_RULE) {
      qb.leftJoin(`${alias}.jewelryGroupMaster`, 'jewelryGroupMaster');
      qb.addSelect([
        `${alias}.jewelryGroupId`,
        'jewelryGroupMaster.id',
        'jewelryGroupMaster.value',
        'jewelryGroupMaster.aliasName',
        `${alias}.overheadApplyMode`,
        `${alias}.ratePercent`,
        `${alias}.flatAmount`,
      ]);
    }

    if (query.status === 'ACTIVE' || (!query.status && !query.includeInactive)) {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: true });
    } else if (query.status === 'INACTIVE') {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: false });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where(`${alias}.value LIKE :search`, { search })
            .orWhere(`${alias}.aliasName LIKE :search`, { search })
            .orWhere(`${alias}.description LIKE :search`, { search });

          if (
            masterType === DesignMasterType.COLLECTION ||
            masterType === DesignMasterType.JEWELRY_SIZE ||
            masterType === DesignMasterType.LABOR_RULE ||
            masterType === DesignMasterType.OVERHEAD_RULE
          ) {
            where
              .orWhere('jewelryGroupMaster.value LIKE :search', { search })
              .orWhere('jewelryGroupMaster.aliasName LIKE :search', { search });
          }

          if (masterType === DesignMasterType.METAL_COLOR || masterType === DesignMasterType.METAL_PURITY) {
            where
              .orWhere('metalMaster.value LIKE :search', { search })
              .orWhere('metalMaster.aliasName LIKE :search', { search });
          }

          if (masterType === DesignMasterType.METAL_PURITY) {
            where.orWhere(`CAST(${alias}.purityPercentage AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.METAL_NAME) {
            where
              .orWhere(`CAST(${alias}.marketPricePerOunce AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.marketPricePerGm AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.livePricePerGm AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.METAL_CARATAGE) {
            where
              .orWhere('metalMaster.value LIKE :search', { search })
              .orWhere('metalMaster.aliasName LIKE :search', { search })
              .orWhere('metalColorMaster.value LIKE :search', { search })
              .orWhere('metalColorMaster.aliasName LIKE :search', { search })
              .orWhere('metalPurityMaster.value LIKE :search', { search })
              .orWhere('metalPurityMaster.aliasName LIKE :search', { search })
              .orWhere(`CAST(${alias}.purityPercentage AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.livePricePerGm AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.defaultWastagePercent AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.VENDOR_NAME) {
            where.orWhere(`${alias}.email LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.FINDING_HEAD) {
            where
              .orWhere(`${alias}.findingNo LIKE :search`, { search })
              .orWhere('metalCaratageMaster.value LIKE :search', { search })
              .orWhere('metalCaratageMaster.aliasName LIKE :search', { search })
              .orWhere(`${alias}.priceIn LIKE :search`, { search })
              .orWhere(`${alias}.dimensions LIKE :search`, { search })
              .orWhere(`CAST(${alias}.pricePerUnit AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.weightPerUnit AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.LABOR_RULE) {
            where
              .orWhere(`${alias}.laborApplyMode LIKE :search`, { search })
              .orWhere(`CAST(${alias}.flatCost AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerStone AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerGram AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePerGroup AS CHAR) LIKE :search`, { search });
          }

          if (masterType === DesignMasterType.OVERHEAD_RULE) {
            where
              .orWhere(`${alias}.overheadApplyMode LIKE :search`, { search })
              .orWhere(`CAST(${alias}.ratePercent AS CHAR) LIKE :search`, { search })
              .orWhere(`CAST(${alias}.flatAmount AS CHAR) LIKE :search`, { search });
          }
        }),
      );
    }
    if (query.jewelryGroupId) {
      qb.andWhere(`${alias}.jewelryGroupId = :jewelryGroupId`, { jewelryGroupId: query.jewelryGroupId });
    }
    if (query.metalId) {
      qb.andWhere(`${alias}.metalId = :metalId`, { metalId: query.metalId });
    }

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      qb.orderBy(`CASE WHEN ${alias}.sortOrder > 0 THEN 0 ELSE 1 END`, 'ASC')
        .addOrderBy(`${alias}.sortOrder`, 'ASC')
        .addOrderBy(`${alias}.value`, 'ASC');
    } else {
      qb.orderBy(`${alias}.value`, 'ASC');
    }
    const rows = await qb.getMany();
    return rows.map((row): DropdownMaster => {
        const value = String((row as MasterTableEntity).value ?? '');
        const aliasName = typeof (row as MasterTableEntity).aliasName === 'string'
          ? (row as MasterTableEntity).aliasName
          : null;

        const option: DropdownMaster & Record<string, unknown> = {
          id: Number((row as MasterTableEntity).id),
          name: value,
          value,
          alias: aliasName,
          aliasName,
          label: value,
        };

        if (masterType === DesignMasterType.METAL_CARATAGE) {
          option.displayColor = row.displayColor ?? null;
          option.sortOrder = row.sortOrder ?? 0;
          option.metalId = row.metalId ?? null;
          option.metalColorId = row.metalColorId ?? null;
          option.metalPurityId = row.metalPurityId ?? null;
          option.metalName = this.serializeJoined(row.metalMaster)?.value ?? null;
          option.metalColor = this.serializeJoined(row.metalColorMaster)?.value ?? null;
          option.metalPurity = this.serializeJoined(row.metalPurityMaster)?.value ?? null;
          option.purityPercentage = row.purityPercentage ?? this.serializeJoined(row.metalPurityMaster)?.purityPercentage ?? null;
          option.marketPricePerOunce = row.marketPricePerOunce ?? null;
          option.marketPricePerGm = row.marketPricePerGm ?? null;
          option.livePricePerGm = row.livePricePerGm ?? null;
          option.defaultWastagePercent = row.defaultWastagePercent ?? null;
        }

        if (masterType === DesignMasterType.METAL_NAME) {
          option.marketPricePerOunce = row.marketPricePerOunce ?? null;
          option.marketPricePerGm = row.marketPricePerGm ?? null;
          option.livePricePerGm = row.livePricePerGm ?? null;
        }

        if (masterType === DesignMasterType.COLLECTION || masterType === DesignMasterType.JEWELRY_SIZE) {
          option.jewelryGroupId = row.jewelryGroupId ?? null;
          option.jewelryGroup = this.serializeJoined(row.jewelryGroupMaster)?.value ?? null;
        }

        if (masterType === DesignMasterType.METAL_COLOR || masterType === DesignMasterType.METAL_PURITY) {
          option.metalId = row.metalId ?? null;
          option.metalName = this.serializeJoined(row.metalMaster)?.value ?? null;
        }

        if (masterType === DesignMasterType.METAL_PURITY) {
          option.purityPercentage = row.purityPercentage ?? null;
        }

        if (masterType === DesignMasterType.OVERHEAD_RULE) {
          const overheadApplyMode = row.overheadApplyMode as OverheadRuleApplyMode | null | undefined;
          const overheadApplyModeName = overheadApplyMode
            ? OVERHEAD_RULE_APPLY_MODE_NAME_BY_KEY[overheadApplyMode] || String(overheadApplyMode)
            : null;
          option.jewelryGroupId = row.jewelryGroupId ?? null;
          option.jewelryGroup = this.serializeJoined(row.jewelryGroupMaster)?.value ?? null;
          option.overheadApplyMode = overheadApplyMode ?? null;
          option.overhead_apply_mode = overheadApplyMode ?? null;
          option.overheadApplyModeKey = overheadApplyMode ?? null;
          option.overheadApplyModeName = overheadApplyModeName;
          option.overheadApplyModeOption = overheadApplyMode
            ? { key: overheadApplyMode, name: overheadApplyModeName }
            : null;
          option.ratePercent = row.ratePercent ?? null;
          option.rate_percent = row.ratePercent ?? null;
          option.flatAmount = row.flatAmount ?? null;
          option.flat_amount = row.flatAmount ?? null;
        }

        return option;
      });
  }

  async getMetalLivePrice() {
    const repo = this.getRepository(DesignMasterType.METAL_NAME);
    const rows = await repo
      .createQueryBuilder('master')
      .where('master.id IN (:...ids)', {
        ids: [METAL_MASTER_IDS.GOLD, METAL_MASTER_IDS.PLATINUM],
      })
      .getMany();

    const byId = new Map(rows.map((row) => [Number(row.id), this.serializeMetalLivePrice(row)]));

    return {
      gold: byId.get(METAL_MASTER_IDS.GOLD) || null,
      platinum: byId.get(METAL_MASTER_IDS.PLATINUM) || null,
    };
  }

  async get(masterType: DesignMasterType, id: number): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.getPacket(id);
    }

    const repo = this.getRepository(masterType);
    const row = await repo.findOne({
      where: { id } as any,
      relations: MASTER_RELATIONS[masterType] || [],
    });
    if (!row) {
      throw new NotFoundException('Master record not found');
    }
    return this.serialize(row);
  }

  async findOne(masterType: DesignMasterType, payload: FindOneMasterTableDto): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      const id = this.toOptionalInt(payload.id);
      return id ? this.getPacket(id) : null;
    }

    const repo = this.getRepository(masterType);
    const alias = 'master';
    const qb = repo.createQueryBuilder(alias);
    const hasCondition = [
      payload.id,
      payload.value,
      payload.aliasName,
      payload.search,
      payload.jewelryGroupId,
      payload.metalId,
      payload.metalColorId,
      payload.metalPurityId,
      payload.findingNo,
      payload.overheadApplyMode,
    ].some((value) => value !== undefined && value !== null && value !== '');

    if (!hasCondition) {
      throw new BadRequestException('At least one find condition is required');
    }

    for (const relation of MASTER_RELATIONS[masterType] || []) {
      qb.leftJoinAndSelect(`${alias}.${relation}`, relation);
    }

    const id = this.toOptionalInt(payload.id);
    if (id) {
      qb.andWhere(`${alias}.id = :id`, { id });
    }

    const lookupText = this.optionalString(payload.value)
      || this.optionalString(payload.aliasName)
      || this.optionalString(payload.search);
    if (lookupText) {
      const normalized = lookupText.toLowerCase();
      qb.andWhere(
        new Brackets((where) => {
          where
            .where(`${alias}.normalizedValue = :normalized`, { normalized })
            .orWhere(`${alias}.normalizedAlias = :normalized`, { normalized })
            .orWhere(`${alias}.value = :lookupText`, { lookupText })
            .orWhere(`${alias}.aliasName = :lookupText`, { lookupText });
        }),
      );
    }

    this.applyFindOneFilter(qb, alias, 'jewelryGroupId', payload.jewelryGroupId);
    this.applyFindOneFilter(qb, alias, 'metalId', payload.metalId);
    this.applyFindOneFilter(qb, alias, 'metalColorId', payload.metalColorId);
    this.applyFindOneFilter(qb, alias, 'metalPurityId', payload.metalPurityId);
    this.applyFindOneFilter(qb, alias, 'findingNo', payload.findingNo);
    this.applyFindOneFilter(qb, alias, 'overheadApplyMode', payload.overheadApplyMode);

    if (payload.status === 'ACTIVE') {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: true });
    } else if (payload.status === 'INACTIVE') {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: false });
    } else if (payload.isActive !== undefined && payload.status !== 'ALL') {
      qb.andWhere(`${alias}.isActive = :isActive`, { isActive: payload.isActive });
    }

    const row = await qb.orderBy(`${alias}.id`, 'ASC').getOne();
    return row ? this.serialize(row) : null;
  }

  async create(masterType: DesignMasterType, dto: SaveMasterTableDto, requester: AuthUser): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.createPacket(dto);
    }

    const repo = this.getRepository(masterType);
    const data = this.pickWritable(masterType, dto);
    await this.validateBeforeSave(masterType, data);
    await this.assertUniqueMetalCaratageSortOrder(masterType, data);
    await this.assertUnique(repo, masterType, data);
    const row = repo.create(data);
    (row as any).createdBy = this.toOptionalInt(requester?.id);
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    const saved = await repo.save(row);
    return this.get(masterType, (saved as any).id);
  }

  async update(masterType: DesignMasterType, id: number, dto: Partial<SaveMasterTableDto>, requester: AuthUser): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.updatePacket(id, dto);
    }

    const repo = this.getRepository(masterType);
    const row = await repo.findOne({ where: { id } as any });
    if (!row) {
      throw new NotFoundException('Master record not found');
    }

    const data = this.pickWritable(masterType, dto);
    const nextRow = { ...row, ...data };
    await this.validateBeforeSave(masterType, nextRow);
    await this.assertUniqueMetalCaratageSortOrder(masterType, nextRow, id);
    await this.assertUnique(repo, masterType, nextRow, id);
    if (masterType === DesignMasterType.METAL_CARATAGE) {
      data.value = nextRow.value;
      data.aliasName = nextRow.aliasName;
    }
    Object.assign(row, data);
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    await repo.save(row);
    this.bumpActiveStatusVersion();
    return this.get(masterType, id);
  }

  async setActive(masterType: DesignMasterType, id: number, isActive: boolean, requester: AuthUser): Promise<any> {
    if (masterType === DesignMasterType.PACKET) {
      return this.updatePacketStatus(id, isActive);
    }

    const repo = this.getRepository(masterType);
    const row = await repo.findOne({ where: { id } as any });
    if (!row) {
      throw new NotFoundException('Master record not found');
    }
    if (isActive && !(row as any).isActive) {
      await this.assertUnique(repo, masterType, row as Record<string, unknown>, id);
    }
    (row as any).isActive = isActive;
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    await repo.save(row);
    this.bumpActiveStatusVersion();
    return this.get(masterType, id);
  }

  async exportTemplate(masterType: DesignMasterType): Promise<{ buffer: Buffer; fileName: string }> {
    if (masterType === DesignMasterType.PACKET) {
      return this.exportPacketTemplate();
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([this.buildTemplateRow(masterType)], {
        header: this.getImportHeaders(masterType),
      }),
      'Masters',
    );
    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${masterType.toLowerCase()}-import-template.xlsx`,
    };
  }

  async exportRows(masterType: DesignMasterType, query: FindMasterTableQueryDto): Promise<{ buffer: Buffer; fileName: string }> {
    if (masterType === DesignMasterType.PACKET) {
      return this.exportPackets(query);
    }

    const rows = await this.list(masterType, { ...query, status: query.status || 'ALL' });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(rows.map((row) => this.toExportRow(masterType, row))),
      'Masters',
    );
    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${masterType.toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importRows(
    masterType: DesignMasterType,
    file: { buffer?: Buffer; originalname?: string } | undefined,
    requester: AuthUser,
  ): Promise<{ totalRows: number; created: number; updated: number; failed: number; errors: string[] }> {
    if (masterType === DesignMasterType.PACKET) {
      return this.importPackets(file);
    }

    if (!file?.buffer) {
      throw new BadRequestException('Import file is required');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('Import workbook has no sheets');
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;
      try {
        const payload = this.fromImportRow(masterType, rows[index]);
        await this.resolveImportRelationIds(masterType, payload, rows[index]);
        const existing = await this.findExistingByImportPayload(masterType, payload);
        const isActive = this.parseBoolean(this.readCell(rows[index], 'Is Active'), true);
        let saved: SerializedMaster;
        if (existing?.isActive) {
          saved = await this.update(masterType, existing.id, payload, requester);
          updated += 1;
        } else {
          saved = await this.create(masterType, payload as SaveMasterTableDto, requester);
          created += 1;
        }
        if (Boolean((saved as any).isActive) !== isActive) {
          await this.setActive(masterType, saved.id, isActive, requester);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return { totalRows: rows.length, created, updated, failed: errors.length, errors };
  }

  private async listPackets(query: FindMasterTableQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const qb = this.packetQuery();
    const status = query.status || 'ACTIVE';

    if (status === 'ACTIVE') {
      qb.where('packet.isActive = :isActive', { isActive: true });
    } else if (status === 'INACTIVE') {
      qb.where('packet.isActive = :isActive', { isActive: false });
    }

    if (query.stockType?.trim()) {
      qb.andWhere('packet.stockType LIKE :stockType', { stockType: `%${query.stockType.trim()}%` });
    }
    if (query.barcode?.trim()) {
      qb.andWhere('packet.barcode LIKE :barcode', { barcode: `%${query.barcode.trim()}%` });
    }
    if (query.stone?.trim()) {
      qb.andWhere('stoneMaster.value LIKE :stone', { stone: `%${query.stone.trim()}%` });
    }
    if (query.shape?.trim()) {
      qb.andWhere('shapeMaster.value LIKE :shape', { shape: `%${query.shape.trim()}%` });
    }
    if (query.size?.trim()) {
      qb.andWhere('sizeMaster.value LIKE :size', { size: `%${query.size.trim()}%` });
    }
    if (query.cut?.trim()) {
      qb.andWhere('cutMaster.value LIKE :cut', { cut: `%${query.cut.trim()}%` });
    }
    if (query.color?.trim()) {
      qb.andWhere('colorMaster.value LIKE :color', { color: `%${query.color.trim()}%` });
    }
    if (query.quality?.trim()) {
      qb.andWhere('qualityMaster.value LIKE :quality', { quality: `%${query.quality.trim()}%` });
    }
    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('packet.packetName LIKE :search', { search })
            .orWhere('packet.barcode LIKE :search', { search })
            .orWhere('stoneMaster.value LIKE :search', { search })
            .orWhere('shapeMaster.value LIKE :search', { search })
            .orWhere('sizeMaster.value LIKE :search', { search })
            .orWhere('cutMaster.value LIKE :search', { search })
            .orWhere('colorMaster.value LIKE :search', { search })
            .orWhere('qualityMaster.value LIKE :search', { search });
        }),
      );
    }

    const total = await qb.clone().getCount();
    const data = await qb
      .orderBy('packet.createdAt', 'DESC')
      .addOrderBy('packet.id', 'DESC')
      .offset(skip)
      .limit(limit)
      .getMany();

    return {
      data: data.map((packet) => this.serializePacket(packet)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getPacket(id: number) {
    const packet = await this.packetQuery()
      .where('packet.id = :id', { id })
      .getOne();
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }
    return this.serializePacket(packet);
  }

  private async createPacket(dto: Partial<SaveMasterTableDto>) {
    const packetName = this.normalizePacketName(dto.packetName);
    const packetRepo = this.getPacketRepository();
    const existing = await packetRepo.findOne({ where: { packetName } });
    if (existing?.isActive) {
      throw new ConflictException('Packet name already exists');
    }

    const pieces = this.resolvePacketPieces(dto.pieces, 1);
    const weightPerPc = this.resolvePacketWeightPerPc({
      weightPerPc: dto.weightPerPc,
      weight: dto.weight,
      pieces,
    });
    const barcode = await this.resolveStonePacketBarcode(dto.barcode);
    const packet = packetRepo.create();

    Object.assign(packet, {
      barcode,
      packetName,
      stockType: this.optionalString(dto.stockType) || 'COMPLETED',
      stoneId: await this.resolvePacketMasterId(DesignMasterType.PACKET_STONE, dto.stoneId, dto.stone, 'stone'),
      shapeId: await this.resolvePacketMasterId(DesignMasterType.PACKET_SHAPE, dto.shapeId, dto.shape, 'shape'),
      sizeId: await this.resolvePacketMasterId(DesignMasterType.PACKET_SIZE, dto.sizeId, dto.size, 'size'),
      cutId: await this.resolvePacketMasterId(DesignMasterType.PACKET_CUT, dto.cutId, dto.cut, 'cut'),
      colorId: await this.resolvePacketMasterId(DesignMasterType.PACKET_COLOR, dto.colorId, dto.color, 'color'),
      qualityId: await this.resolvePacketMasterId(DesignMasterType.PACKET_QUALITY, dto.qualityId, dto.quality, 'quality'),
      priceIn: this.normalizePacketPriceIn(dto.priceIn),
      sellingPrice: this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice'),
      weightPerPc: this.roundTo3(weightPerPc),
      pieces,
      weight: this.roundTo3(weightPerPc * pieces),
      weightUnit: this.normalizePacketWeightUnit(dto.weightUnit),
      isActive: true,
    });

    const saved = await packetRepo.save(packet);
    return this.getPacket(saved.id);
  }

  private async updatePacket(id: number, dto: Partial<SaveMasterTableDto>) {
    const packetRepo = this.getPacketRepository();
    const packet = await packetRepo.findOne({ where: { id } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }

    if (dto.packetName !== undefined) {
      const packetName = this.normalizePacketName(dto.packetName);
      if (packetName !== packet.packetName) {
        const duplicate = await packetRepo.findOne({ where: { packetName } });
        if (duplicate && duplicate.id !== packet.id) {
          throw new ConflictException('Packet name already exists');
        }
      }
      packet.packetName = packetName;
    }
    if (dto.barcode !== undefined) packet.barcode = await this.resolveStonePacketBarcode(dto.barcode, packet.id, false);
    if (dto.stockType !== undefined) packet.stockType = this.optionalString(dto.stockType);
    if (dto.stoneId !== undefined || dto.stone !== undefined) packet.stoneId = await this.resolvePacketMasterId(DesignMasterType.PACKET_STONE, dto.stoneId, dto.stone, 'stone');
    if (dto.shapeId !== undefined || dto.shape !== undefined) packet.shapeId = await this.resolvePacketMasterId(DesignMasterType.PACKET_SHAPE, dto.shapeId, dto.shape, 'shape');
    if (dto.sizeId !== undefined || dto.size !== undefined) packet.sizeId = await this.resolvePacketMasterId(DesignMasterType.PACKET_SIZE, dto.sizeId, dto.size, 'size');
    if (dto.cutId !== undefined || dto.cut !== undefined) packet.cutId = await this.resolvePacketMasterId(DesignMasterType.PACKET_CUT, dto.cutId, dto.cut, 'cut');
    if (dto.colorId !== undefined || dto.color !== undefined) packet.colorId = await this.resolvePacketMasterId(DesignMasterType.PACKET_COLOR, dto.colorId, dto.color, 'color');
    if (dto.qualityId !== undefined || dto.quality !== undefined) packet.qualityId = await this.resolvePacketMasterId(DesignMasterType.PACKET_QUALITY, dto.qualityId, dto.quality, 'quality');
    if (dto.priceIn !== undefined) packet.priceIn = this.normalizePacketPriceIn(dto.priceIn);
    if (dto.sellingPrice !== undefined) packet.sellingPrice = this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice');
    if (dto.weightUnit !== undefined) packet.weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);

    const nextPieces = this.resolvePacketPieces(dto.pieces !== undefined ? dto.pieces : packet.pieces, packet.pieces || 1);
    if (dto.weight !== undefined || dto.weightPerPc !== undefined || dto.pieces !== undefined) {
      const nextWeightPerPc = this.resolvePacketWeightPerPc({
        weightPerPc: dto.weightPerPc,
        weight: dto.weight,
        pieces: nextPieces,
        fallbackWeightPerPc: packet.weightPerPc,
        fallbackWeight: packet.weight,
      });
      packet.weightPerPc = this.roundTo3(nextWeightPerPc);
      packet.weight = this.roundTo3(nextWeightPerPc * nextPieces);
    }
    packet.pieces = nextPieces;

    const saved = await packetRepo.save(packet);
    return this.getPacket(saved.id);
  }

  private async updatePacketStatus(id: number, isActive: boolean) {
    const packetRepo = this.getPacketRepository();
    const packet = await packetRepo.findOne({ where: { id } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }
    if (isActive && !packet.isActive) {
      const duplicate = await packetRepo.findOne({ where: { packetName: packet.packetName, isActive: true } });
      if (duplicate && duplicate.id !== packet.id) {
        throw new ConflictException('Already exists/enabled save info. To enable this master, please change master info first.');
      }
    }
    packet.isActive = isActive;
    const saved = await packetRepo.save(packet);
    return this.getPacket(saved.id);
  }

  private async exportPacketTemplate(): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([this.buildPacketTemplateRow()], { header: this.packetImportHeaders() }),
      'Packets',
    );
    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: 'stone-packets-import-template.xlsx',
    };
  }

  private async exportPackets(query: FindMasterTableQueryDto): Promise<{ buffer: Buffer; fileName: string }> {
    const result = await this.listPackets({ ...query, status: query.status || 'ALL', page: 1, limit: 5000 });
    const workbook = XLSX.utils.book_new();
    const rows = result.data.map((packet: Record<string, any>) => ({
      Barcode: packet.barcode || '',
      'Packet Name': packet.packetName,
      Stone: packet.stoneMaster?.value || '',
      Shape: packet.shapeMaster?.value || '',
      Cut: packet.cutMaster?.value || '',
      Size: packet.sizeMaster?.value || '',
      Color: packet.colorMaster?.value || '',
      Quality: packet.qualityMaster?.value || '',
      'Price In': packet.priceIn,
      'Selling Price': packet.sellingPrice ?? '',
      'Weight Per Pc': packet.weightPerPc ?? '',
      Pieces: packet.pieces,
      Weight: packet.weight,
      'Weight Unit': packet.weightUnit,
      Status: packet.isActive ? 'ACTIVE' : 'INACTIVE',
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Packets');
    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `stone-packets-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  private async importPackets(file: { buffer?: Buffer; originalname?: string } | undefined) {
    if (!file?.buffer) {
      throw new BadRequestException('Import file is required');
    }
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('Import workbook has no sheets');
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: '' });
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;
      try {
        const payload = this.packetPayloadFromImportRow(rows[index]);
        const existing = await this.getPacketRepository().findOne({ where: { packetName: payload.packetName } });
        const saved = existing ? await this.updatePacket(existing.id, payload) : await this.createPacket(payload);
        existing ? updated += 1 : created += 1;
        const isActive = this.parseBoolean(this.readCell(rows[index], 'Status'), true);
        if (Boolean((saved as any).isActive) !== isActive) {
          await this.updatePacketStatus((saved as any).id, isActive);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return { totalRows: rows.length, created, updated, failed: errors.length, errors };
  }

  private getRepository(masterType: DesignMasterType): Repository<ObjectLiteral> {
    const entity = DESIGN_MASTER_TYPE_TABLE_MAP[masterType] as MasterEntityTarget | undefined;
    if (!entity) {
      throw new BadRequestException(`Unsupported master type: ${masterType}`);
    }
    return this.dataSource.getRepository(entity);
  }

  private getPacketRepository(): Repository<StonePacket> {
    return this.dataSource.getRepository(StonePacket);
  }

  private packetQuery() {
    return this.getPacketRepository()
      .createQueryBuilder('packet')
      .leftJoinAndSelect('packet.stoneMaster', 'stoneMaster')
      .leftJoinAndSelect('packet.shapeMaster', 'shapeMaster')
      .leftJoinAndSelect('packet.sizeMaster', 'sizeMaster')
      .leftJoinAndSelect('packet.cutMaster', 'cutMaster')
      .leftJoinAndSelect('packet.colorMaster', 'colorMaster')
      .leftJoinAndSelect('packet.qualityMaster', 'qualityMaster');
  }

  private serializePacket(packet: StonePacket) {
    return {
      ...packet,
      stoneMaster: this.serializePacketMaster(packet.stoneMaster),
      shapeMaster: this.serializePacketMaster(packet.shapeMaster),
      sizeMaster: this.serializePacketMaster(packet.sizeMaster),
      cutMaster: this.serializePacketMaster(packet.cutMaster),
      colorMaster: this.serializePacketMaster(packet.colorMaster),
      qualityMaster: this.serializePacketMaster(packet.qualityMaster),
    };
  }

  private serializePacketMaster(master: { id: number; value: string } | null | undefined) {
    if (!master) {
      return null;
    }
    return {
      id: master.id,
      name: master.value,
      value: master.value,
    };
  }

  private async resolvePacketMasterId(
    masterType: DesignMasterType,
    id: unknown,
    value: unknown,
    field: string,
  ): Promise<number | null> {
    const explicitId = this.toOptionalInt(id);
    if (explicitId) {
      await this.assertRelatedMasterExists(masterType, explicitId, `${field}Id`);
      return explicitId;
    }

    const resolved = await this.resolveIdByValue(masterType, value);
    if (!resolved) {
      throw new BadRequestException(`${field} is required`);
    }
    return resolved;
  }

  private normalizePacketName(value: unknown): string {
    const normalized = this.optionalString(value);
    if (!normalized) {
      throw new BadRequestException('packetName is required');
    }
    return normalized;
  }

  private normalizePacketPriceIn(value: unknown): StonePacketPriceIn {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === StonePacketPriceIn.PCS ? StonePacketPriceIn.PCS : StonePacketPriceIn.WT;
  }

  private normalizePacketWeightUnit(value: unknown): StoneWeightUnit {
    const normalized = String(value || '').trim().toUpperCase();
    return normalized === StoneWeightUnit.GMS || normalized === 'GRAM' ? StoneWeightUnit.GMS : StoneWeightUnit.CTS;
  }

  private normalizeStonePacketBarcode(value: unknown): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('Packet barcode must contain digits only');
    }
    return normalized;
  }

  private async resolveStonePacketBarcode(value: unknown, excludePacketId?: number, autoGenerate = true): Promise<string | null> {
    const normalized = this.normalizeStonePacketBarcode(value);
    if (!normalized) {
      return autoGenerate ? this.generateStonePacketBarcode() : null;
    }

    const existing = await this.getPacketRepository().findOne({ where: { barcode: normalized } });
    if (existing && existing.id !== excludePacketId) {
      throw new ConflictException('Packet barcode already exists');
    }
    return normalized;
  }

  private async generateStonePacketBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const existing = await this.getPacketRepository().findOne({ where: { barcode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new BadRequestException('Unable to generate a unique packet barcode');
  }

  private resolvePacketPieces(value: unknown, fallback = 1): number {
    const parsed = value === undefined || value === null || value === '' ? Number(fallback) : Number(value);
    return Math.max(1, Math.trunc(Number.isFinite(parsed) ? parsed : fallback));
  }

  private resolvePacketWeightPerPc(input: {
    weightPerPc?: unknown;
    weight?: unknown;
    pieces: number;
    fallbackWeightPerPc?: unknown;
    fallbackWeight?: unknown;
  }): number {
    const explicitWeightPerPc = this.optionalNonNegativeNumber(input.weightPerPc, 'weightPerPc');
    if (explicitWeightPerPc !== null) {
      if (explicitWeightPerPc <= 0) {
        throw new BadRequestException('weightPerPc must be greater than 0');
      }
      return explicitWeightPerPc;
    }

    const explicitWeight = this.optionalNonNegativeNumber(input.weight, 'weight');
    if (explicitWeight !== null) {
      if (explicitWeight <= 0) {
        throw new BadRequestException('weight must be greater than 0');
      }
      return explicitWeight / Math.max(1, input.pieces);
    }

    const fallbackWeightPerPc = this.toOptionalNumber(input.fallbackWeightPerPc);
    if (fallbackWeightPerPc !== null && fallbackWeightPerPc > 0) {
      return fallbackWeightPerPc;
    }

    const fallbackWeight = this.toOptionalNumber(input.fallbackWeight);
    if (fallbackWeight !== null && fallbackWeight > 0) {
      return fallbackWeight / Math.max(1, input.pieces);
    }

    throw new BadRequestException('weightPerPc must be greater than 0');
  }

  private optionalNonNegativeNumber(value: unknown, field: string): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a valid non-negative number`);
    }
    return parsed;
  }

  private roundTo3(value: number): number {
    return Math.round((value + Number.EPSILON) * 1000) / 1000;
  }

  private packetImportHeaders(): string[] {
    return Object.keys(this.buildPacketTemplateRow());
  }

  private buildPacketTemplateRow() {
    return {
      Barcode: '100000000001',
      'Packet Name': 'LD-ROU-400-DF-VV',
      Stone: '',
      Shape: '',
      Cut: '',
      Size: '',
      Color: '',
      Quality: '',
      'Price In': 'WT',
      'Selling Price': 500,
      'Weight Per Pc': 0.24,
      Pieces: 1,
      Weight: 0.24,
      'Weight Unit': 'CTS',
      Status: 'ACTIVE',
    };
  }

  private packetPayloadFromImportRow(row: Record<string, unknown>): Partial<SaveMasterTableDto> {
    return {
      barcode: this.readCell(row, 'Barcode') || undefined,
      packetName: this.readCell(row, 'Packet Name') || this.readCell(row, 'packetName'),
      stone: this.readCell(row, 'Stone') || undefined,
      shape: this.readCell(row, 'Shape') || undefined,
      cut: this.readCell(row, 'Cut') || undefined,
      size: this.readCell(row, 'Size') || undefined,
      color: this.readCell(row, 'Color') || undefined,
      quality: this.readCell(row, 'Quality') || undefined,
      priceIn: (this.readCell(row, 'Price In') || 'WT') as 'WT' | 'PCS',
      sellingPrice: this.toOptionalNumber(this.readCell(row, 'Selling Price')) ?? undefined,
      weightPerPc: this.toOptionalNumber(this.readCell(row, 'Weight Per Pc')) ?? undefined,
      pieces: this.toOptionalNumber(this.readCell(row, 'Pieces')) ?? 1,
      weight: this.toOptionalNumber(this.readCell(row, 'Weight')) ?? undefined,
      weightUnit: (this.readCell(row, 'Weight Unit') || 'CTS') as 'CTS' | 'GMS',
    };
  }

  private getMasterExportValueHeader(masterType: DesignMasterType): string {
    return MASTER_EXPORT_VALUE_HEADERS[masterType as Exclude<DesignMasterType, DesignMasterType.PACKET>] || 'Value';
  }
  private getImportHeaders(masterType: DesignMasterType): string[] {
    return Object.keys(this.buildTemplateRow(masterType));
  }

  private buildTemplateRow(masterType: DesignMasterType) {
    const valueHeader = this.getMasterExportValueHeader(masterType);
    const base: Record<string, unknown> = {
      [valueHeader]: '',
      Alias: '',
      Description: '',
      'Is Active': 'TRUE',
    };
    if ([DesignMasterType.COLLECTION, DesignMasterType.JEWELRY_SIZE, DesignMasterType.LABOR_RULE, DesignMasterType.OVERHEAD_RULE].includes(masterType)) {
      base['Jewelry Group ID'] = '';
      base['Jewelry Group'] = '';
    }
    if (masterType === DesignMasterType.METAL_NAME) {
      base['Market Price/Ounce'] = '';
      base['Market Price/Gms'] = '';
      base['Live Price/Gms'] = '';
    }
    if ([DesignMasterType.METAL_COLOR, DesignMasterType.METAL_PURITY, DesignMasterType.METAL_CARATAGE].includes(masterType)) {
      base['Metal ID'] = '';
      base.Metal = '';
    }
    if (masterType === DesignMasterType.METAL_CARATAGE) {
      base['Metal Color ID'] = '';
      base['Metal Color'] = '';
      base['Metal Purity ID'] = '';
      base['Metal Purity'] = '';
      base['Live Price/Gms'] = '';
      base['Default Wastage Percent'] = '';
      base['Sort Order'] = '';
    }
    if (masterType === DesignMasterType.METAL_PURITY || masterType === DesignMasterType.METAL_CARATAGE) {
      base['Purity Percentage'] = '';
    }
    if (masterType === DesignMasterType.VENDOR_NAME) {
      base.Email = '';
    }
    if (masterType === DesignMasterType.LABOR_RULE) {
      base['Apply Mode'] = '';
      base['Flat Cost'] = '';
      base['Rate Per Stone'] = '';
      base['Rate Per Gram'] = '';
      base['Rate Per Group'] = '';
    }
    if (masterType === DesignMasterType.OVERHEAD_RULE) {
      base['Overhead Apply Mode'] = 'per_of_materials';
      base['Rate Percent'] = '';
      base['Flat Amount'] = '';
    }
    if (masterType === DesignMasterType.FINDING_HEAD) {
      base['Finding No'] = '';
      base['Metal Caratage ID'] = '';
      base['Metal Caratage'] = '';
      base['Price In'] = 'PIECES';
      base['Price/Unit'] = '';
      base.Dimensions = '';
      base['Weight/Unit'] = '';
    }
    return base;
  }

  private toExportRow(masterType: DesignMasterType, row: SerializedMaster) {
    const output = this.buildTemplateRow(masterType);
    output[this.getMasterExportValueHeader(masterType)] = row.value;
    output.Alias = row.aliasName || '';
    output.Description = row.description || '';
    output['Is Active'] = row.isActive ? 'TRUE' : 'FALSE';

    if (
      masterType === DesignMasterType.COLLECTION ||
      masterType === DesignMasterType.JEWELRY_SIZE ||
      masterType === DesignMasterType.LABOR_RULE ||
      masterType === DesignMasterType.OVERHEAD_RULE
    ) {
      output['Jewelry Group ID'] = row.jewelryGroupId || '';
      output['Jewelry Group'] = (row.jewelryGroup as any)?.value || '';
    }

    if (masterType === DesignMasterType.METAL_NAME) {
      output['Market Price/Ounce'] = row.marketPricePerOunce ?? '';
      output['Market Price/Gms'] = row.marketPricePerGm ?? '';
      output['Live Price/Gms'] = row.livePricePerGm ?? '';
    }

    if (
      masterType === DesignMasterType.METAL_COLOR ||
      masterType === DesignMasterType.METAL_PURITY ||
      masterType === DesignMasterType.METAL_CARATAGE
    ) {
      output['Metal ID'] = row.metalId || '';
      output.Metal = (row.metal as any)?.value || '';
    }

    if (masterType === DesignMasterType.METAL_PURITY) {
      output['Purity Percentage'] = row.purityPercentage ?? '';
    }

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      output['Metal Color ID'] = row.metalColorId || '';
      output['Metal Color'] = (row.metalColor as any)?.value || '';
      output['Metal Purity ID'] = row.metalPurityId || '';
      output['Metal Purity'] = (row.metalPurity as any)?.value || '';
      output['Purity Percentage'] = row.purityPercentage ?? '';
      output['Live Price/Gms'] = row.livePricePerGm ?? '';
      output['Default Wastage Percent'] = row.defaultWastagePercent ?? '';
      output['Sort Order'] = Number(row.sortOrder) > 0 ? row.sortOrder : '';
    }

    if (masterType === DesignMasterType.VENDOR_NAME) {
      output.Email = row.email || '';
    }

    if (masterType === DesignMasterType.LABOR_RULE) {
      output['Apply Mode'] = row.laborApplyMode || '';
      output['Flat Cost'] = row.flatCost ?? '';
      output['Rate Per Stone'] = row.ratePerStone ?? '';
      output['Rate Per Gram'] = row.ratePerGram ?? '';
      output['Rate Per Group'] = row.ratePerGroup ?? '';
    }

    if (masterType === DesignMasterType.OVERHEAD_RULE) {
      output['Overhead Apply Mode'] = row.overheadApplyMode || output['Overhead Apply Mode'] || '';
      output['Rate Percent'] = row.ratePercent ?? '';
      output['Flat Amount'] = row.flatAmount ?? '';
    }

    if (masterType === DesignMasterType.FINDING_HEAD) {
      output['Finding No'] = row.findingNo || '';
      output['Metal Caratage ID'] = row.metalCaratageId || '';
      output['Metal Caratage'] = (row.metalCaratage as any)?.value || '';
      output['Price In'] = row.priceIn || output['Price In'] || '';
      output['Price/Unit'] = row.pricePerUnit ?? '';
      output.Dimensions = row.dimensions || '';
      output['Weight/Unit'] = row.weightPerUnit ?? '';
    }

    return output;
  }

  private fromImportRow(masterType: DesignMasterType, row: Record<string, unknown>): Partial<SaveMasterTableDto> {
    const payload: Record<string, unknown> = {
      value: this.readCell(row, this.getMasterExportValueHeader(masterType)) || this.readCell(row, 'Value'),
      aliasName: this.readCell(row, 'Alias') || this.readCell(row, this.getMasterExportValueHeader(masterType)) || this.readCell(row, 'Value'),
      description: this.readCell(row, 'Description') || null,
    };
    payload.jewelryGroupId = this.toOptionalInt(this.readCell(row, 'Jewelry Group ID'));
    payload.metalId = this.toOptionalInt(this.readCell(row, 'Metal ID'));
    payload.metalColorId = this.toOptionalInt(this.readCell(row, 'Metal Color ID'));
    payload.metalPurityId = this.toOptionalInt(this.readCell(row, 'Metal Purity ID'));
    payload.email = this.readCell(row, 'Email') || null;
    payload.findingNo = this.readCell(row, 'Finding No') || null;
    payload.metalCaratageId = this.toOptionalInt(this.readCell(row, 'Metal Caratage ID'));
    payload.priceIn = this.readCell(row, 'Price In') || undefined;
    payload.pricePerUnit = this.toOptionalNumber(this.readCell(row, 'Price/Unit'));
    payload.dimensions = this.readCell(row, 'Dimensions') || null;
    payload.weightPerUnit = this.toOptionalNumber(this.readCell(row, 'Weight/Unit'));
    payload.purityPercentage = this.toOptionalNumber(this.readCell(row, 'Purity Percentage'));
    payload.marketPricePerOunce = this.toOptionalNumber(this.readCell(row, 'Market Price/Ounce'));
    payload.marketPricePerGm = this.toOptionalNumber(this.readCell(row, 'Market Price/Gms'));
    payload.livePricePerGm = this.toOptionalNumber(this.readCell(row, 'Live Price/Gms'));
    payload.defaultWastagePercent = this.toOptionalNumber(this.readCell(row, 'Default Wastage Percent'));
    payload.sortOrder = this.toOptionalNumber(this.readCell(row, 'Sort Order')) ?? 0;
    payload.laborApplyMode = this.readCell(row, 'Apply Mode') || undefined;
    payload.flatCost = this.toOptionalNumber(this.readCell(row, 'Flat Cost'));
    payload.ratePerStone = this.toOptionalNumber(this.readCell(row, 'Rate Per Stone'));
    payload.ratePerGram = this.toOptionalNumber(this.readCell(row, 'Rate Per Gram'));
    payload.ratePerGroup = this.toOptionalNumber(this.readCell(row, 'Rate Per Group'));
    payload.overheadApplyMode = this.readCell(row, 'Overhead Apply Mode') || undefined;
    payload.ratePercent = this.toOptionalNumber(this.readCell(row, 'Rate Percent'));
    payload.flatAmount = this.toOptionalNumber(this.readCell(row, 'Flat Amount'));
    return this.pickWritable(masterType, payload);
  }

  private async resolveImportRelationIds(
    masterType: DesignMasterType,
    payload: Record<string, unknown>,
    row: Record<string, unknown>,
  ) {
    if (!payload.jewelryGroupId) {
      payload.jewelryGroupId = await this.resolveIdByValue(DesignMasterType.JEWELRY_GROUP, this.readCell(row, 'Jewelry Group'));
    }
    if (!payload.metalId) {
      payload.metalId = await this.resolveIdByValue(DesignMasterType.METAL_NAME, this.readCell(row, 'Metal'));
    }
    if (!payload.metalColorId) {
      payload.metalColorId = await this.resolveIdByValue(DesignMasterType.METAL_COLOR, this.readCell(row, 'Metal Color'), { metalId: payload.metalId });
    }
    if (!payload.metalPurityId) {
      payload.metalPurityId = await this.resolveIdByValue(DesignMasterType.METAL_PURITY, this.readCell(row, 'Metal Purity'), { metalId: payload.metalId });
    }
    if (!payload.metalCaratageId) {
      payload.metalCaratageId = await this.resolveIdByValue(DesignMasterType.METAL_CARATAGE, this.readCell(row, 'Metal Caratage'));
    }
    if (masterType) {
      return;
    }
  }

  private async findExistingByImportPayload(masterType: DesignMasterType, payload: Record<string, unknown>) {
    const normalizedValue = this.optionalString(payload.value)?.toLowerCase();
    if (!normalizedValue) {
      throw new BadRequestException('Value is required');
    }
    const repo = this.getRepository(masterType);
    const alias = 'master';
    const qb = repo.createQueryBuilder(alias).where(`${alias}.normalizedValue = :normalizedValue`, { normalizedValue });
    for (const field of UNIQUE_SCOPE_FIELDS[masterType] || []) {
      if (payload[field]) {
        qb.andWhere(`${alias}.${field} = :${field}`, { [field]: payload[field] });
      }
    }
    return qb.getOne() as Promise<(ObjectLiteral & { id: number }) | null>;
  }

  private async resolveIdByValue(masterType: DesignMasterType, value: unknown, scope: Record<string, unknown> = {}) {
    const text = this.optionalString(value);
    if (!text) {
      return null;
    }
    const alias = 'master';
    const qb = this.getRepository(masterType)
      .createQueryBuilder(alias)
      .where(`(${alias}.normalizedValue = :text OR ${alias}.normalizedAlias = :text)`, { text: text.toLowerCase() });
    for (const [field, fieldValue] of Object.entries(scope)) {
      if (fieldValue) {
        qb.andWhere(`${alias}.${field} = :${field}`, { [field]: fieldValue });
      }
    }
    const row = await qb.getOne();
    return row ? Number((row as any).id) : null;
  }

  private readCell(row: Record<string, unknown>, header: string): string {
    const value = row[header] ?? row[header.toLowerCase()] ?? row[header.replace(/\s+/g, '')];
    return value === undefined || value === null ? '' : String(value).trim();
  }

  private toOptionalNumber(value: unknown): number | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseBoolean(value: unknown, fallback: boolean): boolean {
    const text = String(value ?? '').trim().toLowerCase();
    if (!text) return fallback;
    return ['true', 'yes', 'y', '1', 'active'].includes(text);
  }

  private workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private pickWritable(masterType: DesignMasterType, dto: Partial<SaveMasterTableDto>) {
    const data: Record<string, unknown> = {};
    for (const field of [...COMMON_WRITE_FIELDS, ...(TYPE_WRITE_FIELDS[masterType] || [])]) {
      if ((dto as any)[field] !== undefined) {
        data[field] = this.normalizeWritableValue(field, (dto as any)[field]);
      }
    }
    return data;
  }


  private async validateBeforeSave(masterType: DesignMasterType, data: Record<string, unknown>) {
    if (!this.optionalString(data.value)) {
      throw new BadRequestException('value is required');
    }

    for (const field of REQUIRED_FIELDS[masterType] || []) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new BadRequestException(`${field} is required for ${masterType}`);
      }
    }

    for (const [field, relatedType] of Object.entries(RELATION_FIELD_TYPES)) {
      if (data[field] !== undefined && data[field] !== null) {
        await this.assertRelatedMasterExists(relatedType, Number(data[field]), field);
      }
    }

    if (masterType === DesignMasterType.METAL_CARATAGE && data.metalId) {
      const sortOrder = Number(data.sortOrder ?? 0);
      if (!Number.isInteger(sortOrder) || sortOrder < 0) {
        throw new BadRequestException('Sort Order must be a non-negative whole number.');
      }
      data.sortOrder = sortOrder;
      await this.assertScopedMaster(
        DesignMasterType.METAL_COLOR,
        Number(data.metalColorId),
        { metalId: Number(data.metalId) },
        'metalColorId',
      );
      await this.assertScopedMaster(
        DesignMasterType.METAL_PURITY,
        Number(data.metalPurityId),
        { metalId: Number(data.metalId) },
        'metalPurityId',
      );
    }
  }

  private async assertUniqueMetalCaratageSortOrder(
    masterType: DesignMasterType,
    data: Record<string, unknown>,
    excludeId?: number,
  ): Promise<void> {
    if (masterType !== DesignMasterType.METAL_CARATAGE) return;

    const sortOrder = Number(data.sortOrder ?? 0);
    // Zero represents an unconfigured legacy/empty position and may repeat.
    if (!Number.isInteger(sortOrder) || sortOrder <= 0) return;

    const qb = this.getRepository(masterType)
      .createQueryBuilder('master')
      .where('master.sortOrder = :sortOrder', { sortOrder });
    if (excludeId !== undefined) {
      qb.andWhere('master.id != :excludeId', { excludeId });
    }
    if (await qb.getExists()) {
      throw new ConflictException('Sort Order already exists.');
    }
  }

  private async assertRelatedMasterExists(masterType: DesignMasterType, id: number, field: string) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`${field} must be a valid integer ID`);
    }
    const exists = await this.getRepository(masterType).exist({ where: { id } as any });
    if (!exists) {
      throw new BadRequestException(`${field} does not reference an existing master record`);
    }
  }

  private async assertScopedMaster(
    masterType: DesignMasterType,
    id: number,
    scope: Record<string, number>,
    field: string,
  ) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException(`${field} must be a valid integer ID`);
    }
    const exists = await this.getRepository(masterType).exist({
      where: { id, ...scope } as any,
    });
    if (!exists) {
      throw new BadRequestException(`${field} does not belong to the selected metal`);
    }
  }

  private async assertUnique(
    repo: Repository<ObjectLiteral>,
    masterType: DesignMasterType,
    data: Record<string, unknown>,
    excludeId?: number,
  ) {
    const normalizedValue = this.optionalString(data.value)?.toLowerCase();
    if (!normalizedValue) {
      return;
    }
    const normalizedAlias = (this.optionalString(data.aliasName) || this.optionalString(data.value))?.toLowerCase();

    const alias = 'master';
    const qb = repo
      .createQueryBuilder(alias)
      .where(`${alias}.scopeKey = :scopeKey`, { scopeKey: this.optionalString(data.scopeKey) || '' })
      .andWhere(`${alias}.isActive = :isActive`, { isActive: true });

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      qb.andWhere(`${alias}.metalId = :metalId`, { metalId: data.metalId })
        .andWhere(`${alias}.metalColorId = :metalColorId`, { metalColorId: data.metalColorId })
        .andWhere(`${alias}.metalPurityId = :metalPurityId`, { metalPurityId: data.metalPurityId });
    } else {
      qb.andWhere(`(${alias}.normalizedValue = :normalizedValue OR ${alias}.normalizedAlias = :normalizedAlias)`, {
        normalizedValue,
        normalizedAlias,
      });

      for (const field of UNIQUE_SCOPE_FIELDS[masterType] || []) {
        if (data[field] === undefined || data[field] === null) {
          qb.andWhere(`${alias}.${field} IS NULL`);
        } else {
          qb.andWhere(`${alias}.${field} = :${field}`, { [field]: data[field] });
        }
      }
    }

    if (excludeId) {
      qb.andWhere(`${alias}.id != :excludeId`, { excludeId });
    }

    const duplicate = await qb.getExists();
    if (duplicate) {
      throw new ConflictException('Already exists/enabled save info. To enable this master, please change master info first.');
    }
  }

  private normalizeWritableValue(field: string, value: unknown) {
    if (field.endsWith('Id')) {
      return this.toOptionalInt(value);
    }
    if (field === 'sortOrder') {
      if (value === undefined || value === null || value === '') return 0;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
  }

  private applyFindOneFilter(
    qb: ReturnType<Repository<ObjectLiteral>['createQueryBuilder']>,
    alias: string,
    field: string,
    value: unknown,
  ): void {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (field.endsWith('Id')) {
      const id = this.toOptionalInt(value);
      if (id) {
        qb.andWhere(`${alias}.${field} = :${field}`, { [field]: id });
      }
      return;
    }

    const text = this.optionalString(value);
    if (text) {
      qb.andWhere(`${alias}.${field} = :${field}`, { [field]: text });
    }
  }

  private optionalString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private serialize(row: ObjectLiteral): SerializedMaster {
    const {
      jewelryGroupMaster,
      metalMaster,
      metalColorMaster,
      metalPurityMaster,
      metalCaratageMaster,
      normalizedValue: _normalizedValue,
      normalizedAlias: _normalizedAlias,
      ...plainRow
    } = row;

    return {
      ...plainRow,
      id: Number(row.id),
      value: String(row.value ?? ''),
      aliasName: typeof row.aliasName === 'string' ? row.aliasName : null,
      jewelryGroup: this.serializeJoined(jewelryGroupMaster),
      metal: this.serializeJoined(metalMaster),
      metalColor: this.serializeJoined(metalColorMaster),
      metalPurity: this.serializeJoined(metalPurityMaster),
      metalCaratage: this.serializeJoined(metalCaratageMaster),
    };
  }

  private serializeMetalLivePrice(row: ObjectLiteral) {
    return {
      id: Number(row.id),
      value: String(row.value ?? ''),
      aliasName: typeof row.aliasName === 'string' ? row.aliasName : null,
      marketPricePerOunce: row.marketPricePerOunce ?? null,
      marketPricePerGm: row.marketPricePerGm ?? null,
      livePricePerGm: row.livePricePerGm ?? null,
      updatedAt: row.updatedAt ?? null,
    };
  }

  private serializeJoined(row: unknown) {
    if (!row || typeof row !== 'object') {
      return null;
    }
    const entity = row as MasterTableEntity & Record<string, unknown>;
    return {
      id: entity.id,
      name: entity.value,
      value: entity.value,
      aliasName: typeof entity.aliasName === 'string' ? entity.aliasName : null,
      metalId: entity.metalId ?? undefined,
      metalColorId: entity.metalColorId ?? undefined,
      metalPurityId: entity.metalPurityId ?? undefined,
      jewelryGroupId: entity.jewelryGroupId ?? undefined,
      purityPercentage: entity.purityPercentage ?? undefined,
      marketPricePerOunce: entity.marketPricePerOunce ?? undefined,
      marketPricePerGm: entity.marketPricePerGm ?? undefined,
      livePricePerGm: entity.livePricePerGm ?? undefined,
      defaultWastagePercent: entity.defaultWastagePercent ?? undefined,
    };
  }

  private toOptionalInt(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { DesignMasterType } from './entities/design-master.entity';
import {
  DESIGN_MASTER_TYPE_TABLE_MAP,
  MasterTableEntity,
} from './entities/design-master-tables.entity';
import { FindMasterTableQueryDto, SaveMasterTableDto } from './dto/master-table.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

type MasterEntityTarget = EntityTarget<ObjectLiteral>;
type SerializedMaster = Record<string, unknown> & {
  id: number;
  value: string;
  aliasName: string | null;
};

const MASTER_RELATIONS: Partial<Record<DesignMasterType, string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupMaster'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupMaster'],
  [DesignMasterType.METAL_COLOR]: ['metalMaster'],
  [DesignMasterType.METAL_PURITY]: ['metalMaster'],
  [DesignMasterType.METAL_CARATAGE]: ['metalMaster', 'metalColorMaster', 'metalPurityMaster'],
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
  [DesignMasterType.LABOR_RULE]: ['laborApplyMode', 'flatCost', 'ratePerStone', 'ratePerGram', 'ratePerGroup'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupId', 'overheadApplyMode', 'ratePercent', 'flatAmount'],
  [DesignMasterType.FINDING_HEAD]: [
    'findingNo',
    'metalCaratage',
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
};

const RELATION_FIELD_TYPES: Record<string, DesignMasterType> = {
  jewelryGroupId: DesignMasterType.JEWELRY_GROUP,
  metalId: DesignMasterType.METAL_NAME,
  metalColorId: DesignMasterType.METAL_COLOR,
  metalPurityId: DesignMasterType.METAL_PURITY,
};

const UNIQUE_SCOPE_FIELDS: Partial<Record<DesignMasterType, readonly string[]>> = {
  [DesignMasterType.COLLECTION]: ['jewelryGroupId'],
  [DesignMasterType.JEWELRY_SIZE]: ['jewelryGroupId'],
  [DesignMasterType.METAL_COLOR]: ['metalId'],
  [DesignMasterType.METAL_PURITY]: ['metalId'],
  [DesignMasterType.METAL_CARATAGE]: ['metalId', 'metalColorId', 'metalPurityId'],
  [DesignMasterType.OVERHEAD_RULE]: ['jewelryGroupId'],
};

@Injectable()
export class MasterTablesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(masterType: DesignMasterType, query: FindMasterTableQueryDto) {
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
      qb.andWhere(`(${alias}.value LIKE :search OR ${alias}.aliasName LIKE :search)`, {
        search: `%${query.search.trim()}%`,
      });
    }
    if (query.jewelryGroupId) {
      qb.andWhere(`${alias}.jewelryGroupId = :jewelryGroupId`, { jewelryGroupId: query.jewelryGroupId });
    }
    if (query.metalId) {
      qb.andWhere(`${alias}.metalId = :metalId`, { metalId: query.metalId });
    }

    const rows = await qb.orderBy(`${alias}.createdAt`, 'DESC').getMany();
    return rows.map((row) => this.serialize(row));
  }

  async dropdown(masterType: DesignMasterType, query: FindMasterTableQueryDto) {
    const rows = await this.list(masterType, query);
    return rows
      .sort((a, b) => a.value.localeCompare(b.value))
      .map((row) => ({
        ...row,
        id: row.id,
        value: row.value,
        label: row.aliasName || row.value,
      }));
  }

  async get(masterType: DesignMasterType, id: number) {
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

  async create(masterType: DesignMasterType, dto: SaveMasterTableDto, requester: AuthUser) {
    const repo = this.getRepository(masterType);
    const data = this.pickWritable(masterType, dto);
    await this.validateBeforeSave(masterType, data);
    await this.assertUnique(repo, masterType, data);
    const row = repo.create(data);
    (row as any).createdBy = this.toOptionalInt(requester?.id);
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    const saved = await repo.save(row);
    return this.get(masterType, (saved as any).id);
  }

  async update(masterType: DesignMasterType, id: number, dto: Partial<SaveMasterTableDto>, requester: AuthUser) {
    const repo = this.getRepository(masterType);
    const row = await repo.findOne({ where: { id } as any });
    if (!row) {
      throw new NotFoundException('Master record not found');
    }

    const data = this.pickWritable(masterType, dto);
    const nextRow = { ...row, ...data };
    await this.validateBeforeSave(masterType, nextRow);
    await this.assertUnique(repo, masterType, nextRow, id);
    Object.assign(row, data);
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    await repo.save(row);
    return this.get(masterType, id);
  }

  async setActive(masterType: DesignMasterType, id: number, isActive: boolean, requester: AuthUser) {
    const repo = this.getRepository(masterType);
    const row = await repo.findOne({ where: { id } as any });
    if (!row) {
      throw new NotFoundException('Master record not found');
    }
    (row as any).isActive = isActive;
    (row as any).updatedBy = this.toOptionalInt(requester?.id);
    await repo.save(row);
    return this.get(masterType, id);
  }

  async exportTemplate(masterType: DesignMasterType): Promise<{ buffer: Buffer; fileName: string }> {
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
        if (existing) {
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

  private getRepository(masterType: DesignMasterType): Repository<ObjectLiteral> {
    const entity = DESIGN_MASTER_TYPE_TABLE_MAP[masterType] as MasterEntityTarget | undefined;
    if (!entity) {
      throw new BadRequestException(`Unsupported master type: ${masterType}`);
    }
    return this.dataSource.getRepository(entity);
  }

  private getImportHeaders(masterType: DesignMasterType): string[] {
    return Object.keys(this.buildTemplateRow(masterType));
  }

  private buildTemplateRow(masterType: DesignMasterType) {
    const base: Record<string, unknown> = {
      Value: '',
      Alias: '',
      Description: '',
      'Is Active': 'TRUE',
    };
    if ([DesignMasterType.COLLECTION, DesignMasterType.JEWELRY_SIZE, DesignMasterType.OVERHEAD_RULE].includes(masterType)) {
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
    output.Value = row.value;
    output.Alias = row.aliasName || '';
    output.Description = row.description || '';
    output['Is Active'] = row.isActive ? 'TRUE' : 'FALSE';
    output['Jewelry Group ID'] = row.jewelryGroupId || '';
    output['Jewelry Group'] = (row.jewelryGroup as any)?.value || '';
    output['Metal ID'] = row.metalId || '';
    output.Metal = (row.metal as any)?.value || '';
    output['Metal Color ID'] = row.metalColorId || '';
    output['Metal Color'] = (row.metalColor as any)?.value || '';
    output['Metal Purity ID'] = row.metalPurityId || '';
    output['Metal Purity'] = (row.metalPurity as any)?.value || '';
    output.Email = row.email || '';
    output['Finding No'] = row.findingNo || '';
    output['Metal Caratage'] = row.metalCaratage || '';
    output['Price In'] = row.priceIn || output['Price In'] || '';
    output['Price/Unit'] = row.pricePerUnit ?? '';
    output.Dimensions = row.dimensions || '';
    output['Weight/Unit'] = row.weightPerUnit ?? '';
    output['Purity Percentage'] = row.purityPercentage ?? '';
    output['Market Price/Ounce'] = row.marketPricePerOunce ?? '';
    output['Market Price/Gms'] = row.marketPricePerGm ?? '';
    output['Live Price/Gms'] = row.livePricePerGm ?? '';
    output['Default Wastage Percent'] = row.defaultWastagePercent ?? '';
    output['Apply Mode'] = row.laborApplyMode || '';
    output['Flat Cost'] = row.flatCost ?? '';
    output['Rate Per Stone'] = row.ratePerStone ?? '';
    output['Rate Per Gram'] = row.ratePerGram ?? '';
    output['Rate Per Group'] = row.ratePerGroup ?? '';
    output['Overhead Apply Mode'] = row.overheadApplyMode || output['Overhead Apply Mode'] || '';
    output['Rate Percent'] = row.ratePercent ?? '';
    output['Flat Amount'] = row.flatAmount ?? '';
    return output;
  }

  private fromImportRow(masterType: DesignMasterType, row: Record<string, unknown>): Partial<SaveMasterTableDto> {
    const payload: Record<string, unknown> = {
      value: this.readCell(row, 'Value'),
      aliasName: this.readCell(row, 'Alias') || this.readCell(row, 'Value'),
      description: this.readCell(row, 'Description') || null,
    };
    payload.jewelryGroupId = this.toOptionalInt(this.readCell(row, 'Jewelry Group ID'));
    payload.metalId = this.toOptionalInt(this.readCell(row, 'Metal ID'));
    payload.metalColorId = this.toOptionalInt(this.readCell(row, 'Metal Color ID'));
    payload.metalPurityId = this.toOptionalInt(this.readCell(row, 'Metal Purity ID'));
    payload.email = this.readCell(row, 'Email') || null;
    payload.findingNo = this.readCell(row, 'Finding No') || null;
    payload.metalCaratage = this.readCell(row, 'Metal Caratage') || null;
    payload.priceIn = this.readCell(row, 'Price In') || undefined;
    payload.pricePerUnit = this.toOptionalNumber(this.readCell(row, 'Price/Unit'));
    payload.dimensions = this.readCell(row, 'Dimensions') || null;
    payload.weightPerUnit = this.toOptionalNumber(this.readCell(row, 'Weight/Unit'));
    payload.purityPercentage = this.toOptionalNumber(this.readCell(row, 'Purity Percentage'));
    payload.marketPricePerOunce = this.toOptionalNumber(this.readCell(row, 'Market Price/Ounce'));
    payload.marketPricePerGm = this.toOptionalNumber(this.readCell(row, 'Market Price/Gms'));
    payload.livePricePerGm = this.toOptionalNumber(this.readCell(row, 'Live Price/Gms'));
    payload.defaultWastagePercent = this.toOptionalNumber(this.readCell(row, 'Default Wastage Percent'));
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
      .where(`(${alias}.normalizedValue = :normalizedValue OR ${alias}.normalizedAlias = :normalizedAlias)`, {
        normalizedValue,
        normalizedAlias,
      })
      .andWhere(`${alias}.scopeKey = :scopeKey`, { scopeKey: this.optionalString(data.scopeKey) || '' });

    for (const field of UNIQUE_SCOPE_FIELDS[masterType] || []) {
      if (data[field] === undefined || data[field] === null) {
        qb.andWhere(`${alias}.${field} IS NULL`);
      } else {
        qb.andWhere(`${alias}.${field} = :${field}`, { [field]: data[field] });
      }
    }

    if (excludeId) {
      qb.andWhere(`${alias}.id != :excludeId`, { excludeId });
    }

    const duplicate = await qb.getExists();
    if (duplicate) {
      throw new ConflictException('Master record already exists');
    }
  }

  private normalizeWritableValue(field: string, value: unknown) {
    if (field.endsWith('Id')) {
      return this.toOptionalInt(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
    return value;
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

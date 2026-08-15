  async findMasters(query: FindDesignMastersQueryDto): Promise<any> {
    const status = query.status || (query.type ? 'ALL' : 'ACTIVE');

    if (query.type) {
      const rows = await this.masterTablesService.list(query.type as unknown as DesignMasterType, {
        search: query.search,
        status,
      });
      return { data: rows.map((row) => this.serializeMasterTableCompatRow(row)), total: rows.length };
    }

    const grouped = {
      jewelryGroups: [] as Array<{ id: string; value: string }>,
      collections: [] as Array<{ id: string; value: string; jewelryGroupId?: string; jewelryGroup?: string }>,
      jewelrySizes: [] as Array<{
        id: string;
        value: string;
        jewelryGroupId?: string;
        jewelryGroup?: string;
      }>,
      tags: [] as Array<{ id: string; value: string }>,
      designStatuses: [] as Array<{ id: string; value: string }>,
      stages: [] as Array<{ id: string; value: string }>,
      metalNames: [] as Array<{
        id: string;
        value: string;
        marketPricePerOunce?: number;
        marketPricePerGm?: number;
        livePricePerGm?: number;
      }>,
      metalColors: [] as Array<{ id: string; value: string; metalName?: string }>,
      metalPurities: [] as Array<{
        id: string;
        value: string;
        metalName?: string;
        purityPercentage?: number;
      }>,
      metalCaratages: [] as Array<{
        id: string;
        value: string;
        metalName?: string;
        metalColor?: string;
        metalPurity?: string;
        purityPercentage?: number;
        defaultWastagePercent?: number;
        livePricePerGm?: number;
      }>,
      goldColours: [] as Array<{ id: string; value: string; wastagePercent?: number }>,
      diamondTypes: [] as Array<{ id: string; value: string }>,
      diamondSpreads: [] as Array<{ id: string; value: string }>,
      diamondWeights: [] as Array<{ id: string; value: string }>,
      diamondQualities: [] as Array<{ id: string; value: string }>,
      vendorNames: [] as Array<{ id: string; value: string }>,
      laborHeads: [] as Array<{ id: string; value: string }>,
      laborRules: [] as Array<{
        id: string;
        value: string;
        jewelryGroupId?: string;
        jewelryGroup?: string;
        laborApplyMode?: LaborApplyMode;
        flatCost?: number;
        ratePerStone?: number;
        ratePerGram?: number;
        ratePerGroup?: number;
      }>,
      overheadRules: [] as Array<{
        id: string;
        value: string;
        jewelryGroupId?: string;
        jewelryGroup?: string;
        overheadApplyMode?: OverheadApplyMode;
        ratePercent?: number;
        flatAmount?: number;
      }>,
      findingHeads: [] as Array<{ id: string; value: string }>,
      packetStones: [] as Array<{ id: string; value: string }>,
      packetShapes: [] as Array<{ id: string; value: string }>,
      packetSizes: [] as Array<{ id: string; value: string }>,
      packetCuts: [] as Array<{ id: string; value: string }>,
      packetColors: [] as Array<{ id: string; value: string }>,
      packetQualities: [] as Array<{ id: string; value: string }>,
    };

    const groupedMasterTypes: Array<[DesignMasterType, keyof typeof grouped]> = [
      [DesignMasterType.JEWELRY_GROUP, 'jewelryGroups'],
      [DesignMasterType.COLLECTION, 'collections'],
      [DesignMasterType.JEWELRY_SIZE, 'jewelrySizes'],
      [DesignMasterType.TAG, 'tags'],
      [DesignMasterType.DESIGN_STATUS, 'designStatuses'],
      [DesignMasterType.STAGE, 'stages'],
      [DesignMasterType.METAL_NAME, 'metalNames'],
      [DesignMasterType.METAL_COLOR, 'metalColors'],
      [DesignMasterType.METAL_PURITY, 'metalPurities'],
      [DesignMasterType.METAL_CARATAGE, 'metalCaratages'],
      [DesignMasterType.GOLD_COLOUR, 'goldColours'],
      [DesignMasterType.DIAMOND_TYPE, 'diamondTypes'],
      [DesignMasterType.DIAMOND_SPREAD, 'diamondSpreads'],
      [DesignMasterType.DIAMOND_WEIGHT, 'diamondWeights'],
      [DesignMasterType.DIAMOND_QUALITY, 'diamondQualities'],
      [DesignMasterType.VENDOR_NAME, 'vendorNames'],
      [DesignMasterType.LABOR_HEAD, 'laborHeads'],
      [DesignMasterType.LABOR_RULE, 'laborRules'],
      [DesignMasterType.OVERHEAD_RULE, 'overheadRules'],
      [DesignMasterType.FINDING_HEAD, 'findingHeads'],
      [DesignMasterType.PACKET_STONE, 'packetStones'],
      [DesignMasterType.PACKET_SHAPE, 'packetShapes'],
      [DesignMasterType.PACKET_SIZE, 'packetSizes'],
      [DesignMasterType.PACKET_CUT, 'packetCuts'],
      [DesignMasterType.PACKET_COLOR, 'packetColors'],
      [DesignMasterType.PACKET_QUALITY, 'packetQualities'],
    ];

    for (const [masterType, key] of groupedMasterTypes) {
      const rows = await this.masterTablesService.list(masterType, { status });
      (grouped[key] as any[]).push(...rows.map((row) => this.serializeMasterTableCompatRow(row)));
      (grouped[key] as any[]).sort((a, b) => String(a.value || '').localeCompare(String(b.value || '')));
    }

    return grouped;
  }


  async exportMasterTemplate(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    return this.masterTablesService.exportTemplate(type);
  }


    async exportMasters(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    return this.masterTablesService.exportRows(type, {
      search: query.search,
      status: query.status || 'ALL',
    });
  }

  private async exportLegacyMasters(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    const result = await this.findMasters({
      ...query,
      status: query.status || 'ALL',
    });
    const rows = (result.data || []).map((master: DesignMaster) => this.toMasterExportRow(master, type));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Masters');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${type.toLowerCase()}-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importMasters(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    query: FindDesignMastersQueryDto,
    requester: AuthUser,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.assertDesignWriteAccess(requester);
    const type = this.requireMasterType(query);
    return this.masterTablesService.importRows(type, file, requester);
  }

  private async importLegacyMasters(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    query: FindDesignMastersQueryDto,
    requester: AuthUser,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.assertDesignWriteAccess(requester);
    const type = this.requireMasterType(query);
    const rows = this.readExcelRows(file);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;
      try {
        const payload = await this.buildMasterImportPayload(
          type,
          this.normalizeMasterImportRow(rows[index]),
          line,
        );
        const existing = await this.findExistingMasterForImport(type, payload);
        let saved: DesignMaster;
        if (existing) {
          saved = await this.updateMaster(existing.id, payload, requester);
          updated += 1;
        } else {
          saved = await this.createMaster(
            {
              masterType: type,
              value: payload.value || '',
              aliasName: payload.aliasName,
              jewelryGroupId: payload.jewelryGroupId,
              description: payload.description,
              findingNo: payload.findingNo,
              metalCaratage: payload.metalCaratage,
              priceIn: payload.priceIn,
              pricePerUnit: payload.pricePerUnit,
              dimensions: payload.dimensions,
              weightPerUnit: payload.weightPerUnit,
              metalName: payload.metalName,
              metalColor: payload.metalColor,
              metalPurity: payload.metalPurity,
              purityPercentage: payload.purityPercentage,
              marketPricePerOunce: payload.marketPricePerOunce,
              marketPricePerGm: payload.marketPricePerGm,
              livePricePerGm: payload.livePricePerGm,
              defaultWastagePercent: payload.defaultWastagePercent,
              laborApplyMode: payload.laborApplyMode,
              flatCost: payload.flatCost,
              ratePerStone: payload.ratePerStone,
              ratePerGram: payload.ratePerGram,
              ratePerGroup: payload.ratePerGroup,
              overheadApplyMode: payload.overheadApplyMode,
              ratePercent: payload.ratePercent,
              flatAmount: payload.flatAmount,
            },
            requester,
          );
          created += 1;
        }

        const isActive = this.parseImportStatus(this.normalizeMasterImportRow(rows[index]).isActive);
        if (saved.isActive !== isActive) {
          await this.updateMasterStatus(saved.id, isActive, requester);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

    async createMaster(dto: CreateDesignMasterDto, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const masterType = dto.masterType as unknown as DesignMasterType;
    const payload = await this.toMasterTablePayload(dto);
    return this.masterTablesService.create(masterType, payload as any, requester) as unknown as Promise<DesignMaster>;
  }

  private async createLegacyMaster(dto: CreateDesignMasterDto, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const value = this.normalizeMasterValue(dto.value);
    const aliasName = this.normalizeMasterAlias(dto.aliasName, value);
    const description = this.optionalText(dto.description);
    const masterType = dto.masterType as unknown as DesignMasterType;
    const vendorEmail = this.normalizeVendorEmail(masterType, dto.vendorEmail);
    const normalizedValue = value.toLowerCase();
    const normalizedAlias = aliasName.toLowerCase();
    const findingFields =
      masterType === DesignMasterType.FINDING_HEAD
        ? this.normalizeFindingMasterFields({
            findingNo: dto.findingNo,
            metalCaratage: dto.metalCaratage,
            priceIn: dto.priceIn as FindingPriceIn | undefined,
            pricePerUnit: dto.pricePerUnit,
            dimensions: dto.dimensions,
            weightPerUnit: dto.weightPerUnit,
          })
        : this.emptyFindingMasterFields();
    const metalFields = await this.normalizeMetalMasterFields(
      masterType,
      {
        metalName: dto.metalName,
        metalColor: dto.metalColor,
        metalPurity: dto.metalPurity,
        purityPercentage: dto.purityPercentage,
        marketPricePerOunce: dto.marketPricePerOunce,
        marketPricePerGm: dto.marketPricePerGm,
        livePricePerGm: dto.livePricePerGm,
        defaultWastagePercent: dto.defaultWastagePercent,
      },
      undefined,
    );
    const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
      masterType,
      {
        jewelryGroupId: dto.jewelryGroupId,
      },
      undefined,
    );
    const laborRuleFields = this.normalizeLaborRuleFields(
      masterType,
      {
        laborApplyMode: dto.laborApplyMode,
        flatCost: dto.flatCost,
        ratePerStone: dto.ratePerStone,
        ratePerGram: dto.ratePerGram,
        ratePerGroup: dto.ratePerGroup,
      },
      undefined,
    );
    const overheadRuleFields = this.normalizeOverheadRuleFields(
      masterType,
      {
        overheadApplyMode: dto.overheadApplyMode,
        ratePercent: dto.ratePercent,
        flatAmount: dto.flatAmount,
      },
      undefined,
    );
    const defaultWastagePercent =
      masterType === DesignMasterType.GOLD_COLOUR
        ? this.optionalNonNegativeNumber(dto.pricePerUnit, 'pricePerUnit')
        : null;
    const masterPricePerUnit =
      masterType === DesignMasterType.FINDING_HEAD
        ? findingFields.pricePerUnit
        : masterType === DesignMasterType.METAL_CARATAGE
          ? metalFields.defaultWastagePercent
        : masterType === DesignMasterType.GOLD_COLOUR
          ? defaultWastagePercent
          : null;

    const matches = await this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType })
      .andWhere('master.scopeKey = :scopeKey', { scopeKey: jewelrySizeFields.scopeKey })
      .andWhere(
        new Brackets((where) => {
          where
            .where('master.normalizedValue = :normalizedValue', { normalizedValue })
            .orWhere('master.normalizedAlias = :normalizedAlias', { normalizedAlias });
          if (findingFields.normalizedFindingNo) {
            where.orWhere('LOWER(master.finding_no) = :normalizedFindingNo', {
              normalizedFindingNo: findingFields.normalizedFindingNo,
            });
          }
        }),
      )
      .getMany();

    const valueMatch = matches.find((master) => master.normalizedValue === normalizedValue);
    if (valueMatch) {
      if (!valueMatch.isActive) {
        valueMatch.value = value;
        valueMatch.aliasName = aliasName;
        valueMatch.normalizedAlias = normalizedAlias;
        valueMatch.description = description;
        valueMatch.vendorEmail = vendorEmail;
        valueMatch.findingNo = findingFields.findingNo;
        valueMatch.metalCaratage = findingFields.metalCaratage;
        valueMatch.scopeKey = jewelrySizeFields.scopeKey;
        valueMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
        valueMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
        valueMatch.priceIn = findingFields.priceIn;
        valueMatch.pricePerUnit = masterPricePerUnit;
        valueMatch.dimensions = findingFields.dimensions;
        valueMatch.weightPerUnit = findingFields.weightPerUnit;
        valueMatch.metalName = metalFields.metalName;
        valueMatch.metalColor = metalFields.metalColor;
        valueMatch.metalPurity = metalFields.metalPurity;
        valueMatch.purityPercentage = metalFields.purityPercentage;
        valueMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
        valueMatch.marketPricePerGm = metalFields.marketPricePerGm;
        valueMatch.livePricePerGm = metalFields.livePricePerGm;
        valueMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
        valueMatch.laborApplyMode = laborRuleFields.laborApplyMode;
        valueMatch.flatCost = laborRuleFields.flatCost;
        valueMatch.ratePerStone = laborRuleFields.ratePerStone;
        valueMatch.ratePerGram = laborRuleFields.ratePerGram;
        valueMatch.ratePerGroup = laborRuleFields.ratePerGroup;
        valueMatch.overheadApplyMode = overheadRuleFields.overheadApplyMode;
        valueMatch.ratePercent = overheadRuleFields.ratePercent;
        valueMatch.flatAmount = overheadRuleFields.flatAmount;
        valueMatch.isActive = true;
        valueMatch.updatedBy = requester.id;
        await this.assertNoDuplicateOverheadRule(
          masterType,
          jewelrySizeFields.scopeKey,
          overheadRuleFields,
          valueMatch.id,
        );
        return this.designMasterRepo.save(valueMatch);
      }
      throw new BadRequestException('Master value already exists for selected type');
    }

    const aliasMatch = matches.find((master) => master.normalizedAlias === normalizedAlias);
    if (aliasMatch) {
      if (!aliasMatch.isActive) {
        aliasMatch.value = value;
        aliasMatch.normalizedValue = normalizedValue;
        aliasMatch.aliasName = aliasName;
        aliasMatch.description = description;
        aliasMatch.vendorEmail = vendorEmail;
        aliasMatch.findingNo = findingFields.findingNo;
        aliasMatch.metalCaratage = findingFields.metalCaratage;
        aliasMatch.scopeKey = jewelrySizeFields.scopeKey;
        aliasMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
        aliasMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
        aliasMatch.priceIn = findingFields.priceIn;
        aliasMatch.pricePerUnit = masterPricePerUnit;
        aliasMatch.dimensions = findingFields.dimensions;
        aliasMatch.weightPerUnit = findingFields.weightPerUnit;
        aliasMatch.metalName = metalFields.metalName;
        aliasMatch.metalColor = metalFields.metalColor;
        aliasMatch.metalPurity = metalFields.metalPurity;
        aliasMatch.purityPercentage = metalFields.purityPercentage;
        aliasMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
        aliasMatch.marketPricePerGm = metalFields.marketPricePerGm;
        aliasMatch.livePricePerGm = metalFields.livePricePerGm;
        aliasMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
        aliasMatch.laborApplyMode = laborRuleFields.laborApplyMode;
        aliasMatch.flatCost = laborRuleFields.flatCost;
        aliasMatch.ratePerStone = laborRuleFields.ratePerStone;
        aliasMatch.ratePerGram = laborRuleFields.ratePerGram;
        aliasMatch.ratePerGroup = laborRuleFields.ratePerGroup;
        aliasMatch.overheadApplyMode = overheadRuleFields.overheadApplyMode;
        aliasMatch.ratePercent = overheadRuleFields.ratePercent;
        aliasMatch.flatAmount = overheadRuleFields.flatAmount;
        aliasMatch.isActive = true;
        aliasMatch.updatedBy = requester.id;
        await this.assertNoDuplicateOverheadRule(
          masterType,
          jewelrySizeFields.scopeKey,
          overheadRuleFields,
          aliasMatch.id,
        );
        return this.designMasterRepo.save(aliasMatch);
      }
      throw new BadRequestException('Master alias already exists for selected type');
    }

    if (findingFields.normalizedFindingNo) {
      const findingNoMatch = matches.find(
        (master) => (master.findingNo || '').toLowerCase() === findingFields.normalizedFindingNo,
      );
      if (findingNoMatch) {
        if (!findingNoMatch.isActive) {
          findingNoMatch.value = value;
          findingNoMatch.normalizedValue = normalizedValue;
          findingNoMatch.aliasName = aliasName;
          findingNoMatch.normalizedAlias = normalizedAlias;
          findingNoMatch.description = description;
          findingNoMatch.vendorEmail = vendorEmail;
          findingNoMatch.findingNo = findingFields.findingNo;
          findingNoMatch.metalCaratage = findingFields.metalCaratage;
          findingNoMatch.scopeKey = jewelrySizeFields.scopeKey;
          findingNoMatch.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
          findingNoMatch.jewelryGroup = jewelrySizeFields.jewelryGroup;
          findingNoMatch.priceIn = findingFields.priceIn;
          findingNoMatch.pricePerUnit = masterPricePerUnit;
          findingNoMatch.dimensions = findingFields.dimensions;
          findingNoMatch.weightPerUnit = findingFields.weightPerUnit;
          findingNoMatch.metalName = metalFields.metalName;
          findingNoMatch.metalColor = metalFields.metalColor;
          findingNoMatch.metalPurity = metalFields.metalPurity;
          findingNoMatch.purityPercentage = metalFields.purityPercentage;
          findingNoMatch.marketPricePerOunce = metalFields.marketPricePerOunce;
          findingNoMatch.marketPricePerGm = metalFields.marketPricePerGm;
          findingNoMatch.livePricePerGm = metalFields.livePricePerGm;
          findingNoMatch.defaultWastagePercent = metalFields.defaultWastagePercent;
          findingNoMatch.laborApplyMode = laborRuleFields.laborApplyMode;
          findingNoMatch.flatCost = laborRuleFields.flatCost;
          findingNoMatch.ratePerStone = laborRuleFields.ratePerStone;
          findingNoMatch.ratePerGram = laborRuleFields.ratePerGram;
          findingNoMatch.ratePerGroup = laborRuleFields.ratePerGroup;
          findingNoMatch.overheadApplyMode = overheadRuleFields.overheadApplyMode;
          findingNoMatch.ratePercent = overheadRuleFields.ratePercent;
          findingNoMatch.flatAmount = overheadRuleFields.flatAmount;
          findingNoMatch.isActive = true;
          findingNoMatch.updatedBy = requester.id;
          await this.assertNoDuplicateOverheadRule(
            masterType,
            jewelrySizeFields.scopeKey,
            overheadRuleFields,
            findingNoMatch.id,
          );
          return this.designMasterRepo.save(findingNoMatch);
        }
        throw new BadRequestException('Finding number already exists');
      }
    }

    await this.assertNoDuplicateOverheadRule(
      masterType,
      jewelrySizeFields.scopeKey,
      overheadRuleFields,
    );

    const created = this.designMasterRepo.create({
      masterType,
      value,
      normalizedValue,
      aliasName,
      normalizedAlias,
      scopeKey: jewelrySizeFields.scopeKey,
      jewelryGroupId: jewelrySizeFields.jewelryGroupId,
      jewelryGroup: jewelrySizeFields.jewelryGroup,
      description,
      vendorEmail,
      findingNo: findingFields.findingNo,
      metalCaratage: findingFields.metalCaratage,
      priceIn: findingFields.priceIn,
      pricePerUnit: masterPricePerUnit,
      dimensions: findingFields.dimensions,
      weightPerUnit: findingFields.weightPerUnit,
      metalName: metalFields.metalName,
      metalColor: metalFields.metalColor,
      metalPurity: metalFields.metalPurity,
      purityPercentage: metalFields.purityPercentage,
      marketPricePerOunce: metalFields.marketPricePerOunce,
      marketPricePerGm: metalFields.marketPricePerGm,
      livePricePerGm: metalFields.livePricePerGm,
      defaultWastagePercent: metalFields.defaultWastagePercent,
      laborApplyMode: laborRuleFields.laborApplyMode,
      flatCost: laborRuleFields.flatCost,
      ratePerStone: laborRuleFields.ratePerStone,
      ratePerGram: laborRuleFields.ratePerGram,
      ratePerGroup: laborRuleFields.ratePerGroup,
      overheadApplyMode: overheadRuleFields.overheadApplyMode,
      ratePercent: overheadRuleFields.ratePercent,
      flatAmount: overheadRuleFields.flatAmount,
      isActive: true,
      createdBy: requester.id,
      updatedBy: requester.id,
    });

    return this.designMasterRepo.save(created);
  }

    async updateMaster(id: string, dto: UpdateDesignMasterDto, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const master = await this.designMasterRepo.findOne({ where: { id } });
    if (!master) {
      throw new NotFoundException('Master value not found');
    }
    const previousMetalCaratageValue =
      master.masterType === DesignMasterType.METAL_CARATAGE ? master.value : null;
    const previousMetalCaratageRate =
      master.masterType === DesignMasterType.METAL_CARATAGE
        ? this.toNumber(master.livePricePerGm)
        : null;

    const value = dto.value !== undefined ? this.normalizeMasterValue(dto.value) : master.value;
    const normalizedValue = value.toLowerCase();
    const aliasName = this.normalizeMasterAlias(
      dto.aliasName !== undefined ? dto.aliasName : master.aliasName,
      value,
    );
    const normalizedAlias = aliasName.toLowerCase();
    const description =
      dto.description !== undefined ? this.optionalText(dto.description) : master.description;
    const vendorEmail =
      dto.vendorEmail !== undefined
        ? this.normalizeVendorEmail(master.masterType, dto.vendorEmail)
        : master.vendorEmail;
    const findingFields =
      master.masterType === DesignMasterType.FINDING_HEAD
        ? this.normalizeFindingMasterFields({
            findingNo: dto.findingNo !== undefined ? dto.findingNo : master.findingNo,
            metalCaratage:
              dto.metalCaratage !== undefined ? dto.metalCaratage : master.metalCaratage,
            priceIn: (dto.priceIn !== undefined ? dto.priceIn : master.priceIn) as
              | FindingPriceIn
              | undefined
              | null,
            pricePerUnit:
              dto.pricePerUnit !== undefined ? dto.pricePerUnit : master.pricePerUnit,
            dimensions: dto.dimensions !== undefined ? dto.dimensions : master.dimensions,
            weightPerUnit:
              dto.weightPerUnit !== undefined ? dto.weightPerUnit : master.weightPerUnit,
          })
        : this.emptyFindingMasterFields();
    const metalFields = await this.normalizeMetalMasterFields(
      master.masterType,
      {
        metalName: dto.metalName,
        metalColor: dto.metalColor,
        metalPurity: dto.metalPurity,
        purityPercentage: dto.purityPercentage,
        marketPricePerOunce: dto.marketPricePerOunce,
        marketPricePerGm: dto.marketPricePerGm,
        livePricePerGm: dto.livePricePerGm,
        defaultWastagePercent: dto.defaultWastagePercent,
      },
      master,
    );
    const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
      master.masterType,
      {
        jewelryGroupId: dto.jewelryGroupId,
      },
      master,
    );
    const laborRuleFields = this.normalizeLaborRuleFields(
      master.masterType,
      {
        laborApplyMode: dto.laborApplyMode,
        flatCost: dto.flatCost,
        ratePerStone: dto.ratePerStone,
        ratePerGram: dto.ratePerGram,
        ratePerGroup: dto.ratePerGroup,
      },
      master,
    );
    const overheadRuleFields = this.normalizeOverheadRuleFields(
      master.masterType,
      {
        overheadApplyMode: dto.overheadApplyMode,
        ratePercent: dto.ratePercent,
        flatAmount: dto.flatAmount,
      },
      master,
    );
    const defaultWastagePercent =
      master.masterType === DesignMasterType.GOLD_COLOUR
        ? this.optionalNonNegativeNumber(
            dto.pricePerUnit !== undefined ? dto.pricePerUnit : master.pricePerUnit,
            'pricePerUnit',
          )
        : null;
    const masterPricePerUnit =
      master.masterType === DesignMasterType.FINDING_HEAD
        ? findingFields.pricePerUnit
        : master.masterType === DesignMasterType.METAL_CARATAGE
          ? metalFields.defaultWastagePercent
        : master.masterType === DesignMasterType.GOLD_COLOUR
          ? defaultWastagePercent
          : null;

    const duplicates = await this.designMasterRepo
      .createQueryBuilder('duplicate')
      .where('duplicate.masterType = :masterType', { masterType: master.masterType })
      .andWhere('duplicate.scopeKey = :scopeKey', { scopeKey: jewelrySizeFields.scopeKey })
      .andWhere('duplicate.id != :id', { id: master.id })
      .andWhere(
        new Brackets((where) => {
          where
            .where('duplicate.normalizedValue = :normalizedValue', { normalizedValue })
            .orWhere('duplicate.normalizedAlias = :normalizedAlias', { normalizedAlias });
          if (findingFields.normalizedFindingNo) {
            where.orWhere('LOWER(duplicate.finding_no) = :normalizedFindingNo', {
              normalizedFindingNo: findingFields.normalizedFindingNo,
            });
          }
        }),
      )
      .getMany();

    if (duplicates.some((duplicate) => duplicate.normalizedValue === normalizedValue)) {
      throw new BadRequestException('Master value already exists for selected type');
    }
    if (duplicates.some((duplicate) => duplicate.normalizedAlias === normalizedAlias)) {
      throw new BadRequestException('Master alias already exists for selected type');
    }
    if (
      findingFields.normalizedFindingNo &&
      duplicates.some(
        (duplicate) => (duplicate.findingNo || '').toLowerCase() === findingFields.normalizedFindingNo,
      )
    ) {
      throw new BadRequestException('Finding number already exists');
    }

    await this.assertNoDuplicateOverheadRule(
      master.masterType,
      jewelrySizeFields.scopeKey,
      overheadRuleFields,
      master.id,
    );

    master.value = value;
    master.normalizedValue = normalizedValue;
    master.aliasName = aliasName;
    master.normalizedAlias = normalizedAlias;
    master.scopeKey = jewelrySizeFields.scopeKey;
    master.jewelryGroupId = jewelrySizeFields.jewelryGroupId;
    master.jewelryGroup = jewelrySizeFields.jewelryGroup;
    master.description = description;
    master.vendorEmail = vendorEmail;
    master.findingNo = findingFields.findingNo;
    master.metalCaratage = findingFields.metalCaratage;
    master.priceIn = findingFields.priceIn;
    master.pricePerUnit = masterPricePerUnit;
    master.dimensions = findingFields.dimensions;
    master.weightPerUnit = findingFields.weightPerUnit;
    master.metalName = metalFields.metalName;
    master.metalColor = metalFields.metalColor;
    master.metalPurity = metalFields.metalPurity;
    master.purityPercentage = metalFields.purityPercentage;
    master.marketPricePerOunce = metalFields.marketPricePerOunce;
    master.marketPricePerGm = metalFields.marketPricePerGm;
    master.livePricePerGm = metalFields.livePricePerGm;
    master.defaultWastagePercent = metalFields.defaultWastagePercent;
    master.laborApplyMode = laborRuleFields.laborApplyMode;
    master.flatCost = laborRuleFields.flatCost;
    master.ratePerStone = laborRuleFields.ratePerStone;
    master.ratePerGram = laborRuleFields.ratePerGram;
    master.ratePerGroup = laborRuleFields.ratePerGroup;
    master.overheadApplyMode = overheadRuleFields.overheadApplyMode;
    master.ratePercent = overheadRuleFields.ratePercent;
    master.flatAmount = overheadRuleFields.flatAmount;
    master.updatedBy = requester.id;

    const savedMaster = await this.designMasterRepo.save(master);

    if (savedMaster.masterType === DesignMasterType.METAL_NAME) {
      await this.safeSaveMetalPriceHistory(savedMaster, requester.id);
      this.scheduleMetalNameDependentsSync(savedMaster, requester.id);
    } else if (savedMaster.masterType === DesignMasterType.METAL_CARATAGE) {
      const nextMetalCaratageRate = this.toNumber(savedMaster.livePricePerGm);
      if (previousMetalCaratageRate !== nextMetalCaratageRate) {
        void this.recalculateDesignsForDependencies({
          metalCaratages: Array.from(
            new Set([previousMetalCaratageValue, savedMaster.value].filter(Boolean) as string[]),
          ),
        }).catch((error) => {
          console.error('Failed to recalculate designs for metal caratage update', error);
        });
      }
    }

    return savedMaster;
  }

  async updateMasterStatus(id: string, isActive: boolean, requester: AuthUser): Promise<DesignMaster> {
    this.assertDesignWriteAccess(requester);
    const master = await this.designMasterRepo.findOne({ where: { id } });
    if (!master) {
      throw new NotFoundException('Master value not found');
    }

    master.isActive = isActive;
    master.updatedBy = requester.id;
    return this.designMasterRepo.save(master);
  }


    async getMetalPriceHistory(masterId: string): Promise<any[]> {
    const history = await this.metalPriceHistoryRepo.find({
      where: { masterId },
      relations: ['changedByUser'],
      order: { createdAt: 'DESC' },
    });

    return history.map((entry) => ({
      id: entry.id,
      marketPricePerOunce: this.toNumber(entry.marketPricePerOunce),
      marketPricePerGm: this.toNumber(entry.marketPricePerGm),
      livePricePerGm: this.toNumber(entry.livePricePerGm),
      createdAt: entry.createdAt,
      changedBy: entry.changedByUser
        ? `${entry.changedByUser.firstName || ''} ${entry.changedByUser.lastName || ''}`.trim() || entry.changedByUser.email
        : 'System',
    }));
  }




    async createPacket(dto: CreateStonePacketDto, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packetName = this.normalizePacketName(dto.packetName);
    const existing = await this.packetRepo.findOne({ where: { packetName } });
    const pieces = this.resolvePacketPieces(dto.pieces, 1);
    const weightPerPc = this.resolvePacketWeightPerPc({
      weightPerPc: dto.weightPerPc,
      weight: dto.weight,
      pieces,
    });
    const totalWeight = this.roundTo3(weightPerPc * pieces);
    const priceIn = this.normalizePacketPriceIn(dto.priceIn);
    const sellingPrice = this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice');
    const weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);
    const barcode = await this.resolveStonePacketBarcode(dto.barcode);

    if (existing) {
      if (!existing.isActive) {
        existing.barcode = barcode;
        existing.stockType = this.optionalText(dto.stockType) || existing.stockType || 'COMPLETED';
        existing.stoneId = this.optionalInt(dto.stoneId);
        existing.shapeId = this.optionalInt(dto.shapeId);
        existing.sizeId = this.optionalInt(dto.sizeId);
        existing.cutId = this.optionalInt(dto.cutId);
        existing.colorId = this.optionalInt(dto.colorId);
        existing.qualityId = this.optionalInt(dto.qualityId);
        existing.priceIn = priceIn;
        existing.sellingPrice = sellingPrice;
        existing.weightPerPc = this.roundTo3(weightPerPc);
        existing.pieces = pieces;
        existing.weight = totalWeight;
        existing.weightUnit = weightUnit;
        existing.isActive = true;
        return this.packetRepo.save(existing);
      }
      throw new BadRequestException('Packet name already exists');
    }

    const packet = this.packetRepo.create({
      barcode,
      packetName,
      stockType: this.optionalText(dto.stockType) || 'COMPLETED',
      stoneId: this.optionalInt(dto.stoneId),
      shapeId: this.optionalInt(dto.shapeId),
      sizeId: this.optionalInt(dto.sizeId),
      cutId: this.optionalInt(dto.cutId),
      colorId: this.optionalInt(dto.colorId),
      qualityId: this.optionalInt(dto.qualityId),
      priceIn,
      sellingPrice,
      weightPerPc: this.roundTo3(weightPerPc),
      pieces,
      weight: totalWeight,
      weightUnit,
      isActive: true,
    });

    return this.packetRepo.save(packet);
  }

  async updatePacket(id: string | number, dto: UpdateStonePacketDto, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packetId = this.requiredPacketId(id);
    const packet = await this.packetRepo.findOne({ where: { id: packetId } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }

    if (dto.packetName !== undefined) {
      const nextPacketName = this.normalizePacketName(dto.packetName);
      if (nextPacketName !== packet.packetName) {
        const duplicate = await this.packetRepo.findOne({ where: { packetName: nextPacketName } });
        if (duplicate && duplicate.id !== packet.id) {
          throw new BadRequestException('Packet name already exists');
        }
      }
      packet.packetName = nextPacketName;
    }

    if (dto.barcode !== undefined) {
      packet.barcode = await this.resolveStonePacketBarcode(dto.barcode, packet.id);
    }

    const nextPieces = this.resolvePacketPieces(
      dto.pieces !== undefined ? dto.pieces : packet.pieces,
      packet.pieces || 1,
    );

    if (dto.stockType !== undefined) packet.stockType = this.optionalText(dto.stockType);
    if (dto.stoneId !== undefined) packet.stoneId = this.optionalInt(dto.stoneId);
    if (dto.shapeId !== undefined) packet.shapeId = this.optionalInt(dto.shapeId);
    if (dto.sizeId !== undefined) packet.sizeId = this.optionalInt(dto.sizeId);
    if (dto.cutId !== undefined) packet.cutId = this.optionalInt(dto.cutId);
    if (dto.colorId !== undefined) packet.colorId = this.optionalInt(dto.colorId);
    if (dto.qualityId !== undefined) packet.qualityId = this.optionalInt(dto.qualityId);
    if (dto.priceIn !== undefined) packet.priceIn = this.normalizePacketPriceIn(dto.priceIn);
    if (dto.sellingPrice !== undefined) {
      packet.sellingPrice = this.optionalNonNegativeNumber(dto.sellingPrice, 'sellingPrice');
    }

    const shouldRecalculateWeight =
      dto.weight !== undefined || dto.weightPerPc !== undefined || dto.pieces !== undefined;
    if (shouldRecalculateWeight) {
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
    if (dto.weightUnit !== undefined) packet.weightUnit = this.normalizePacketWeightUnit(dto.weightUnit);

    if (this.toNumber(packet.weightPerPc) <= 0) {
      throw new BadRequestException('Stone packet weight per pc must be greater than 0');
    }

    const savedPacket = await this.packetRepo.save(packet);
    await this.recalculateDesignsForDependencies({ packetIds: [savedPacket.id] });
    return savedPacket;
  }

  async updatePacketStatus(id: string | number, isActive: boolean, requester: AuthUser): Promise<StonePacket> {
    this.assertDesignWriteAccess(requester);
    const packetId = this.requiredPacketId(id);
    const packet = await this.packetRepo.findOne({ where: { id: packetId } });
    if (!packet) {
      throw new NotFoundException('Packet not found');
    }

    packet.isActive = isActive;
    return this.packetRepo.save(packet);
  }

  async exportPacketTemplate(): Promise<{ buffer: Buffer; fileName: string }> {
    const workbook = XLSX.utils.book_new();
    const masters = await this.findMasters({});
    const templateRows = [
      {
        Barcode: '100000000001',
        'Packet Name': 'LD-ROU-400-DF-VV',
        Stone: masters.packetStones?.[0]?.value || 'Lab Diamonds',
        Shape: masters.packetShapes?.[0]?.value || 'Round',
        Cut: masters.packetCuts?.[0]?.value || '',
        Size: masters.packetSizes?.[0]?.value || '4.00MM',
        Color: masters.packetColors?.[0]?.value || 'D-F',
        Quality: masters.packetQualities?.[0]?.value || 'VS-VVS',
        'Price In': 'WT',
        'Selling Price': 500,
        'Weight Per Pc': 0.24,
        Pieces: 1,
        Weight: 0.24,
        'Weight Unit': 'CTS',
        Status: 'ACTIVE',
      },
    ];
    const referenceRows = [
      { Field: 'Price In', AllowedValues: Object.values(StonePacketPriceIn).join(', '), Notes: 'Optional, defaults to WT' },
      { Field: 'Weight Unit', AllowedValues: Object.values(StoneWeightUnit).join(', '), Notes: 'Optional, defaults to CTS' },
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional, defaults to ACTIVE' },
      { Field: 'Barcode', AllowedValues: 'Digits only', Notes: 'Optional; leave blank to auto-generate a numeric barcode.' },
      { Field: 'Packet Name', AllowedValues: 'Unique packet name', Notes: 'Required; existing packet name updates that row' },
    ];
    const lookupRows = this.buildPacketTemplateLookupRows(masters);

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows, { header: [...this.packetImportHeaders] }),
      'Packets',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');
    if (lookupRows.length > 0) {
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(lookupRows), 'Lookups');
    }

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: 'stone-packets-import-template.xlsx',
    };
  }

  async exportPackets(query: FindPacketsQueryDto = {}): Promise<{ buffer: Buffer; fileName: string }> {
    const result = await this.findPackets({
      ...query,
      limit: 5000,
      page: 1,
    });

    const workbook = XLSX.utils.book_new();
    const rows = (result.data || []).map((packet: StonePacket) => ({
      Barcode: packet.barcode || '',
      'Packet Name': packet.packetName,
      Stone: packet.stoneMaster?.value || '',
      Shape: packet.shapeMaster?.value || '',
      Cut: packet.cutMaster?.value || '',
      Size: packet.sizeMaster?.value || '',
      Color: packet.colorMaster?.value || '',
      Quality: packet.qualityMaster?.value || '',
      'Price In': packet.priceIn,
      'Selling Price':
        packet.sellingPrice !== null && packet.sellingPrice !== undefined
          ? this.toNumber(packet.sellingPrice)
          : '',
      'Weight Per Pc':
        packet.weightPerPc !== null && packet.weightPerPc !== undefined
          ? this.toNumber(packet.weightPerPc)
          : '',
      Pieces: packet.pieces,
      Weight: this.toNumber(packet.weight),
      'Weight Unit': packet.weightUnit,
      Status: packet.isActive ? 'ACTIVE' : 'INACTIVE',
      'Created At': packet.createdAt,
      'Updated At': packet.updatedAt,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Packets');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `stone-packets-export-${new Date().toISOString().slice(0, 10)}.xlsx`,
    };
  }

  async importPackets(
    file: { buffer?: Buffer; originalname?: string } | undefined,
    requester: AuthUser,
  ): Promise<{
    totalRows: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    this.assertDesignWriteAccess(requester);
    const rows = this.readExcelRows(file);
    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const line = index + 2;

      try {
        const row = this.normalizePacketImportRow(rows[index]);
        const packetName = this.normalizePacketName(row.packetName);
        const existing = await this.packetRepo.findOne({ where: { packetName } });
        const payload: CreateStonePacketDto = {
          barcode: await this.resolveStonePacketBarcode(row.barcode, existing?.id),
          packetName,
          stone: this.optionalText(row.stone) || undefined,
          shape: this.optionalText(row.shape) || undefined,
          cut: this.optionalText(row.cut) || undefined,
          size: this.optionalText(row.size) || undefined,
          color: this.optionalText(row.color) || undefined,
          quality: this.optionalText(row.quality) || undefined,
          priceIn: this.normalizePacketPriceIn(row.priceIn),
          sellingPrice: this.optionalNonNegativeNumber(row.sellingPrice, 'sellingPrice') ?? 0,
          weightPerPc: this.resolvePacketWeightPerPc({
            weightPerPc: row.weightPerPc,
            weight: row.weight,
            pieces: this.resolvePacketPieces(row.pieces, 1),
          }),
          pieces: this.resolvePacketPieces(row.pieces, 1),
          weight: this.optionalNonNegativeNumber(row.weight, 'weight') ?? undefined,
          weightUnit: this.normalizePacketWeightUnit(row.weightUnit),
          stockType: undefined,
        };

        let saved: StonePacket;
        if (existing) {
          const updatePayload: UpdateStonePacketDto = {
            barcode: payload.barcode,
            packetName: payload.packetName,
            stone: payload.stone,
            shape: payload.shape,
            cut: payload.cut,
            size: payload.size,
            color: payload.color,
            quality: payload.quality,
            priceIn: payload.priceIn,
            sellingPrice: payload.sellingPrice,
            weightPerPc: payload.weightPerPc,
            pieces: payload.pieces,
            weight: payload.weight,
            weightUnit: payload.weightUnit,
          };
          saved = await this.updatePacket(existing.id, updatePayload, requester);
          updated += 1;
        } else {
          saved = await this.createPacket(payload, requester);
          created += 1;
        }

        const isActive = this.parseImportStatus(row.isActive);
        if (saved.isActive !== isActive) {
          await this.updatePacketStatus(saved.id, isActive, requester);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Row ${line}: ${message}`);
      }
    }

    return {
      totalRows: rows.length,
      created,
      updated,
      failed: errors.length,
      errors,
    };
  }

   @Put('packets/:id')
  @TaskPermissions()
  @AnyActionPermissions('master.edit', 'dashboard.price_activity.packet_price.update')
  updatePacket(
    @Param('id') id: string,
    @Body() dto: UpdateStonePacketDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updatePacket(id, dto, req.user);
  }

  @Patch('packets/:id/status')
  @TaskPermissions()
  @ActionPermissions('master.status_update')
  updatePacketStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStonePacketStatusDto,
    @Request() req: { user: AuthUser },
  ) {
    return this.productsService.updatePacketStatus(id, dto.isActive, req.user);
  }

    private async findExistingMasterForImport(
    type: DesignMasterType,
    payload: UpdateDesignMasterDto,
  ): Promise<DesignMaster | null> {
    let scopeKey = '';
    if (
      type === DesignMasterType.JEWELRY_SIZE ||
      type === DesignMasterType.COLLECTION ||
      type === DesignMasterType.LABOR_RULE ||
      type === DesignMasterType.OVERHEAD_RULE
    ) {
      const jewelrySizeFields = await this.normalizeCategoryScopedMasterFields(
        type,
        { jewelryGroupId: payload.jewelryGroupId },
        undefined,
      );
      scopeKey = jewelrySizeFields.scopeKey;
    }

    return this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType: type })
      .andWhere('master.scopeKey = :scopeKey', { scopeKey })
      .andWhere('master.normalizedValue = :normalizedValue', {
        normalizedValue: this.normalizeMasterValue(payload.value).toLowerCase(),
      })
      .getOne();
  }



  private async buildMasterImportPayload(
    type: DesignMasterType,
    row: MasterImportRow,
    _line: number,
  ): Promise<UpdateDesignMasterDto> {
    const value = row.value?.trim();
    if (!value) {
      throw new BadRequestException('Value is required');
    }

    const payload: UpdateDesignMasterDto = {
      value,
      aliasName: row.aliasName?.trim() || value,
      description: row.description?.trim() || undefined,
    };

    if (
      type === DesignMasterType.JEWELRY_SIZE ||
      type === DesignMasterType.COLLECTION ||
      type === DesignMasterType.LABOR_RULE ||
      type === DesignMasterType.OVERHEAD_RULE
    ) {
      const jewelryGroup = row.jewelryGroup?.trim();
      if (!jewelryGroup) {
        throw new BadRequestException('Category is required');
      }
      const jewelryGroupOption = await this.findMasterByValueOrAlias(
        DesignMasterType.JEWELRY_GROUP,
        jewelryGroup,
      );
      if (!jewelryGroupOption) {
        throw new BadRequestException(`Category "${jewelryGroup}" not found`);
      }
      payload.jewelryGroupId = jewelryGroupOption.id;
    }

    if (type === DesignMasterType.METAL_NAME) {
      payload.marketPricePerOunce =
        this.optionalNonNegativeNumber(row.marketPricePerOunce, 'marketPricePerOunce') ?? undefined;
      payload.marketPricePerGm =
        this.optionalNonNegativeNumber(row.marketPricePerGm, 'marketPricePerGm') ?? undefined;
      payload.livePricePerGm =
        this.optionalNonNegativeNumber(row.livePricePerGm, 'livePricePerGm') ?? undefined;
    } else if (type === DesignMasterType.METAL_COLOR) {
      payload.metalName = row.metalName?.trim() || undefined;
      if (!payload.metalName) {
        throw new BadRequestException('Metal Name is required');
      }
    } else if (type === DesignMasterType.METAL_PURITY) {
      payload.metalName = row.metalName?.trim() || undefined;
      if (!payload.metalName) {
        throw new BadRequestException('Metal Name is required');
      }
      payload.purityPercentage =
        this.optionalNonNegativeNumber(row.purityPercentage, 'purityPercentage') ?? undefined;
      if (payload.purityPercentage === undefined) {
        throw new BadRequestException('Purity Percentage is required');
      }
    } else if (type === DesignMasterType.METAL_CARATAGE) {
      payload.metalName = row.metalName?.trim() || undefined;
      payload.metalColor = row.metalColor?.trim() || undefined;
      payload.metalPurity = row.metalPurity?.trim() || undefined;
      if (!payload.metalName || !payload.metalColor || !payload.metalPurity) {
        throw new BadRequestException('Metal Name, Metal Color and Metal Purity are required');
      }
      payload.purityPercentage =
        this.optionalNonNegativeNumber(row.purityPercentage, 'purityPercentage') ?? undefined;
      payload.livePricePerGm =
        this.optionalNonNegativeNumber(row.livePricePerGm, 'livePricePerGm') ?? undefined;
      payload.defaultWastagePercent =
        this.optionalNonNegativeNumber(row.defaultWastagePercent, 'defaultWastagePercent') ??
        undefined;
      if (!row.aliasName?.trim()) {
        payload.aliasName = value;
      }
    } else if (type === DesignMasterType.GOLD_COLOUR) {
      payload.pricePerUnit =
        this.optionalNonNegativeNumber(row.pricePerUnit, 'pricePerUnit') ?? undefined;
    } else if (type === DesignMasterType.LABOR_RULE) {
      payload.laborApplyMode = (row.laborApplyMode?.trim().toUpperCase() as LaborApplyMode) || undefined;
      payload.flatCost = this.optionalNonNegativeNumber(row.flatCost, 'flatCost') ?? undefined;
      payload.ratePerStone =
        this.optionalNonNegativeNumber(row.ratePerStone, 'ratePerStone') ?? undefined;
      payload.ratePerGram =
        this.optionalNonNegativeNumber(row.ratePerGram, 'ratePerGram') ?? undefined;
      payload.ratePerGroup =
        this.optionalNonNegativeNumber(row.ratePerGroup, 'ratePerGroup') ?? undefined;
    } else if (type === DesignMasterType.OVERHEAD_RULE) {
      payload.overheadApplyMode =
        (row.overheadApplyMode?.trim().toUpperCase() as OverheadApplyMode) || undefined;
      payload.ratePercent =
        this.optionalNonNegativeNumber(row.ratePercent, 'ratePercent') ?? undefined;
      payload.flatAmount =
        this.optionalNonNegativeNumber(row.flatAmount, 'flatAmount') ?? undefined;
    } else if (type === DesignMasterType.FINDING_HEAD) {
      payload.findingNo = row.findingNo?.trim() || undefined;
      payload.metalCaratage = row.metalCaratage?.trim() || undefined;
      payload.priceIn = (row.priceIn?.trim().toUpperCase() as FindingPriceIn) || undefined;
      payload.pricePerUnit =
        this.optionalNonNegativeNumber(row.pricePerUnit, 'pricePerUnit') ?? undefined;
      payload.dimensions = row.dimensions?.trim() || undefined;
      payload.weightPerUnit =
        this.optionalNonNegativeNumber(row.weightPerUnit, 'weightPerUnit') ?? undefined;
    }

    return payload;
  }



    private async exportLegacyMasterTemplate(
    query: FindDesignMastersQueryDto,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const type = this.requireMasterType(query);
    const workbook = XLSX.utils.book_new();
    const templateRows = [this.buildMasterTemplateRow(type)];
    const referenceRows = await this.buildMasterTemplateReferenceRows(type);

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(templateRows, { header: [...this.masterImportHeaders] }),
      'Masters',
    );
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(referenceRows), 'Reference');

    return {
      buffer: this.workbookToBuffer(workbook),
      fileName: `${type.toLowerCase()}-import-template.xlsx`,
    };
  }


    private async buildMasterTemplateReferenceRows(
    type: DesignMasterType,
  ): Promise<Array<Record<string, string>>> {
    const rows: Array<Record<string, string>> = [
      { Field: 'Status', AllowedValues: 'ACTIVE, INACTIVE', Notes: 'Optional, defaults to ACTIVE' },
    ];

    if (type === DesignMasterType.JEWELRY_SIZE || type === DesignMasterType.COLLECTION) {
      const jewelryGroups = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.JEWELRY_GROUP, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push({
        Field: 'Category',
        AllowedValues: jewelryGroups.map((item) => item.value).join(', '),
        Notes: 'Required. Existing Category value or alias',
      });
    }

    if (
      type === DesignMasterType.METAL_COLOR ||
      type === DesignMasterType.METAL_PURITY ||
      type === DesignMasterType.METAL_CARATAGE
    ) {
      const metalNames = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_NAME, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push({
        Field: 'Metal Name',
        AllowedValues: metalNames.map((item) => item.value).join(', '),
        Notes: 'Required for this master type',
      });
    }

    if (type === DesignMasterType.METAL_CARATAGE) {
      const metalColors = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_COLOR, isActive: true },
        order: { value: 'ASC' },
      });
      const metalPurities = await this.designMasterRepo.find({
        where: { masterType: DesignMasterType.METAL_PURITY, isActive: true },
        order: { value: 'ASC' },
      });
      rows.push(
        {
          Field: 'Metal Color',
          AllowedValues: metalColors.map((item) => item.value).join(', '),
          Notes: 'Required for Metal Caratage',
        },
        {
          Field: 'Metal Purity',
          AllowedValues: metalPurities.map((item) => item.value).join(', '),
          Notes: 'Required for Metal Caratage',
        },
      );
    }

    if (type === DesignMasterType.FINDING_HEAD) {
      rows.push({
        Field: 'Price In',
        AllowedValues: Object.values(FindingPriceIn).join(', '),
        Notes: 'Required for Finding Head',
      });
    }

    return rows;
  }


  private buildPacketTemplateLookupRows(masters: any): Array<Record<string, string>> {
    const rows: Array<Record<string, string>> = [];
    const addRows = (field: string, values: Array<{ value: string }>) => {
      values.forEach((item) => rows.push({ Field: field, Value: item.value }));
    };

    addRows('Stone', masters.packetStones || []);
    addRows('Shape', masters.packetShapes || []);
    addRows('Size', masters.packetSizes || []);
    addRows('Cut', masters.packetCuts || []);
    addRows('Color', masters.packetColors || []);
    addRows('Quality', masters.packetQualities || []);

    return rows;
  }

  private toMasterExportRow(master: DesignMaster, _type: DesignMasterType): Record<string, unknown> {
    return {
      Value: master.value,
      'Alias Name': master.aliasName || '',
      Description: master.description || '',
      Category: master.jewelryGroup || '',
      'Finding No': master.findingNo || '',
      'Metal Caratage': master.metalCaratage || '',
      'Price In': master.priceIn || '',
      'Price Per Unit':
        master.pricePerUnit !== null && master.pricePerUnit !== undefined
          ? this.toNumber(master.pricePerUnit)
          : '',
      Dimensions: master.dimensions || '',
      'Weight Per Unit':
        master.weightPerUnit !== null && master.weightPerUnit !== undefined
          ? this.toNumber(master.weightPerUnit)
          : '',
      'Metal Name': master.metalName || '',
      'Metal Color': master.metalColor || '',
      'Metal Purity': master.metalPurity || '',
      'Purity Percentage':
        master.purityPercentage !== null && master.purityPercentage !== undefined
          ? this.toNumber(master.purityPercentage)
          : '',
      'Market Price Per Ounce':
        master.marketPricePerOunce !== null && master.marketPricePerOunce !== undefined
          ? this.toNumber(master.marketPricePerOunce)
          : '',
      'Market Price Per Gm':
        master.marketPricePerGm !== null && master.marketPricePerGm !== undefined
          ? this.toNumber(master.marketPricePerGm)
          : '',
      'Live Price Per Gm':
        master.livePricePerGm !== null && master.livePricePerGm !== undefined
          ? this.toNumber(master.livePricePerGm)
          : '',
      'Default Wastage Percent':
        master.defaultWastagePercent !== null && master.defaultWastagePercent !== undefined
          ? this.toNumber(master.defaultWastagePercent)
          : '',
      'Labor Apply Mode': master.laborApplyMode || '',
      'Flat Cost':
        master.flatCost !== null && master.flatCost !== undefined ? this.toNumber(master.flatCost) : '',
      'Rate Per Stone':
        master.ratePerStone !== null && master.ratePerStone !== undefined
          ? this.toNumber(master.ratePerStone)
          : '',
      'Rate Per Gram':
        master.ratePerGram !== null && master.ratePerGram !== undefined
          ? this.toNumber(master.ratePerGram)
          : '',
      'Rate Per Group':
        master.ratePerGroup !== null && master.ratePerGroup !== undefined
          ? this.toNumber(master.ratePerGroup)
          : '',
      'Overhead Apply Mode': master.overheadApplyMode || '',
      'Rate Percent':
        master.ratePercent !== null && master.ratePercent !== undefined
          ? this.toNumber(master.ratePercent)
          : '',
      'Flat Amount':
        master.flatAmount !== null && master.flatAmount !== undefined
          ? this.toNumber(master.flatAmount)
          : '',
      Status: master.isActive ? 'ACTIVE' : 'INACTIVE',
      'Created At': master.createdAt,
      'Updated At': master.updatedAt,
    };
  }

  private async findMasterByValueOrAlias(
    type: DesignMasterType,
    valueOrAlias: string,
  ): Promise<DesignMaster | null> {
    const normalized = valueOrAlias.trim().toLowerCase();
    if (!normalized) {
      return null;
    }

    return this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType: type })
      .andWhere('master.isActive = :isActive', { isActive: true })
      .andWhere(
        new Brackets((where) => {
          where
            .where('master.normalizedValue = :normalized', { normalized })
            .orWhere('master.normalizedAlias = :normalized', { normalized });
        }),
      )
      .getOne();
  }

  private normalizeMasterValue(value?: string): string {
    const normalized = value?.trim() || '';
    if (!normalized) {
      throw new BadRequestException('value is required');
    }
    return normalized;
  }

  private normalizeMasterAlias(aliasName?: string | null, fallbackValue?: string): string {
    const aliasValue = aliasName?.trim() || fallbackValue?.trim() || '';
    if (!aliasValue) {
      throw new BadRequestException('aliasName is required');
    }
    return aliasValue;
  }

  private emptyFindingMasterFields(): {
    findingNo: string | null;
    normalizedFindingNo: string | null;
    metalCaratage: string | null;
    priceIn: FindingPriceIn | null;
    pricePerUnit: number | null;
    dimensions: string | null;
    weightPerUnit: number | null;
  } {
    return {
      findingNo: null,
      normalizedFindingNo: null,
      metalCaratage: null,
      priceIn: null,
      pricePerUnit: null,
      dimensions: null,
      weightPerUnit: null,
    };
  }

  private normalizeFindingMasterFields(input: {
    findingNo?: string | null;
    metalCaratage?: string | null;
    priceIn?: FindingPriceIn | null;
    pricePerUnit?: number | null;
    dimensions?: string | null;
    weightPerUnit?: number | null;
  }): {
    findingNo: string;
    normalizedFindingNo: string;
    metalCaratage: string;
    priceIn: FindingPriceIn;
    pricePerUnit: number;
    dimensions: string | null;
    weightPerUnit: number;
  } {
    const findingNo = this.requiredText(input.findingNo, 'findingNo');
    const metalCaratage = this.requiredText(input.metalCaratage, 'metalCaratage');
    const priceIn = this.normalizeFindingPriceIn(input.priceIn);
    const pricePerUnit = this.requiredNumber(input.pricePerUnit, 'pricePerUnit');
    const weightPerUnit = this.requiredNumber(input.weightPerUnit, 'weightPerUnit');
    const dimensions = this.optionalText(input.dimensions);

    return {
      findingNo,
      normalizedFindingNo: findingNo.toLowerCase(),
      metalCaratage,
      priceIn,
      pricePerUnit,
      dimensions,
      weightPerUnit,
    };
  }


    private async normalizeCategoryScopedMasterFields(
    masterType: DesignMasterType,
    input: {
      jewelryGroupId?: string | null;
    },
    existing?: DesignMaster,
  ): Promise<{
    scopeKey: string;
    jewelryGroupId: string | null;
    jewelryGroup: string | null;
  }> {
    if (
      masterType !== DesignMasterType.JEWELRY_SIZE &&
      masterType !== DesignMasterType.COLLECTION &&
      masterType !== DesignMasterType.LABOR_RULE &&
      masterType !== DesignMasterType.OVERHEAD_RULE
    ) {
      return this.emptyCategoryScopedMasterFields();
    }

    const jewelryGroupId = this.requiredText(
      input.jewelryGroupId !== undefined ? input.jewelryGroupId : existing?.jewelryGroupId,
      'jewelryGroupId',
    );

    const jewelryGroupMaster = await this.designMasterRepo.findOne({
      where: {
        id: jewelryGroupId,
        masterType: DesignMasterType.JEWELRY_GROUP,
        isActive: true,
      },
    });
    if (!jewelryGroupMaster) {
      throw new BadRequestException('Selected category was not found');
    }

    return {
      scopeKey: jewelryGroupMaster.id,
      jewelryGroupId: jewelryGroupMaster.id,
      jewelryGroup: jewelryGroupMaster.value,
    };
  }


    private async assertNoDuplicateOverheadRule(
    masterType: DesignMasterType,
    scopeKey: string,
    fields: {
      overheadApplyMode: OverheadApplyMode | null;
      ratePercent: number | null;
      flatAmount: number | null;
    },
    excludeId?: string,
  ): Promise<void> {
    if (masterType !== DesignMasterType.OVERHEAD_RULE || !fields.overheadApplyMode) {
      return;
    }

    const isFlatMode = fields.overheadApplyMode === OverheadApplyMode.FLAT;
    const amount = isFlatMode ? fields.flatAmount : fields.ratePercent;
    if (amount === null || amount === undefined) {
      return;
    }

    const duplicateQuery = this.designMasterRepo
      .createQueryBuilder('master')
      .where('master.masterType = :masterType', { masterType })
      .andWhere('master.scopeKey = :scopeKey', { scopeKey })
      .andWhere('master.overheadApplyMode = :overheadApplyMode', {
        overheadApplyMode: fields.overheadApplyMode,
      });

    if (excludeId) {
      duplicateQuery.andWhere('master.id != :excludeId', { excludeId });
    }

    if (isFlatMode) {
      duplicateQuery.andWhere('master.flatAmount = :amount', { amount });
    } else {
      duplicateQuery.andWhere('master.ratePercent = :amount', { amount });
    }

    const duplicate = await duplicateQuery.getOne();
    if (duplicate) {
      throw new BadRequestException(
        'Overhead rule already exists for this category, apply mode, and amount',
      );
    }
  }

    private normalizeOverheadRuleFields(
    masterType: DesignMasterType,
    input: {
      overheadApplyMode?: OverheadApplyMode | string | null;
      ratePercent?: number | null;
      flatAmount?: number | null;
    },
    existing?: DesignMaster,
  ): {
    overheadApplyMode: OverheadApplyMode | null;
    ratePercent: number | null;
    flatAmount: number | null;
  } {
    if (masterType !== DesignMasterType.OVERHEAD_RULE) {
      return this.emptyOverheadRuleFields();
    }

    const overheadApplyMode = this.normalizeOverheadApplyMode(
      input.overheadApplyMode !== undefined ? input.overheadApplyMode : existing?.overheadApplyMode,
    );
    const ratePercent = this.optionalNonNegativeNumber(
      input.ratePercent !== undefined ? input.ratePercent : existing?.ratePercent,
      'ratePercent',
    );
    const flatAmount = this.optionalNonNegativeNumber(
      input.flatAmount !== undefined ? input.flatAmount : existing?.flatAmount,
      'flatAmount',
    );

    if (
      overheadApplyMode === OverheadApplyMode.FLAT &&
      flatAmount === null &&
      ratePercent === null
    ) {
      throw new BadRequestException('flatAmount is required for FLAT overhead mode');
    }

    if (
      overheadApplyMode !== OverheadApplyMode.FLAT &&
      ratePercent === null
    ) {
      throw new BadRequestException('ratePercent is required for percentage overhead mode');
    }

    return {
      overheadApplyMode,
      ratePercent,
      flatAmount,
    };
  }



  private async normalizeMetalMasterFields(
    masterType: DesignMasterType,
    input: {
      metalName?: string | null;
      metalColor?: string | null;
      metalPurity?: string | null;
      purityPercentage?: number | null;
      marketPricePerOunce?: number | null;
      marketPricePerGm?: number | null;
      livePricePerGm?: number | null;
      defaultWastagePercent?: number | null;
    },
    existing?: DesignMaster,
  ): Promise<{
    metalName: string | null;
    metalColor: string | null;
    metalPurity: string | null;
    purityPercentage: number | null;
    marketPricePerOunce: number | null;
    marketPricePerGm: number | null;
    livePricePerGm: number | null;
    defaultWastagePercent: number | null;
  }> {
    if (
      masterType !== DesignMasterType.METAL_NAME &&
      masterType !== DesignMasterType.METAL_COLOR &&
      masterType !== DesignMasterType.METAL_PURITY &&
      masterType !== DesignMasterType.METAL_CARATAGE
    ) {
      return this.emptyMetalMasterFields();
    }

    const empty = this.emptyMetalMasterFields();

    if (masterType === DesignMasterType.METAL_NAME) {
      const marketPricePerOunce = this.optionalNonNegativeNumber(
        input.marketPricePerOunce !== undefined ? input.marketPricePerOunce : existing?.marketPricePerOunce,
        'marketPricePerOunce',
      );
      let marketPricePerGm = this.optionalNonNegativeNumber(
        input.marketPricePerGm !== undefined ? input.marketPricePerGm : existing?.marketPricePerGm,
        'marketPricePerGm',
      );
      if (marketPricePerGm === null && marketPricePerOunce !== null) {
        marketPricePerGm = this.roundTo2(marketPricePerOunce / 31.1035);
      }
      if (marketPricePerGm === null) {
        throw new BadRequestException('marketPricePerGm is required for METAL_NAME');
      }
      let livePricePerGm = this.optionalNonNegativeNumber(
        input.livePricePerGm !== undefined ? input.livePricePerGm : existing?.livePricePerGm,
        'livePricePerGm',
      );
      if (livePricePerGm === null) {
        livePricePerGm = marketPricePerGm;
      }
      return {
        ...empty,
        marketPricePerOunce,
        marketPricePerGm,
        livePricePerGm,
      };
    }

    if (masterType === DesignMasterType.METAL_COLOR) {
      const metalName = this.requiredText(
        input.metalName !== undefined ? input.metalName : existing?.metalName,
        'metalName',
      );
      return {
        ...empty,
        metalName,
      };
    }

    if (masterType === DesignMasterType.METAL_PURITY) {
      const metalName = this.requiredText(
        input.metalName !== undefined ? input.metalName : existing?.metalName,
        'metalName',
      );
      const purityPercentage = this.requiredNumber(
        input.purityPercentage !== undefined ? input.purityPercentage : existing?.purityPercentage,
        'purityPercentage',
      );
      return {
        ...empty,
        metalName,
        purityPercentage,
      };
    }

    const metalName = this.requiredText(
      input.metalName !== undefined ? input.metalName : existing?.metalName,
      'metalName',
    );
    const metalColor = this.requiredText(
      input.metalColor !== undefined ? input.metalColor : existing?.metalColor,
      'metalColor',
    );
    const metalPurity = this.requiredText(
      input.metalPurity !== undefined ? input.metalPurity : existing?.metalPurity,
      'metalPurity',
    );

    let purityPercentage = this.optionalNonNegativeNumber(
      input.purityPercentage !== undefined ? input.purityPercentage : existing?.purityPercentage,
      'purityPercentage',
    );
    if (purityPercentage === null) {
      const purityMaster = await this.designMasterRepo.findOne({
        where: {
          masterType: DesignMasterType.METAL_PURITY,
          value: metalPurity,
          metalName,
          isActive: true,
        },
      });
      if (purityMaster?.purityPercentage !== null && purityMaster?.purityPercentage !== undefined) {
        purityPercentage = this.toNumber(purityMaster.purityPercentage);
      }
    }
    if (purityPercentage === null) {
      throw new BadRequestException('purityPercentage is required for METAL_CARATAGE');
    }

    const defaultWastagePercent =
      this.optionalNonNegativeNumber(
        input.defaultWastagePercent !== undefined
          ? input.defaultWastagePercent
          : existing?.defaultWastagePercent,
        'defaultWastagePercent',
      ) ?? 0;

    const metalMaster = await this.designMasterRepo.findOne({
      where: {
        masterType: DesignMasterType.METAL_NAME,
        value: metalName,
        isActive: true,
      },
    });
    const baseMarketPricePerGm =
      metalMaster?.marketPricePerGm !== null && metalMaster?.marketPricePerGm !== undefined
        ? this.toNumber(metalMaster.marketPricePerGm)
        : null;
    if (baseMarketPricePerGm === null) {
      throw new BadRequestException(
        'Unable to resolve Market Price/Gms from selected METAL_NAME for METAL_CARATAGE',
      );
    }

    const computedLivePricePerGm = this.roundTo2((baseMarketPricePerGm * purityPercentage) / 100);
    const manualLivePricePerGm = this.optionalNonNegativeNumber(
      input.livePricePerGm !== undefined ? input.livePricePerGm : null,
      'livePricePerGm',
    );
    const finalLivePricePerGm = this.roundTo2(
      manualLivePricePerGm !== null ? manualLivePricePerGm : computedLivePricePerGm,
    );
    return {
      ...empty,
      metalName,
      metalColor,
      metalPurity,
      purityPercentage,
      livePricePerGm: finalLivePricePerGm,
      defaultWastagePercent,
    };
  }


  private requiredText(value: string | null | undefined, field: string): string {
    const normalized = this.optionalText(value);
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private requiredNumber(value: number | null | undefined, field: string): number {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new BadRequestException(`${field} is required`);
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be a valid number`);
    }
    return parsed;
  }


  private requiredPositiveNumber(value: number | string | null | undefined, field: string): number {
    if (value === undefined || value === null || Number.isNaN(Number(value))) {
      throw new BadRequestException(`${field} is required`);
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be greater than 0`);
    }

    return parsed;
  }



  private serializeMasterTableCompatRow(row: Record<string, any>): Record<string, any> {
    const relationValue = (value: unknown): string | undefined => {
      if (!value || typeof value !== 'object') return undefined;
      const relation = value as { value?: unknown; name?: unknown };
      return String(relation.value ?? relation.name ?? '').trim() || undefined;
    };
    const numberOrUndefined = (value: unknown): number | undefined =>
      value !== null && value !== undefined ? this.toNumber(value as string | number) : undefined;

    return {
      ...row,
      id: String(row.id),
      value: String(row.value ?? ''),
      aliasName: row.aliasName || undefined,
      jewelryGroupId: row.jewelryGroupId !== null && row.jewelryGroupId !== undefined ? String(row.jewelryGroupId) : undefined,
      jewelryGroup: relationValue(row.jewelryGroup) || row.jewelryGroupName || row.jewelryGroup || undefined,
      metalName: relationValue(row.metal) || row.metalName || undefined,
      metalColor: relationValue(row.metalColor) || row.metalColorName || undefined,
      metalPurity: relationValue(row.metalPurity) || row.metalPurityName || undefined,
      marketPricePerOunce: numberOrUndefined(row.marketPricePerOunce),
      marketPricePerGm: numberOrUndefined(row.marketPricePerGm),
      livePricePerGm: numberOrUndefined(row.livePricePerGm),
      purityPercentage: numberOrUndefined(row.purityPercentage),
      defaultWastagePercent: numberOrUndefined(row.defaultWastagePercent),
      wastagePercent: numberOrUndefined(row.defaultWastagePercent),
      flatCost: numberOrUndefined(row.flatCost),
      ratePerStone: numberOrUndefined(row.ratePerStone),
      ratePerGram: numberOrUndefined(row.ratePerGram),
      ratePerGroup: numberOrUndefined(row.ratePerGroup),
      ratePercent: numberOrUndefined(row.ratePercent),
      flatAmount: numberOrUndefined(row.flatAmount),
      pricePerUnit: numberOrUndefined(row.pricePerUnit),
      weightPerUnit: numberOrUndefined(row.weightPerUnit),
    };
  }

  private async toMasterTablePayload(dto: CreateDesignMasterDto | UpdateDesignMasterDto): Promise<Record<string, unknown>> {
    const masterType = (dto as CreateDesignMasterDto).masterType as unknown as DesignMasterType | undefined;
    const payload: Record<string, unknown> = {
      value: dto.value,
      aliasName: dto.aliasName,
      description: dto.description,
      jewelryGroupId: dto.jewelryGroupId,
      email: dto.vendorEmail,
      findingNo: dto.findingNo,
      metalCaratage: dto.metalCaratage,
      priceIn: dto.priceIn,
      pricePerUnit: dto.pricePerUnit,
      dimensions: dto.dimensions,
      weightPerUnit: dto.weightPerUnit,
      purityPercentage: dto.purityPercentage,
      marketPricePerOunce: dto.marketPricePerOunce,
      marketPricePerGm: dto.marketPricePerGm,
      livePricePerGm: dto.livePricePerGm,
      defaultWastagePercent: dto.defaultWastagePercent,
      laborApplyMode: dto.laborApplyMode,
      flatCost: dto.flatCost,
      ratePerStone: dto.ratePerStone,
      ratePerGram: dto.ratePerGram,
      ratePerGroup: dto.ratePerGroup,
      overheadApplyMode:
        dto.overheadApplyMode === 'FLAT'
          ? 'flat'
          : dto.overheadApplyMode
            ? 'per_of_materials'
            : undefined,
      ratePercent: dto.ratePercent,
      flatAmount: dto.flatAmount,
    };

    if (masterType === DesignMasterType.METAL_CARATAGE) {
      const [metal, metalColor, metalPurity] = await Promise.all([
        this.resolveMasterRef('metal_names', undefined, dto.metalName, 'metalName', true),
        this.resolveMasterRef('metal_colors', undefined, dto.metalColor, 'metalColor', true),
        this.resolveMasterRef('metal_purities', undefined, dto.metalPurity, 'metalPurity', true),
      ]);
      payload.metalId = metal.id;
      payload.metalColorId = metalColor.id;
      payload.metalPurityId = metalPurity.id;
    }

    return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  }


  private resolvePacketWeightPerPc(input: {
    weightPerPc?: number | string | null;
    weight?: number | string | null;
    pieces: number;
    fallbackWeightPerPc?: number | string | null;
    fallbackWeight?: number | string | null;
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

    const fallbackPerPc = this.toNumber(input.fallbackWeightPerPc);
    if (fallbackPerPc > 0) {
      return fallbackPerPc;
    }

    const fallbackWeight = this.toNumber(input.fallbackWeight);
    if (fallbackWeight > 0) {
      return fallbackWeight / Math.max(1, input.pieces);
    }

    throw new BadRequestException('weightPerPc must be greater than 0');
  }

    private normalizePacketWeightUnit(value?: string): StoneWeightUnit {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === StoneWeightUnit.GMS || normalized === 'GRAM') {
      return StoneWeightUnit.GMS;
    }
    return StoneWeightUnit.CTS;
  }

  private normalizePacketPriceIn(value?: string): StonePacketPriceIn {
    const normalized = (value || '').trim().toUpperCase();
    if (normalized === StonePacketPriceIn.PCS) {
      return StonePacketPriceIn.PCS;
    }
    return StonePacketPriceIn.WT;
  }

  private resolvePacketPieces(value: number | string | null | undefined, fallback = 1): number {
    if (value === undefined || value === null || value === '') {
      return Math.max(1, this.toInt(fallback));
    }
    return Math.max(1, this.toInt(value));
  }

    private requiredPacketId(value: string | number): number {
    const id = this.optionalInt(value);
    if (id === null) {
      throw new BadRequestException('Invalid packet id');
    }
    return id;
  }

    private async resolveStonePacketBarcode(value?: string | null, excludePacketId?: number): Promise<string> {
    const normalized = this.normalizeStonePacketBarcode(value);
    if (!normalized) {
      return this.generateStonePacketBarcode();
    }

    const existing = await this.packetRepo.findOne({ where: { barcode: normalized } });
    if (existing && existing.id !== excludePacketId) {
      throw new BadRequestException('Packet barcode already exists');
    }
    return normalized;
  }

    private normalizeStonePacketBarcode(value?: string | null): string | null {
    const normalized = String(value || '').trim();
    if (!normalized) {
      return null;
    }
    if (!/^\d+$/.test(normalized)) {
      throw new BadRequestException('Packet barcode must contain digits only');
    }
    return normalized;
  }

  private async generateStonePacketBarcode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      const existing = await this.packetRepo.findOne({ where: { barcode: candidate } });
      if (!existing) {
        return candidate;
      }
    }
    throw new BadRequestException('Unable to generate a unique packet barcode');
  }

  private serializeDesignMasterListRow(row: DesignMaster): Record<string, unknown> {
    const { normalizedValue: _normalizedValue, normalizedAlias: _normalizedAlias, ...publicRow } = row;
    return publicRow;
  }

    private normalizePacketName(value?: string): string {
    const normalized = value?.trim() || '';
    if (!normalized) {
      throw new BadRequestException('packetName is required');
    }
    return normalized;
  }

  private normalizeVendorEmail(masterType: DesignMasterType, value?: string | null): string | null {
    if (masterType !== DesignMasterType.VENDOR_NAME) {
      return null;
    }
    return this.optionalText(value);
  }

    private resolveMetalRate(
    globalRateMaps: GlobalRateMaps | undefined,
    metalCaratage: string | null,
  ): number | undefined {
    if (!globalRateMaps || !metalCaratage) {
      return undefined;
    }

    const lookupKey = this.normalizeLookupKey(metalCaratage);
    if (!lookupKey) {
      return undefined;
    }

    return globalRateMaps.metalRates.get(lookupKey);
  }


    private normalizeLaborRuleFields(
    masterType: DesignMasterType,
    input: {
      laborApplyMode?: LaborApplyMode | string | null;
      flatCost?: number | null;
      ratePerStone?: number | null;
      ratePerGram?: number | null;
      ratePerGroup?: number | null;
    },
    existing?: ProductMasterRow,
  ): {
    laborApplyMode: LaborApplyMode | null;
    flatCost: number | null;
    ratePerStone: number | null;
    ratePerGram: number | null;
    ratePerGroup: number | null;
  } {
    if (masterType !== DesignMasterType.LABOR_RULE) {
      return this.emptyLaborRuleFields();
    }

    const laborApplyMode = this.normalizeLaborApplyMode(
      input.laborApplyMode !== undefined ? input.laborApplyMode : existing?.laborApplyMode,
    );
    const flatCost = this.optionalNonNegativeNumber(
      input.flatCost !== undefined ? input.flatCost : existing?.flatCost,
      'flatCost',
    );
    const ratePerStone = this.optionalNonNegativeNumber(
      input.ratePerStone !== undefined ? input.ratePerStone : existing?.ratePerStone,
      'ratePerStone',
    );
    const ratePerGram = this.optionalNonNegativeNumber(
      input.ratePerGram !== undefined ? input.ratePerGram : existing?.ratePerGram,
      'ratePerGram',
    );
    const ratePerGroup = this.optionalNonNegativeNumber(
      input.ratePerGroup !== undefined ? input.ratePerGroup : existing?.ratePerGroup,
      'ratePerGroup',
    );

    if (
      laborApplyMode === LaborApplyMode.FLAT &&
      flatCost === null &&
      ratePerStone === null &&
      ratePerGram === null &&
      ratePerGroup === null
    ) {
      throw new BadRequestException('flatCost is required for FLAT labor mode');
    }

    return {
      laborApplyMode,
      flatCost,
      ratePerStone,
      ratePerGram,
      ratePerGroup,
    };
  }

  private emptyOverheadRuleFields(): {
    overheadApplyMode: OverheadApplyMode | null;
    ratePercent: number | null;
    flatAmount: number | null;
  } {
    return {
      overheadApplyMode: null,
      ratePercent: null,
      flatAmount: null,
    };
  }

  private normalizeOverheadApplyMode(value?: OverheadApplyMode | string | null): OverheadApplyMode {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '_');
    if (normalized === OverheadApplyMode.PERCENT_MATERIALS) return OverheadApplyMode.PERCENT_MATERIALS;
    if (normalized === OverheadApplyMode.PERCENT_BOM_SUBTOTAL) {
      return OverheadApplyMode.PERCENT_BOM_SUBTOTAL;
    }
    if (normalized === OverheadApplyMode.FLAT) return OverheadApplyMode.FLAT;
    throw new BadRequestException('overheadApplyMode is required');
  }

  private emptyMetalMasterFields(): {
    metalName: string | null;
    metalColor: string | null;
    metalPurity: string | null;
    purityPercentage: number | null;
    marketPricePerOunce: number | null;
    marketPricePerGm: number | null;
    livePricePerGm: number | null;
    defaultWastagePercent: number | null;
  } {
    return {
      metalName: null,
      metalColor: null,
      metalPurity: null,
      purityPercentage: null,
      marketPricePerOunce: null,
      marketPricePerGm: null,
      livePricePerGm: null,
      defaultWastagePercent: null,
    };
  }


    private buildMasterTemplateRow(type: DesignMasterType): Record<string, unknown> {
    const row: Record<string, unknown> = {
      Value: 'Sample Value',
      'Alias Name': 'SAMPLE',
      Description: 'Optional description',
      Category: '',
      'Finding No': '',
      'Metal Caratage': '',
      'Price In': '',
      'Price Per Unit': '',
      Dimensions: '',
      'Weight Per Unit': '',
      'Metal Name': '',
      'Metal Color': '',
      'Metal Purity': '',
      'Purity Percentage': '',
      'Market Price Per Ounce': '',
      'Market Price Per Gm': '',
      'Live Price Per Gm': '',
      'Default Wastage Percent': '',
      'Labor Apply Mode': '',
      'Flat Cost': '',
      'Rate Per Stone': '',
      'Rate Per Gram': '',
      'Rate Per Group': '',
      'Overhead Apply Mode': '',
      'Rate Percent': '',
      'Flat Amount': '',
      Status: 'ACTIVE',
    };

    if (type === DesignMasterType.LABOR_RULE) {
      row.Value = 'Standard Ring Labor';
      row['Alias Name'] = 'STD-RING-LABOR';
      row.Description = 'Base labor rule for ring styles';
      row.Category = 'Ring';
      row['Labor Apply Mode'] = 'PER_STONE';
      row['Flat Cost'] = '45';
      row['Rate Per Stone'] = '1.50';
      row['Rate Per Gram'] = '';
      row['Rate Per Group'] = '';
    }

    if (type === DesignMasterType.OVERHEAD_RULE) {
      row.Value = 'Materials Overhead';
      row['Alias Name'] = 'MAT-OH-15';
      row.Description = 'Overhead applied on materials subtotal';
      row.Category = 'Ring';
      row['Overhead Apply Mode'] = 'PERCENT_MATERIALS';
      row['Rate Percent'] = '15';
      row['Flat Amount'] = '';
    }

    switch (type) {
      case DesignMasterType.JEWELRY_SIZE:
        row.Value = 'US 6';
        row['Alias Name'] = 'US 6';
        row.Category = 'Ring';
        break;
      case DesignMasterType.COLLECTION:
        row.Value = 'Eternity Bands';
        row['Alias Name'] = 'ETB';
        row.Category = 'Ring';
        break;
      case DesignMasterType.METAL_NAME:
        row.Value = 'Gold';
        row['Alias Name'] = 'G';
        row['Market Price Per Ounce'] = 5200;
        row['Market Price Per Gm'] = 167.18;
        row['Live Price Per Gm'] = 170;
        break;
      case DesignMasterType.METAL_COLOR:
        row.Value = 'Rose';
        row['Alias Name'] = 'RG';
        row['Metal Name'] = 'Gold';
        break;
      case DesignMasterType.METAL_PURITY:
        row.Value = '18';
        row['Alias Name'] = '18';
        row['Metal Name'] = 'Gold';
        row['Purity Percentage'] = 75;
        break;
      case DesignMasterType.METAL_CARATAGE:
        row.Value = '18-Rose-Gold';
        row['Alias Name'] = '18-Rose-Gold';
        row['Metal Name'] = 'Gold';
        row['Metal Color'] = 'Rose';
        row['Metal Purity'] = '18';
        row['Purity Percentage'] = 75;
        row['Live Price Per Gm'] = 125.39;
        row['Default Wastage Percent'] = 10;
        break;
      case DesignMasterType.GOLD_COLOUR:
        row.Value = 'Rose';
        row['Alias Name'] = 'Rose';
        row['Price Per Unit'] = 10;
        break;
      case DesignMasterType.FINDING_HEAD:
        row.Value = 'Hook';
        row['Alias Name'] = 'HK';
        row['Finding No'] = 'F-001';
        row['Metal Caratage'] = '18-Rose-Gold';
        row['Price In'] = 'PIECES';
        row['Price Per Unit'] = 10;
        row['Dimensions'] = '10x2';
        row['Weight Per Unit'] = 0.2;
        break;
      default:
        break;
    }

    return row;
  }

  private normalizeFindingPriceIn(value?: FindingPriceIn | null): FindingPriceIn {
    if (
      value === FindingPriceIn.PIECES ||
      value === FindingPriceIn.GRAM ||
      value === FindingPriceIn.PAIR ||
      value === FindingPriceIn.INCHES
    ) {
      return value;
    }
    throw new BadRequestException('priceIn is required');
  }

  private emptyCategoryScopedMasterFields(): {
    scopeKey: string;
    jewelryGroupId: string | null;
    jewelryGroup: string | null;
  } {
    return {
      scopeKey: '',
      jewelryGroupId: null,
      jewelryGroup: null,
    };
  }

  private emptyLaborRuleFields(): {
    laborApplyMode: LaborApplyMode | null;
    flatCost: number | null;
    ratePerStone: number | null;
    ratePerGram: number | null;
    ratePerGroup: number | null;
  } {
    return {
      laborApplyMode: null,
      flatCost: null,
      ratePerStone: null,
      ratePerGram: null,
      ratePerGroup: null,
    };
  }

  private normalizeLaborApplyMode(value?: LaborApplyMode | string | null): LaborApplyMode {
    const normalized = String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z]/g, '_');
    if (normalized === LaborApplyMode.FLAT) return LaborApplyMode.FLAT;
    if (normalized === LaborApplyMode.PER_STONE) return LaborApplyMode.PER_STONE;
    if (normalized === LaborApplyMode.PER_GRAM) return LaborApplyMode.PER_GRAM;
    if (normalized === LaborApplyMode.PER_GROUP) return LaborApplyMode.PER_GROUP;
    throw new BadRequestException('laborApplyMode is required');
  }

    private normalizeMasterImportRow(row: Record<string, unknown>): MasterImportRow {
    return {
      value: this.getImportCell(row, 'Value', 'value'),
      aliasName: this.getImportCell(row, 'Alias Name', 'aliasName'),
      description: this.getImportCell(row, 'Description', 'description'),
      jewelryGroup: this.getImportCell(row, 'Category', 'category', 'Jewelry Group', 'jewelryGroup'),
      findingNo: this.getImportCell(row, 'Finding No', 'findingNo'),
      metalCaratage: this.getImportCell(row, 'Metal Caratage', 'metalCaratage'),
      priceIn: this.getImportCell(row, 'Price In', 'priceIn'),
      pricePerUnit: this.getImportCell(row, 'Price Per Unit', 'pricePerUnit'),
      dimensions: this.getImportCell(row, 'Dimensions', 'dimensions'),
      weightPerUnit: this.getImportCell(row, 'Weight Per Unit', 'weightPerUnit'),
      metalName: this.getImportCell(row, 'Metal Name', 'metalName'),
      metalColor: this.getImportCell(row, 'Metal Color', 'metalColor'),
      metalPurity: this.getImportCell(row, 'Metal Purity', 'metalPurity'),
      purityPercentage: this.getImportCell(row, 'Purity Percentage', 'purityPercentage'),
      marketPricePerOunce: this.getImportCell(row, 'Market Price Per Ounce', 'marketPricePerOunce'),
      marketPricePerGm: this.getImportCell(row, 'Market Price Per Gm', 'marketPricePerGm'),
      livePricePerGm: this.getImportCell(row, 'Live Price Per Gm', 'livePricePerGm'),
      defaultWastagePercent: this.getImportCell(row, 'Default Wastage Percent', 'defaultWastagePercent'),
      laborApplyMode: this.getImportCell(row, 'Labor Apply Mode', 'laborApplyMode'),
      flatCost: this.getImportCell(row, 'Flat Cost', 'flatCost'),
      ratePerStone: this.getImportCell(row, 'Rate Per Stone', 'ratePerStone'),
      ratePerGram: this.getImportCell(row, 'Rate Per Gram', 'ratePerGram'),
      ratePerGroup: this.getImportCell(row, 'Rate Per Group', 'ratePerGroup'),
      overheadApplyMode: this.getImportCell(row, 'Overhead Apply Mode', 'overheadApplyMode'),
      ratePercent: this.getImportCell(row, 'Rate Percent', 'ratePercent'),
      flatAmount: this.getImportCell(row, 'Flat Amount', 'flatAmount'),
      isActive: this.getImportCell(row, 'Status', 'status', 'isActive'),
    };
  }

  private normalizePacketImportRow(row: Record<string, unknown>): PacketImportRow {
    return {
      barcode: this.getImportCell(row, 'Barcode', 'barcode'),
      packetName: this.getImportCell(row, 'Packet Name', 'packetName'),
      stone: this.getImportCell(row, 'Stone', 'stone'),
      shape: this.getImportCell(row, 'Shape', 'shape'),
      cut: this.getImportCell(row, 'Cut', 'cut'),
      size: this.getImportCell(row, 'Size', 'size'),
      color: this.getImportCell(row, 'Color', 'color'),
      quality: this.getImportCell(row, 'Quality', 'quality'),
      priceIn: this.getImportCell(row, 'Price In', 'priceIn'),
      sellingPrice: this.getImportCell(row, 'Selling Price', 'sellingPrice'),
      weightPerPc: this.getImportCell(row, 'Weight Per Pc', 'weightPerPc'),
      pieces: this.getImportCell(row, 'Pieces', 'pieces'),
      weight: this.getImportCell(row, 'Weight', 'weight'),
      weightUnit: this.getImportCell(row, 'Weight Unit', 'weightUnit'),
      isActive: this.getImportCell(row, 'Status', 'status', 'isActive'),
    };
  }

  private requireMasterType(query: FindDesignMastersQueryDto): DesignMasterType {
    if (!query.type) {
      throw new BadRequestException('Master type is required for Excel import/export');
    }

    return query.type as unknown as DesignMasterType;
  }
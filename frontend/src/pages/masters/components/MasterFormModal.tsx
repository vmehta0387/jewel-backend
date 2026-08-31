import { FormEvent, MouseEvent, useRef } from 'react';
import { createPortal } from 'react-dom';
import Button from '../../../components/common/Button';
import SmartDropdown, { SmartDropdownOption } from '../../../components/common/SmartDropdown';

type FindingPriceIn = 'PIECES' | 'GRAM' | 'PAIR' | 'INCHES';
type LaborApplyMode = 'FLAT' | 'PER_STONE' | 'PER_GRAM' | 'PER_GROUP';
type OverheadApplyMode = 'per_of_materials' | 'flat';

interface JoinedMasterRef {
  id: string | number;
  name?: string;
  value?: string;
  aliasName?: string | null;
  label?: string;
  metalId?: string | number | null;
  metalColorId?: string | number | null;
  metalPurityId?: string | number | null;
  jewelryGroupId?: string | number | null;
  purityPercentage?: number | null;
  marketPricePerOunce?: number | null;
  marketPricePerGm?: number | null;
  livePricePerGm?: number | null;
  defaultWastagePercent?: number | null;
}

export interface MasterOption extends SmartDropdownOption {
  id: string | number;
  value: string;
  aliasName?: string | null;
  label?: string;
  email?: string | null;
  jewelryGroupId?: string | number | null;
  jewelryGroup?: JoinedMasterRef | string | null;
  metalId?: string | number | null;
  metal?: JoinedMasterRef | string | null;
  metalColorId?: string | number | null;
  metalColor?: JoinedMasterRef | string | null;
  metalPurityId?: string | number | null;
  metalPurity?: JoinedMasterRef | string | null;
  purityPercentage?: number | null;
  marketPricePerOunce?: number | null;
  marketPricePerGm?: number | null;
  livePricePerGm?: number | null;
  defaultWastagePercent?: number | null;
}
export interface MasterFormModalProps {
  open: boolean;
  title: string;
  saveLabel: string;
  loading: boolean;
  valueLabel: string;
  formValue: string;
  formAliasName: string;
  formDescription: string;
  vendorEmail: string;
  isCategoryScopedType: boolean;
  isFindingType: boolean;
  isVendorType: boolean;
  isMetalNameType: boolean;
  isMetalColorType: boolean;
  isMetalPurityType: boolean;
  isMetalCaratageType: boolean;
  isLaborRuleType: boolean;
  isOverheadRuleType: boolean;
  findingNo: string;
  jewelryGroupId: string;
  metalCaratage: string;
  metalName: string;
  metalColor: string;
  metalPurity: string;
  purityPercentage: string;
  marketPricePerOunce: string;
  marketPricePerGm: string;
  livePricePerGm: string;
  defaultWastage: string;
  metalNameOptions: MasterOption[];
  metalColorOptions: MasterOption[];
  metalPurityOptions: MasterOption[];
  priceIn: FindingPriceIn;
  pricePerUnit: string;
  dimensions: string;
  weightPerUnit: string;
  laborApplyMode: LaborApplyMode;
  flatCost: string;
  ratePerStone: string;
  ratePerGram: string;
  ratePerGroup: string;
  overheadApplyMode: OverheadApplyMode;
  ratePercent: string;
  flatAmount: string;
  jewelryGroupOptions: MasterOption[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave?: () => void;
  onChangeValue: (value: string) => void;
  onChangeAliasName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeVendorEmail: (value: string) => void;
  onChangeFindingNo: (value: string) => void;
  onChangeJewelryGroupId: (value: string, option?: SmartDropdownOption | null) => void;
  onChangeMetalCaratage: (value: string) => void;
  onChangeMetalName: (value: string, option?: SmartDropdownOption | null) => void;
  onChangeMetalColor: (value: string, option?: SmartDropdownOption | null) => void;
  onChangeMetalPurity: (value: string, option?: SmartDropdownOption | null) => void;
  onChangePurityPercentage: (value: string) => void;
  onChangeMarketPricePerOunce: (value: string) => void;
  onChangeMarketPricePerGm: (value: string) => void;
  onChangeLivePricePerGm: (value: string) => void;
  onChangeDefaultWastage: (value: string) => void;
  onChangePriceIn: (value: FindingPriceIn) => void;
  onChangePricePerUnit: (value: string) => void;
  onChangeDimensions: (value: string) => void;
  onChangeWeightPerUnit: (value: string) => void;
  onChangeLaborApplyMode: (value: LaborApplyMode) => void;
  onChangeFlatCost: (value: string) => void;
  onChangeRatePerStone: (value: string) => void;
  onChangeRatePerGram: (value: string) => void;
  onChangeRatePerGroup: (value: string) => void;
  onChangeOverheadApplyMode: (value: OverheadApplyMode) => void;
  onChangeRatePercent: (value: string) => void;
  onChangeFlatAmount: (value: string) => void;
}

export interface PacketFormModalProps {
  open: boolean;
  title: string;
  saveLabel: string;
  loading: boolean;
  form: PacketForm;
  masterOptions: PacketMasterOptions;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave?: () => void;
  onChange: (key: keyof PacketForm, value: string, option?: SmartDropdownOption | null) => void;
  onRegeneratePacketName: () => void;
}

export interface PacketForm {
  barcode: string;
  packetName: string;
  stone: string;
  shape: string;
  size: string;
  cut: string;
  color: string;
  quality: string;
  priceIn: 'WT' | 'PCS';
  sellingPrice: string;
  weightPerPc: string;
  weightIn: 'CTS' | 'GRAM';
}

export interface PacketMasterOptions {
  packetStones: MasterOption[];
  packetShapes: MasterOption[];
  packetSizes: MasterOption[];
  packetCuts: MasterOption[];
  packetColors: MasterOption[];
  packetQualities: MasterOption[];
}

export type PacketSelectionMap = Partial<Record<'stone' | 'shape' | 'size' | 'cut' | 'color' | 'quality', MasterOption | null>>;

export interface PacketPayload {
  barcode?: string | null;
  packetName: string;
  stoneId: string;
  shapeId: string;
  sizeId: string;
  cutId: string;
  colorId: string;
  qualityId: string;
  priceIn: PacketForm['priceIn'];
  sellingPrice: number;
  weightPerPc: number;
  pieces: number;
  weight: number;
  weightUnit: 'CTS';
}

export function toPacketAbbreviation(value: string): string {
  const normalized = (value || '').trim();
  if (!normalized) return '';

  const compact = normalized.replace(/[^a-zA-Z0-9]/g, '');
  const words = normalized
    .replace(/[^a-zA-Z0-9\s/-]/g, ' ')
    .split(/[\s/-]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (words.length <= 1) {
    return compact.slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((entry) => entry.charAt(0).toUpperCase())
    .join('');
}

export function buildPacketNameFromForm(
  form: Pick<PacketForm, 'stone' | 'shape' | 'size' | 'cut' | 'color' | 'quality'>,
  selected: PacketSelectionMap = {},
): string {
  const parts = [
    selected.stone?.value || form.stone,
    selected.shape?.value || form.shape,
    selected.size?.value || form.size,
    selected.cut?.value || form.cut,
    selected.color?.value || form.color,
    selected.quality?.value || form.quality,
  ]
    .map((entry) => toPacketAbbreviation((entry || '').trim()))
    .filter((entry) => entry.length > 0);
  return parts.join('-');
}

export function buildPacketPayload(form: PacketForm, parseNumber: (value: string) => number): PacketPayload {
  const weightPerPc = parseNumber(form.weightPerPc);
  return {
    barcode: form.barcode.trim() || null,
    packetName: form.packetName.trim(),
    stoneId: form.stone.trim(),
    shapeId: form.shape.trim(),
    sizeId: form.size.trim(),
    cutId: form.cut.trim(),
    colorId: form.color.trim(),
    qualityId: form.quality.trim(),
    priceIn: form.priceIn,
    sellingPrice: parseNumber(form.sellingPrice),
    weightPerPc,
    pieces: 1,
    weight: weightPerPc,
    weightUnit: 'CTS',
  };
}

export function validatePacketPayload(payload: PacketPayload): string | null {
  if (!payload.packetName || !payload.stoneId || !payload.shapeId || !payload.sizeId || !payload.cutId || !payload.colorId || !payload.qualityId) {
    return 'Packet Name, Stone, Shape, Size, Cut, Color and Quality are required.';
  }
  if (payload.sellingPrice < 0) {
    return 'Selling price cannot be negative.';
  }
  if (payload.weightPerPc <= 0) {
    return 'Weight/Pc must be greater than 0.';
  }
  return null;
}
function optionId(value?: string | number | null): string {
  return value === undefined || value === null ? '' : String(value);
}

function getMetalPurityDisplay(option: MasterOption): string {
  return (option.value || option.label || '').trim();
}

function getJoinedMasterDisplay(value?: JoinedMasterRef | string | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value.value ?? value.name ?? value.label ?? value.id ?? '');
}

function matchesSelectedMetal(option: MasterOption, selectedMetal: string): boolean {
  const selected = selectedMetal.trim().toLowerCase();
  if (!selected) return true;

  const candidates = [
    option.metalId,
    option.metal,
    option.metal && typeof option.metal !== 'string' ? option.metal.id : undefined,
    getJoinedMasterDisplay(option.metal),
  ];

  return candidates.some((candidate) => String(candidate ?? '').trim().toLowerCase() === selected);
}

export function MasterFormModal({
  open,
  title,
  saveLabel,
  loading,
  valueLabel,
  formValue,
  formAliasName,
  formDescription,
  vendorEmail,
  isCategoryScopedType,
  isFindingType,
  isVendorType,
  isMetalNameType,
  isMetalColorType,
  isMetalPurityType,
  isMetalCaratageType,
  isLaborRuleType,
  isOverheadRuleType,
  findingNo,
  jewelryGroupId,
  metalCaratage,
  metalName,
  metalColor,
  metalPurity,
  purityPercentage,
  marketPricePerOunce,
  marketPricePerGm,
  livePricePerGm,
  defaultWastage,
  metalNameOptions,
  metalColorOptions,
  metalPurityOptions,
  priceIn,
  pricePerUnit,
  dimensions,
  weightPerUnit,
  laborApplyMode,
  flatCost,
  ratePerStone,
  ratePerGram,
  ratePerGroup,
  overheadApplyMode,
  ratePercent,
  flatAmount,
  jewelryGroupOptions,
  onClose,
  onSubmit,
  onSave,
  onChangeValue,
  onChangeAliasName,
  onChangeDescription,
  onChangeVendorEmail,
  onChangeFindingNo,
  onChangeJewelryGroupId,
  onChangeMetalCaratage,
  onChangeMetalName,
  onChangeMetalColor,
  onChangeMetalPurity,
  onChangePurityPercentage,
  onChangeMarketPricePerOunce,
  onChangeMarketPricePerGm,
  onChangeLivePricePerGm,
  onChangeDefaultWastage,
  onChangePriceIn,
  onChangePricePerUnit,
  onChangeDimensions,
  onChangeWeightPerUnit,
  onChangeLaborApplyMode,
  onChangeFlatCost,
  onChangeRatePerStone,
  onChangeRatePerGram,
  onChangeRatePerGroup,
  onChangeOverheadApplyMode,
  onChangeRatePercent,
  onChangeFlatAmount,
}: MasterFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return null;
  }

  const selectedMetalOption = metalNameOptions.find(
    (option) =>
      optionId(option.id) === metalName ||
      String(option.value ?? '').trim().toLowerCase() === metalName.trim().toLowerCase(),
  );
  const selectedMetalId = optionId(selectedMetalOption?.id || metalName);
  const filteredMetalColors = metalColorOptions.filter((option) => matchesSelectedMetal(option, metalName));
  const filteredMetalPurities = metalPurityOptions.filter((option) => matchesSelectedMetal(option, metalName));
  const isFlatOverheadMode = overheadApplyMode === 'flat';

  const stopSaveEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (onSave) {
      onSave();
      return;
    }

    onSubmit(event);
  };

  const handleSaveClick = (event: MouseEvent<HTMLButtonElement>) => {
    stopSaveEvent(event);

    const form = formRef.current;
    if (!form || !form.reportValidity()) {
      return;
    }

    onSave?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            className="rounded px-2 text-lg font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          {isFindingType ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Finding No.*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={findingNo}
                  onChange={(event) => onChangeFindingNo(event.target.value)}
                  placeholder="ACS-0001"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{valueLabel}*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formValue}
                  onChange={(event) => onChangeValue(event.target.value)}
                  placeholder={valueLabel}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formAliasName}
                  onChange={(event) => onChangeAliasName(event.target.value)}
                  placeholder="Alias Name"
                  required
                />
              </div>
            </div>
          ) : null}

          {isCategoryScopedType ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{valueLabel}*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formValue}
                  onChange={(event) => onChangeValue(event.target.value)}
                  placeholder={valueLabel}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category*</label>
                <SmartDropdown
                  value={jewelryGroupId}
                  onChange={onChangeJewelryGroupId}
                  config={{
                    apiSubPath: '/products/master-tables/JEWELRY_GROUP/dropdown',
                    options: jewelryGroupOptions,
                    placeholder: 'Select Category',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formAliasName}
                  onChange={(event) => onChangeAliasName(event.target.value)}
                  placeholder="Alias Name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formDescription}
                  onChange={(event) => onChangeDescription(event.target.value)}
                  placeholder="Description"
                />
              </div>
            </div>
          ) : null}

          {!isFindingType && !isMetalCaratageType && !isCategoryScopedType && !isVendorType ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{valueLabel}*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formValue}
                  onChange={(event) => onChangeValue(event.target.value)}
                  placeholder={valueLabel}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formAliasName}
                  onChange={(event) => onChangeAliasName(event.target.value)}
                  placeholder="Alias Name"
                  required
                />
              </div>
            </div>
          ) : null}

          {isVendorType ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{valueLabel}*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formValue}
                  onChange={(event) => onChangeValue(event.target.value)}
                  placeholder={valueLabel}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formAliasName}
                  onChange={(event) => onChangeAliasName(event.target.value)}
                  placeholder="Alias Name"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Email</label>
                <input
                  type="email"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={vendorEmail}
                  onChange={(event) => onChangeVendorEmail(event.target.value)}
                  placeholder="vendor@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formDescription}
                  onChange={(event) => onChangeDescription(event.target.value)}
                  placeholder="Description"
                />
              </div>
            </div>
          ) : null}

          {isLaborRuleType ? (
            <>
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category*</label>
                  <SmartDropdown
                    value={jewelryGroupId}
                    onChange={onChangeJewelryGroupId}
                    config={{
                      apiSubPath: '/products/master-tables/JEWELRY_GROUP/dropdown',
                      options: jewelryGroupOptions,
                      placeholder: 'Select Category',
                      valueKey: 'id',
                      labelKey: 'value',
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Apply Mode*</label>
                  <SmartDropdown
                    value={laborApplyMode}
                    onChange={(nextValue) => onChangeLaborApplyMode(nextValue as LaborApplyMode)}
                    config={{
                      showSearch: false,
                      placeholder: 'Select Apply Mode',
                      options: [
                        { id: 'FLAT', value: 'FLAT', label: 'Flat' },
                        { id: 'PER_STONE', value: 'PER_STONE', label: 'Per Stone' },
                        { id: 'PER_GRAM', value: 'PER_GRAM', label: 'Per Gram' },
                        { id: 'PER_GROUP', value: 'PER_GROUP', label: 'Per Group' },
                      ],
                      valueKey: 'id',
                      labelKey: 'label',
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Flat Cost</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={flatCost}
                    onChange={(event) => onChangeFlatCost(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rate Per Stone</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={ratePerStone}
                    onChange={(event) => onChangeRatePerStone(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rate Per Gram</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={ratePerGram}
                    onChange={(event) => onChangeRatePerGram(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Rate Per Group</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={ratePerGroup}
                    onChange={(event) => onChangeRatePerGroup(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={formDescription}
                    onChange={(event) => onChangeDescription(event.target.value)}
                    placeholder="Explain how this labor rule should apply in BOM."
                  />
                </div>
              </div>
            </>
          ) : null}

          {isOverheadRuleType ? (
            <>
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-amber-100 bg-amber-50/40 p-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Category*</label>
                  <SmartDropdown
                    value={jewelryGroupId}
                    onChange={onChangeJewelryGroupId}
                    config={{
                      apiSubPath: '/products/master-tables/JEWELRY_GROUP/dropdown',
                      options: jewelryGroupOptions,
                      placeholder: 'Select Category',
                      valueKey: 'id',
                      labelKey: 'value',
                    }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Apply Mode*</label>
                  <SmartDropdown
                    value={overheadApplyMode}
                    onChange={(nextValue) => onChangeOverheadApplyMode(nextValue as OverheadApplyMode)}
                    config={{
                      showSearch: false,
                      placeholder: 'Select Apply Mode',
                      options: [
                        { id: 'per_of_materials', value: 'per_of_materials', label: '% of Materials' },
                        { id: 'flat', value: 'flat', label: 'Flat' },
                      ],
                      valueKey: 'id',
                      labelKey: 'label',
                    }}
                  />
                </div>
                {isFlatOverheadMode ? (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Flat Amount*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={flatAmount}
                      onChange={(event) => onChangeFlatAmount(event.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Rate Percent*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={ratePercent}
                      onChange={(event) => onChangeRatePercent(event.target.value)}
                      placeholder="0.000"
                      required
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                  <textarea
                    className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={formDescription}
                    onChange={(event) => onChangeDescription(event.target.value)}
                    placeholder="Explain how this overhead rule should apply in BOM."
                  />
                </div>
              </div>
            </>
          ) : null}

          {isFindingType ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Metal Caratage*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={metalCaratage}
                  onChange={(event) => onChangeMetalCaratage(event.target.value)}
                  placeholder="Metal Caratage"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Price In*</label>
                <div className="flex flex-wrap items-center gap-4 rounded border border-slate-300 px-3 py-2 text-sm">
                  {(['PIECES', 'GRAM', 'PAIR', 'INCHES'] as FindingPriceIn[]).map((option) => (
                    <label key={option} className="inline-flex items-center gap-1.5 text-slate-700">
                      <input
                        type="radio"
                        name="finding-price-in"
                        value={option}
                        checked={priceIn === option}
                        onChange={(event) => onChangePriceIn(event.target.value as FindingPriceIn)}
                      />
                      <span>
                        {option === 'PIECES'
                          ? 'Pieces'
                          : option === 'GRAM'
                            ? 'Gram'
                            : option === 'PAIR'
                              ? 'Pair'
                              : 'Inches'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Price/Unit*</label>
                <div className="flex">
                  <input
                    className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={pricePerUnit}
                    onChange={(event) => onChangePricePerUnit(event.target.value)}
                    placeholder="Price/Unit"
                    required
                  />
                  <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Dimensions</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={dimensions}
                  onChange={(event) => onChangeDimensions(event.target.value)}
                  placeholder="Dimensions"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Weight/Unit*</label>
                <input
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={weightPerUnit}
                  onChange={(event) => onChangeWeightPerUnit(event.target.value)}
                  placeholder="Weight/Unit"
                  required
                />
              </div>
            </div>
          ) : null}

          {!isFindingType ? (
            <>
              {isMetalNameType ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Market Price/Ounce*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={marketPricePerOunce}
                      onChange={(event) => onChangeMarketPricePerOunce(event.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Market Price/Gms*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={marketPricePerGm}
                      onChange={(event) => onChangeMarketPricePerGm(event.target.value)}
                      placeholder="0.0000"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Live Price/Gms*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={livePricePerGm}
                      onChange={(event) => onChangeLivePricePerGm(event.target.value)}
                      placeholder="0.0000"
                      required
                    />
                  </div>
                </div>
              ) : null}

              {isMetalColorType ? (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
                  <SmartDropdown
                    value={metalName}
                    onChange={onChangeMetalName}
                    config={{
                      apiSubPath: '/products/master-tables/METAL_NAME/dropdown',
                      options: metalNameOptions,
                      placeholder: 'Select Metal Name',
                      valueKey: 'id',
                      labelKey: 'value',
                    }}
                  />
                </div>
              ) : null}

              {isMetalPurityType ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
                      <SmartDropdown
                      value={metalName}
                      onChange={onChangeMetalName}
                      config={{
                        apiSubPath: '/products/master-tables/METAL_NAME/dropdown',
                        options: metalNameOptions,
                        placeholder: 'Select Metal Name',
                        valueKey: 'id',
                        labelKey: 'value',
                      }}
                    />
                </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Percentage*</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={purityPercentage}
                      onChange={(event) => onChangePurityPercentage(event.target.value)}
                      placeholder="75"
                      required
                    />
                  </div>
                </div>
              ) : null}

              {isMetalCaratageType ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
                      <SmartDropdown
                      value={metalName}
                      onChange={onChangeMetalName}
                      config={{
                        apiSubPath: '/products/master-tables/METAL_NAME/dropdown',
                        options: metalNameOptions,
                        placeholder: 'Select Metal Name',
                        valueKey: 'id',
                        labelKey: 'value',
                      }}
                    />
                </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Purity*</label>
                    <SmartDropdown
                      value={metalPurity}
                      onChange={onChangeMetalPurity}
                      config={{
                        apiSubPath: '/products/master-tables/METAL_PURITY/dropdown',
                        extraParams: selectedMetalId ? { metalId: selectedMetalId } : undefined,
                        options: filteredMetalPurities.map((option) => ({
                          ...option,
                          label: getMetalPurityDisplay(option),
                        })),
                        placeholder: 'Select Metal Purity',
                        valueKey: 'id',
                        labelKey: 'label',
                      }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Color*</label>
                    <SmartDropdown
                      value={metalColor}
                      onChange={onChangeMetalColor}
                      config={{
                        apiSubPath: '/products/master-tables/METAL_COLOR/dropdown',
                        extraParams: selectedMetalId ? { metalId: selectedMetalId } : undefined,
                        options: filteredMetalColors,
                        placeholder: 'Select Metal Color',
                        valueKey: 'id',
                        labelKey: 'value',
                      }}
                    />
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Caratage Name*</label>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={formValue}
                      onChange={(event) => onChangeValue(event.target.value)}
                      placeholder="Metal Caratage Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Alias Name*</label>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={formAliasName}
                      onChange={(event) => onChangeAliasName(event.target.value)}
                      placeholder="Alias Name"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Wastage</label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={defaultWastage}
                        onChange={(event) => onChangeDefaultWastage(event.target.value)}
                        placeholder="0.00"
                      />
                      <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Price/Gms</label>
                    <div className="flex">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full rounded-l border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={livePricePerGm}
                        onChange={(event) => onChangeLivePricePerGm(event.target.value)}
                        placeholder="Auto calculated (editable)"
                      />
                      <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-600">USD</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {!isCategoryScopedType && !isVendorType && !isLaborRuleType && !isOverheadRuleType ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={formDescription}
                  onChange={(event) => onChangeDescription(event.target.value)}
                  placeholder="Description"
                />
              </div>
              ) : null}
            </>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type={onSave ? 'button' : 'submit'}
              size="sm"
              disabled={loading}
              onMouseDown={onSave ? stopSaveEvent : undefined}
              onClick={onSave ? handleSaveClick : undefined}
            >
              {loading ? 'Saving...' : saveLabel}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

export function PacketFormModal({
  open,
  title,
  saveLabel,
  loading,
  form,
  masterOptions,
  onClose,
  onSubmit,
  onSave,
  onChange,
  onRegeneratePacketName,
}: PacketFormModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return null;
  }

  const stopSaveEvent = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (onSave) {
      onSave();
      return;
    }

    onSubmit(event);
  };

  const handleSaveClick = (event: MouseEvent<HTMLButtonElement>) => {
    stopSaveEvent(event);

    const form = formRef.current;
    if (!form || !form.reportValidity()) {
      return;
    }

    onSave?.();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/55 p-4 backdrop-blur-sm sm:p-6" onMouseDown={(event) => event.stopPropagation()} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <div className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <button
            type="button"
            className="rounded px-2 text-lg font-semibold text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-6">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Basic Info</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Stone*</label>
                <SmartDropdown
                  value={form.stone}
                  onChange={(nextValue, option) => onChange('stone', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_STONE/dropdown',
                    options: masterOptions.packetStones.some((option) => optionId(option.id) === form.stone) || !form.stone
                      ? masterOptions.packetStones
                      : [{ id: form.stone, value: form.stone }, ...masterOptions.packetStones],
                    placeholder: 'Select Stone',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Shape*</label>
                <SmartDropdown
                  value={form.shape}
                  onChange={(nextValue, option) => onChange('shape', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_SHAPE/dropdown',
                    options: masterOptions.packetShapes.some((option) => optionId(option.id) === form.shape) || !form.shape
                      ? masterOptions.packetShapes
                      : [{ id: form.shape, value: form.shape }, ...masterOptions.packetShapes],
                    placeholder: 'Select Shape',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Size*</label>
                <SmartDropdown
                  value={form.size}
                  onChange={(nextValue, option) => onChange('size', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_SIZE/dropdown',
                    options: masterOptions.packetSizes.some((option) => optionId(option.id) === form.size) || !form.size
                      ? masterOptions.packetSizes
                      : [{ id: form.size, value: form.size }, ...masterOptions.packetSizes],
                    placeholder: 'Select Size',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Cut*</label>
                <SmartDropdown
                  value={form.cut}
                  onChange={(nextValue, option) => onChange('cut', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_CUT/dropdown',
                    options: masterOptions.packetCuts.some((option) => optionId(option.id) === form.cut) || !form.cut
                      ? masterOptions.packetCuts
                      : [{ id: form.cut, value: form.cut }, ...masterOptions.packetCuts],
                    placeholder: 'Select Cut',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Color*</label>
                <SmartDropdown
                  value={form.color}
                  onChange={(nextValue, option) => onChange('color', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_COLOR/dropdown',
                    options: masterOptions.packetColors.some((option) => optionId(option.id) === form.color) || !form.color
                      ? masterOptions.packetColors
                      : [{ id: form.color, value: form.color }, ...masterOptions.packetColors],
                    placeholder: 'Select Color',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Quality*</label>
                <SmartDropdown
                  value={form.quality}
                  onChange={(nextValue, option) => onChange('quality', nextValue, option)}
                  config={{
                    apiSubPath: '/products/master-tables/PACKET_QUALITY/dropdown',
                    options: masterOptions.packetQualities.some((option) => optionId(option.id) === form.quality) || !form.quality
                      ? masterOptions.packetQualities
                      : [{ id: form.quality, value: form.quality }, ...masterOptions.packetQualities],
                    placeholder: 'Select Quality',
                    valueKey: 'id',
                    labelKey: 'value',
                  }}
                />
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Packet Name*</label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                    value={form.packetName}
                    onChange={(event) => onChange('packetName', event.target.value)}
                    placeholder="Packet Name"
                  />
                  <button
                    type="button"
                    className="inline-flex h-8 min-w-[2rem] shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold leading-none text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-50"
                    title="Regenerate packet name"
                    onClick={onRegeneratePacketName}
                  >
                    R
                  </button>
                </div>
              </div>
              <div className="xl:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Barcode</label>
                <input
                  className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                  value={form.barcode}
                  onChange={(event) => onChange('barcode', event.target.value.replace(/\D/g, ''))}
                  placeholder="Auto generated if blank"
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Purchase Weight & Price (Optional)</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Price In</label>
                <div className="flex items-center gap-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="packet-price-in-master"
                      value="WT"
                      checked={form.priceIn === 'WT'}
                      onChange={(event) => onChange('priceIn', event.target.value)}
                    />
                    <span>Wt</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="packet-price-in-master"
                      value="PCS"
                      checked={form.priceIn === 'PCS'}
                      onChange={(event) => onChange('priceIn', event.target.value)}
                    />
                    <span>Pcs</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Weight Unit</label>
                <div className="flex min-h-[38px] items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                  <span className="text-slate-700">Carats</span>
                  <span className="rounded-md bg-[#f4ede3] px-2 py-0.5 text-xs font-bold tracking-wide text-[#80632f]">
                    CTS
                  </span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Selling Price*</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-l border border-slate-300 px-2 py-2 text-sm"
                    value={form.sellingPrice}
                    onChange={(event) => onChange('sellingPrice', event.target.value)}
                    placeholder="Price"
                  />
                  <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600">USD</span>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Weight/Pc.</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    className="w-full rounded-l border border-slate-300 px-2 py-2 text-sm"
                    value={form.weightPerPc}
                    onChange={(event) => onChange('weightPerPc', event.target.value)}
                    placeholder="Weight/Pc."
                  />
                  <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600">CTS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button
              type={onSave ? 'button' : 'submit'}
              size="sm"
              disabled={loading}
              onMouseDown={onSave ? stopSaveEvent : undefined}
              onClick={onSave ? handleSaveClick : undefined}
            >
              {loading ? 'Saving...' : saveLabel}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}





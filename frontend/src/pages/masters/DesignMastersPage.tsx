import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Pagination from '../../components/common/Pagination';
import api from '../../services/api';

type DesignMasterType =
  | 'JEWELRY_GROUP'
  | 'COLLECTION'
  | 'JEWELRY_SIZE'
  | 'TAG'
  | 'DESIGN_STATUS'
  | 'STAGE'
  | 'METAL_NAME'
  | 'METAL_COLOR'
  | 'METAL_PURITY'
  | 'METAL_CARATAGE'
  | 'GOLD_COLOUR'
  | 'DIAMOND_TYPE'
  | 'DIAMOND_SPREAD'
  | 'LABOR_HEAD'
  | 'FINDING_HEAD'
  | 'PACKET_STONE'
  | 'PACKET_SHAPE'
  | 'PACKET_SIZE'
  | 'PACKET_CUT'
  | 'PACKET_COLOR'
  | 'PACKET_QUALITY';

type MasterCategoryType = DesignMasterType | 'STONE_PACKET';
type FindingPriceIn = 'PIECES' | 'GRAM' | 'PAIR' | 'INCHES';

interface MasterOption {
  id: string;
  value: string;
  aliasName?: string;
  jewelryGroupId?: string;
  jewelryGroup?: string;
  metalName?: string;
  purityPercentage?: number;
  marketPricePerOunce?: number;
  marketPricePerGm?: number;
  livePricePerGm?: number;
  defaultWastagePercent?: number;
}

interface MasterRow {
  id: string;
  masterType: DesignMasterType;
  value: string;
  aliasName?: string | null;
  jewelryGroupId?: string | null;
  jewelryGroup?: string | null;
  description?: string | null;
  findingNo?: string | null;
  metalCaratage?: string | null;
  priceIn?: FindingPriceIn | null;
  pricePerUnit?: number | null;
  dimensions?: string | null;
  weightPerUnit?: number | null;
  metalName?: string | null;
  metalColor?: string | null;
  metalPurity?: string | null;
  purityPercentage?: number | null;
  marketPricePerOunce?: number | null;
  marketPricePerGm?: number | null;
  livePricePerGm?: number | null;
  defaultWastagePercent?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PacketRow {
  id: string;
  packetName: string;
  stone: string | null;
  shape: string | null;
  size: string | null;
  cut: string | null;
  color: string | null;
  quality: string | null;
  priceIn: 'WT' | 'PCS';
  sellingPrice: number | null;
  weightPerPc: number | null;
  pieces: number;
  weight: number;
  weightUnit: 'CTS' | 'GMS';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface MasterTypeConfig {
  value: MasterCategoryType;
  label: string;
  icon: string;
  accentClass: string;
  hint: string;
}

const MASTER_TYPE_CONFIGS: MasterTypeConfig[] = [
  {
    value: 'JEWELRY_GROUP',
    label: 'Category',
    icon: 'JG',
    accentClass: 'bg-blue-50 text-blue-700 ring-blue-200',
    hint: 'Ring, Bracelet, Pendant',
  },
  {
    value: 'COLLECTION',
    label: 'Sub Category',
    icon: 'CL',
    accentClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    hint: 'Sub categories linked to categories',
  },
  {
    value: 'JEWELRY_SIZE',
    label: 'Jewelry Size',
    icon: 'SZ',
    accentClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    hint: 'US, CM, inch sizes',
  },
  {
    value: 'TAG',
    label: 'Tags',
    icon: 'TG',
    accentClass: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
    hint: 'Search and grouping tags',
  },
  {
    value: 'DESIGN_STATUS',
    label: 'Design Status',
    icon: 'ST',
    accentClass: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    hint: 'Active, Mold, Inactive',
  },
  {
    value: 'STAGE',
    label: 'Stage',
    icon: 'SG',
    accentClass: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    hint: 'Sketch, CAD, Casting',
  },
  {
    value: 'METAL_NAME',
    label: 'Metal',
    icon: 'MN',
    accentClass: 'bg-yellow-50 text-yellow-800 ring-yellow-200',
    hint: 'Base pure metal prices',
  },
  {
    value: 'METAL_COLOR',
    label: 'Metal Color',
    icon: 'MC',
    accentClass: 'bg-orange-50 text-orange-700 ring-orange-200',
    hint: 'Color options per metal',
  },
  {
    value: 'METAL_PURITY',
    label: 'Metal Purity',
    icon: 'MP',
    accentClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    hint: 'Purity with percentage',
  },
  {
    value: 'METAL_CARATAGE',
    label: 'Metal Caratage',
    icon: 'MK',
    accentClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    hint: 'Metal + purity + color mapping',
  },
  {
    value: 'DIAMOND_TYPE',
    label: 'Diamond Type',
    icon: 'DT',
    accentClass: 'bg-teal-50 text-teal-700 ring-teal-200',
    hint: 'Lab, Natural',
  },
  {
    value: 'DIAMOND_SPREAD',
    label: 'Diamond Spread',
    icon: 'DP',
    accentClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    hint: '1/2 Way, 3/4 Way, Full',
  },
  {
    value: 'LABOR_HEAD',
    label: 'Labor Head',
    icon: 'LH',
    accentClass: 'bg-purple-50 text-purple-700 ring-purple-200',
    hint: 'Labor line item heads',
  },
  {
    value: 'PACKET_STONE',
    label: 'Stone Type',
    icon: 'PS',
    accentClass: 'bg-sky-50 text-sky-700 ring-sky-200',
    hint: 'Stone type options',
  },
  {
    value: 'PACKET_SHAPE',
    label: 'Stone Shape',
    icon: 'PH',
    accentClass: 'bg-lime-50 text-lime-700 ring-lime-200',
    hint: 'Stone shape options',
  },
  {
    value: 'PACKET_SIZE',
    label: 'Stone Size',
    icon: 'PZ',
    accentClass: 'bg-orange-50 text-orange-700 ring-orange-200',
    hint: 'Stone size options',
  },
  {
    value: 'PACKET_CUT',
    label: 'Stone Cut',
    icon: 'PC',
    accentClass: 'bg-red-50 text-red-700 ring-red-200',
    hint: 'Stone cut options',
  },
  {
    value: 'PACKET_COLOR',
    label: 'Stone Color',
    icon: 'PO',
    accentClass: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    hint: 'Stone color options',
  },
  {
    value: 'PACKET_QUALITY',
    label: 'Stone Quality',
    icon: 'PQ',
    accentClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    hint: 'Stone quality options',
  },
  {
    value: 'STONE_PACKET',
    label: 'Stone Packet',
    icon: 'PK',
    accentClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    hint: 'Gemstone packet masters',
  },
];

function MasterCategoryIcon({ type }: { type: MasterCategoryType }) {
  if (
    type === 'GOLD_COLOUR' ||
    type === 'METAL_NAME' ||
    type === 'METAL_COLOR' ||
    type === 'METAL_PURITY' ||
    type === 'METAL_CARATAGE'
  ) {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 3c-3.2 3.8-5 6-5 9a5 5 0 1 0 10 0c0-3-1.8-5.2-5-9Z" />
      </svg>
    );
  }

  if (type === 'DIAMOND_TYPE' || type === 'DIAMOND_SPREAD') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 9 8 4h8l4 5-8 11L4 9Z" />
      </svg>
    );
  }

  if (type === 'TAG') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m20 10-8 8-8-8V4h6l10 6Z" />
        <circle cx="8.5" cy="8.5" r="1.3" />
      </svg>
    );
  }

  if (type === 'LABOR_HEAD') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m4 20 7-7" />
        <path d="m14 4 6 6-1.5 1.5-6-6L14 4Z" />
        <path d="M8 10 4 6l2-2 4 4" />
      </svg>
    );
  }

  if (type === 'PACKET_STONE' || type === 'PACKET_SHAPE' || type === 'PACKET_SIZE' || type === 'PACKET_CUT' || type === 'PACKET_COLOR' || type === 'PACKET_QUALITY' || type === 'STONE_PACKET') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
        <path d="m4 7.5 8 4.5 8-4.5" />
      </svg>
    );
  }

  if (type === 'DESIGN_STATUS' || type === 'STAGE') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 6h12M8 12h12M8 18h12" />
        <circle cx="4" cy="6" r="1" />
        <circle cx="4" cy="12" r="1" />
        <circle cx="4" cy="18" r="1" />
      </svg>
    );
  }

  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

interface MasterModalProps {
  open: boolean;
  title: string;
  saveLabel: string;
  loading: boolean;
  valueLabel: string;
  formValue: string;
  formAliasName: string;
  formDescription: string;
  isCategoryScopedType: boolean;
  isFindingType: boolean;
  isMetalNameType: boolean;
  isMetalColorType: boolean;
  isMetalPurityType: boolean;
  isMetalCaratageType: boolean;
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
  jewelryGroupOptions: MasterOption[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChangeValue: (value: string) => void;
  onChangeAliasName: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeFindingNo: (value: string) => void;
  onChangeJewelryGroupId: (value: string) => void;
  onChangeMetalCaratage: (value: string) => void;
  onChangeMetalName: (value: string) => void;
  onChangeMetalColor: (value: string) => void;
  onChangeMetalPurity: (value: string) => void;
  onChangePurityPercentage: (value: string) => void;
  onChangeMarketPricePerOunce: (value: string) => void;
  onChangeMarketPricePerGm: (value: string) => void;
  onChangeLivePricePerGm: (value: string) => void;
  onChangeDefaultWastage: (value: string) => void;
  onChangePriceIn: (value: FindingPriceIn) => void;
  onChangePricePerUnit: (value: string) => void;
  onChangeDimensions: (value: string) => void;
  onChangeWeightPerUnit: (value: string) => void;
}

interface PacketModalProps {
  open: boolean;
  title: string;
  saveLabel: string;
  loading: boolean;
  form: PacketForm;
  masterOptions: PacketMasterOptions;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onChange: (key: keyof PacketForm, value: string) => void;
  onRegeneratePacketName: () => void;
}

interface PacketForm {
  packetName: string;
  stone: string;
  shape: string;
  size: string;
  color: string;
  quality: string;
  priceIn: 'WT' | 'PCS';
  sellingPrice: string;
  weightPerPc: string;
  weightIn: 'CTS' | 'GRAM';
}

interface PacketMasterOptions {
  packetStones: MasterOption[];
  packetShapes: MasterOption[];
  packetSizes: MasterOption[];
  packetColors: MasterOption[];
  packetQualities: MasterOption[];
}

interface MetalMasterOptions {
  jewelryGroups: MasterOption[];
  metalNames: MasterOption[];
  metalColors: MasterOption[];
  metalPurities: MasterOption[];
  metalCaratages: MasterOption[];
}

const defaultPacketForm: PacketForm = {
  packetName: '',
  stone: '',
  shape: '',
  size: '',
  color: '',
  quality: '',
  priceIn: 'WT',
  sellingPrice: '',
  weightPerPc: '',
  weightIn: 'CTS',
};

const emptyPacketMasterOptions: PacketMasterOptions = {
  packetStones: [],
  packetShapes: [],
  packetSizes: [],
  packetColors: [],
  packetQualities: [],
};

const emptyMetalMasterOptions: MetalMasterOptions = {
  jewelryGroups: [],
  metalNames: [],
  metalColors: [],
  metalPurities: [],
  metalCaratages: [],
};

function parseNum(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalNum(value: string): number | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toPacketAbbreviation(value: string): string {
  const normalized = (value || '').trim();
  if (!normalized) {
    return '';
  }

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

function buildPacketNameFromForm(
  form: Pick<PacketForm, 'stone' | 'shape' | 'size' | 'color' | 'quality'>,
): string {
  const parts = [form.stone, form.shape, form.size, form.color, form.quality]
    .map((entry) => toPacketAbbreviation((entry || '').trim()))
    .filter((entry) => entry.length > 0);
  return parts.join('-');
}

function getMetalPurityDisplay(option: MasterOption): string {
  return (option.aliasName || option.value || '').trim();
}

function MasterModal({
  open,
  title,
  saveLabel,
  loading,
  valueLabel,
  formValue,
  formAliasName,
  formDescription,
  isCategoryScopedType,
  isFindingType,
  isMetalNameType,
  isMetalColorType,
  isMetalPurityType,
  isMetalCaratageType,
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
  jewelryGroupOptions,
  onClose,
  onSubmit,
  onChangeValue,
  onChangeAliasName,
  onChangeDescription,
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
}: MasterModalProps) {
  if (!open) {
    return null;
  }

  const normalizeLookup = (value?: string | null): string =>
    (value || '').trim().toLowerCase();
  const filteredMetalColors =
    metalName.trim().length > 0
      ? metalColorOptions.filter(
          (option) => normalizeLookup(option.metalName) === normalizeLookup(metalName),
        )
      : metalColorOptions;
  const filteredMetalPurities =
    metalName.trim().length > 0
      ? metalPurityOptions.filter(
          (option) => normalizeLookup(option.metalName) === normalizeLookup(metalName),
        )
      : metalPurityOptions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
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

        <form onSubmit={onSubmit} className="space-y-4 p-6">
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
                <select
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={jewelryGroupId}
                  onChange={(event) => onChangeJewelryGroupId(event.target.value)}
                  required
                >
                  <option value="">Select Category</option>
                  {jewelryGroupOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.aliasName || option.value}
                    </option>
                  ))}
                </select>
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

          {!isFindingType && !isMetalCaratageType && !isCategoryScopedType ? (
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
                  <select
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    value={metalName}
                    onChange={(event) => onChangeMetalName(event.target.value)}
                    required
                  >
                    <option value="">Select Metal Name</option>
                    {metalNameOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isMetalPurityType ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Name*</label>
                    <select
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={metalName}
                      onChange={(event) => onChangeMetalName(event.target.value)}
                      required
                    >
                    <option value="">Select Metal Name</option>
                    {metalNameOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
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
                    <select
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={metalName}
                      onChange={(event) => onChangeMetalName(event.target.value)}
                      required
                    >
                    <option value="">Select Metal Name</option>
                    {metalNameOptions.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
                </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Purity*</label>
                    <select
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={metalPurity}
                      onChange={(event) => onChangeMetalPurity(event.target.value)}
                      required
                    >
                      <option value="">Select Metal Purity</option>
                      {filteredMetalPurities.map((option) => (
                        <option key={option.id} value={option.value}>
                          {getMetalPurityDisplay(option)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Color*</label>
                    <select
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={metalColor}
                      onChange={(event) => onChangeMetalColor(event.target.value)}
                      required
                    >
                    <option value="">Select Metal Color</option>
                    {filteredMetalColors.map((option) => (
                      <option key={option.id} value={option.value}>
                        {option.aliasName || option.value}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Metal Caratage Name*</label>
                    <input
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={formAliasName}
                      onChange={(event) => onChangeAliasName(event.target.value)}
                      placeholder="Metal Caratage Name"
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

              {!isCategoryScopedType ? (
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
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : saveLabel}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PacketModal({
  open,
  title,
  saveLabel,
  loading,
  form,
  masterOptions,
  onClose,
  onSubmit,
  onChange,
  onRegeneratePacketName,
}: PacketModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
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

        <form onSubmit={onSubmit} className="space-y-4 p-6">
          <p className="text-sm font-medium text-rose-700">* Required fields</p>

          <div className="rounded border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Basic Info</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Stone*</label>
                <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={form.stone} onChange={(event) => onChange('stone', event.target.value)}>
                  <option value="">Select Stone</option>
                  {!masterOptions.packetStones.some((option) => option.value === form.stone) && form.stone ? (
                    <option value={form.stone}>{form.stone}</option>
                  ) : null}
                  {masterOptions.packetStones.map((option) => (
                    <option key={option.id} value={option.value}>{option.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Shape*</label>
                <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={form.shape} onChange={(event) => onChange('shape', event.target.value)}>
                  <option value="">Select Shape</option>
                  {!masterOptions.packetShapes.some((option) => option.value === form.shape) && form.shape ? (
                    <option value={form.shape}>{form.shape}</option>
                  ) : null}
                  {masterOptions.packetShapes.map((option) => (
                    <option key={option.id} value={option.value}>{option.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Size*</label>
                <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={form.size} onChange={(event) => onChange('size', event.target.value)}>
                  <option value="">Select Size</option>
                  {!masterOptions.packetSizes.some((option) => option.value === form.size) && form.size ? (
                    <option value={form.size}>{form.size}</option>
                  ) : null}
                  {masterOptions.packetSizes.map((option) => (
                    <option key={option.id} value={option.value}>{option.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Color*</label>
                <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={form.color} onChange={(event) => onChange('color', event.target.value)}>
                  <option value="">Select Color</option>
                  {!masterOptions.packetColors.some((option) => option.value === form.color) && form.color ? (
                    <option value={form.color}>{form.color}</option>
                  ) : null}
                  {masterOptions.packetColors.map((option) => (
                    <option key={option.id} value={option.value}>{option.value}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Quality*</label>
                <select className="w-full rounded border border-slate-300 px-2 py-2 text-sm" value={form.quality} onChange={(event) => onChange('quality', event.target.value)}>
                  <option value="">Select Quality</option>
                  {!masterOptions.packetQualities.some((option) => option.value === form.quality) && form.quality ? (
                    <option value={form.quality}>{form.quality}</option>
                  ) : null}
                  {masterOptions.packetQualities.map((option) => (
                    <option key={option.id} value={option.value}>{option.value}</option>
                  ))}
                </select>
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
                <label className="mb-1 block text-xs font-medium text-slate-700">Weight In</label>
                <div className="flex items-center gap-3 rounded border border-slate-300 bg-white px-3 py-2 text-sm">
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="packet-weight-in-master"
                      value="CTS"
                      checked={form.weightIn === 'CTS'}
                      onChange={(event) => onChange('weightIn', event.target.value)}
                    />
                    <span>Cts</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5">
                    <input
                      type="radio"
                      name="packet-weight-in-master"
                      value="GRAM"
                      checked={form.weightIn === 'GRAM'}
                      onChange={(event) => onChange('weightIn', event.target.value)}
                    />
                    <span>Gram</span>
                  </label>
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
                  <span className="inline-flex items-center rounded-r border border-l-0 border-slate-300 bg-slate-100 px-3 text-xs font-semibold text-slate-600">
                    {form.weightIn === 'GRAM' ? 'GMS' : 'CTS'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Saving...' : saveLabel}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DesignMastersPage() {
  const [selectedType, setSelectedType] = useState<MasterCategoryType>('JEWELRY_GROUP');
  const [viewInactive, setViewInactive] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [packetRows, setPacketRows] = useState<PacketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterRow | null>(null);
  const [editingPacket, setEditingPacket] = useState<PacketRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formValue, setFormValue] = useState('');
  const [formAliasName, setFormAliasName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFindingNo, setFormFindingNo] = useState('');
  const [formJewelryGroupId, setFormJewelryGroupId] = useState('');
  const [formMetalCaratage, setFormMetalCaratage] = useState('');
  const [formMetalName, setFormMetalName] = useState('');
  const [formMetalColor, setFormMetalColor] = useState('');
  const [formMetalPurity, setFormMetalPurity] = useState('');
  const [formPurityPercentage, setFormPurityPercentage] = useState('');
  const [formMarketPricePerOunce, setFormMarketPricePerOunce] = useState('');
  const [formMarketPricePerGm, setFormMarketPricePerGm] = useState('');
  const [formLivePricePerGm, setFormLivePricePerGm] = useState('');
  const [formDefaultWastage, setFormDefaultWastage] = useState('');
  const [formPriceIn, setFormPriceIn] = useState<FindingPriceIn>('PIECES');
  const [formPricePerUnit, setFormPricePerUnit] = useState('');
  const [formDimensions, setFormDimensions] = useState('');
  const [formWeightPerUnit, setFormWeightPerUnit] = useState('');
  const [packetForm, setPacketForm] = useState<PacketForm>(defaultPacketForm);
  const [packetNameManuallyEdited, setPacketNameManuallyEdited] = useState(false);
  const [packetMasterOptions, setPacketMasterOptions] = useState<PacketMasterOptions>(emptyPacketMasterOptions);
  const [metalMasterOptions, setMetalMasterOptions] = useState<MetalMasterOptions>(emptyMetalMasterOptions);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const isPacketType = selectedType === 'STONE_PACKET';

  const selectedConfig = useMemo(
    () => MASTER_TYPE_CONFIGS.find((config) => config.value === selectedType) || MASTER_TYPE_CONFIGS[0],
    [selectedType],
  );
  const categoryBlocks = useMemo(() => {
    const metalTypes = new Set<MasterCategoryType>([
      'METAL_NAME',
      'METAL_COLOR',
      'METAL_PURITY',
      'METAL_CARATAGE',
      'GOLD_COLOUR',
    ]);
    const stoneTypes = new Set<MasterCategoryType>([
      'DIAMOND_TYPE',
      'DIAMOND_SPREAD',
      'PACKET_STONE',
      'PACKET_SHAPE',
      'PACKET_SIZE',
      'PACKET_CUT',
      'PACKET_COLOR',
      'PACKET_QUALITY',
      'STONE_PACKET',
    ]);

    return [
      {
        key: 'general',
        label: 'General',
        hint: 'Core masters used across the design module',
        configs: MASTER_TYPE_CONFIGS.filter(
          (config) => !metalTypes.has(config.value) && !stoneTypes.has(config.value),
        ),
      },
      {
        key: 'metal',
        label: 'Metal',
        hint: 'Metal name, color, purity and caratage definitions',
        configs: MASTER_TYPE_CONFIGS.filter((config) => metalTypes.has(config.value)),
      },
      {
        key: 'stone',
        label: 'Stone',
        hint: 'Diamond and stone packet related masters',
        configs: MASTER_TYPE_CONFIGS.filter((config) => stoneTypes.has(config.value)),
      },
    ];
  }, []);
  const [collapsedBlocks, setCollapsedBlocks] = useState<{
    general: boolean;
    metal: boolean;
    stone: boolean;
  }>({
    general: false,
    metal: true,
    stone: true,
  });
  const toggleCategoryBlock = (blockKey: keyof typeof collapsedBlocks) => {
    setCollapsedBlocks((prev) => ({
      ...prev,
      [blockKey]: !prev[blockKey],
    }));
  };

  useEffect(() => {
    if (!showModal || !isPacketType || packetNameManuallyEdited) {
      return;
    }
    const computedPacketName = buildPacketNameFromForm(packetForm);
    if (computedPacketName && computedPacketName !== packetForm.packetName) {
      setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    }
  }, [isPacketType, packetForm, packetNameManuallyEdited, showModal]);

  useEffect(() => {
    if (selectedType !== 'METAL_NAME') return;
    const ounce = parseNum(formMarketPricePerOunce);
    if (ounce <= 0) return;
    const computedPerGm = ounce / 31.1035;
    const rounded = computedPerGm.toFixed(2);
    if (rounded !== formMarketPricePerGm) {
      setFormMarketPricePerGm(rounded);
    }
  }, [formMarketPricePerOunce, formMarketPricePerGm, selectedType]);

  useEffect(() => {
    if (selectedType !== 'METAL_CARATAGE') return;
    const selectedMetal = metalMasterOptions.metalNames.find((row) => row.value === formMetalName);
    const selectedPurity = metalMasterOptions.metalPurities.find(
      (row) => row.value === formMetalPurity && (!formMetalName || row.metalName === formMetalName),
    );
    const purityPercent =
      selectedPurity?.purityPercentage !== undefined
        ? selectedPurity.purityPercentage
        : parseNum(formPurityPercentage);
    if (purityPercent > 0 && String(purityPercent) !== formPurityPercentage) {
      setFormPurityPercentage(String(purityPercent));
    }

    const basePricePerGm =
      selectedMetal?.marketPricePerGm !== undefined ? selectedMetal.marketPricePerGm : 0;
    const shouldAutoFillLivePrice = !editingRow || formLivePricePerGm.trim().length === 0;
    if (basePricePerGm > 0 && purityPercent > 0 && shouldAutoFillLivePrice) {
      const computed = ((basePricePerGm * purityPercent) / 100).toFixed(2);
      if (computed !== formLivePricePerGm) {
        setFormLivePricePerGm(computed);
      }
    }

    if (formMetalName && formMetalPurity && formMetalColor) {
      const purityToken = selectedPurity ? getMetalPurityDisplay(selectedPurity) : formMetalPurity;
      const computedValue = `${purityToken}-${formMetalColor}-${formMetalName}`;
      if (computedValue !== formValue) {
        setFormValue(computedValue);
      }
      if (computedValue !== formAliasName) {
        setFormAliasName(computedValue);
      }
    }
  }, [
    editingRow,
    formMetalColor,
    formLivePricePerGm,
    formMetalName,
    formMetalPurity,
    formPurityPercentage,
    formValue,
    metalMasterOptions.metalNames,
    metalMasterOptions.metalPurities,
    selectedType,
  ]);

  const fetchRows = async () => {
    setLoading(true);
    try {
      if (isPacketType) {
        const response = await api.get('/products/packets', {
          params: {
            status: viewInactive ? 'INACTIVE' : 'ACTIVE',
            search: searchTerm || undefined,
            limit: 200,
          },
        });
        setPacketRows(response.data?.data || []);
        setMasterRows([]);
      } else {
        const response = await api.get('/products/masters', {
          params: {
            type: selectedType,
            status: viewInactive ? 'INACTIVE' : 'ACTIVE',
            search: searchTerm || undefined,
          },
        });
        setMasterRows(response.data?.data || []);
        setPacketRows([]);
      }
    } catch {
      setMasterRows([]);
      setPacketRows([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPacketMasterOptions = async () => {
    try {
      const response = await api.get('/products/masters');
      setPacketMasterOptions({
        packetStones: response.data?.packetStones || [],
        packetShapes: response.data?.packetShapes || [],
        packetSizes: response.data?.packetSizes || [],
        packetColors: response.data?.packetColors || [],
        packetQualities: response.data?.packetQualities || [],
      });
    } catch {
      setPacketMasterOptions(emptyPacketMasterOptions);
    }
  };

  const fetchMetalMasterOptions = async () => {
    try {
      const response = await api.get('/products/masters');
      setMetalMasterOptions({
        jewelryGroups: response.data?.jewelryGroups || [],
        metalNames: response.data?.metalNames || [],
        metalColors: response.data?.metalColors || [],
        metalPurities: response.data?.metalPurities || [],
        metalCaratages: response.data?.metalCaratages || [],
      });
    } catch {
      setMetalMasterOptions(emptyMetalMasterOptions);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [selectedType, viewInactive, searchTerm]);

  useEffect(() => {
    fetchPacketMasterOptions();
    fetchMetalMasterOptions();
  }, []);

  useEffect(() => {
    if (selectedType === 'STONE_PACKET') {
      fetchPacketMasterOptions();
    }
    if (
      selectedType === 'METAL_NAME' ||
      selectedType === 'METAL_COLOR' ||
      selectedType === 'METAL_PURITY' ||
      selectedType === 'METAL_CARATAGE'
    ) {
      fetchMetalMasterOptions();
    }
  }, [selectedType]);

  const resetModalState = () => {
    setEditingRow(null);
    setEditingPacket(null);
    setFormValue('');
    setFormAliasName('');
    setFormDescription('');
    setFormFindingNo('');
    setFormJewelryGroupId('');
    setFormMetalCaratage('');
    setFormMetalName('');
    setFormMetalColor('');
    setFormMetalPurity('');
    setFormPurityPercentage('');
    setFormMarketPricePerOunce('');
    setFormMarketPricePerGm('');
    setFormLivePricePerGm('');
    setFormDefaultWastage('');
    setFormPriceIn('PIECES');
    setFormPricePerUnit('');
    setFormDimensions('');
    setFormWeightPerUnit('');
    setPacketForm(defaultPacketForm);
    setPacketNameManuallyEdited(false);
  };

  const openCreate = () => {
    resetModalState();
    setShowModal(true);
  };

  const openEditMaster = (row: MasterRow) => {
    setEditingPacket(null);
    setEditingRow(row);
    setFormValue(row.value || '');
    setFormAliasName(row.aliasName || row.value || '');
    setFormDescription(row.description || '');
    setFormFindingNo(row.findingNo || '');
    setFormJewelryGroupId(
      row.jewelryGroupId ||
        metalMasterOptions.jewelryGroups.find((option) => option.value === row.jewelryGroup)?.id ||
        '',
    );
    setFormMetalCaratage(row.metalCaratage || '');
    setFormMetalName(row.metalName || '');
    setFormMetalColor(row.metalColor || '');
    setFormMetalPurity(row.metalPurity || '');
    setFormPurityPercentage(
      row.purityPercentage !== null && row.purityPercentage !== undefined
        ? String(row.purityPercentage)
        : '',
    );
    setFormMarketPricePerOunce(
      row.marketPricePerOunce !== null && row.marketPricePerOunce !== undefined
        ? String(row.marketPricePerOunce)
        : '',
    );
    setFormMarketPricePerGm(
      row.marketPricePerGm !== null && row.marketPricePerGm !== undefined
        ? String(row.marketPricePerGm)
        : '',
    );
    setFormLivePricePerGm(
      row.livePricePerGm !== null && row.livePricePerGm !== undefined
        ? String(row.livePricePerGm)
        : '',
    );
    setFormDefaultWastage(
      row.defaultWastagePercent !== null && row.defaultWastagePercent !== undefined
        ? String(row.defaultWastagePercent)
        : '',
    );
    setFormPriceIn((row.priceIn as FindingPriceIn) || 'PIECES');
    setFormPricePerUnit(row.pricePerUnit !== null && row.pricePerUnit !== undefined ? String(row.pricePerUnit) : '');
    setFormDimensions(row.dimensions || '');
    setFormWeightPerUnit(row.weightPerUnit !== null && row.weightPerUnit !== undefined ? String(row.weightPerUnit) : '');
    setShowModal(true);
  };

  const openEditPacket = (row: PacketRow) => {
    setEditingRow(null);
    setEditingPacket(row);
    setPacketForm({
      packetName: row.packetName || '',
      stone: row.stone || '',
      shape: row.shape || '',
      size: row.size || '',
      color: row.color || '',
      quality: row.quality || '',
      priceIn: row.priceIn || 'WT',
      sellingPrice:
        row.sellingPrice !== null && row.sellingPrice !== undefined ? String(row.sellingPrice) : '',
      weightPerPc:
        row.weightPerPc !== null && row.weightPerPc !== undefined
          ? String(row.weightPerPc)
          : row.weight && row.pieces
            ? String(Number(row.weight) / Number(row.pieces))
            : '',
      weightIn: row.weightUnit === 'GMS' ? 'GRAM' : 'CTS',
    });
    setPacketNameManuallyEdited(true);
    setShowModal(true);
  };

  const updatePacketFormField = (key: keyof PacketForm, value: string) => {
    setPacketForm((prev) => {
      const next = { ...prev, [key]: value } as PacketForm;
      if (
        !packetNameManuallyEdited &&
        key !== 'packetName' &&
        key !== 'priceIn' &&
        key !== 'weightIn' &&
        key !== 'sellingPrice' &&
        key !== 'weightPerPc'
      ) {
        const computedPacketName = buildPacketNameFromForm(next);
        if (computedPacketName) {
          next.packetName = computedPacketName;
        }
      }
      return next;
    });
    if (key === 'packetName') {
      setPacketNameManuallyEdited(true);
    }
  };

  const regeneratePacketName = () => {
    const computedPacketName = buildPacketNameFromForm(packetForm);
    setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    setPacketNameManuallyEdited(false);
  };

  const handleSubmitModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPacketType) {
      const payload = {
        packetName: packetForm.packetName.trim(),
        stone: packetForm.stone.trim(),
        shape: packetForm.shape.trim(),
        size: packetForm.size.trim(),
        color: packetForm.color.trim(),
        quality: packetForm.quality.trim(),
        priceIn: packetForm.priceIn,
        sellingPrice: parseNum(packetForm.sellingPrice),
        weightPerPc: parseNum(packetForm.weightPerPc),
        pieces: 1,
        weight: parseNum(packetForm.weightPerPc),
        weightUnit: packetForm.weightIn === 'GRAM' ? 'GMS' : 'CTS',
      };

      if (!payload.packetName || !payload.stone || !payload.shape || !payload.size || !payload.color || !payload.quality) {
        window.alert('Packet Name, Stone, Shape, Size, Color and Quality are required.');
        return;
      }
      if (payload.sellingPrice < 0) {
        window.alert('Selling price cannot be negative.');
        return;
      }
      if (payload.weightPerPc <= 0) {
        window.alert('Weight/Pc must be greater than 0.');
        return;
      }

      setSaving(true);
      try {
        if (editingPacket) {
          await api.put(`/products/packets/${editingPacket.id}`, payload);
        } else {
          await api.post('/products/packets', payload);
        }
        setShowModal(false);
        resetModalState();
        fetchRows();
      } catch (error: any) {
        window.alert(error?.response?.data?.message || 'Unable to save packet.');
      } finally {
        setSaving(false);
      }
      return;
    }

    let value = formValue.trim();
    let aliasName = formAliasName.trim();
    if (selectedType === 'METAL_CARATAGE' && formMetalName && formMetalPurity && formMetalColor) {
      const autoValue = `${formMetalPurity}-${formMetalColor}-${formMetalName}`;
      if (!value) {
        value = autoValue;
      }
      if (!aliasName) {
        aliasName = autoValue;
      }
    }
    if (!value || !aliasName) {
      window.alert('Master name and alias name are required.');
      return;
    }

    const findingPayload =
      selectedType === 'FINDING_HEAD'
        ? {
            findingNo: formFindingNo.trim(),
            metalCaratage: formMetalCaratage.trim(),
            priceIn: formPriceIn,
            pricePerUnit: parseNum(formPricePerUnit),
            dimensions: formDimensions.trim() || null,
            weightPerUnit: parseNum(formWeightPerUnit),
          }
        : null;
    const defaultWastagePayload =
      selectedType === 'GOLD_COLOUR'
        ? {
            pricePerUnit:
              formPricePerUnit.trim().length > 0 ? parseNum(formPricePerUnit) : null,
          }
        : null;

    const selectedPurityOption =
      selectedType === 'METAL_CARATAGE'
        ? metalMasterOptions.metalPurities.find(
            (option) =>
              option.value === formMetalPurity &&
              (!formMetalName || option.metalName === formMetalName),
          )
        : null;
    const resolvedPurityPercentage =
      parseOptionalNum(formPurityPercentage) ??
      (selectedPurityOption?.purityPercentage ?? null);
    const metalPayload =
      selectedType === 'METAL_NAME'
        ? {
            marketPricePerOunce: parseOptionalNum(formMarketPricePerOunce),
            marketPricePerGm: parseOptionalNum(formMarketPricePerGm),
            livePricePerGm: parseOptionalNum(formLivePricePerGm),
          }
        : selectedType === 'METAL_COLOR'
          ? {
              metalName: formMetalName.trim(),
            }
          : selectedType === 'METAL_PURITY'
            ? {
                metalName: formMetalName.trim(),
                purityPercentage: parseOptionalNum(formPurityPercentage),
              }
            : selectedType === 'METAL_CARATAGE'
              ? {
                  metalName: formMetalName.trim(),
                  metalColor: formMetalColor.trim(),
                  metalPurity: formMetalPurity.trim(),
                  purityPercentage: resolvedPurityPercentage,
                  livePricePerGm: parseOptionalNum(formLivePricePerGm),
                  defaultWastagePercent: parseOptionalNum(formDefaultWastage) ?? 0,
                }
              : null;
    const jewelrySizePayload =
      selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION'
        ? {
            jewelryGroupId: formJewelryGroupId,
          }
        : null;
    const descriptionPayload = selectedType === 'FINDING_HEAD' ? null : formDescription.trim() || null;

    if (selectedType === 'FINDING_HEAD') {
      if (!findingPayload?.findingNo || !findingPayload?.metalCaratage) {
        window.alert('Finding No and Metal Caratage are required.');
        return;
      }
      if (formPricePerUnit.trim().length === 0 || formWeightPerUnit.trim().length === 0) {
        window.alert('Price/Unit and Weight/Unit are required.');
        return;
      }
    }
    if ((selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION') && !formJewelryGroupId.trim()) {
      window.alert('Category is required.');
      return;
    }

    if (selectedType === 'METAL_NAME') {
      if (
        parseOptionalNum(formMarketPricePerOunce) === null ||
        parseOptionalNum(formMarketPricePerGm) === null
      ) {
        window.alert('Market Price/Ounce and Market Price/Gms are required.');
        return;
      }
    }

    if (selectedType === 'METAL_COLOR' && !formMetalName.trim()) {
      window.alert('Metal Name is required.');
      return;
    }

    if (selectedType === 'METAL_PURITY') {
      if (!formMetalName.trim()) {
        window.alert('Metal Name is required.');
        return;
      }
      if (parseOptionalNum(formPurityPercentage) === null) {
        window.alert('Percentage is required.');
        return;
      }
    }

    if (selectedType === 'METAL_CARATAGE') {
      if (!formMetalName.trim() || !formMetalPurity.trim() || !formMetalColor.trim()) {
        window.alert('Metal Name, Metal Purity and Metal Color are required.');
        return;
      }
      if (resolvedPurityPercentage === null) {
        window.alert('Unable to resolve purity percentage for selected Metal Purity.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingRow) {
        await api.put(`/products/masters/${editingRow.id}`, {
          value,
          aliasName,
          description: descriptionPayload,
          ...(jewelrySizePayload || {}),
          ...(findingPayload || {}),
          ...(metalPayload || {}),
          ...(defaultWastagePayload || {}),
        });
      } else {
        await api.post('/products/masters', {
          masterType: selectedType,
          value,
          aliasName,
          description: descriptionPayload,
          ...(jewelrySizePayload || {}),
          ...(findingPayload || {}),
          ...(metalPayload || {}),
          ...(defaultWastagePayload || {}),
        });
      }
      setShowModal(false);
      resetModalState();
      fetchRows();
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to save master value.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (row: MasterRow | PacketRow) => {
    try {
      if (isPacketType) {
        await api.patch(`/products/packets/${row.id}/status`, { isActive: !row.isActive });
      } else {
        await api.patch(`/products/masters/${row.id}/status`, { isActive: !row.isActive });
      }
      fetchRows();
    } catch (error: any) {
      window.alert(error?.response?.data?.message || 'Unable to update status.');
    }
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchTerm('');
  };

  const getCurrentParams = (): Record<string, string> => {
    if (isPacketType) {
      return {
        status: viewInactive ? 'INACTIVE' : 'ACTIVE',
        ...(searchTerm ? { search: searchTerm } : {}),
      };
    }

    return {
      type: selectedType,
      status: viewInactive ? 'INACTIVE' : 'ACTIVE',
      ...(searchTerm ? { search: searchTerm } : {}),
    };
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get(
        isPacketType ? '/products/packets/export/template' : '/products/masters/export/template',
        {
          params: isPacketType ? undefined : { type: selectedType },
          responseType: 'blob',
        },
      );
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        isPacketType ? 'stone-packets-import-template.xlsx' : `${selectedType.toLowerCase()}-import-template.xlsx`,
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to download import template.');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(
        isPacketType ? '/products/packets/export' : '/products/masters/export',
        {
          params: getCurrentParams(),
          responseType: 'blob',
        },
      );
      downloadBlob(
        new Blob([response.data], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        isPacketType ? 'stone-packets-export.xlsx' : `${selectedType.toLowerCase()}-export.xlsx`,
      );
    } catch (error) {
      console.error(error);
      window.alert('Failed to export records.');
    }
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const response = await api.post(
        isPacketType ? '/products/packets/import' : '/products/masters/import',
        formData,
        {
          params: isPacketType ? undefined : { type: selectedType },
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );
      const summary = response.data as {
        totalRows: number;
        created: number;
        updated: number;
        failed: number;
        errors: string[];
      };
      const errorPreview =
        summary.errors.length > 0 ? `\n\nErrors:\n${summary.errors.slice(0, 10).join('\n')}` : '';
      window.alert(
        `Import completed.\nTotal Rows: ${summary.totalRows}\nCreated: ${summary.created}\nUpdated: ${summary.updated}\nFailed: ${summary.failed}${errorPreview}`,
      );
      fetchRows();
      if (isPacketType) {
        fetchPacketMasterOptions();
      } else {
        fetchMetalMasterOptions();
      }
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message;
      window.alert(Array.isArray(message) ? message.join(', ') : message || 'Failed to import records.');
    } finally {
      setImporting(false);
    }
  };

  const pageSize = 15;
  const rowsCount = isPacketType ? packetRows.length : masterRows.length;
  const totalPages = Math.max(1, Math.ceil(rowsCount / pageSize));
  const pageOffset = (page - 1) * pageSize;
  const pagedPacketRows = useMemo(
    () => packetRows.slice(pageOffset, pageOffset + pageSize),
    [packetRows, pageOffset, pageSize],
  );
  const pagedMasterRows = useMemo(
    () => masterRows.slice(pageOffset, pageOffset + pageSize),
    [masterRows, pageOffset, pageSize],
  );
  const showingFrom = rowsCount === 0 ? 0 : pageOffset + 1;
  const showingTo = Math.min(pageOffset + pageSize, rowsCount);

  useEffect(() => {
    setPage(1);
  }, [selectedType, searchTerm, viewInactive]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Design Masters</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage all dropdown masters and packet masters used in Add New Design.
        </p>
      </div>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary-50 text-primary-700 ring-1 ring-primary-200">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 7h14M5 12h14M5 17h14" />
              </svg>
            </span>
            Master Categories
          </h2>
          <span className="text-xs text-slate-500">Click a block to expand/collapse</span>
        </div>
        <div className="space-y-4">
          {categoryBlocks.map((block) => {
            const blockKey = block.key as keyof typeof collapsedBlocks;
            const isCollapsed = collapsedBlocks[blockKey];

            return (
              <div
                key={block.key}
                role="button"
                tabIndex={0}
                className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 cursor-pointer transition-colors hover:bg-slate-50"
                onClick={() => toggleCategoryBlock(blockKey)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleCategoryBlock(blockKey);
                  }
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{block.label}</h3>
                    <p className="text-xs text-slate-500">{block.hint}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700">
                    <span>{isCollapsed ? 'Show' : 'Hide'}</span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 8 4 4 4-4" />
                    </svg>
                  </span>
                </div>
                {!isCollapsed && (
                  <div
                    className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {block.configs.map((config) => {
                      const isSelected = config.value === selectedType;
                      return (
                        <button
                          key={config.value}
                          type="button"
                          className={`rounded-md border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-primary-400 bg-primary-50 shadow-sm ring-1 ring-primary-200'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                          }`}
                          onClick={() => {
                            setSelectedType(config.value);
                            setShowModal(false);
                            setSearchInput('');
                            setSearchTerm('');
                            resetModalState();
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`inline-flex h-8 w-8 items-center justify-center rounded ring-1 ${config.accentClass}`}>
                              <MasterCategoryIcon type={config.value} />
                            </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{config.label}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{selectedConfig.label} List</h2>
            <p className="text-xs text-slate-500">
              Showing {viewInactive ? 'inactive' : 'active'} entries only
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={handleDownloadTemplate}>
              Template
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={handleExport}>
              Export Excel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
            >
              {importing ? 'Importing...' : 'Import Excel'}
            </Button>
            <Button type="button" size="sm" variant={viewInactive ? 'secondary' : 'danger'} onClick={() => setViewInactive((prev) => !prev)}>
              {viewInactive ? 'View Active' : 'View Inactive'}
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              + {selectedConfig.label}
            </Button>
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportChange}
        />

        <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-col gap-2 md:flex-row">
          <input
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={isPacketType ? 'Search packet name, stone, shape, size, color, quality' : `Search ${selectedConfig.label} name, alias, or description`}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Search
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={clearSearch}>
              Clear
            </Button>
          </div>
        </form>

        <div className="app-table-shell">
          <div className="app-table-scroll scrollbar-top">
            {isPacketType ? (
              <table className="app-table app-table-compact min-w-[1400px]">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Packet Name</th>
                    <th className="app-table-head-cell">Stone</th>
                    <th className="app-table-head-cell">Shape</th>
                    <th className="app-table-head-cell">Size</th>
                    <th className="app-table-head-cell">Color</th>
                    <th className="app-table-head-cell">Quality</th>
                    <th className="app-table-head-cell">Pieces</th>
                    <th className="app-table-head-cell">Weight</th>
                    <th className="app-table-head-cell">Unit</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={13} className="app-table-empty">
                        Loading records...
                      </td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={13} className="app-table-empty">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    pagedPacketRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.packetName}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.stone || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.shape || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.size || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.color || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.quality || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.pieces}</td>
                        <td className="app-table-cell text-sm text-slate-700">{Number(row.weight || 0).toFixed(3)}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.weightUnit}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditPacket(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedType === 'METAL_NAME' ? (
              <table className="app-table app-table-compact min-w-[1200px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Metal Name</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Market/Oz</th>
                    <th className="app-table-head-cell">Market/Gm</th>
                    <th className="app-table-head-cell">Live/Gm</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="app-table-empty">Loading records...</td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={10} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.marketPricePerOunce !== null && row.marketPricePerOunce !== undefined ? Number(row.marketPricePerOunce).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.marketPricePerGm !== null && row.marketPricePerGm !== undefined ? Number(row.marketPricePerGm).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.livePricePerGm !== null && row.livePricePerGm !== undefined ? Number(row.livePricePerGm).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditMaster(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedType === 'METAL_COLOR' ? (
              <table className="app-table app-table-compact min-w-[1000px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Metal Name</th>
                    <th className="app-table-head-cell">Metal Color</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="app-table-empty">Loading records...</td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={8} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.metalName || '-'}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditMaster(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedType === 'METAL_PURITY' ? (
              <table className="app-table app-table-compact min-w-[1100px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Metal Name</th>
                    <th className="app-table-head-cell">Metal Purity</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Purity %</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="app-table-empty">Loading records...</td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={9} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.metalName || '-'}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.purityPercentage !== null && row.purityPercentage !== undefined
                            ? Number(row.purityPercentage).toFixed(Number(row.purityPercentage) % 1 === 0 ? 0 : 2)
                            : '-'}
                        </td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditMaster(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedType === 'METAL_CARATAGE' ? (
              <table className="app-table app-table-compact min-w-[1500px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Metal Caratage</th>
                    <th className="app-table-head-cell">Metal Name</th>
                    <th className="app-table-head-cell">Metal Purity</th>
                    <th className="app-table-head-cell">Purity %</th>
                    <th className="app-table-head-cell">Metal Color</th>
                    <th className="app-table-head-cell">Price/Gms</th>
                    <th className="app-table-head-cell">Default Wastage (%)</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="app-table-empty">Loading records...</td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={12} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.metalName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.metalPurity || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.purityPercentage !== null && row.purityPercentage !== undefined
                            ? Number(row.purityPercentage).toFixed(Number(row.purityPercentage) % 1 === 0 ? 0 : 2)
                            : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">{row.metalColor || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.livePricePerGm !== null && row.livePricePerGm !== undefined ? Number(row.livePricePerGm).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.defaultWastagePercent !== null && row.defaultWastagePercent !== undefined
                            ? Number(row.defaultWastagePercent).toFixed(2)
                            : '-'}
                        </td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditMaster(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="app-table app-table-compact min-w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">{selectedConfig.label}</th>
                    {selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? (
                      <th className="app-table-head-cell">Category</th>
                    ) : null}
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? 8 : 7}
                        className="app-table-empty"
                      >
                        Loading records...
                      </td>
                    </tr>
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? 8 : 7}
                        className="app-table-empty"
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        {selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? (
                          <td className="app-table-cell text-sm text-slate-700">{row.jewelryGroup || '-'}</td>
                        ) : null}
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || row.value}</td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.createdAt).toLocaleString()}</td>
                        <td className="app-table-cell whitespace-nowrap text-sm text-slate-600">{new Date(row.updatedAt).toLocaleString()}</td>
                        <td className="app-table-cell text-sm">
                          <div className="flex gap-2">
                            <button type="button" className="app-table-action" onClick={() => openEditMaster(row)}>
                              Edit
                            </button>
                            <button
                              type="button"
                              className={`app-table-action ${
                                row.isActive
                                  ? 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800'
                              }`}
                              onClick={() => handleToggleStatus(row)}
                            >
                              {row.isActive ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <span>Showing {showingFrom}–{showingTo} of {rowsCount} entries</span>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card>

      {isPacketType ? (
        <PacketModal
          open={showModal}
          title={`${editingPacket ? 'Update' : 'Add New'} ${selectedConfig.label}`}
          saveLabel={editingPacket ? 'Update' : 'Save'}
          loading={saving}
          form={packetForm}
          masterOptions={packetMasterOptions}
          onClose={() => {
            setShowModal(false);
            resetModalState();
          }}
          onSubmit={handleSubmitModal}
          onChange={updatePacketFormField}
          onRegeneratePacketName={regeneratePacketName}
        />
      ) : (
        <MasterModal
          open={showModal}
          title={`${editingRow ? 'Update' : 'Add New'} ${selectedConfig.label}`}
          saveLabel={editingRow ? 'Update' : 'Save'}
          loading={saving}
          valueLabel={selectedConfig.label}
          formValue={formValue}
          formAliasName={formAliasName}
          formDescription={formDescription}
          isCategoryScopedType={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION'}
          isFindingType={selectedType === 'FINDING_HEAD'}
          isMetalNameType={selectedType === 'METAL_NAME'}
          isMetalColorType={selectedType === 'METAL_COLOR'}
          isMetalPurityType={selectedType === 'METAL_PURITY'}
          isMetalCaratageType={selectedType === 'METAL_CARATAGE' || selectedType === 'GOLD_COLOUR'}
          findingNo={formFindingNo}
          jewelryGroupId={formJewelryGroupId}
          metalCaratage={formMetalCaratage}
          metalName={formMetalName}
          metalColor={formMetalColor}
          metalPurity={formMetalPurity}
          purityPercentage={formPurityPercentage}
          marketPricePerOunce={formMarketPricePerOunce}
          marketPricePerGm={formMarketPricePerGm}
          livePricePerGm={formLivePricePerGm}
          defaultWastage={formDefaultWastage}
          metalNameOptions={metalMasterOptions.metalNames}
          metalColorOptions={metalMasterOptions.metalColors}
          metalPurityOptions={metalMasterOptions.metalPurities}
          priceIn={formPriceIn}
          pricePerUnit={formPricePerUnit}
          dimensions={formDimensions}
          weightPerUnit={formWeightPerUnit}
          jewelryGroupOptions={metalMasterOptions.jewelryGroups}
          onClose={() => {
            setShowModal(false);
            resetModalState();
          }}
          onSubmit={handleSubmitModal}
          onChangeValue={setFormValue}
          onChangeAliasName={setFormAliasName}
          onChangeDescription={setFormDescription}
          onChangeFindingNo={setFormFindingNo}
          onChangeJewelryGroupId={setFormJewelryGroupId}
          onChangeMetalCaratage={setFormMetalCaratage}
          onChangeMetalName={setFormMetalName}
          onChangeMetalColor={setFormMetalColor}
          onChangeMetalPurity={setFormMetalPurity}
          onChangePurityPercentage={setFormPurityPercentage}
          onChangeMarketPricePerOunce={setFormMarketPricePerOunce}
          onChangeMarketPricePerGm={setFormMarketPricePerGm}
          onChangeLivePricePerGm={setFormLivePricePerGm}
          onChangeDefaultWastage={setFormDefaultWastage}
          onChangePriceIn={setFormPriceIn}
          onChangePricePerUnit={setFormPricePerUnit}
          onChangeDimensions={setFormDimensions}
          onChangeWeightPerUnit={setFormWeightPerUnit}
        />
      )}
    </div>
  );
}

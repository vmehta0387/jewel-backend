import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Card from '../../components/common/Card';
import Pagination from '../../components/common/Pagination';
import { SmartDropdownOption } from '../../components/common/SmartDropdown';
import TableLoadingRow from '../../components/common/TableLoadingRow';
import { MasterFormModal, PacketFormModal, buildPacketNameFromForm, buildPacketPayload, validatePacketPayload } from './components/MasterFormModal';
import { useAppDialog } from '../../components/common/useAppDialog';
import api from '../../services/api';
import { getStoredUser, hasActionPermission } from '../../utils/auth';

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
  | 'DIAMOND_TYPE'
  | 'DIAMOND_SPREAD'
  | 'DIAMOND_WEIGHT'
  | 'DIAMOND_QUALITY'
  | 'VENDOR_NAME'
  | 'LABOR_HEAD'
  | 'LABOR_RULE'
  | 'OVERHEAD_RULE'
  | 'FINDING_HEAD'
  | 'PACKET'
  | 'PACKET_STONE'
  | 'PACKET_SHAPE'
  | 'PACKET_SIZE'
  | 'PACKET_CUT'
  | 'PACKET_COLOR'
  | 'PACKET_QUALITY';

type MasterCategoryType = DesignMasterType;
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

interface MasterOption extends SmartDropdownOption {
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

interface MasterRow {
  id: string | number;
  masterType?: DesignMasterType;
  value: string;
  aliasName?: string | null;
  jewelryGroupId?: string | number | null;
  jewelryGroup?: JoinedMasterRef | string | null;
  description?: string | null;
  email?: string | null;
  vendorEmail?: string | null;
  findingNo?: string | null;
  metalCaratage?: string | null;
  priceIn?: FindingPriceIn | null;
  pricePerUnit?: number | null;
  dimensions?: string | null;
  weightPerUnit?: number | null;
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
  laborApplyMode?: LaborApplyMode | null;
  flatCost?: number | null;
  ratePerStone?: number | null;
  ratePerGram?: number | null;
  ratePerGroup?: number | null;
  overheadApplyMode?: OverheadApplyMode | null;
  ratePercent?: number | null;
  flatAmount?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PacketRow {
  id: string;
  barcode: string | null;
  packetName: string;
  stoneId?: string | number | null;
  stone: string | null;
  stoneMaster?: JoinedMasterRef | null;
  shapeId?: string | number | null;
  shape: string | null;
  shapeMaster?: JoinedMasterRef | null;
  sizeId?: string | number | null;
  size: string | null;
  sizeMaster?: JoinedMasterRef | null;
  cutId?: string | number | null;
  cut: string | null;
  cutMaster?: JoinedMasterRef | null;
  colorId?: string | number | null;
  color: string | null;
  colorMaster?: JoinedMasterRef | null;
  qualityId?: string | number | null;
  quality: string | null;
  qualityMaster?: JoinedMasterRef | null;
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
    hint: 'Sub category master values for designs',
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
    value: 'DIAMOND_WEIGHT',
    label: 'Diamond Wt',
    icon: 'DW',
    accentClass: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
    hint: 'Preset diamond weight master values used in designs',
  },
  {
    value: 'DIAMOND_QUALITY',
    label: 'Diamond Quality',
    icon: 'DQ',
    accentClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    hint: 'Diamond quality master values like VVS, VS and SI',
  },
  {
    value: 'VENDOR_NAME',
    label: 'Vendor Name',
    icon: 'VN',
    accentClass: 'bg-slate-50 text-slate-700 ring-slate-200',
    hint: 'Vendor master names available inside design forms',
  },
  {
    value: 'LABOR_HEAD',
    label: 'Labor Head',
    icon: 'LH',
    accentClass: 'bg-purple-50 text-purple-700 ring-purple-200',
    hint: 'Labor line item heads',
  },
  {
    value: 'OVERHEAD_RULE',
    label: 'Overhead Master',
    icon: 'OH',
    accentClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    hint: 'Material percentage or flat overhead rules',
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
    value: 'PACKET',
    label: 'Stone Packet',
    icon: 'PK',
    accentClass: 'bg-violet-50 text-violet-700 ring-violet-200',
    hint: 'Gemstone packet masters',
  },
];

function MasterCategoryIcon({ type }: { type: MasterCategoryType }) {
  if (
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

  if (
    type === 'DIAMOND_TYPE' ||
    type === 'DIAMOND_SPREAD' ||
    type === 'DIAMOND_WEIGHT' ||
    type === 'DIAMOND_QUALITY'
  ) {
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

  if (type === 'LABOR_RULE') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 19h16" />
        <path d="M8 15V9" />
        <path d="M12 15V5" />
        <path d="M16 15v-3" />
      </svg>
    );
  }

  if (type === 'OVERHEAD_RULE') {
    return (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 8v8" />
        <path d="M9.5 10.5c0-1 1-1.75 2.5-1.75s2.5.75 2.5 1.75c0 2-5 1-5 3 0 1 1 1.75 2.5 1.75s2.5-.75 2.5-1.75" />
      </svg>
    );
  }

  if (type === 'PACKET' || type === 'PACKET_STONE' || type === 'PACKET_SHAPE' || type === 'PACKET_SIZE' || type === 'PACKET_CUT' || type === 'PACKET_COLOR' || type === 'PACKET_QUALITY') {
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

interface PacketForm {
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

const defaultPacketForm: PacketForm = {
  barcode: '',
  packetName: '',
  stone: '',
  shape: '',
  size: '',
  cut: '',
  color: '',
  quality: '',
  priceIn: 'WT',
  sellingPrice: '',
  weightPerPc: '',
  weightIn: 'CTS',
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

function optionId(value?: string | number | null): string {
  return value === undefined || value === null ? '' : String(value);
}

function masterRefValue(ref?: JoinedMasterRef | string | null): string {
  if (!ref) {
    return '';
  }
  if (typeof ref === 'string') {
    return ref;
  }
  return ref.value || ref.name || ref.label || '';
}

function masterRefId(ref?: JoinedMasterRef | string | null): string {
  if (!ref || typeof ref === 'string') {
    return '';
  }
  return optionId(ref.id);
}

function masterRefOption(
  id?: string | number | null,
  ref?: JoinedMasterRef | string | null,
  extras: Partial<MasterOption> = {},
): MasterOption | null {
  const resolvedId = optionId(id) || masterRefId(ref);
  const resolvedValue = masterRefValue(ref);
  if (!resolvedId && !resolvedValue) {
    return null;
  }
  const refFields: Partial<MasterOption> = ref && typeof ref === 'object' ? (ref as Partial<MasterOption>) : {};
  return {
    ...refFields,
    ...extras,
    id: resolvedId || resolvedValue,
    value: resolvedValue || resolvedId,
    label: extras.label || refFields.label || resolvedValue || resolvedId,
  };
}

function getMetalPurityDisplay(option: MasterOption): string {
  return (option.value || option.label || '').trim();
}

function buildMetalCaratageName(metalName: string, metalPurity: string, metalColor: string, purityOption?: MasterOption | null): string {
  const purityToken = purityOption ? getMetalPurityDisplay(purityOption) : metalPurity.trim();
  const parts = [purityToken, metalColor.trim(), metalName.trim()].filter((part) => part.length > 0);
  return parts.join('-');
}

function getMasterDisplayName(row: Pick<MasterRow, 'value'>): string {
  return (row.value || '').trim();
}

function getOverheadApplyModeLabel(mode?: OverheadApplyMode | null): string {
  if (mode === 'flat') {
    return 'Flat';
  }
  if (mode === 'per_of_materials') {
    return '% of Materials';
  }
  return '-';
}

export default function DesignMastersPage() {
  const { showAlert: showAppAlert, confirm: confirmAppDialog, dialogNode } = useAppDialog();
  const currentUser = getStoredUser();
  const canCreateMaster = Boolean(currentUser && hasActionPermission(currentUser, 'master.create'));
  const canEditMaster = Boolean(currentUser && hasActionPermission(currentUser, 'master.edit'));
  const canUpdateMasterStatus = Boolean(currentUser && hasActionPermission(currentUser, 'master.status_update'));
  const canImportMaster = Boolean(currentUser && hasActionPermission(currentUser, 'master.import'));
  const [selectedType, setSelectedType] = useState<MasterCategoryType>('JEWELRY_GROUP');
  const [viewInactive, setViewInactive] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [masterRows, setMasterRows] = useState<MasterRow[]>([]);
  const [packetRows, setPacketRows] = useState<PacketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingRow, setEditingRow] = useState<MasterRow | null>(null);
  const [editingPacket, setEditingPacket] = useState<PacketRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [formValue, setFormValue] = useState('');
  const [formAliasName, setFormAliasName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVendorEmail, setFormVendorEmail] = useState('');
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
  const [formLaborApplyMode, setFormLaborApplyMode] = useState<LaborApplyMode>('FLAT');
  const [formFlatCost, setFormFlatCost] = useState('');
  const [formRatePerStone, setFormRatePerStone] = useState('');
  const [formRatePerGram, setFormRatePerGram] = useState('');
  const [formRatePerGroup, setFormRatePerGroup] = useState('');
  const [formOverheadApplyMode, setFormOverheadApplyMode] =
    useState<OverheadApplyMode>('per_of_materials');
  const [formRatePercent, setFormRatePercent] = useState('');
  const [formFlatAmount, setFormFlatAmount] = useState('');
  const [packetForm, setPacketForm] = useState<PacketForm>(defaultPacketForm);
  const [packetNameManuallyEdited, setPacketNameManuallyEdited] = useState(false);
  const [selectedJewelryGroupOption, setSelectedJewelryGroupOption] = useState<MasterOption | null>(null);
  const [selectedMetalOption, setSelectedMetalOption] = useState<MasterOption | null>(null);
  const [selectedMetalColorOption, setSelectedMetalColorOption] = useState<MasterOption | null>(null);
  const [selectedMetalPurityOption, setSelectedMetalPurityOption] = useState<MasterOption | null>(null);
  const [selectedPacketStoneOption, setSelectedPacketStoneOption] = useState<MasterOption | null>(null);
  const [selectedPacketShapeOption, setSelectedPacketShapeOption] = useState<MasterOption | null>(null);
  const [selectedPacketSizeOption, setSelectedPacketSizeOption] = useState<MasterOption | null>(null);
  const [selectedPacketCutOption, setSelectedPacketCutOption] = useState<MasterOption | null>(null);
  const [selectedPacketColorOption, setSelectedPacketColorOption] = useState<MasterOption | null>(null);
  const [selectedPacketQualityOption, setSelectedPacketQualityOption] = useState<MasterOption | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const isPacketType = selectedType === 'PACKET';

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
    ]);
    const stoneTypes = new Set<MasterCategoryType>([
      'DIAMOND_TYPE',
      'DIAMOND_SPREAD',
      'DIAMOND_WEIGHT',
      'DIAMOND_QUALITY',
      'PACKET_STONE',
      'PACKET_SHAPE',
      'PACKET_SIZE',
      'PACKET_CUT',
      'PACKET_COLOR',
      'PACKET_QUALITY',
      'PACKET',
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
    const computedPacketName = buildPacketNameFromForm(packetForm, {
      stone: selectedPacketStoneOption,
      shape: selectedPacketShapeOption,
      size: selectedPacketSizeOption,
      cut: selectedPacketCutOption,
      color: selectedPacketColorOption,
      quality: selectedPacketQualityOption,
    });
    if (computedPacketName && computedPacketName !== packetForm.packetName) {
      setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    }
  }, [
    isPacketType,
    packetForm,
    packetNameManuallyEdited,
    selectedPacketColorOption,
    selectedPacketCutOption,
    selectedPacketQualityOption,
    selectedPacketShapeOption,
    selectedPacketSizeOption,
    selectedPacketStoneOption,
    showModal,
  ]);

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
    const selectedMetal = selectedMetalOption;
    const selectedPurity = selectedMetalPurityOption;
    const purityPercent =
      selectedPurity?.purityPercentage !== undefined && selectedPurity.purityPercentage !== null
        ? selectedPurity.purityPercentage
        : parseNum(formPurityPercentage);
    if (purityPercent > 0 && String(purityPercent) !== formPurityPercentage) {
      setFormPurityPercentage(String(purityPercent));
    }

    const basePricePerGm =
      selectedMetal?.marketPricePerGm !== undefined && selectedMetal.marketPricePerGm !== null
        ? selectedMetal.marketPricePerGm
        : 0;
    const shouldAutoFillLivePrice = formLivePricePerGm.trim().length === 0;
    if (basePricePerGm > 0 && purityPercent > 0 && shouldAutoFillLivePrice) {
      const computed = ((basePricePerGm * purityPercent) / 100).toFixed(2);
      if (computed !== formLivePricePerGm) {
        setFormLivePricePerGm(computed);
      }
    }
  }, [
    formLivePricePerGm,
    formPurityPercentage,
    selectedMetalOption,
    selectedMetalPurityOption,
    selectedType,
  ]);

  const syncMetalCaratageNameFromSelection = useCallback((
    metalOption: MasterOption | null,
    purityOption: MasterOption | null,
    colorOption: MasterOption | null,
  ) => {
    if (selectedType !== 'METAL_CARATAGE' || !metalOption || !purityOption || !colorOption) {
      return;
    }

    const computedValue = buildMetalCaratageName(
      metalOption.value || '',
      purityOption.value || '',
      colorOption.value || '',
      purityOption,
    );
    setFormValue(computedValue);
  }, [selectedType]);

  const handleMetalNameChange = useCallback((value: string, option?: SmartDropdownOption | null) => {
    setFormMetalName(value);
    setSelectedMetalOption((option as MasterOption) || null);
    setFormMetalColor('');
    setFormMetalPurity('');
    setSelectedMetalColorOption(null);
    setSelectedMetalPurityOption(null);
    if (selectedType === 'METAL_CARATAGE') {
      setFormLivePricePerGm('');
    }
  }, [selectedType]);

  const handleMetalColorChange = useCallback((value: string, option?: SmartDropdownOption | null) => {
    setFormMetalColor(value);
    const selectedOption = (option as MasterOption) || null;
    setSelectedMetalColorOption(selectedOption);
    if (selectedType === 'METAL_CARATAGE') {
      syncMetalCaratageNameFromSelection(selectedMetalOption, selectedMetalPurityOption, selectedOption);
    }
  }, [selectedMetalOption, selectedMetalPurityOption, selectedType, syncMetalCaratageNameFromSelection]);

  const handleMetalPurityChange = useCallback((value: string, option?: SmartDropdownOption | null) => {
    setFormMetalPurity(value);
    const selectedOption = (option as MasterOption) || null;
    setSelectedMetalPurityOption(selectedOption);

    if (selectedType !== 'METAL_CARATAGE') {
      return;
    }


    const selectedPurity = selectedOption;
    const purityPercent = selectedPurity?.purityPercentage;
    if (purityPercent !== undefined && purityPercent !== null) {
      setFormPurityPercentage(String(purityPercent));
    }

    syncMetalCaratageNameFromSelection(selectedMetalOption, selectedOption, selectedMetalColorOption);

    const basePricePerGm = selectedMetalOption?.marketPricePerGm ?? 0;
    if (basePricePerGm > 0 && purityPercent !== undefined && purityPercent !== null && purityPercent > 0) {
      setFormLivePricePerGm(((basePricePerGm * purityPercent) / 100).toFixed(2));
    }
  }, [selectedMetalColorOption, selectedMetalOption, selectedType, syncMetalCaratageNameFromSelection]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      if (isPacketType) {
        const response = await api.get('/products/master-tables/PACKET', {
          params: {
            status: viewInactive ? 'INACTIVE' : 'ACTIVE',
            search: searchTerm || undefined,
            limit: 200,
          },
        });
        setPacketRows(response.data?.data || []);
        setMasterRows([]);
      } else {
        const response = await api.get(`/products/master-tables/${selectedType}`, {
          params: {
            includeInactive: viewInactive ? true : undefined,
            search: searchTerm || undefined,
          },
        });
        const rows = Array.isArray(response.data) ? response.data : [];
        setMasterRows(rows.filter((row: MasterRow) => Boolean(row.isActive) !== viewInactive));
        setPacketRows([]);
      }
    } catch {
      setMasterRows([]);
      setPacketRows([]);
    } finally {
      setLoading(false);
    }
  }, [isPacketType, selectedType, viewInactive, searchTerm]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const resetModalState = () => {
    setEditingRow(null);
    setEditingPacket(null);
    setFormValue('');
    setFormAliasName('');
    setFormDescription('');
    setFormVendorEmail('');
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
    setFormLaborApplyMode('FLAT');
    setFormFlatCost('');
    setFormRatePerStone('');
    setFormRatePerGram('');
    setFormRatePerGroup('');
    setFormOverheadApplyMode('per_of_materials');
    setFormRatePercent('');
    setFormFlatAmount('');
    setPacketForm(defaultPacketForm);
    setPacketNameManuallyEdited(false);
    setSelectedJewelryGroupOption(null);
    setSelectedMetalOption(null);
    setSelectedMetalColorOption(null);
    setSelectedMetalPurityOption(null);
    setSelectedPacketStoneOption(null);
    setSelectedPacketShapeOption(null);
    setSelectedPacketSizeOption(null);
    setSelectedPacketCutOption(null);
    setSelectedPacketColorOption(null);
    setSelectedPacketQualityOption(null);
  };

  const openCreate = () => {
    if (!canCreateMaster) return;
    resetModalState();
    setShowModal(true);
  };

  const openEditMaster = (row: MasterRow) => {
    if (!canEditMaster) return;
    setEditingPacket(null);
    setEditingRow(row);
    setFormValue(row.value || '');
    setFormAliasName(row.aliasName || row.value || '');
    setFormDescription(row.description || '');
    setFormVendorEmail(row.email || row.vendorEmail || '');
    setFormFindingNo(row.findingNo || '');
    setFormJewelryGroupId(
      optionId(row.jewelryGroupId) ||
        masterRefId(row.jewelryGroup) ||
        '',
    );
    setSelectedJewelryGroupOption(masterRefOption(row.jewelryGroupId, row.jewelryGroup));
    setFormMetalCaratage(row.metalCaratage || '');
    setFormMetalName(optionId(row.metalId) || masterRefId(row.metal) || '');
    setFormMetalColor(optionId(row.metalColorId) || masterRefId(row.metalColor) || '');
    setFormMetalPurity(optionId(row.metalPurityId) || masterRefId(row.metalPurity) || '');
    const resolvedRowPurityPercentage =
      row.purityPercentage ??
      (row.metalPurity && typeof row.metalPurity === 'object'
        ? row.metalPurity.purityPercentage
        : null);
    const rowMetalRef = row.metal && typeof row.metal === 'object' ? row.metal : null;
    setSelectedMetalOption(
      masterRefOption(row.metalId, row.metal, {
        marketPricePerOunce: row.marketPricePerOunce ?? rowMetalRef?.marketPricePerOunce,
        marketPricePerGm: row.marketPricePerGm ?? rowMetalRef?.marketPricePerGm,
        livePricePerGm: rowMetalRef?.livePricePerGm ?? row.livePricePerGm,
      }),
    );
    setSelectedMetalColorOption(
      masterRefOption(row.metalColorId, row.metalColor, {
        metalId: row.metalId || masterRefId(row.metal) || undefined,
      }),
    );
    setSelectedMetalPurityOption(
      masterRefOption(row.metalPurityId, row.metalPurity, {
        metalId: row.metalId || masterRefId(row.metal) || undefined,
        purityPercentage: resolvedRowPurityPercentage,
      }),
    );
    setFormPurityPercentage(
      resolvedRowPurityPercentage !== null && resolvedRowPurityPercentage !== undefined
        ? String(resolvedRowPurityPercentage)
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
    setFormLaborApplyMode((row.laborApplyMode as LaborApplyMode) || 'FLAT');
    setFormFlatCost(row.flatCost !== null && row.flatCost !== undefined ? String(row.flatCost) : '');
    setFormRatePerStone(
      row.ratePerStone !== null && row.ratePerStone !== undefined ? String(row.ratePerStone) : '',
    );
    setFormRatePerGram(
      row.ratePerGram !== null && row.ratePerGram !== undefined ? String(row.ratePerGram) : '',
    );
    setFormRatePerGroup(
      row.ratePerGroup !== null && row.ratePerGroup !== undefined ? String(row.ratePerGroup) : '',
    );
    setFormOverheadApplyMode(row.overheadApplyMode === 'flat' ? 'flat' : 'per_of_materials');
    setFormRatePercent(
      row.ratePercent !== null && row.ratePercent !== undefined ? String(row.ratePercent) : '',
    );
    setFormFlatAmount(
      row.flatAmount !== null && row.flatAmount !== undefined ? String(row.flatAmount) : '',
    );
    setShowModal(true);
  };

  const openEditPacket = (row: PacketRow) => {
    if (!canEditMaster) return;
    setEditingRow(null);
    setEditingPacket(row);
    setPacketForm({
      barcode: row.barcode || '',
      packetName: row.packetName || '',
      stone: optionId(row.stoneId) || masterRefId(row.stoneMaster) || '',
      shape: optionId(row.shapeId) || masterRefId(row.shapeMaster) || '',
      size: optionId(row.sizeId) || masterRefId(row.sizeMaster) || '',
      cut: optionId(row.cutId) || masterRefId(row.cutMaster) || '',
      color: optionId(row.colorId) || masterRefId(row.colorMaster) || '',
      quality: optionId(row.qualityId) || masterRefId(row.qualityMaster) || '',
      priceIn: row.priceIn || 'WT',
      sellingPrice:
        row.sellingPrice !== null && row.sellingPrice !== undefined ? String(row.sellingPrice) : '',
      weightPerPc:
        row.weightPerPc !== null && row.weightPerPc !== undefined
          ? String(row.weightPerPc)
          : row.weight && row.pieces
            ? String(Number(row.weight) / Number(row.pieces))
            : '',
      weightIn: 'CTS',
    });
    setSelectedPacketStoneOption(masterRefOption(row.stoneId, row.stoneMaster));
    setSelectedPacketShapeOption(masterRefOption(row.shapeId, row.shapeMaster));
    setSelectedPacketSizeOption(masterRefOption(row.sizeId, row.sizeMaster));
    setSelectedPacketCutOption(masterRefOption(row.cutId, row.cutMaster));
    setSelectedPacketColorOption(masterRefOption(row.colorId, row.colorMaster));
    setSelectedPacketQualityOption(masterRefOption(row.qualityId, row.qualityMaster));
    setPacketNameManuallyEdited(true);
    setShowModal(true);
  };

  const updatePacketFormField = (key: keyof PacketForm, value: string, option?: SmartDropdownOption | null) => {
    const selectedOption = (option as MasterOption) || null;
    if (key === 'stone') setSelectedPacketStoneOption(selectedOption);
    if (key === 'shape') setSelectedPacketShapeOption(selectedOption);
    if (key === 'size') setSelectedPacketSizeOption(selectedOption);
    if (key === 'cut') setSelectedPacketCutOption(selectedOption);
    if (key === 'color') setSelectedPacketColorOption(selectedOption);
    if (key === 'quality') setSelectedPacketQualityOption(selectedOption);

    setPacketForm((prev) => {
      const next = { ...prev, [key]: value } as PacketForm;
      if (
        !packetNameManuallyEdited &&
        key !== 'packetName' &&
        key !== 'barcode' &&
        key !== 'priceIn' &&
        key !== 'weightIn' &&
        key !== 'sellingPrice' &&
        key !== 'weightPerPc'
      ) {
        const computedPacketName = buildPacketNameFromForm(next, {
          stone: key === 'stone' ? selectedOption : selectedPacketStoneOption,
          shape: key === 'shape' ? selectedOption : selectedPacketShapeOption,
          size: key === 'size' ? selectedOption : selectedPacketSizeOption,
          cut: key === 'cut' ? selectedOption : selectedPacketCutOption,
          color: key === 'color' ? selectedOption : selectedPacketColorOption,
          quality: key === 'quality' ? selectedOption : selectedPacketQualityOption,
        });
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
    const computedPacketName = buildPacketNameFromForm(packetForm, {
      stone: selectedPacketStoneOption,
      shape: selectedPacketShapeOption,
      size: selectedPacketSizeOption,
      cut: selectedPacketCutOption,
      color: selectedPacketColorOption,
      quality: selectedPacketQualityOption,
    });
    setPacketForm((prev) => ({ ...prev, packetName: computedPacketName }));
    setPacketNameManuallyEdited(false);
  };

  const handleSubmitModal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isPacketType) {
      const payload = buildPacketPayload(packetForm, parseNum);
      const validationError = validatePacketPayload(payload);
      if (validationError) {
        showAppAlert(validationError);
        return;
      }

      setSaving(true);
      try {
        if (editingPacket) {
          await api.put(`/products/master-tables/PACKET/${editingPacket.id}`, payload);
        } else {
          await api.post('/products/master-tables/PACKET', payload);
        }
        setShowModal(false);
        resetModalState();
        fetchRows();
      } catch (error: any) {
        showAppAlert(error?.response?.data?.message || 'Unable to save packet.');
      } finally {
        setSaving(false);
      }
      return;
    }

    let value = formValue.trim();
    let aliasName = formAliasName.trim();
    if (!value || !aliasName) {
      showAppAlert('Master name and alias name are required.');
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
    const defaultWastagePayload = null;

    const selectedPurityOption =
      selectedType === 'METAL_CARATAGE'
        ? selectedMetalPurityOption
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
              metalId: formMetalName.trim(),
            }
          : selectedType === 'METAL_PURITY'
            ? {
                metalId: formMetalName.trim(),
                purityPercentage: parseOptionalNum(formPurityPercentage),
              }
            : selectedType === 'METAL_CARATAGE'
              ? {
                  metalId: formMetalName.trim(),
                  metalColorId: formMetalColor.trim(),
                  metalPurityId: formMetalPurity.trim(),
                  purityPercentage: resolvedPurityPercentage,
                  livePricePerGm: parseOptionalNum(formLivePricePerGm),
                  defaultWastagePercent: parseOptionalNum(formDefaultWastage) ?? 0,
                }
              : null;
    const categoryScopedPayload =
      selectedType === 'JEWELRY_SIZE' ||
      selectedType === 'COLLECTION' ||
      selectedType === 'LABOR_RULE' ||
      selectedType === 'OVERHEAD_RULE'
        ? {
            jewelryGroupId: formJewelryGroupId,
          }
        : null;
    const laborRulePayload =
      selectedType === 'LABOR_RULE'
        ? {
            laborApplyMode: formLaborApplyMode,
            flatCost: parseOptionalNum(formFlatCost),
            ratePerStone: parseOptionalNum(formRatePerStone),
            ratePerGram: parseOptionalNum(formRatePerGram),
            ratePerGroup: parseOptionalNum(formRatePerGroup),
          }
        : null;
    const overheadRulePayload =
      selectedType === 'OVERHEAD_RULE'
        ? {
            overheadApplyMode: formOverheadApplyMode,
            ratePercent:
              formOverheadApplyMode === 'flat' ? null : parseOptionalNum(formRatePercent),
            flatAmount:
              formOverheadApplyMode === 'flat' ? parseOptionalNum(formFlatAmount) : null,
          }
        : null;
    const descriptionPayload = selectedType === 'FINDING_HEAD' ? null : formDescription.trim() || null;
    const vendorPayload =
      selectedType === 'VENDOR_NAME'
        ? {
            email: formVendorEmail.trim() || null,
          }
        : null;

    if (selectedType === 'FINDING_HEAD') {
      if (!findingPayload?.findingNo || !findingPayload?.metalCaratage) {
        showAppAlert('Finding No and Metal Caratage are required.');
        return;
      }
      if (formPricePerUnit.trim().length === 0 || formWeightPerUnit.trim().length === 0) {
        showAppAlert('Price/Unit and Weight/Unit are required.');
        return;
      }
    }
    if (
      (selectedType === 'JEWELRY_SIZE' ||
        selectedType === 'COLLECTION' ||
        selectedType === 'LABOR_RULE' ||
        selectedType === 'OVERHEAD_RULE') &&
      !formJewelryGroupId.trim()
    ) {
      showAppAlert('Category is required.');
      return;
    }

    if (selectedType === 'LABOR_RULE') {
      const hasAnyRate =
        parseOptionalNum(formFlatCost) !== null ||
        parseOptionalNum(formRatePerStone) !== null ||
        parseOptionalNum(formRatePerGram) !== null ||
        parseOptionalNum(formRatePerGroup) !== null;
      if (!hasAnyRate) {
        showAppAlert('Enter at least one labor rate or flat cost.');
        return;
      }
    }

    if (selectedType === 'OVERHEAD_RULE') {
      if (
        formOverheadApplyMode === 'flat' &&
        parseOptionalNum(formFlatAmount) === null
      ) {
        showAppAlert('Flat Amount is required for flat overhead mode.');
        return;
      }
      if (
        formOverheadApplyMode !== 'flat' &&
        parseOptionalNum(formRatePercent) === null
      ) {
        showAppAlert('Rate Percent is required for percentage overhead mode.');
        return;
      }
    }

    if (selectedType === 'METAL_NAME') {
      if (
        parseOptionalNum(formMarketPricePerOunce) === null ||
        parseOptionalNum(formMarketPricePerGm) === null
      ) {
        showAppAlert('Market Price/Ounce and Market Price/Gms are required.');
        return;
      }
    }

    if (selectedType === 'METAL_COLOR' && !formMetalName.trim()) {
      showAppAlert('Metal Name is required.');
      return;
    }

    if (selectedType === 'METAL_PURITY') {
      if (!formMetalName.trim()) {
        showAppAlert('Metal Name is required.');
        return;
      }
      if (parseOptionalNum(formPurityPercentage) === null) {
        showAppAlert('Percentage is required.');
        return;
      }
    }

    if (selectedType === 'METAL_CARATAGE') {
      if (!formMetalName.trim() || !formMetalPurity.trim() || !formMetalColor.trim()) {
        showAppAlert('Metal Name, Metal Purity and Metal Color are required.');
        return;
      }
      if (resolvedPurityPercentage === null) {
        showAppAlert('Unable to resolve purity percentage for selected Metal Purity.');
        return;
      }
    }

    setSaving(true);
    try {
      if (editingRow) {
        await api.patch(`/products/master-tables/${selectedType}/${editingRow.id}`, {
          value,
          aliasName,
          description: descriptionPayload,
          ...(vendorPayload || {}),
          ...(categoryScopedPayload || {}),
          ...(laborRulePayload || {}),
          ...(overheadRulePayload || {}),
          ...(findingPayload || {}),
          ...(metalPayload || {}),
          ...(defaultWastagePayload || {}),
        });
      } else {
        await api.post(`/products/master-tables/${selectedType}`, {
          value,
          aliasName,
          description: descriptionPayload,
          ...(vendorPayload || {}),
          ...(categoryScopedPayload || {}),
          ...(laborRulePayload || {}),
          ...(overheadRulePayload || {}),
          ...(findingPayload || {}),
          ...(metalPayload || {}),
          ...(defaultWastagePayload || {}),
        });
      }
      setShowModal(false);
      resetModalState();
      fetchRows();
    } catch (error: any) {
      showAppAlert(error?.response?.data?.message || 'Unable to save master value.');
    } finally {
      setSaving(false);
    }
  };

  const closeMasterModal = () => {
    setShowModal(false);
    resetModalState();
  };

  const confirmCloseMasterModal = async () => {
    if (!showModal) return;
    const confirmed = await confirmAppDialog('Close this master form? Unsaved changes will be lost.', {
      title: 'Close master form',
      confirmLabel: 'Close',
      cancelLabel: 'Stay',
      variant: 'warning',
    });
    if (confirmed) {
      closeMasterModal();
    }
  };
  const handleToggleStatus = async (row: MasterRow | PacketRow) => {
    if (!canUpdateMasterStatus) return;
    try {
      if (isPacketType) {
        await api.patch(`/products/master-tables/PACKET/${row.id}/status`, { isActive: !row.isActive });
      } else {
        await api.patch(`/products/master-tables/${selectedType}/${row.id}/status`, { isActive: !row.isActive });
      }
      fetchRows();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Unable to update status.';
      showAppAlert(message);
      if (!row.isActive && error?.response?.status === 409) {
        if (isPacketType) {
          openEditPacket(row as PacketRow);
        } else {
          openEditMaster(row as MasterRow);
        }
      }
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

  // const handleDownloadTemplate = async () => {
  //   Template download is hidden from the master list header.
  // };

  const handleExport = async () => {
    try {
      const response = await api.get(
        isPacketType ? '/products/master-tables/PACKET/export' : `/products/master-tables/${selectedType}/export`,
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
      showAppAlert('Failed to export records.');
    }
  };

  const handleImportChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!canImportMaster) {
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const response = await api.post(
        isPacketType ? '/products/master-tables/PACKET/import' : `/products/master-tables/${selectedType}/import`,
        formData,
        {
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
      showAppAlert(
        `Import completed.\nTotal Rows: ${summary.totalRows}\nCreated: ${summary.created}\nUpdated: ${summary.updated}\nFailed: ${summary.failed}${errorPreview}`,
      );
      fetchRows();
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message;
      showAppAlert(Array.isArray(message) ? message.join(', ') : message || 'Failed to import records.');
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
        <h1 className="text-2xl font-bold text-gray-900">Masters</h1>
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
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{selectedConfig.label} List</h2>
            <p className="text-xs text-slate-500">
              Showing {viewInactive ? 'inactive' : 'active'} entries only
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* {canImportMaster ? (
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
              >
                Template
              </button>
            ) : null} */}
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              Export Excel
            </button>
            {/* <button
              type="button"
              disabled={importing}
              onClick={() => importInputRef.current?.click()}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {importing ? 'Importing...' : 'Import Excel'}
            </button> */}
            <button
              type="button"
              onClick={() => setViewInactive((prev) => !prev)}
              className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all ${
                viewInactive
                  ? 'border-amber-200 bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-500/10'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {viewInactive ? 'View Active' : 'View Inactive'}
            </button>
            {canCreateMaster ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-95"
              >
                + {selectedConfig.label}
              </button>
            ) : null}
          </div>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleImportChange}
        />

        <form onSubmit={handleSearchSubmit} className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-sm text-slate-900 shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={isPacketType ? 'Search packet name, stone, shape, size, color, quality' : `Search ${selectedConfig.label} name, alias, or description`}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_15px_-3px_rgba(79,70,229,0.3)] transition-all hover:bg-indigo-700 hover:shadow-indigo-500/40 active:scale-95"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearSearch}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="app-table-shell">
          <div className="app-table-scroll scrollbar-top">
            {isPacketType ? (
              <table className="app-table app-table-compact min-w-[1400px]">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Barcode</th>
                    <th className="app-table-head-cell">Packet Name</th>
                    <th className="app-table-head-cell">Stone</th>
                    <th className="app-table-head-cell">Shape</th>
                    <th className="app-table-head-cell">Size</th>
                    <th className="app-table-head-cell">Cut</th>
                    <th className="app-table-head-cell">Color</th>
                    <th className="app-table-head-cell">Quality</th>
                    <th className="app-table-head-cell">Weight</th>
                    <th className="app-table-head-cell">Unit</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingRow colSpan={14} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={14} className="app-table-empty">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    pagedPacketRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.barcode || '-'}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.packetName}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.stoneMaster) || row.stone || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.shapeMaster) || row.shape || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.sizeMaster) || row.size || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.cutMaster) || row.cut || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.colorMaster) || row.color || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.qualityMaster) || row.quality || '-'}</td>
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
                    <TableLoadingRow colSpan={11} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={11} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{getMasterDisplayName(row)}</td>
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
                    <TableLoadingRow colSpan={8} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={8} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.metal) || '-'}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{getMasterDisplayName(row)}</td>
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
                    <TableLoadingRow colSpan={9} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={9} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.metal) || '-'}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.purityPercentage !== null && row.purityPercentage !== undefined
                            ? String(row.purityPercentage)
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
              <table className="app-table app-table-compact min-w-[1600px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Metal Caratage</th>
                    <th className="app-table-head-cell">Alias Name</th>
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
                    <TableLoadingRow colSpan={13} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={13} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{getMasterDisplayName(row)}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.metal) || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.metalPurity) || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.purityPercentage !== null && row.purityPercentage !== undefined
                            ? Number(row.purityPercentage).toFixed(Number(row.purityPercentage) % 1 === 0 ? 0 : 2)
                            : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.metalColor) || '-'}</td>
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
            ) : selectedType === 'LABOR_RULE' ? (
              <table className="app-table app-table-compact min-w-[1550px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Labor Rule</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Category</th>
                    <th className="app-table-head-cell">Apply Mode</th>
                    <th className="app-table-head-cell">Flat Cost</th>
                    <th className="app-table-head-cell">Rate/Stone</th>
                    <th className="app-table-head-cell">Rate/Gram</th>
                    <th className="app-table-head-cell">Rate/Group</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Status</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingRow colSpan={13} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={13} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.jewelryGroup) || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.laborApplyMode || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.flatCost !== null && row.flatCost !== undefined ? Number(row.flatCost).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.ratePerStone !== null && row.ratePerStone !== undefined ? Number(row.ratePerStone).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.ratePerGram !== null && row.ratePerGram !== undefined ? Number(row.ratePerGram).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.ratePerGroup !== null && row.ratePerGroup !== undefined ? Number(row.ratePerGroup).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
            ) : selectedType === 'OVERHEAD_RULE' ? (
              <table className="app-table app-table-compact min-w-[1450px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Overhead Rule</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Category</th>
                    <th className="app-table-head-cell">Apply Mode</th>
                    <th className="app-table-head-cell">Rate %</th>
                    <th className="app-table-head-cell">Flat Amount</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Status</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingRow colSpan={11} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={11} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.jewelryGroup) || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {getOverheadApplyModeLabel(row.overheadApplyMode)}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.ratePercent !== null && row.ratePercent !== undefined ? Number(row.ratePercent).toFixed(3) : '-'}
                        </td>
                        <td className="app-table-cell text-sm text-slate-700">
                          {row.flatAmount !== null && row.flatAmount !== undefined ? Number(row.flatAmount).toFixed(2) : '-'}
                        </td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
            ) : selectedType === 'VENDOR_NAME' ? (
              <table className="app-table app-table-compact min-w-[1200px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">Vendor Name</th>
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Vendor Email</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Status</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingRow colSpan={9} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td colSpan={9} className="app-table-empty">No records found.</td>
                    </tr>
                  ) : (
                    pagedMasterRows.map((row, index) => (
                      <tr key={row.id} className="app-table-row">
                        <td className="app-table-cell text-sm text-slate-600">{pageOffset + index + 1}</td>
                        <td className="app-table-cell text-sm font-semibold text-slate-900">{row.value}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell text-sm text-slate-700">{row.email || row.vendorEmail || '-'}</td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
              <table className="app-table app-table-compact min-w-[1100px] w-full">
                <thead>
                  <tr>
                    <th className="app-table-head-cell">#</th>
                    <th className="app-table-head-cell">{selectedConfig.label}</th>
                    {selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? (
                      <th className="app-table-head-cell">Category</th>
                    ) : null}
                    <th className="app-table-head-cell">Alias Name</th>
                    <th className="app-table-head-cell">Description</th>
                    <th className="app-table-head-cell">Status</th>
                    <th className="app-table-head-cell">Created</th>
                    <th className="app-table-head-cell">Modified</th>
                    <th className="app-table-head-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableLoadingRow colSpan={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? 9 : 8} />
                  ) : rowsCount === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION' ? 9 : 8}
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
                          <td className="app-table-cell text-sm text-slate-700">{masterRefValue(row.jewelryGroup) || '-'}</td>
                        ) : null}
                        <td className="app-table-cell text-sm text-slate-700">{row.aliasName || '-'}</td>
                        <td className="app-table-cell max-w-sm text-sm text-slate-600">{row.description || '-'}</td>
                        <td className="app-table-cell text-sm">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              row.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                            }`}
                          >
                            {row.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
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
        <PacketFormModal
          open={showModal}
          title={`${editingPacket ? 'Update' : 'Add New'} ${selectedConfig.label}`}
          saveLabel={editingPacket ? 'Update' : 'Save'}
          loading={saving}
          form={packetForm}
          masterOptions={{
            packetStones: selectedPacketStoneOption ? [selectedPacketStoneOption] : [],
            packetShapes: selectedPacketShapeOption ? [selectedPacketShapeOption] : [],
            packetSizes: selectedPacketSizeOption ? [selectedPacketSizeOption] : [],
            packetCuts: selectedPacketCutOption ? [selectedPacketCutOption] : [],
            packetColors: selectedPacketColorOption ? [selectedPacketColorOption] : [],
            packetQualities: selectedPacketQualityOption ? [selectedPacketQualityOption] : [],
          }}
          onClose={confirmCloseMasterModal}
          onSubmit={handleSubmitModal}
          onChange={updatePacketFormField}
          onRegeneratePacketName={regeneratePacketName}
        />
      ) : (
        <MasterFormModal
          open={showModal}
          title={`${editingRow ? 'Update' : 'Add New'} ${selectedConfig.label}`}
          saveLabel={editingRow ? 'Update' : 'Save'}
          loading={saving}
          valueLabel={selectedConfig.label}
          formValue={formValue}
          formAliasName={formAliasName}
          formDescription={formDescription}
          vendorEmail={formVendorEmail}
          isCategoryScopedType={selectedType === 'JEWELRY_SIZE' || selectedType === 'COLLECTION'}
          isFindingType={selectedType === 'FINDING_HEAD'}
          isVendorType={selectedType === 'VENDOR_NAME'}
          isMetalNameType={selectedType === 'METAL_NAME'}
          isMetalColorType={selectedType === 'METAL_COLOR'}
          isMetalPurityType={selectedType === 'METAL_PURITY'}
          isMetalCaratageType={selectedType === 'METAL_CARATAGE'}
          isLaborRuleType={selectedType === 'LABOR_RULE'}
          isOverheadRuleType={selectedType === 'OVERHEAD_RULE'}
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
          metalNameOptions={selectedMetalOption ? [selectedMetalOption] : []}
          metalColorOptions={selectedMetalColorOption ? [selectedMetalColorOption] : []}
          metalPurityOptions={selectedMetalPurityOption ? [selectedMetalPurityOption] : []}
          priceIn={formPriceIn}
          pricePerUnit={formPricePerUnit}
          dimensions={formDimensions}
          weightPerUnit={formWeightPerUnit}
          laborApplyMode={formLaborApplyMode}
          flatCost={formFlatCost}
          ratePerStone={formRatePerStone}
          ratePerGram={formRatePerGram}
          ratePerGroup={formRatePerGroup}
          overheadApplyMode={formOverheadApplyMode}
          ratePercent={formRatePercent}
          flatAmount={formFlatAmount}
          jewelryGroupOptions={selectedJewelryGroupOption ? [selectedJewelryGroupOption] : []}
          onClose={confirmCloseMasterModal}
          onSubmit={handleSubmitModal}
          onChangeValue={setFormValue}
          onChangeAliasName={setFormAliasName}
          onChangeDescription={setFormDescription}
          onChangeVendorEmail={setFormVendorEmail}
          onChangeFindingNo={setFormFindingNo}
          onChangeJewelryGroupId={(value, option) => {
            setFormJewelryGroupId(value);
            setSelectedJewelryGroupOption((option as MasterOption) || null);
          }}
          onChangeMetalCaratage={setFormMetalCaratage}
          onChangeMetalName={handleMetalNameChange}
          onChangeMetalColor={handleMetalColorChange}
          onChangeMetalPurity={handleMetalPurityChange}
          onChangePurityPercentage={setFormPurityPercentage}
          onChangeMarketPricePerOunce={setFormMarketPricePerOunce}
          onChangeMarketPricePerGm={setFormMarketPricePerGm}
          onChangeLivePricePerGm={setFormLivePricePerGm}
          onChangeDefaultWastage={setFormDefaultWastage}
          onChangePriceIn={setFormPriceIn}
          onChangePricePerUnit={setFormPricePerUnit}
          onChangeDimensions={setFormDimensions}
          onChangeWeightPerUnit={setFormWeightPerUnit}
          onChangeLaborApplyMode={setFormLaborApplyMode}
          onChangeFlatCost={setFormFlatCost}
          onChangeRatePerStone={setFormRatePerStone}
          onChangeRatePerGram={setFormRatePerGram}
          onChangeRatePerGroup={setFormRatePerGroup}
          onChangeOverheadApplyMode={(value) => {
            setFormOverheadApplyMode(value);
            if (value === 'flat') {
              setFormRatePercent('');
            } else {
              setFormFlatAmount('');
            }
          }}
          onChangeRatePercent={setFormRatePercent}
          onChangeFlatAmount={setFormFlatAmount}
        />
      )}
      {dialogNode}
    </div>
  );
}




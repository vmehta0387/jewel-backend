import { useEffect, useRef } from 'react';
import Button from '../../../components/common/Button';
import SmartDropdown from '../../../components/common/SmartDropdown';
import ProductsModal from './ProductsModal';

interface StateSetter {
  (value: (prev: any) => any): void;
  (value: any): void;
}
interface ArrayStateSetter {
  (value: (prev: any[]) => any[]): void;
  (value: any[]): void;
}
type MasterOptionsScope = Record<string, any[]>;

interface DesignFormModalScope {
  FINDING_FEATURE_ENABLED: any;
  MEDIA_GUIDANCE_TEXT: any;
  MediaPreview: (...args: any[]) => any;
  addMasterFromDesign: (masterType: any, onCreated?: (masterValue: any, createdMaster?: any) => void) => any;
  addMetalLine: (...args: any[]) => any;
  addTag: (...args: any[]) => any;
  buildIjewelEmbedUrl: (...args: any[]) => any;
  buildPacketSearchOptions: (rowId: any) => any[];
  costTotals: any;
  createDefaultVendorRow: (...args: any[]) => any;
  creatingMasterType: any;
  defaultPacketForm: any;
  editingDesignIsPrimary: any;
  filteredJewelrySizeOptions: any[];
  filteredSubCategoryOptions: any[];
  findingRows: any[];
  formatMoney: (value: number) => string;
  form: any;
  galleryItems: any[];
  galleryUploadInputRef: { current: any };
  galleryUploading: any;
  gemRows: any[];
  getGemValue: (...args: any[]) => any;
  getGemWeight: (...args: any[]) => any;
  getLaborValue: (...args: any[]) => any;
  getMetalCaratageDisplay: (...args: any[]) => any;
  getMetalTotalWt: (...args: any[]) => any;
  getMetalValue: (...args: any[]) => any;
  getOverheadApplyModeLabel: (...args: any[]) => any;
  getOverheadRowValue: (...args: any[]) => any;
  getOverheadRuleConfiguredDisplay: (...args: any[]) => any;
  getOverheadRuleForRow: (...args: any[]) => any;
  getVersionDisplayValue: (...args: any[]) => any;
  handleGalleryUploadChange: (...args: any[]) => any;
  handleJewelryGroupChange: (...args: any[]) => any;
  handleNumericFieldFocus: (...args: any[]) => any;
  handleNumericFieldMouseUp: (...args: any[]) => any;
  handlePacketSelectionChange: (...args: any[]) => any;
  handleStlUploadChange: (...args: any[]) => any;
  inlineMasterControlGroupClass: any;
  inlineMasterDropdownClass: any;
  inlineMasterJoinedAddButtonClass: any;
  isVideoUrl: (...args: any[]) => any;
  laborRows: any[];
  lockedFieldSurfaceClass: any;
  makeId: (...args: any[]) => any;
  masterDropdownConfig: (...args: any[]) => any;
  masterOptions: MasterOptionsScope;
  mastersLoading: any;
  mergeMasterOption: (...args: any[]) => any;
  metalRows: any[];
  moveGalleryItem: (...args: any[]) => any;
  normalizeLookupKey: (...args: any[]) => any;
  normalizeMasterOptionRows: (rows: any[]) => any[];
  overheadRows: any[];
  parseNum: (...args: any[]) => any;
  removeGalleryItem: (...args: any[]) => any;
  removeTag: (...args: any[]) => any;
  resolvePublicAssetUrl: (...args: any[]) => any;
  saveDesign: (...args: any[]) => any;
  savingDesign: any;
  selectedJewelryGroupMasterId: any;
  selectedTags: any[];
  setEditingDesignIsPrimary: StateSetter;
  setEditingId: StateSetter;
  setFindingRows: ArrayStateSetter;
  setForm: StateSetter;
  setGemRows: ArrayStateSetter;
  setIsDesignNameManual: StateSetter;
  setLaborRows: ArrayStateSetter;
  setMetalRows: ArrayStateSetter;
  setOverheadRows: ArrayStateSetter;
  setPacketForm: StateSetter;
  setPacketNameManuallyEdited: StateSetter;
  setPrimaryGalleryItem: (index: number) => void;
  setShowAddModal: StateSetter;
  setShowGalleryPicker: StateSetter;
  setShowPacketMasterModal: StateSetter;
  setStlItem: StateSetter;
  setStlRemoved: StateSetter;
  setTagPicker: StateSetter;
  setVendorRows: ArrayStateSetter;
  singleDesignOverheadRules: any[];
  sourceDesignNo: any;
  stlItem: any;
  stlUploadInputRef: { current: any };
  stlUploading: any;
  tagPicker: any;
  toSmartDropdownOptions: (options: any[], getLabel?: (option: any) => string) => any[];
  updateFindingRow: (...args: any[]) => any;
  updateGemRow: (...args: any[]) => any;
  updateLaborRow: (...args: any[]) => any;
  updateMetalRow: (...args: any[]) => any;
  vendorRows: any[];
}

interface DesignFormModalProps {
  editingId: string | null;
  showAddModal: boolean;
  onClose: () => void;
  scope: DesignFormModalScope;
}

export default function DesignFormModal({ editingId, showAddModal, onClose, scope }: DesignFormModalProps) {
  const modalContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showAddModal) return;

    const handle = window.setTimeout(() => {
      const candidates = Array.from(
        modalContentRef.current?.querySelectorAll<HTMLElement>('input, select, textarea, button') || [],
      );
      const firstEditable = candidates.find((element) => {
        const field = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement;
        const isDisabled = field.disabled || element.getAttribute('aria-disabled') === 'true';
        const isReadOnly = 'readOnly' in field && field.readOnly;
        const isSkipped = element.tabIndex < 0 || element.getAttribute('data-autofocus-skip') === 'true';
        const isVisible = element.offsetParent !== null || element.getClientRects().length > 0;
        return !isDisabled && !isReadOnly && !isSkipped && isVisible;
      });
      firstEditable?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(handle);
  }, [showAddModal, editingId]);

  if (!showAddModal) return null;

  const {
    FINDING_FEATURE_ENABLED,
    MEDIA_GUIDANCE_TEXT,
    MediaPreview,
    addMasterFromDesign,
    addMetalLine,
    addTag,
    buildIjewelEmbedUrl,
    buildPacketSearchOptions,
    costTotals,
    createDefaultVendorRow,
    creatingMasterType,
    defaultPacketForm,
    editingDesignIsPrimary,
    filteredJewelrySizeOptions,
    filteredSubCategoryOptions,
    findingRows,
    formatMoney,
    form,
    galleryItems,
    galleryUploadInputRef,
    galleryUploading,
    gemRows,
    getGemValue,
    getGemWeight,
    getLaborValue,
    getMetalCaratageDisplay,
    getMetalTotalWt,
    getMetalValue,
    getOverheadApplyModeLabel,
    getOverheadRowValue,
    getOverheadRuleConfiguredDisplay,
    getOverheadRuleForRow,
    getVersionDisplayValue,
    handleGalleryUploadChange,
    handleJewelryGroupChange,
    handleNumericFieldFocus,
    handleNumericFieldMouseUp,
    handlePacketSelectionChange,
    handleStlUploadChange,
    inlineMasterControlGroupClass,
    inlineMasterDropdownClass,
    inlineMasterJoinedAddButtonClass,
    isVideoUrl,
    laborRows,
    lockedFieldSurfaceClass,
    makeId,
    masterDropdownConfig,
    masterOptions,
    mastersLoading,
    mergeMasterOption,
    metalRows,
    moveGalleryItem,
    normalizeLookupKey,
    normalizeMasterOptionRows,
    overheadRows,
    parseNum,
    removeGalleryItem,
    removeTag,
    resolvePublicAssetUrl,
    saveDesign,
    savingDesign,
    selectedJewelryGroupMasterId,
    selectedTags,
    setEditingDesignIsPrimary,
    setEditingId,
    setFindingRows,
    setForm,
    setGemRows,
    setIsDesignNameManual,
    setLaborRows,
    setMetalRows,
    setOverheadRows,
    setPacketForm,
    setPacketNameManuallyEdited,
    setPrimaryGalleryItem,
    setShowAddModal,
    setShowGalleryPicker,
    setShowPacketMasterModal,
    setStlItem,
    setStlRemoved,
    setTagPicker,
    setVendorRows,
    singleDesignOverheadRules,
    sourceDesignNo,
    stlItem,
    stlUploadInputRef,
    stlUploading,
    tagPicker,
    toSmartDropdownOptions,
    updateFindingRow,
    updateGemRow,
    updateLaborRow,
    updateMetalRow,
    vendorRows,
  } = scope;
  const skipTabFocusProps = { tabIndex: -1, 'data-autofocus-skip': 'true' };

  return (
    <ProductsModal
      title={editingId ? 'EDIT DESIGN' : 'ADD NEW DESIGN'}
      size="max-w-7xl"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button type="button" onClick={() => saveDesign()} disabled={savingDesign || galleryUploading || stlUploading}>
            {savingDesign ? 'Saving...' : galleryUploading || stlUploading ? 'Uploading...' : 'Save'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => { setShowGalleryPicker(false); setShowAddModal(false); setEditingId(null); setEditingDesignIsPrimary(false); setStlRemoved(false); }}>
            Close
          </Button>
        </div>
      }
    >
          <div ref={modalContentRef} className={`space-y-6 [&_label]:text-[11px] [&_label]:font-semibold [&_label]:uppercase [&_label]:tracking-[0.13em] [&_label]:text-[#6f6358] [&_input]:h-10 [&_input]:rounded-lg [&_input]:border-[#d9ccbc] [&_input]:bg-white [&_input]:px-3 [&_input]:text-[13px] [&_input]:leading-5 [&_input]:text-[#2b241d] [&_input]:placeholder:text-[#9a8f83] [&_input]:shadow-none [&_input]:focus:border-[#bf944d] [&_input]:focus:ring-2 [&_input]:focus:ring-[#f0dfc2] [&_select]:h-10 [&_select]:rounded-lg [&_select]:border-[#d9ccbc] [&_select]:bg-white [&_select]:px-3 [&_select]:pr-8 [&_select]:text-[13px] [&_select]:leading-5 [&_select]:text-[#2b241d] [&_select]:shadow-none [&_select]:focus:border-[#bf944d] [&_select]:focus:ring-2 [&_select]:focus:ring-[#f0dfc2] [&_textarea]:rounded-lg [&_textarea]:border-[#d9ccbc] [&_textarea]:bg-white [&_textarea]:px-3 [&_textarea]:py-2.5 [&_textarea]:text-[13px] [&_textarea]:leading-5 [&_textarea]:text-[#2b241d] [&_textarea]:placeholder:text-[#9a8f83] [&_textarea]:shadow-none [&_textarea]:focus:border-[#bf944d] [&_textarea]:focus:ring-2 [&_textarea]:focus:ring-[#f0dfc2] [&_th]:normal-case [&_th]:tracking-normal ${lockedFieldSurfaceClass}`}>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold text-red-600">*Required fields</p>
              <p className="font-semibold text-slate-700">Version: {getVersionDisplayValue(form.version || 'V1')}</p>
            </div>
            {mastersLoading && <p className="text-xs text-gray-500">Loading master dropdowns...</p>}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">General Information</div>
                <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-12">
                  <div className="xl:col-span-6">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Name</label>
                    <input
                      className={`w-full rounded border border-gray-300 px-2 py-2 text-sm ${
                        editingId && !editingDesignIsPrimary ? 'bg-[#c9d5e0] text-slate-500' : ''
                      }`}
                      value={form.designName}
                      onChange={(event) => {
                        setIsDesignNameManual(true);
                        setForm((prev) => ({ ...prev, designName: event.target.value }));
                      }}
                      readOnly={Boolean(editingId && !editingDesignIsPrimary)}
                      placeholder="Design Name"
                    />
                    {editingId && !editingDesignIsPrimary ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Design name is controlled by the parent design for this version family.
                      </p>
                    ) : null}
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design No *</label>
                    <input
                      className="w-full rounded border border-gray-300 bg-[#c9d5e0] px-2 py-2 text-sm text-slate-700"
                      value={form.designNo}
                      readOnly
                      placeholder="Design No"
                    />
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Version</label>
                    <input
                      className={`w-full rounded border border-gray-300 px-2 py-2 text-sm text-slate-700 ${
                        editingId || sourceDesignNo ? 'bg-[#c9d5e0]' : ''
                      }`}
                      value={getVersionDisplayValue(form.version || 'V1')}
                      readOnly={Boolean(editingId || sourceDesignNo)}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/[^0-9]/g, '');
                        setForm((prev) => ({ ...prev, version: digitsOnly || '1' }));
                      }}
                      placeholder="1"
                    />
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Category *</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.jewelryGroup}
                        onChange={handleJewelryGroupChange}
                        config={{
                          ...masterDropdownConfig(
                            'JEWELRY_GROUP',
                            'Select Category',
                            toSmartDropdownOptions(masterOptions.jewelryGroups),
                          ),
                          disabled: Boolean(editingId),
                        }}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={Boolean(editingId) || creatingMasterType === 'JEWELRY_GROUP'}
                        onClick={() => addMasterFromDesign('JEWELRY_GROUP')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Sub Category</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.collection}
                        onChange={(value, option) => {
                          mergeMasterOption('COLLECTION', option);
                          setForm((prev) => ({ ...prev, collection: value }));
                        }}
                        config={{
                          ...masterDropdownConfig(
                            'COLLECTION',
                            'Select Sub Category',
                            toSmartDropdownOptions(filteredSubCategoryOptions),
                            selectedJewelryGroupMasterId ? { jewelryGroupId: selectedJewelryGroupMasterId } : undefined,
                          ),
                          disabled: Boolean(editingId) || !form.jewelryGroup,
                        }}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={Boolean(editingId) || creatingMasterType === 'COLLECTION'}
                        onClick={() => addMasterFromDesign('COLLECTION')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Spread</label>
                    <SmartDropdown
                      value={form.diamondSpread}
                      onChange={(value, option) => {
                        mergeMasterOption('DIAMOND_SPREAD', option);
                        setForm((prev) => ({
                          ...prev,
                          diamondSpread: value,
                          coverageCustom: value === 'Custom' ? prev.coverageCustom : '',
                        }));
                      }}
                      config={masterDropdownConfig(
                        'DIAMOND_SPREAD',
                        'Select Diamond Spread',
                        toSmartDropdownOptions(masterOptions.diamondSpreads, (option) => option.aliasName || option.value),
                      )}
                    />
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Dia Quality</label>
                    <SmartDropdown
                      value={form.diamondQuality}
                      onChange={(value, option) => {
                        mergeMasterOption('DIAMOND_QUALITY', option);
                        setForm((prev) => ({
                          ...prev,
                          diamondQuality: value,
                          diamondQualityCustom: value === 'Custom' ? prev.diamondQualityCustom : '',
                        }));
                      }}
                      config={masterDropdownConfig(
                        'DIAMOND_QUALITY',
                        'Select Dia Quality',
                        [
                          ...(!masterOptions.diamondQualities.some((option) => option.value === form.diamondQuality) &&
                          form.diamondQuality
                            ? [{ id: `current-${form.diamondQuality}`, value: form.diamondQuality, label: form.diamondQuality }]
                            : []),
                          ...toSmartDropdownOptions(masterOptions.diamondQualities, (option) => option.aliasName || option.value),
                        ],
                      )}
                    />
                  </div>
                  {form.diamondSpread === 'Custom' ? (
                    <div className="xl:col-span-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Spread Custom Code</label>
                      <input
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.coverageCustom}
                        onChange={(event) => setForm((prev) => ({ ...prev, coverageCustom: event.target.value }))}
                        placeholder="C"
                      />
                    </div>
                  ) : null}
                  {form.diamondQuality === 'Custom' ? (
                    <div className="xl:col-span-3">
                      <label className="mb-1 block text-sm font-medium text-slate-700">Dia Quality Custom Code</label>
                      <input
                        className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                        value={form.diamondQualityCustom}
                        onChange={(event) => setForm((prev) => ({ ...prev, diamondQualityCustom: event.target.value }))}
                        placeholder="C"
                      />
                    </div>
                  ) : null}
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Size</label>
                    <SmartDropdown
                      value={form.jewelrySize}
                      onChange={(value, option) => {
                        mergeMasterOption('JEWELRY_SIZE', option);
                        setForm((prev) => ({ ...prev, jewelrySize: value }));
                      }}
                      config={{
                        ...masterDropdownConfig(
                          'JEWELRY_SIZE',
                          'Select Size',
                          [
                          ...(!filteredJewelrySizeOptions.some(
                            (option) => normalizeLookupKey(option.value) === normalizeLookupKey(form.jewelrySize),
                          ) && form.jewelrySize
                            ? [{ id: `current-${form.jewelrySize}`, value: form.jewelrySize, label: form.jewelrySize }]
                            : []),
                          ...toSmartDropdownOptions(filteredJewelrySizeOptions),
                          ],
                          selectedJewelryGroupMasterId ? { jewelryGroupId: selectedJewelryGroupMasterId } : undefined,
                        ),
                        disabled: !form.jewelryGroup,
                      }}
                    />
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Status</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.designStatus}
                        onChange={(value, option) => {
                          mergeMasterOption('DESIGN_STATUS', option);
                          setForm((prev) => ({ ...prev, designStatus: value }));
                        }}
                        config={masterDropdownConfig(
                          'DESIGN_STATUS',
                          'Select Design Status',
                          toSmartDropdownOptions(masterOptions.designStatuses),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'DESIGN_STATUS'}
                        onClick={() => addMasterFromDesign('DESIGN_STATUS')}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Type</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.diamondType}
                        onChange={(value, option) => {
                          mergeMasterOption('DIAMOND_TYPE', option);
                          setForm((prev) => ({ ...prev, diamondType: value }));
                        }}
                        config={masterDropdownConfig(
                          'DIAMOND_TYPE',
                          'Select Diamond Type',
                          toSmartDropdownOptions(masterOptions.diamondTypes),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'DIAMOND_TYPE'}
                        onClick={() => addMasterFromDesign('DIAMOND_TYPE')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Diamond Wt (Optional)</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.diamondWeight}
                        onChange={(value, option) => {
                          mergeMasterOption('DIAMOND_WEIGHT', option);
                          setForm((prev) => ({ ...prev, diamondWeight: value }));
                        }}
                        config={masterDropdownConfig(
                          'DIAMOND_WEIGHT',
                          'Select Diamond Wt',
                          toSmartDropdownOptions(masterOptions.diamondWeights),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'DIAMOND_WEIGHT'}
                        onClick={() => addMasterFromDesign('DIAMOND_WEIGHT')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Stage</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={form.stage}
                        onChange={(value, option) => {
                          mergeMasterOption('STAGE', option);
                          setForm((prev) => ({ ...prev, stage: value }));
                        }}
                        config={masterDropdownConfig(
                          'STAGE',
                          'Select Stage',
                          toSmartDropdownOptions(masterOptions.stages),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'STAGE'}
                        onClick={() => addMasterFromDesign('STAGE')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Drawer Location</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.drawerLocation}
                      onChange={(event) => setForm((prev) => ({ ...prev, drawerLocation: event.target.value }))}
                      placeholder="Drawer Location"
                    />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Other Wt</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.otherWeight}
                      onChange={(event) => setForm((prev) => ({ ...prev, otherWeight: event.target.value }))}
                      placeholder="Other Wt"
                    />
                  </div>

                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Production / Purchase</label>
                    <SmartDropdown
                      value={vendorRows[0]?.stockType || ''}
                      onChange={(value) => {
                        setVendorRows((prev) => {
                          const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                          const [first, ...rest] = base;
                          return [{ ...first, stockType: value }, ...rest];
                        });
                      }}
                      config={{
                        options: [
                          { id: 'Production', value: 'Production', label: 'Production' },
                          { id: 'Purchase', value: 'Purchase', label: 'Purchase' },
                        ],
                        valueKey: 'value',
                        labelKey: 'label',
                        placeholder: 'Select Stock Type',
                        showSearch: false,
                      }}
                    />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vendor Name</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={vendorRows[0]?.supplier || ''}
                        onChange={(value, option) => {
                          mergeMasterOption('VENDOR_NAME', option);
                          setVendorRows((prev) => {
                            const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                            const [first, ...rest] = base;
                            return [{ ...first, supplier: value }, ...rest];
                          });
                        }}
                        config={masterDropdownConfig(
                          'VENDOR_NAME',
                          'Select Vendor Name',
                          toSmartDropdownOptions(masterOptions.vendorNames),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'VENDOR_NAME'}
                        onClick={() => addMasterFromDesign('VENDOR_NAME')}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Vendor SKU</label>
                    <input
                      className="w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={vendorRows[0]?.supplierStyleNo || ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setVendorRows((prev) => {
                          const base = prev.length > 0 ? prev : [createDefaultVendorRow()];
                          const [first, ...rest] = base;
                          return [{ ...first, supplierStyleNo: value }, ...rest];
                        });
                      }}
                      placeholder="Vendor SKU"
                    />
                  </div>

                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tags</label>
                    <div className={inlineMasterControlGroupClass}>
                      <SmartDropdown
                        className={inlineMasterDropdownClass}
                        value={tagPicker}
                        onChange={(selected, option) => {
                          mergeMasterOption('TAG', option);
                          if (!selected) return;
                          addTag(selected);
                          setTagPicker('');
                        }}
                        config={masterDropdownConfig(
                          'TAG',
                          'Select Tag',
                          toSmartDropdownOptions(masterOptions.tags),
                        )}
                      />
                      <button
                        type="button"
                        {...skipTabFocusProps}
                        className={inlineMasterJoinedAddButtonClass}
                        disabled={creatingMasterType === 'TAG'}
                        onClick={() => addMasterFromDesign('TAG')}
                      >
                        +
                      </button>
                    </div>
                    <div className="mt-2 flex min-h-10 flex-wrap gap-1 rounded border border-dashed border-slate-200 bg-slate-50/70 px-2 py-2">
                      {selectedTags.length === 0 ? (
                        <span className="text-xs text-gray-500">No tags selected</span>
                      ) : (
                        selectedTags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800"
                            onClick={() => removeTag(tag)}
                            title="Click to remove"
                          >
                            {tag} x
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Design Description</label>
                    <textarea
                      className="h-24 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.designDescription}
                      onChange={(event) => setForm((prev) => ({ ...prev, designDescription: event.target.value }))}
                      placeholder="Design Description"
                    />
                  </div>
                  <div className="xl:col-span-4">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
                    <textarea
                      className="h-24 w-full rounded border border-gray-300 px-2 py-2 text-sm"
                      value={form.remarks}
                      onChange={(event) => setForm((prev) => ({ ...prev, remarks: event.target.value }))}
                      placeholder="Design Remarks"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-fit rounded-xl border border-[#e4d8c9] bg-white shadow-sm">
                <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Media Gallery</div>
                <div className="space-y-3 p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg border border-[#171311] bg-[#171311] px-3 py-2 text-xs font-semibold text-white hover:bg-[#241d19]"
                      onClick={() => setShowGalleryPicker(true)}
                      disabled={savingDesign || galleryUploading || stlUploading}
                    >
                      Choose From Gallery
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[#d8c5a4] bg-[#f7f2e9] px-3 py-2 text-xs font-semibold text-[#8f6a2c] hover:bg-[#f2e8d6] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => galleryUploadInputRef.current?.click()}
                      disabled={savingDesign || galleryUploading || stlUploading}
                    >
                      {galleryUploading ? 'Uploading...' : 'Add Media'}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-[#d8c5a4] bg-[#f7f2e9] px-3 py-2 text-xs font-semibold text-[#8f6a2c] hover:bg-[#f2e8d6] disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => stlUploadInputRef.current?.click()}
                      disabled={savingDesign || galleryUploading || stlUploading}
                    >
                      {stlUploading ? 'Uploading STL...' : 'Add STL'}
                    </button>
                  </div>
                  <input
                    ref={galleryUploadInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                    onChange={handleGalleryUploadChange}
                  />
                  <input
                    ref={stlUploadInputRef}
                    type="file"
                    accept=".stl,model/stl,application/sla"
                    multiple={false}
                    className="hidden"
                    onChange={handleStlUploadChange}
                  />
                  <p className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-[11px] font-medium leading-5 text-sky-800">
                    {MEDIA_GUIDANCE_TEXT}
                  </p>
                  <div className="rounded-lg border border-[#dfd0ba] bg-[#f9f3ea] px-3 py-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8f6a2c]">STL File</p>
                        <p className="text-sm text-slate-700">
                          {stlItem ? stlItem.fileName : 'No STL uploaded for this design version yet.'}
                        </p>
                      </div>
                      {stlItem ? (
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={resolvePublicAssetUrl(stlItem.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded border border-emerald-300 bg-white px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                          >
                            Open STL
                          </a>
                          <button
                            type="button"
                            className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                            disabled={savingDesign || galleryUploading || stlUploading}
                            onClick={() => { setStlItem(null); setStlRemoved(true); }}
                          >
                            Remove STL
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {galleryItems.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-5 text-center text-xs text-gray-500">
                      No media added yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-violet-700">
                        {galleryItems.length} media item{galleryItems.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {galleryItems.map((item, index) => (
                          <div key={`${item.key}-${index}`} className="rounded border border-gray-200 bg-gray-50 p-1.5">
                            <div className="relative">
                              <MediaPreview
                                url={item.url}
                                alt={`Design media ${index + 1}`}
                                className="h-24 w-full rounded object-cover"
                              />
                              {isVideoUrl(item.url) ? (
                                <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/75 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white">
                                  Video
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {index > 0 ? (
                                <button
                                  type="button"
                                  className="rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                                  disabled={savingDesign || galleryUploading || stlUploading}
                                  onClick={() => setPrimaryGalleryItem(index)}
                                >
                                  Make Primary
                                </button>
                              ) : (
                                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Primary
                                </span>
                              )}
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryItem(index, -1)}
                                disabled={index === 0 || savingDesign || galleryUploading || stlUploading}
                              >
                                ^
                              </button>
                              <button
                                type="button"
                                className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                onClick={() => moveGalleryItem(index, 1)}
                                disabled={index === galleryItems.length - 1 || savingDesign || galleryUploading || stlUploading}
                              >
                                v
                              </button>
                              <button
                                type="button"
                                className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                                disabled={savingDesign || galleryUploading || stlUploading}
                                onClick={() => removeGalleryItem(index)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="rounded-lg border border-[#e4d8c9] bg-[#fbf8f3] px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                      iJewel 3D Embed
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Paste the iJewel embed URL (the iframe src) to show the 3D viewer in design details.
                    </p>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-semibold text-slate-700">Embed URL</label>
                      <input
                        className="w-full rounded border border-slate-300 px-2 py-2 text-sm"
                        value={form.ijewelModelId}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, ijewelModelId: event.target.value }))
                        }
                        placeholder="https://ijewel.design/embedded-slug=..."
                      />
                    </div>
                    {form.ijewelModelId.trim() ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs text-slate-600">Preview link ready.</span>
                        <a
                          href={buildIjewelEmbedUrl(form.ijewelModelId, form.ijewelBaseName) || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Open iJewel Viewer
                        </a>
                      </div>
                    ) : null}
                  </div>
                </div>
                </div>
                <div className="h-fit rounded-xl border border-[#e4d8c9] bg-gradient-to-b from-white to-[#f8f5f0] p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between border-b border-[#e4d8c9] pb-2">
                    <h3 className="text-sm font-semibold tracking-wide text-slate-800">Summary</h3>
                    <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      USD
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Metal Value</span>
                      <span className="font-semibold text-slate-900">{formatMoney(costTotals.metal)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Stone Value</span>
                      <span className="font-semibold text-slate-900">{formatMoney(costTotals.gem)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Labor Value</span>
                      <span className="font-semibold text-slate-900">{formatMoney(costTotals.labor)}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                      <span>Overhead Value</span>
                      <span className="font-semibold text-slate-900">{formatMoney(costTotals.overhead)}</span>
                    </div>
                    {FINDING_FEATURE_ENABLED ? (
                      <div className="flex items-center justify-between rounded-md bg-white px-2.5 py-1.5">
                        <span>Finding Value</span>
                        <span className="font-semibold text-slate-900">{formatMoney(costTotals.finding)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 rounded-lg border border-[#d8c5a4] bg-[#f8f2e8] px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Total Value</span>
                      <span className="text-base font-bold text-slate-900">{formatMoney(costTotals.total)}</span>
                    </div>
                  </div>

                  <div className="mt-3 rounded-md border border-slate-200 bg-white px-3 py-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-600">Gross Wt.</span>
                      <span className="font-semibold text-slate-900">{costTotals.grossWeight.toFixed(3)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4">
              <div className="min-w-0 space-y-4">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Metal Information</div>
                  <div className="max-w-full min-w-0 overflow-x-auto scrollbar-top">
                    <table className="w-full min-w-[1020px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="px-2 py-2">Metal</th>
                          <th className="px-2 py-2">Net Wt. *</th>
                          <th className="px-2 py-2">Wastage %</th>
                          <th className="px-2 py-2">Wastage Wt.</th>
                          <th className="px-2 py-2">Total Wt.</th>
                          <th className="px-2 py-2">@(Per Gms)</th>
                          <th className="px-2 py-2">Value</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {metalRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2">
                              <div className={inlineMasterControlGroupClass}>
                                <SmartDropdown
                                  className={`${inlineMasterDropdownClass} min-w-[10.5rem]`}
                                  value={item.metalCaratage}
                                  onChange={(value, option) => {
                                    mergeMasterOption('METAL_CARATAGE', option);
                                    updateMetalRow(item.id, 'metalCaratage', value);
                                  }}
                                  config={masterDropdownConfig(
                                    'METAL_CARATAGE',
                                    'Select Metal',
                                    [
                                      ...(!(
                                        masterOptions.metalCaratages.some((option) => option.value === item.metalCaratage)
                                      ) && item.metalCaratage
                                        ? [{
                                            id: `current-${item.metalCaratage}`,
                                            value: item.metalCaratage,
                                            label:
                                              getMetalCaratageDisplay(
                                                item.metalCaratage,
                                                masterOptions.metalCaratages,
                                              ) || item.metalCaratage,
                                          }]
                                        : []),
                                      ...masterOptions.metalCaratages.map((option) => {
                                        const optionKey = normalizeLookupKey(option.value);
                                        const isUsedInOtherRow =
                                          optionKey.length > 0 &&
                                          metalRows.some(
                                            (row) =>
                                              row.id !== item.id &&
                                              normalizeLookupKey(row.metalCaratage) === optionKey,
                                          );
                                        return {
                                          ...option,
                                          label: `${option.aliasName || option.value}${isUsedInOtherRow ? ' (Used)' : ''}`,
                                          disabled: isUsedInOtherRow,
                                        };
                                      }),
                                    ],
                                  )}
                                />
                                <button
                                  type="button"
                                  {...skipTabFocusProps}
                                  className={inlineMasterJoinedAddButtonClass}
                                  disabled={creatingMasterType === 'METAL_CARATAGE'}
                                  onClick={() =>
                                    addMasterFromDesign('METAL_CARATAGE', (masterValue) =>
                                      updateMetalRow(item.id, 'metalCaratage', masterValue),
                                    )
                                  }
                                  title="Add Metal"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.netWt} onChange={(event) => updateMetalRow(item.id, 'netWt', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Net Wt" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-24 rounded border border-gray-300 px-2 py-1" value={item.wastagePercent} onChange={(event) => updateMetalRow(item.id, 'wastagePercent', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Wastage %" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 text-gray-900"
                                value={item.wastageWt}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
                                onChange={(event) => updateMetalRow(item.id, 'wastageWt', event.target.value)}
                                placeholder="Wastage Wt"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                className="w-28 rounded border border-gray-300 bg-[#c9d5e0] px-2 py-1 text-gray-700"
                                value={item.totalWt}
                                placeholder="Total Wt"
                                readOnly
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="flex items-center gap-1">
                                <input type="text" inputMode="decimal" className="w-28 rounded border border-gray-300 px-2 py-1" value={item.pricePerGm} onChange={(event) => updateMetalRow(item.id, 'pricePerGm', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Price" />
                                <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">USD</span>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-28 rounded border border-gray-300 px-2 py-1 font-semibold text-slate-900"
                                value={item.value}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
                                onChange={(event) => updateMetalRow(item.id, 'value', event.target.value)}
                                placeholder={getMetalValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setMetalRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 text-sm font-bold text-slate-900">
                          <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
                          <td className="px-2 py-2">{metalRows.reduce((sum, row) => sum + getMetalTotalWt(row), 0).toFixed(3)}</td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2">{formatMoney(costTotals.metal)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-amber-200 bg-white px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      onClick={addMetalLine}
                    >
                      + Add Line
                    </button>
                  </div>
                </div>

                <div className="min-w-0 rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5">
                  <div className="flex items-center justify-between border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">
                    <span>Gemstone Information</span>
                  </div>
                  <div className="max-w-full min-w-0 overflow-x-auto overflow-y-visible scrollbar-top">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="px-2 py-2">Packet</th>
                          <th className="px-2 py-2">Info</th>
                          <th className="px-2 py-2">Wt/Per Pcs.</th>
                          <th className="px-2 py-2">Pcs</th>
                          <th className="px-2 py-2">Wt(In Cts)</th>
                          <th className="px-2 py-2">@(P/C/In USD)</th>
                          <th className="px-2 py-2">Amount</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {gemRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-2 py-2">
                              <div className={inlineMasterControlGroupClass}>
                                <SmartDropdown
                                  className={`${inlineMasterDropdownClass} w-52`}
                                  value={item.packetId}
                                  onChange={(value, option) => void handlePacketSelectionChange(item.id, value, option)}
                                  config={{
                                    apiSubPath: '/products/master-tables/PACKET',
                                    options: buildPacketSearchOptions(item.id),
                                    extraParams: {
                                      status: 'ACTIVE',
                                      limit: 200,
                                    },
                                    responsePath: 'data',
                                    valueKey: 'id',
                                    labelKey: 'packetName',
                                    placeholder: 'Select Packet',
                                  }}
                                />
                                <button
                                  type="button"
                                  {...skipTabFocusProps}
                                  className={inlineMasterJoinedAddButtonClass}
                                  onClick={() => {
                                    setPacketForm(defaultPacketForm);
                                    setPacketNameManuallyEdited(false);
                                    setShowPacketMasterModal(true);
                                  }}
                                  title="Add Packet"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="max-w-[14rem] whitespace-normal text-[11px] leading-4 text-gray-700">
                                <p>
                                  <span className="font-semibold text-gray-900">S:</span> {item.stone || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Sh:</span> {item.shape || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Sz:</span> {item.size || '-'}
                                </p>
                                <p>
                                  <span className="font-semibold text-gray-900">C:</span> {item.cut || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Clr:</span> {item.color || '-'}
                                  {' | '}
                                  <span className="font-semibold text-gray-900">Q:</span> {item.quality || '-'}
                                </p>
                              </div>
                            </td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtPerPcs} onChange={(event) => updateGemRow(item.id, 'wtPerPcs', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="numeric" className="w-16 rounded border border-gray-300 px-2 py-1" value={item.pcs} onChange={(event) => updateGemRow(item.id, 'pcs', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Pcs" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.wtInCts} onChange={(event) => updateGemRow(item.id, 'wtInCts', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                            <td className="px-2 py-2"><input type="text" inputMode="decimal" className="w-20 rounded border border-gray-300 px-2 py-1" value={item.pricePerCt} onChange={(event) => updateGemRow(item.id, 'pricePerCt', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                inputMode="decimal"
                                className="w-20 rounded border border-gray-300 px-2 py-1"
                                value={item.amount}
                                onFocus={handleNumericFieldFocus}
                                onMouseUp={handleNumericFieldMouseUp}
                                onChange={(event) => updateGemRow(item.id, 'amount', event.target.value)}
                                placeholder={getGemValue(item).toFixed(2)}
                              />
                            </td>
                            <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setGemRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                          <td className="px-2 py-2 text-right" colSpan={4}>Total</td>
                          <td className="px-2 py-2">{gemRows.reduce((sum, row) => sum + parseNum(row.pcs), 0).toFixed(0)}</td>
                          <td className="px-2 py-2">{gemRows.reduce((sum, row) => sum + getGemWeight(row), 0).toFixed(3)}</td>
                          <td className="px-2 py-2"></td>
                          <td className="px-2 py-2">{formatMoney(costTotals.gem)}</td>
                          <td className="px-2 py-2"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end border-t border-cyan-200 bg-white px-3 py-2">
                    <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setGemRows((prev) => [...prev, { id: makeId(), packetId: '', stone: '', shape: '', size: '', cut: '', color: '', quality: '', settingType: '', wtPerPcs: '', pcs: '', wtInCts: '', pricePerCt: '', amount: '' }])}>+ Add Line</button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="min-w-0 space-y-4">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Labor Information</div>
                  <div className="max-w-full min-w-0 overflow-x-auto scrollbar-top">
                    <table className="min-w-[780px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="w-14 px-3 py-2">##</th>
                          <th className="w-[290px] px-3 py-2">Labor Head</th>
                          <th className="w-[150px] px-3 py-2">Labor/Unit (USD)</th>
                          <th className="w-[120px] px-3 py-2">Unit/Qty</th>
                          <th className="w-[150px] px-3 py-2">Labor Value (USD)</th>
                          <th className="w-[110px] px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {laborRows.map((item, idx) => {
                          const isLaborAutoCalculated = Number.parseFloat(item.laborPerUnit) > 0 && Number.parseFloat(item.unitQty) > 0;
                          return (
                              <tr key={item.id}>
                                <td className="px-3 py-2 text-xs text-gray-600">{idx + 1}.</td>
                                <td className="px-3 py-2">
                                  <div className={inlineMasterControlGroupClass}>
                                    <SmartDropdown
                                      className={`${inlineMasterDropdownClass} min-w-[14rem]`}
                                      value={item.laborHead}
                                      onChange={(value, option) => {
                                        mergeMasterOption('LABOR_HEAD', option);
                                        updateLaborRow(item.id, 'laborHead', value);
                                      }}
                                      config={masterDropdownConfig(
                                        'LABOR_HEAD',
                                        'Select Labor Head',
                                        [
                                          ...(!masterOptions.laborHeads.some((option) => option.value === item.laborHead) && item.laborHead
                                            ? [{ id: `current-${item.laborHead}`, value: item.laborHead, label: item.laborHead }]
                                            : []),
                                          ...toSmartDropdownOptions(masterOptions.laborHeads),
                                        ],
                                      )}
                                    />
                                    <button
                                      type="button"
                                      {...skipTabFocusProps}
                                      className={inlineMasterJoinedAddButtonClass}
                                      disabled={creatingMasterType === 'LABOR_HEAD'}
                                      onClick={() =>
                                        addMasterFromDesign('LABOR_HEAD', (masterValue) => updateLaborRow(item.id, 'laborHead', masterValue))
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="px-3 py-2"><input className="w-32 rounded border border-gray-300 px-2 py-1" value={item.laborPerUnit} onChange={(event) => updateLaborRow(item.id, 'laborPerUnit', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="Price Per Quantity" /></td>
                                <td className="px-3 py-2"><input className="w-24 rounded border border-gray-300 px-2 py-1" value={item.unitQty} onChange={(event) => updateLaborRow(item.id, 'unitQty', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0" /></td>
                                <td className="px-3 py-2">
                                  <input
                                    className={`w-32 rounded border border-gray-300 px-2 py-1 ${
                                      isLaborAutoCalculated ? 'cursor-not-allowed bg-[#c9d5e0] text-gray-700' : ''
                                    }`}
                                    value={isLaborAutoCalculated ? getLaborValue(item).toFixed(2) : item.laborValue}
                                    readOnly={isLaborAutoCalculated}
                                    tabIndex={isLaborAutoCalculated ? -1 : undefined}
                                    onChange={(event) => updateLaborRow(item.id, 'laborValue', event.target.value)}
                                    onFocus={handleNumericFieldFocus}
                                    onMouseUp={handleNumericFieldMouseUp}
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="px-3 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setLaborRows((prev) => {
                                  const next = prev.filter((row) => row.id !== item.id);
                                  return next.length > 0 ? next : [{ id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }];
                                })}>Remove</button></td>
                              </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    <span>Total</span>
                    <span className="min-w-[8rem] text-right">{formatMoney(costTotals.labor)}</span>
                  </div>
                  <div className="flex justify-end border-t border-rose-200 bg-white px-3 py-2">
                    <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setLaborRows((prev) => [...prev, { id: makeId(), laborHead: '', laborPerUnit: '', unitQty: '', laborValue: '' }])}>+ Add Line</button>
                  </div>
                </div>

                {FINDING_FEATURE_ENABLED ? (
                  <div className="overflow-hidden rounded-2xl border border-indigo-200/60 bg-white shadow-sm ring-1 ring-indigo-900/5 transition-all hover:shadow-md">
                    <div className="border-b border-indigo-200/60 bg-indigo-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-indigo-800 backdrop-blur-sm">Finding Information</div>
                    <div className="overflow-x-auto scrollbar-top">
                      <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50/70 text-left text-[11px] font-semibold text-indigo-900">
                          <tr>
                            <th className="px-2 py-2">##</th>
                            <th className="px-2 py-2">Finding Head</th>
                            <th className="px-2 py-2">Price/Unit</th>
                            <th className="px-2 py-2">No. of Units</th>
                            <th className="px-2 py-2">Total Weight (Gms)</th>
                            <th className="px-2 py-2">Finding Value</th>
                            <th className="px-2 py-2">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {findingRows.map((item, idx) => (
                            <tr key={item.id}>
                              <td className="px-2 py-2 text-xs text-gray-600">{idx + 1}.</td>
                              <td className="px-2 py-2">
                                <div className={inlineMasterControlGroupClass}>
                                  <SmartDropdown
                                    className={`${inlineMasterDropdownClass} min-w-[10.5rem]`}
                                    value={item.findingHead}
                                    onChange={(value, option) => {
                                      mergeMasterOption('FINDING_HEAD', option);
                                      updateFindingRow(item.id, 'findingHead', value);
                                    }}
                                    config={masterDropdownConfig(
                                      'FINDING_HEAD',
                                      'Select Finding Head',
                                      [
                                        ...(!masterOptions.findingHeads.some((option) => option.value === item.findingHead) && item.findingHead
                                          ? [{ id: `current-${item.findingHead}`, value: item.findingHead, label: item.findingHead }]
                                          : []),
                                        ...toSmartDropdownOptions(masterOptions.findingHeads),
                                      ],
                                    )}
                                  />
                                  <button
                                    type="button"
                                    {...skipTabFocusProps}
                                    className={inlineMasterJoinedAddButtonClass}
                                    disabled={creatingMasterType === 'FINDING_HEAD'}
                                    onClick={() =>
                                      addMasterFromDesign('FINDING_HEAD', (masterValue) => updateFindingRow(item.id, 'findingHead', masterValue))
                                    }
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.pricePerUnit} onChange={(event) => updateFindingRow(item.id, 'pricePerUnit', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.units} onChange={(event) => updateFindingRow(item.id, 'units', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.totalWeight} onChange={(event) => updateFindingRow(item.id, 'totalWeight', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.000" /></td>
                              <td className="px-2 py-2"><input className="w-full rounded border border-gray-300 px-2 py-1" value={item.findingValue} onChange={(event) => updateFindingRow(item.id, 'findingValue', event.target.value)} onFocus={handleNumericFieldFocus} onMouseUp={handleNumericFieldMouseUp} placeholder="0.00" /></td>
                              <td className="px-2 py-2"><button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40" onClick={() => setFindingRows((prev) => prev.filter((row) => row.id !== item.id))}>Remove</button></td>
                            </tr>
                          ))}
                          <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                            <td className="px-2 py-2 text-right" colSpan={5}>Total</td>
                            <td className="px-2 py-2">{formatMoney(costTotals.finding)}</td>
                            <td className="px-2 py-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end border-t border-indigo-200 bg-white px-3 py-2">
                      <button type="button" className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40" onClick={() => setFindingRows((prev) => [...prev, { id: makeId(), findingHead: masterOptions.findingHeads[0]?.value || '', pricePerUnit: '', units: '', totalWeight: '', findingValue: '' }])}>+ Add Line</button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0 space-y-4">
                <div className="min-w-0 overflow-hidden rounded-2xl border border-[#e4d8c9] bg-white shadow-sm ring-1 ring-[#2b241d]/5 transition-all hover:shadow-md">
                  <div className="border-b border-[#e4d8c9] bg-[#f8f2e8] px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-[#8f6a2c] backdrop-blur-sm">Overhead Information</div>
                  <div className="max-w-full min-w-0 overflow-x-auto scrollbar-top">
                    <table className="min-w-[780px] text-sm">
                      <thead className="border-b border-gray-200 bg-white text-left text-[11px] font-semibold text-slate-900">
                        <tr>
                          <th className="w-14 px-3 py-2">##</th>
                          <th className="w-[290px] px-3 py-2">Overhead</th>
                          <th className="w-[130px] px-3 py-2">Mode</th>
                          <th className="w-[130px] px-3 py-2">Configured</th>
                          <th className="w-[150px] px-3 py-2">Overhead Value (USD)</th>
                          <th className="w-[110px] px-3 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {overheadRows.length === 0 ? (
                          <tr>
                            <td className="px-3 py-4 text-xs text-slate-500" colSpan={6}>
                              No overhead added yet.
                            </td>
                          </tr>
                        ) : (
                          overheadRows.map((item, idx) => {
                            const selectedRule = getOverheadRuleForRow(item);
                            const modeLabel = selectedRule ? getOverheadApplyModeLabel(selectedRule) : '';
                            return (
                              <tr key={item.id}>
                                <td className="px-3 py-2 text-xs text-gray-600">{idx + 1}.</td>
                                <td className="px-3 py-2">
                                  <div className={inlineMasterControlGroupClass}>
                                    <SmartDropdown
                                      className={`${inlineMasterDropdownClass} min-w-[14rem]`}
                                      value={item.ruleId}
                                      onChange={(value, option) => {
                                        mergeMasterOption('OVERHEAD_RULE', option);
                                        const selectedRuleOption =
                                          (option ? normalizeMasterOptionRows([option])[0] : null) ||
                                          singleDesignOverheadRules.find((rule) => rule.id === value);
                                        setOverheadRows((prev) =>
                                          prev.map((row) =>
                                            row.id === item.id
                                              ? {
                                                  ...row,
                                                  ruleId: value,
                                                  overheadHead: selectedRuleOption?.value || '',
                                                  ruleSnapshot: selectedRuleOption || null,
                                                }
                                              : row,
                                          ),
                                        );
                                      }}
                                      config={{
                                        ...masterDropdownConfig(
                                          'OVERHEAD_RULE',
                                          'Select Overhead',
                                          [
                                          ...(item.ruleSnapshot &&
                                          !singleDesignOverheadRules.some((option) => option.id === item.ruleSnapshot?.id)
                                            ? [{
                                                ...item.ruleSnapshot,
                                                label: item.ruleSnapshot.value,
                                              }]
                                            : []),
                                          ...singleDesignOverheadRules.map((option) => ({
                                            ...option,
                                            label: option.value,
                                          })),
                                          ],
                                          selectedJewelryGroupMasterId ? { jewelryGroupId: selectedJewelryGroupMasterId } : undefined,
                                        ),
                                        valueKey: 'id',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      {...skipTabFocusProps}
                                      className={inlineMasterJoinedAddButtonClass}
                                      disabled={creatingMasterType === 'OVERHEAD_RULE'}
                                      onClick={() =>
                                        addMasterFromDesign('OVERHEAD_RULE', (masterValue, createdMaster) =>
                                          setOverheadRows((prev) =>
                                            prev.map((row) =>
                                              row.id === item.id
                                                ? {
                                                    ...row,
                                                    ruleId: createdMaster?.id || row.ruleId,
                                                    overheadHead: createdMaster?.value || masterValue,
                                                    ruleSnapshot: createdMaster || null,
                                                  }
                                                : row,
                                            ),
                                          ),
                                        )
                                      }
                                    >
                                      +
                                    </button>
                                  </div>
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-slate-600">{modeLabel}</td>
                                <td className="whitespace-nowrap px-3 py-2 text-xs font-medium text-slate-600">{selectedRule ? getOverheadRuleConfiguredDisplay(selectedRule) : ''}</td>
                                <td className="px-3 py-2">
                                  <input
                                    className="w-32 cursor-not-allowed rounded border border-gray-300 bg-[#c9d5e0] px-2 py-1 text-gray-700"
                                    value={selectedRule ? getOverheadRowValue(item).toFixed(2) : ''}
                                    readOnly
                                    tabIndex={-1}
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-rose-200/80 bg-rose-50/80 px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-rose-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-rose-300 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-500/40"
                                    onClick={() => setOverheadRows((prev) => {
                                      const next = prev.filter((row) => row.id !== item.id);
                                      return next.length > 0 ? next : [{ id: makeId(), overheadHead: '', ruleId: '' }];
                                    })}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-end gap-4 border-t border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700">
                    <span>Total</span>
                    <span className="min-w-[8rem] text-right">{formatMoney(costTotals.overhead)}</span>
                  </div>
                  <div className="flex justify-end border-t border-amber-200 bg-white px-3 py-2">
                    <button
                      type="button"
                      className="inline-flex min-h-[1.75rem] items-center justify-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                      onClick={() => setOverheadRows((prev) => [...prev, { id: makeId(), overheadHead: '', ruleId: '' }])}
                    >
                      + Add Line
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
    </ProductsModal>
  );
}


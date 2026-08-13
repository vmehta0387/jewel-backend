import ProductsModal from './ProductsModal';

interface DesignViewModalScope {
  DesignInfoSkeleton: (...args: any[]) => any;
  FINDING_FEATURE_ENABLED: boolean;
  MediaPreview: (...args: any[]) => any;
  StlViewer: (...args: any[]) => any;
  detailDesignError: any;
  detailGalleryUrls: any[];
  detailGemstones: any[];
  detailInfo: any;
  detailLabors: any[];
  detailMetals: any[];
  detailOverheadRows: any[];
  detailStlUrl: string;
  detailSummary: any;
  formatDetailDateTime: (...args: any[]) => any;
  formatMoney: (...args: any[]) => any;
  getFileNameFromUrl: (...args: any[]) => any;
  getMetalCaratageDisplay: (...args: any[]) => any;
  ijewelIframeRef: { current: any };
  ijewelPreviewUrl: any;
  isInfoDetailReady: any;
  isVideoUrl: (...args: any[]) => any;
  masterOptions: Record<string, any[]>;
  normalizeStringArray: (...args: any[]) => any;
  parseNumericValue: (...args: any[]) => any;
  resolveDetailPacketName: (...args: any[]) => any;
  scopedDesignCostPrice: any;
  setShowStlViewerModal: (...args: any[]) => any;
  shouldShowInfoSkeleton: any;
  usesScopedDesignInfoView: any;
}

interface DesignViewModalProps {
  showInfoModal: boolean;
  designNo: string;
  onClose: () => void;
  scope: DesignViewModalScope;
}

export default function DesignViewModal({ showInfoModal, designNo, onClose, scope }: DesignViewModalProps) {
  const {
    DesignInfoSkeleton,
    FINDING_FEATURE_ENABLED,
    MediaPreview,
    StlViewer,
    detailDesignError,
    detailGalleryUrls,
    detailGemstones,
    detailInfo,
    detailLabors,
    detailMetals,
    detailOverheadRows,
    detailStlUrl,
    detailSummary,
    formatDetailDateTime,
    formatMoney,
    getFileNameFromUrl,
    getMetalCaratageDisplay,
    ijewelIframeRef,
    ijewelPreviewUrl,
    isInfoDetailReady,
    isVideoUrl,
    masterOptions,
    normalizeStringArray,
    parseNumericValue,
    resolveDetailPacketName,
    scopedDesignCostPrice,
    setShowStlViewerModal,
    shouldShowInfoSkeleton,
    usesScopedDesignInfoView,
  } = scope;

  if (!showInfoModal || !detailInfo) return null;

  return (
    <ProductsModal title={`DESIGN DETAILS (${designNo})`} onClose={onClose} size="max-w-7xl">
          <div className="space-y-4">
            {detailDesignError ? (
              <p className="text-sm text-red-600">{detailDesignError}</p>
            ) : null}
            {shouldShowInfoSkeleton ? (
              <DesignInfoSkeleton />
            ) : isInfoDetailReady && usesScopedDesignInfoView ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
                <div className="rounded border border-gray-200">
                  <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Design Information</div>
                  <table className="min-w-full text-sm">
                    <tbody>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Design No</td><td className="px-3 py-2">{detailInfo.designNo}</td><td className="px-3 py-2 font-medium">Version</td><td className="px-3 py-2">{detailInfo.version || 'V1'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Barcode</td><td className="px-3 py-2 font-mono font-semibold">{detailInfo.barcode || '-'}</td><td className="px-3 py-2 font-medium">Primary Version</td><td className="px-3 py-2">{detailInfo.isPrimary ? 'Yes' : 'No'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Design Name</td><td className="px-3 py-2">{detailInfo.designName || '-'}</td><td className="px-3 py-2 font-medium">Stage</td><td className="px-3 py-2">{detailInfo.stage || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Category</td><td className="px-3 py-2">{detailInfo.jewelryGroup || '-'}</td><td className="px-3 py-2 font-medium">Sub Category</td><td className="px-3 py-2">{detailInfo.collection || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Jewelry Size</td><td className="px-3 py-2">{detailInfo.jewelrySize || '-'}</td><td className="px-3 py-2 font-medium">Design Status</td><td className="px-3 py-2">{detailInfo.designStatus || detailInfo.status || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Type</td><td className="px-3 py-2">{detailInfo.diamondType || '-'}</td><td className="px-3 py-2 font-medium">Diamond Spread</td><td className="px-3 py-2">{detailInfo.diamondSpread || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Wt</td><td className="px-3 py-2">{detailInfo.diamondWeight || '-'}</td><td className="px-3 py-2 font-medium">Diamond Quality</td><td className="px-3 py-2">{detailInfo.diamondQuality || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Cost Price</td><td className="px-3 py-2 font-semibold">{formatMoney(scopedDesignCostPrice)}</td><td className="px-3 py-2 font-medium">Remarks</td><td className="px-3 py-2">{detailInfo.remarks || '-'}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2">{normalizeStringArray(detailInfo.tags).join(', ') || '-'}</td><td className="px-3 py-2 font-medium">Modified</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.updatedAt || detailInfo.modifiedAt)}</td></tr>
                      <tr className="border-b"><td className="px-3 py-2 font-medium">Description</td><td className="px-3 py-2" colSpan={3}>{detailInfo.designDescription || '-'}</td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="space-y-4">
                  <div className="rounded border border-gray-200">
                    <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Gallery Media</div>
                    <div className="p-3">
                      {detailGalleryUrls.length ? (
                        <div className="space-y-3">
                          <MediaPreview
                            url={detailGalleryUrls[0]}
                            alt={`${detailInfo.designNo} primary`}
                            className="h-44 w-full rounded border border-gray-300 object-cover"
                            controls={isVideoUrl(detailGalleryUrls[0])}
                          />
                          {detailGalleryUrls.length > 1 ? (
                            <div className="grid grid-cols-3 gap-2">
                              {detailGalleryUrls.slice(1).map((url, index) => (
                                <MediaPreview
                                  key={`${url}-${index}`}
                                  url={url}
                                  alt={`${detailInfo.designNo} gallery ${index + 2}`}
                                  className="h-16 w-full rounded border border-gray-200 object-cover"
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                          No gallery media
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="rounded border border-gray-200">
                    <div className="flex items-center justify-between border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">
                      <span className="text-sm font-semibold text-gray-800">3D STL Model</span>
                      {detailStlUrl ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-[#81A6C6] hover:text-[#6f93b0]"
                          onClick={() => setShowStlViewerModal(true)}
                        >
                          Expand Viewer
                        </button>
                      ) : null}
                    </div>
                    <div className="p-3">
                      {detailStlUrl ? (
                        <StlViewer designId={detailInfo.id} className="h-72" />
                      ) : (
                        <div className="flex h-48 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                          No STL uploaded
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : isInfoDetailReady ? (
              <>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="rounded border border-gray-200">
                <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Design Information</div>
                <table className="min-w-full text-sm">
                  <tbody>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design No</td><td className="px-3 py-2">{detailInfo.designNo}</td><td className="px-3 py-2 font-medium">Version</td><td className="px-3 py-2">{detailInfo.version || 'V1'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Barcode</td><td className="px-3 py-2 font-mono font-semibold">{detailInfo.barcode || '-'}</td><td className="px-3 py-2 font-medium">Primary Version</td><td className="px-3 py-2">{detailInfo.isPrimary ? 'Yes' : 'No'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Design Name</td><td className="px-3 py-2">{detailInfo.designName || '-'}</td><td className="px-3 py-2 font-medium">Stage</td><td className="px-3 py-2">{detailInfo.stage || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Category</td><td className="px-3 py-2">{detailInfo.jewelryGroup || '-'}</td><td className="px-3 py-2 font-medium">Sub Category</td><td className="px-3 py-2">{detailInfo.collection || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Jewelry Size</td><td className="px-3 py-2">{detailInfo.jewelrySize || '-'}</td><td className="px-3 py-2 font-medium">Design Status</td><td className="px-3 py-2">{detailInfo.designStatus || detailInfo.status || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Type</td><td className="px-3 py-2">{detailInfo.diamondType || '-'}</td><td className="px-3 py-2 font-medium">Diamond Spread</td><td className="px-3 py-2">{detailInfo.diamondSpread || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Diamond Wt</td><td className="px-3 py-2">{detailInfo.diamondWeight || '-'}</td><td className="px-3 py-2 font-medium">Diamond Quality</td><td className="px-3 py-2">{detailInfo.diamondQuality || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Drawer Location</td><td className="px-3 py-2">{detailInfo.drawerLocation || '-'}</td><td className="px-3 py-2 font-medium">Other Wt</td><td className="px-3 py-2">{detailInfo.otherWeight || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Tags</td><td className="px-3 py-2">{normalizeStringArray(detailInfo.tags).join(', ') || '-'}</td><td className="px-3 py-2 font-medium">Description</td><td className="px-3 py-2">{detailInfo.designDescription || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Total Value</td><td className="px-3 py-2">{formatMoney(detailSummary.totalValue || parseNumericValue(detailInfo.price))}</td><td className="px-3 py-2 font-medium">Remarks</td><td className="px-3 py-2">{detailInfo.remarks || '-'}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Created</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.createdAt)}</td><td className="px-3 py-2 font-medium">Modified</td><td className="px-3 py-2">{formatDetailDateTime(detailInfo.updatedAt || detailInfo.modifiedAt)}</td></tr>
                    <tr className="border-b"><td className="px-3 py-2 font-medium">Last Updated By</td><td className="px-3 py-2" colSpan={3}>{detailInfo.updatedByName || '-'}</td></tr>
                  </tbody>
                </table>
              </div>
              <div className="space-y-4">
                <div className="rounded border border-gray-200">
                  <div className="border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">Gallery Media</div>
                  <div className="p-3">
                    {detailGalleryUrls.length ? (
                      <div className="space-y-3">
                        <MediaPreview
                          url={detailGalleryUrls[0]}
                          alt={`${detailInfo.designNo} primary`}
                          className="h-44 w-full rounded border border-gray-300 object-cover"
                          controls={isVideoUrl(detailGalleryUrls[0])}
                        />
                        {detailGalleryUrls.length > 1 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {detailGalleryUrls.slice(1).map((url, index) => (
                              <MediaPreview
                                key={`${url}-${index}`}
                                url={url}
                                alt={`${detailInfo.designNo} gallery ${index + 2}`}
                                className="h-16 w-full rounded border border-gray-200 object-cover"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                        No gallery media
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">
                    <span className="text-sm font-semibold text-gray-800">3D STL Model</span>
                    {detailStlUrl ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#81A6C6] hover:text-[#6f93b0]"
                        onClick={() => setShowStlViewerModal(true)}
                      >
                        Expand Viewer
                      </button>
                    ) : null}
                  </div>
                  <div className="space-y-3 p-3">
                    {detailStlUrl ? (
                      <>
                        <StlViewer designId={detailInfo.id} className="h-72" />
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {getFileNameFromUrl(detailStlUrl)}
                            </p>
                            <p className="text-xs text-slate-500">Interactive STL preview for this design version.</p>
                          </div>
                          <a
                            href={detailStlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
                          >
                            Open File
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-48 flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-700">No STL uploaded</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Upload an STL in the design gallery section to preview the 3D model here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="rounded border border-gray-200">
                  <div className="flex items-center justify-between border-b border-gray-200/60 bg-gray-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-gray-800 backdrop-blur-sm">
                    <span className="text-sm font-semibold text-gray-800">iJewel 3D Model</span>
                    {ijewelPreviewUrl ? (
                      <a
                        href={ijewelPreviewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-[#81A6C6] hover:text-[#6f93b0]"
                      >
                        Open Viewer
                      </a>
                    ) : null}
                  </div>
                  <div className="space-y-3 p-3">
                    {ijewelPreviewUrl ? (
                      <>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                          <iframe
                            title={`iJewel ${detailInfo.designNo}`}
                            src={ijewelPreviewUrl}
                            className="w-full"
                            frameBorder={0}
                            allowFullScreen
                            allow="autoplay; fullscreen; xr-spatial-tracking; web-share"
                            ref={ijewelIframeRef}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            Embed URL: {detailInfo.ijewelModelId}
                          </p>
                            <p className="text-xs text-slate-500">
                              Embedded iJewel viewer for this design.
                            </p>
                          </div>
                          <a
                            href={ijewelPreviewUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-[#D2C4B4] bg-[#F3E3D0] px-3 py-2 text-xs font-semibold text-slate-800 transition hover:bg-[#e9d8c4]"
                          >
                            Open in New Tab
                          </a>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-36 flex-col items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 px-4 text-center">
                        <p className="text-sm font-semibold text-slate-700">No iJewel model linked</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Add the iJewel model ID in the design gallery section to embed the viewer.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-3 ${FINDING_FEATURE_ENABLED ? 'md:grid-cols-6' : 'md:grid-cols-5'}`}>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Metal Value</p><p className="font-semibold">{detailSummary.metalValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Gem Value</p><p className="font-semibold">{detailSummary.gemValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Labor Value</p><p className="font-semibold">{detailSummary.laborValue.toFixed(2)}</p></div>
              <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Overhead Value</p><p className="font-semibold">{detailSummary.overheadValue.toFixed(2)}</p></div>
              {FINDING_FEATURE_ENABLED ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-2 text-sm"><p className="text-xs text-gray-600">Finding Value</p><p className="font-semibold">{detailSummary.findingValue.toFixed(2)}</p></div>
              ) : null}
              <div className="rounded border border-green-200 bg-green-50 p-2 text-sm"><p className="text-xs text-gray-600">Total Value</p><p className="font-semibold">{detailSummary.totalValue.toFixed(2)}</p></div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Metal Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Metal</th>
                      <th className="px-3 py-2">Net Wt.</th>
                      <th className="px-3 py-2">Wastage %</th>
                      <th className="px-3 py-2">Wastage Wt.</th>
                      <th className="px-3 py-2">Total Wt.</th>
                      <th className="px-3 py-2">@(Per Gm)</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailMetals.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={7}>No metal details available.</td></tr>
                    ) : (
                      detailMetals.map((metal: any) => (
                        <tr key={metal.id || `${metal.goldColour}-${metal.sortOrder}`}>
                          <td className="px-3 py-2">
                            {getMetalCaratageDisplay(
                              String(metal.metalCaratage || metal.goldColour || ''),
                              masterOptions.metalCaratages,
                            ) || metal.metalCaratage || metal.goldColour || '-'}
                          </td>
                          <td className="px-3 py-2">{parseNumericValue(metal.netWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.wastagePercent).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.wastageWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.totalWt).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.pricePerGm).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(metal.value).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Gemstone Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Packet</th>
                      <th className="px-3 py-2">Stone</th>
                      <th className="px-3 py-2">Shape</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Color</th>
                      <th className="px-3 py-2">Quality</th>
                      <th className="px-3 py-2">Wt/Pcs</th>
                      <th className="px-3 py-2">Pcs</th>
                      <th className="px-3 py-2">Wt (Cts)</th>
                      <th className="px-3 py-2">@(P/Ct)</th>
                      <th className="px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailGemstones.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={11}>No gemstone details available.</td></tr>
                    ) : (
                      detailGemstones.map((gem: any) => (
                        <tr key={gem.id || `${gem.stone}-${gem.sortOrder}`}>
                          <td className="px-3 py-2">{resolveDetailPacketName(gem)}</td>
                          <td className="px-3 py-2">{gem.stone || '-'}</td>
                          <td className="px-3 py-2">{gem.shape || '-'}</td>
                          <td className="px-3 py-2">{gem.size || '-'}</td>
                          <td className="px-3 py-2">{gem.color || '-'}</td>
                          <td className="px-3 py-2">{gem.quality || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.wtPerPcs).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.pcs).toFixed(0)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.wtInCts).toFixed(3)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.pricePerCt).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(gem.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Labor Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Labor Head</th>
                      <th className="px-3 py-2">Labor/Unit</th>
                      <th className="px-3 py-2">Unit/Qty</th>
                      <th className="px-3 py-2">Labor Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailLabors.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={4}>No labor details available.</td></tr>
                    ) : (
                      detailLabors.map((labor: any) => (
                        <tr key={labor.id || `${labor.laborHead}-${labor.sortOrder}`}>
                          <td className="px-3 py-2">{labor.laborHead || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.laborPerUnit).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.unitQty).toFixed(2)}</td>
                          <td className="px-3 py-2">{parseNumericValue(labor.laborValue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded border border-slate-200">
              <div className="border-b border-slate-200/60 bg-slate-50/50 px-4 py-3 text-[13px] font-bold uppercase tracking-wider text-slate-800 backdrop-blur-sm">Overhead Information</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-gray-200 bg-white text-left text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Overhead</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailOverheadRows.length === 0 ? (
                      <tr><td className="px-3 py-3 text-sm text-slate-500" colSpan={2}>No overhead details available.</td></tr>
                    ) : (
                      detailOverheadRows.map((overhead: any) => (
                        <tr key={overhead.id || `${overhead.laborHead}-${overhead.sortOrder}`}>
                          <td className="px-3 py-2">{String(overhead.laborHead || '-').replace(/^Overhead\s*-\s*/i, '') || '-'}</td>
                          <td className="px-3 py-2">{parseNumericValue(overhead.laborValue).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            ) : null}
          </div>
    </ProductsModal>
  );
}

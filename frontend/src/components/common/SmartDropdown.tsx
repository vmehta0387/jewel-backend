import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../../services/api';

export interface SmartDropdownOption {
  id?: string | number;
  value?: string | number;
  label?: string;
  name?: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export interface SmartDropdownConfig {
  apiSubPath?: string;
  options?: SmartDropdownOption[];
  extraParams?: Record<string, unknown>;
  showSearch?: boolean;
  searchParam?: string;
  serverSearch?: boolean;
  pagination?: boolean;
  pageParam?: string;
  limitParam?: string;
  limit?: number;
  responsePath?: string;
  valueKey?: string;
  labelKey?: string;
  placeholder?: string;
  clearLabel?: string;
  disabled?: boolean;
}

interface SmartDropdownProps {
  value: string;
  onChange: (value: string, option?: SmartDropdownOption | null) => void;
  config: SmartDropdownConfig;
  className?: string;
}

const defaultConfig = {
  showSearch: true,
  searchParam: 'search',
  serverSearch: true,
  pageParam: 'page',
  limitParam: 'limit',
  limit: 20,
  valueKey: 'id',
  labelKey: 'value',
  clearLabel: 'Clear Selection',
};

function readPath(source: unknown, path?: string): unknown {
  if (!path) {
    return source;
  }
  return path.split('.').reduce((value: any, key) => value?.[key], source as any);
}

function optionText(option: SmartDropdownOption, key?: string): string {
  const value = key ? option[key] : undefined;
  return String(value ?? option.label ?? option.name ?? option.value ?? option.id ?? '');
}

export default function SmartDropdown({ value, onChange, config, className = '' }: SmartDropdownProps) {
  const merged = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const isApiMode = Boolean(merged.apiSubPath);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [apiOptions, setApiOptions] = useState<SmartDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(!isApiMode);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0, maxHeight: 320 });

  const normalizedLocalOptions = useMemo(
    () => (merged.options || []).map((option) => ({ ...option })),
    [merged.options],
  );

  const allOptions = useMemo(() => {
    if (!isApiMode) {
      return normalizedLocalOptions;
    }
    const byValue = new Map<string, SmartDropdownOption>();
    for (const option of [...normalizedLocalOptions, ...apiOptions]) {
      byValue.set(optionText(option, merged.valueKey), option);
    }
    return Array.from(byValue.values());
  }, [apiOptions, isApiMode, merged.valueKey, normalizedLocalOptions]);
  const selectedOption = allOptions.find((option) => optionText(option, merged.valueKey) === value);

  const filteredOptions = useMemo(() => {
    if (isApiMode && merged.serverSearch) {
      return allOptions;
    }
    if (!merged.showSearch || !search.trim()) {
      return allOptions;
    }
    const needle = search.trim().toLowerCase();
    return allOptions.filter((option) => {
      const label = optionText(option, merged.labelKey).toLowerCase();
      const optionValue = optionText(option, merged.valueKey).toLowerCase();
      return label.includes(needle) || optionValue.includes(needle);
    });
  }, [allOptions, isApiMode, merged.labelKey, merged.serverSearch, merged.showSearch, merged.valueKey, search]);

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(220, Math.min(420, openAbove ? spaceAbove : spaceBelow));
    setDropdownStyle({
      top: openAbove ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 220),
      maxHeight,
    });
  }, []);

  const fetchOptions = useCallback(
    async (nextPage = 1, nextSearch = search) => {
      if (!merged.apiSubPath) return;
      setLoading(true);
      if (!merged.pagination || nextPage === 1) {
        setHasLoadedOptions(false);
      }
      try {
        const params: Record<string, unknown> = { ...(merged.extraParams || {}) };
        if (merged.showSearch && merged.serverSearch && nextSearch.trim()) {
          params[merged.searchParam] = nextSearch.trim();
        }
        if (merged.pagination) {
          params[merged.pageParam] = nextPage;
          params[merged.limitParam] = merged.limit;
        }
        const response = await api.get(merged.apiSubPath, { params });
        const responseRows = readPath(response.data, merged.responsePath);
        const rows = Array.isArray(responseRows)
          ? responseRows
          : Array.isArray((response.data as any)?.data)
            ? (response.data as any).data
            : [];
        setApiOptions((prev) => (merged.pagination && nextPage > 1 ? [...prev, ...rows] : rows));
        setPage(nextPage);
        const total = Number((response.data as any)?.total || 0);
        setHasMore(Boolean(merged.pagination && (total ? nextPage * merged.limit < total : rows.length >= merged.limit)));
      } finally {
        setHasLoadedOptions(true);
        setLoading(false);
      }
    },
    [merged, search],
  );

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    const handleReposition = () => updateDropdownPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen || !isApiMode || !merged.serverSearch) return;
    setHasLoadedOptions(false);
    const handle = window.setTimeout(() => {
      void fetchOptions(1, search);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [fetchOptions, isApiMode, isOpen, merged.serverSearch, search]);

  const openDropdown = () => {
    if (merged.disabled) return;
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      updateDropdownPosition();
      setSearch('');
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const selectOption = (option: SmartDropdownOption | null) => {
    onChange(option ? optionText(option, merged.valueKey) : '', option);
    setIsOpen(false);
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list || !hasMore || loading || !merged.pagination) return;
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom <= 48) {
      void fetchOptions(page + 1, search);
    }
  };

  const buttonLabel = selectedOption ? optionText(selectedOption, merged.labelKey) : merged.placeholder || 'Select...';
  const listMaxHeight = Math.max(140, dropdownStyle.maxHeight - (merged.showSearch ? 58 : 12));
  const listMinHeight = Math.min(220, listMaxHeight);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={merged.disabled}
        onClick={openDropdown}
        className={`flex w-full min-w-[10rem] items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isOpen ? 'border-primary-500 ring-1 ring-primary-500' : ''
        }`}
      >
        <span className={selectedOption ? 'truncate' : 'truncate text-slate-400'}>{buttonLabel}</span>
        <svg className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[260] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5"
            style={dropdownStyle}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {merged.showSearch ? (
              <div className="border-b border-slate-100 p-2">
                <input
                  ref={inputRef}
                  className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-1 focus:ring-primary-500"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    if (isApiMode && merged.serverSearch) {
                      setHasLoadedOptions(false);
                    }
                    listRef.current?.scrollTo({ top: 0 });
                  }}
                  placeholder="Search..."
                />
              </div>
            ) : null}
            <div
              ref={listRef}
              className="min-h-0 flex-1 overflow-y-auto p-1"
              style={{ maxHeight: listMaxHeight, minHeight: listMinHeight }}
              onScroll={handleScroll}
            >
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm hover:bg-primary-50 hover:text-primary-700 ${
                  value === '' ? 'bg-primary-50 font-semibold text-primary-700' : 'text-slate-700'
                }`}
                onClick={() => selectOption(null)}
              >
                {merged.clearLabel}
              </button>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3">
                  {loading || !hasLoadedOptions ? (
                    <div className="space-y-2" aria-label="Loading options">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div key={index} className="h-8 animate-pulse rounded-md bg-slate-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-sm text-slate-500">No options found.</div>
                  )}
                </div>
              ) : (
                filteredOptions.map((option) => {
                  const optionValue = optionText(option, merged.valueKey);
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      disabled={Boolean(option.disabled)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
                        optionValue === value
                          ? 'bg-primary-50 font-semibold text-primary-700'
                          : option.disabled
                            ? 'cursor-not-allowed text-slate-300'
                            : 'text-slate-700'
                      }`}
                      onClick={() => selectOption(option)}
                    >
                      {optionText(option, merged.labelKey)}
                    </button>
                  );
                })
              )}
              {loading && filteredOptions.length > 0 ? (
                <div className="space-y-2 px-3 py-2" aria-label="Loading more options">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="h-7 animate-pulse rounded-md bg-slate-100" />
                  ))}
                </div>
              ) : null}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
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
  renderLabel?: (option: SmartDropdownOption) => ReactNode;
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
  pageParam: 'page',
  limitParam: 'limit',
  limit: 20,
  valueKey: 'id',
  labelKey: 'value',
  clearLabel: 'Clear Selection',
};

const dropdownTheme = {
  selectedOptionBg: '#f5c772',
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

function optionIdentity(option: SmartDropdownOption, key?: string): string {
  const configuredValue = key ? option[key] : undefined;
  return String(configuredValue ?? option.value ?? option.id ?? option.label ?? option.name ?? '');
}

function optionMatchesValue(option: SmartDropdownOption, value: string, key?: string): boolean {
  const selectedValue = String(value ?? '');
  if (!selectedValue) {
    return false;
  }

  const candidates = [
    key ? option[key] : undefined,
    option.value,
    option.id,
    option.label,
    option.name,
  ];

  return candidates.some((candidate) => String(candidate ?? '') === selectedValue);
}

export default function SmartDropdown({ value, onChange, config, className = '' }: SmartDropdownProps) {
  const merged = useMemo(
    () => ({
      ...defaultConfig,
      ...config,
      serverSearch: config.serverSearch ?? Boolean(config.apiSubPath),
    }),
    [config],
  );
  const isApiMode = Boolean(merged.apiSubPath);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [apiOptions, setApiOptions] = useState<SmartDropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedOptions, setHasLoadedOptions] = useState(!isApiMode);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
      byValue.set(optionIdentity(option, merged.valueKey), option);
    }
    return Array.from(byValue.values());
  }, [apiOptions, isApiMode, merged.valueKey, normalizedLocalOptions]);
  const selectedOption = allOptions.find((option) => optionMatchesValue(option, value, merged.valueKey));

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
  const menuOptions = filteredOptions;
  const selectedMenuIndex = useMemo(() => {
    const index = filteredOptions.findIndex((option) => optionMatchesValue(option, value, merged.valueKey));
    return index >= 0 ? index : 0;
  }, [filteredOptions, merged.valueKey, value]);

  const isMenuIndexDisabled = useCallback(
    (index: number) => Boolean(menuOptions[index] && menuOptions[index]?.disabled),
    [menuOptions],
  );

  const nextEnabledIndex = useCallback(
    (startIndex: number, direction: 1 | -1) => {
      if (menuOptions.length === 0) return 0;
      let nextIndex = startIndex;
      for (let attempt = 0; attempt < menuOptions.length; attempt += 1) {
        nextIndex = (nextIndex + direction + menuOptions.length) % menuOptions.length;
        if (!isMenuIndexDisabled(nextIndex)) {
          return nextIndex;
        }
      }
      return startIndex;
    },
    [isMenuIndexDisabled, menuOptions.length],
  );

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const viewportPadding = 8;
    const gap = 4;
    const preferredMaxHeight = 320;
    const minimumUsefulHeight = 140;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - viewportPadding - gap);
    const spaceAbove = Math.max(0, rect.top - viewportPadding - gap);
    const openAbove = spaceBelow < minimumUsefulHeight && spaceAbove > spaceBelow;
    const availableHeight = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(minimumUsefulHeight, Math.min(preferredMaxHeight, availableHeight));
    const measuredHeight = dropdownRef.current?.offsetHeight || 0;
    const menuHeight = measuredHeight > 0 ? Math.min(measuredHeight, maxHeight) : maxHeight;
    const width = Math.max(rect.width, 220);
    const maxLeft = Math.max(viewportPadding, window.innerWidth - width - viewportPadding);
    const left = Math.min(Math.max(viewportPadding, rect.left), maxLeft);
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - menuHeight - gap)
      : Math.min(rect.bottom + gap, window.innerHeight - menuHeight - viewportPadding);

    setDropdownStyle({
      top,
      left,
      width,
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

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    const frame = window.requestAnimationFrame(updateDropdownPosition);
    return () => window.cancelAnimationFrame(frame);
  }, [filteredOptions.length, hasLoadedOptions, isOpen, loading, merged.showSearch, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen) return;
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

  useEffect(() => {
    if (!isOpen) return;
    const nextIndex = isMenuIndexDisabled(selectedMenuIndex)
      ? nextEnabledIndex(selectedMenuIndex, 1)
      : selectedMenuIndex;
    setActiveIndex(nextIndex);
  }, [isMenuIndexDisabled, isOpen, nextEnabledIndex, selectedMenuIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const activeElement = dropdownRef.current?.querySelector<HTMLElement>(`[data-menu-index="${activeIndex}"]`);
    activeElement?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

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
    onChange(option ? optionIdentity(option, merged.valueKey) : '', option);
    setIsOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  };

  const clearSelection = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    selectOption(null);
  };

  const handleKeyboardNavigation = (event: KeyboardEvent) => {
    if (merged.disabled) return;

    if (!isOpen) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(event.key)) {
        event.preventDefault();
        setIsOpen(true);
        updateDropdownPosition();
        setSearch('');
        setActiveIndex(selectedMenuIndex);
        window.setTimeout(() => inputRef.current?.focus(), 50);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => nextEnabledIndex(current, event.key === 'ArrowDown' ? 1 : -1));
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const edgeIndex = event.key === 'Home' ? 0 : menuOptions.length - 1;
      setActiveIndex(isMenuIndexDisabled(edgeIndex) ? nextEnabledIndex(edgeIndex, event.key === 'Home' ? 1 : -1) : edgeIndex);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const option = menuOptions[activeIndex] || null;
      if (!isMenuIndexDisabled(activeIndex)) {
        selectOption(option);
      }
    }
  };

  const handleScroll = () => {
    const list = listRef.current;
    if (!list || !hasMore || loading || !merged.pagination) return;
    const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (distanceFromBottom <= 48) {
      void fetchOptions(page + 1, search);
    }
  };

  const buttonLabel = selectedOption ? (merged.renderLabel ? merged.renderLabel(selectedOption) : optionText(selectedOption, merged.labelKey)) : value || merged.placeholder || 'Select...';
  const listMaxHeight = Math.max(140, dropdownStyle.maxHeight - (merged.showSearch ? 58 : 12));
  const listMinHeight = Math.min(220, listMaxHeight);

  return (
    <div ref={containerRef} className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={merged.disabled}
        onClick={openDropdown}
        onKeyDown={handleKeyboardNavigation}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={`flex h-10 w-full min-w-0 items-center justify-between rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition hover:bg-slate-50 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isOpen ? 'border-primary-500 ring-1 ring-primary-500' : ''
        }`}
      >
        <span className={selectedOption || value ? 'truncate' : 'truncate text-slate-400'}>{buttonLabel}</span>
        <svg className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {value && !merged.disabled ? (
        <button
          type="button"
          tabIndex={-1}
          data-autofocus-skip="true"
          className="absolute -left-2 -top-2 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-transparent text-red-600 transition hover:text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400"
          onClick={clearSelection}
          aria-label={merged.clearLabel}
          title={merged.clearLabel}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 6V10H16" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.4 9A8 8 0 1 0 20 14" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : null}

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            tabIndex={-1}
            role="listbox"
            className="fixed z-[260] flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5"
            style={dropdownStyle}
            onMouseDown={(event) => event.stopPropagation()}
            onKeyDown={handleKeyboardNavigation}
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
                filteredOptions.map((option, index) => {
                  const optionValue = optionText(option, merged.valueKey);
                  const menuIndex = index;
                  const isSelected = optionValue === value;
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      data-menu-index={menuIndex}
                      disabled={Boolean(option.disabled)}
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
                        activeIndex === menuIndex
                          ? 'bg-primary-50 font-semibold text-primary-800 ring-1 ring-inset ring-primary-200'
                          : isSelected
                          ? 'font-semibold text-slate-900'
                          : option.disabled
                            ? 'cursor-not-allowed text-slate-300'
                            : 'text-slate-700'
                      }`}
                      style={isSelected && activeIndex !== menuIndex ? { backgroundColor: dropdownTheme.selectedOptionBg } : undefined}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectOption(option)}
                    >
                      {merged.renderLabel ? merged.renderLabel(option) : optionText(option, merged.labelKey)}
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

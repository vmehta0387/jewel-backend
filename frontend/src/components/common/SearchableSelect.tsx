import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 320,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 12;
    const spaceAbove = rect.top - 12;
    const shouldOpenAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(220, Math.min(420, shouldOpenAbove ? spaceAbove : spaceBelow));
    setDropdownStyle({
      top: shouldOpenAbove ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6,
      left: rect.left,
      width: Math.max(rect.width, 192),
      maxHeight,
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lowerSearch = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.value.toLowerCase().includes(lowerSearch)
    );
  }, [options, search]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = () => {
    if (disabled) return;
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      updateDropdownPosition();
      setSearch('');
      // focus input asynchronously after render
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const optionsListMaxHeight = Math.max(140, dropdownStyle.maxHeight - 72);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`flex w-full min-w-[9rem] items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
          isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-400' : ''
        }`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <svg
          className={`ml-2 h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180 text-slate-600' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-[250] flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg ring-1 ring-slate-900/5 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-200"
          style={{
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
            maxHeight: dropdownStyle.maxHeight,
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 pl-8 text-sm placeholder-slate-400 transition-colors focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <svg
                className="absolute left-2.5 top-2 h-4 w-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1"
            style={{ maxHeight: optionsListMaxHeight, WebkitOverflowScrolling: 'touch' }}
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            {options.length > 0 && (
              <button
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-indigo-50 hover:text-indigo-700 ${
                  value === '' ? 'bg-indigo-50/50 font-semibold text-indigo-700' : 'text-slate-700'
                }`}
                onClick={() => handleSelect('')}
              >
                Clear Selection
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-slate-500">No options found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 ${
                    opt.value === value
                      ? 'bg-indigo-50 font-semibold text-indigo-700'
                      : opt.disabled
                        ? 'cursor-not-allowed text-slate-300 hover:bg-transparent'
                        : 'text-slate-700'
                  }`}
                  onClick={() => handleSelect(opt.value)}
                >
                  {opt.label}
                  {opt.disabled ? ' (Used)' : ''}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

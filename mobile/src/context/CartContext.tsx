import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { SelectedDesignOptions } from '../types';

export type CartSelection = {
  diamondType?: string;
  shape?: string;
  style?: string;
  metalColor?: string;
  weight?: string;
  quality?: string;
  ringSize?: string;
};

export type CartItem = {
  id: string;
  designId: string;
  designNo: string;
  designName?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
  shortDescription?: string;
  selectedOptions?: SelectedDesignOptions | null;
  selection?: CartSelection;
};

type AddCartItemInput = Omit<CartItem, 'id' | 'quantity'> & {
  quantity?: number;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalValue: number;
  addItem: (item: AddCartItemInput) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const normalize = (value?: string | number | null) => String(value ?? '').trim().toLowerCase();

const buildSignature = (item: AddCartItemInput) => {
  const selection = item.selection || {};
  const selectedOptions = item.selectedOptions || {};
  return [
    item.designId,
    normalize(selectedOptions.diamondType?.id ?? selectedOptions.diamondType?.label ?? selection.diamondType),
    normalize(selectedOptions.shape?.id ?? selectedOptions.shape?.label ?? selection.shape),
    normalize(selectedOptions.style?.id ?? selectedOptions.style?.label ?? selection.style),
    normalize(selectedOptions.metalCaratage?.id ?? selectedOptions.metalCaratage?.label ?? selection.metalColor),
    normalize(selectedOptions.weight?.id ?? selectedOptions.weight?.label ?? selection.weight),
    normalize(selectedOptions.quality?.id ?? selectedOptions.quality?.label ?? selection.quality),
    normalize(selectedOptions.ringSize?.id ?? selectedOptions.ringSize?.label ?? selection.ringSize),
  ].join('|');
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((item: AddCartItemInput) => {
    const quantityToAdd = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const signature = buildSignature(item);
    setItems((prev) => {
      const existing = prev.find(
        (entry) =>
          buildSignature({
            ...entry,
            quantity: entry.quantity,
          }) === signature,
      );
      if (!existing) {
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            ...item,
            quantity: quantityToAdd,
          },
        ];
      }

      return prev.map((entry) =>
        entry.id === existing.id ? { ...entry, quantity: entry.quantity + quantityToAdd } : entry,
      );
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((entry) => entry.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    const nextQty = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems((prev) => prev.map((entry) => (entry.id === id ? { ...entry, quantity: nextQty } : entry)));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice || 0), 0);
    return {
      items,
      itemCount,
      totalValue,
      addItem,
      removeItem,
      updateQuantity,
      clear,
    };
  }, [items, addItem, removeItem, updateQuantity, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};



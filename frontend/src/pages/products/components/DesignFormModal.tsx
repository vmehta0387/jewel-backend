import { ReactNode } from 'react';
import ProductsModal from './ProductsModal';

interface DesignFormModalProps {
  editingId: string | null;
  onClose: () => void;
  children: ReactNode;
}

export default function DesignFormModal({ editingId, onClose, children }: DesignFormModalProps) {
  return (
    <ProductsModal title={editingId ? 'EDIT DESIGN' : 'ADD NEW DESIGN'} size="max-w-7xl" onClose={onClose}>
      {children}
    </ProductsModal>
  );
}

import { ReactNode } from 'react';
import ProductsModal from './ProductsModal';

interface DesignViewModalProps {
  designNo: string;
  onClose: () => void;
  children: ReactNode;
}

export default function DesignViewModal({ designNo, onClose, children }: DesignViewModalProps) {
  return (
    <ProductsModal title={`DESIGN DETAILS (${designNo})`} onClose={onClose} size="max-w-7xl">
      {children}
    </ProductsModal>
  );
}

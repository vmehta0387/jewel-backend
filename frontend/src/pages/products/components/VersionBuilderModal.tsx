import { ReactNode } from 'react';
import ProductsModal from './ProductsModal';

interface VersionBuilderModalProps {
  title: string;
  footer: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export default function VersionBuilderModal({ title, footer, onClose, children }: VersionBuilderModalProps) {
  return (
    <ProductsModal title={title} size="max-w-6xl" onClose={onClose} footer={footer}>
      {children}
    </ProductsModal>
  );
}

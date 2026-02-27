import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function ProductsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ring Styles</h1>
        <Button>+ Add Ring Style</Button>
      </div>
      <Card>
        <div className="text-center py-12 text-gray-500">
          No ring styles yet. Create your first ring style to get started.
        </div>
      </Card>
    </div>
  );
}

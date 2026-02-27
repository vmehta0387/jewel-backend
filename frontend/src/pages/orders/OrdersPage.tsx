import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

export default function OrdersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <Button>+ Create Order</Button>
      </div>
      <Card>
        <div className="text-center py-12 text-gray-500">
          No orders yet. Create your first order to get started.
        </div>
      </Card>
    </div>
  );
}

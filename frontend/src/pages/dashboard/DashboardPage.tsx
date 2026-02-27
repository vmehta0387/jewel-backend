import Card from '../../components/common/Card';

export default function DashboardPage() {
  const stats = [
    { label: 'Total Companies', value: '2', icon: '🏢' },
    { label: 'Active Orders', value: '0', icon: '📦' },
    { label: 'Ring Styles', value: '0', icon: '💍' },
    { label: 'Total Revenue', value: '$0', icon: '💰' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className="text-4xl">{stat.icon}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

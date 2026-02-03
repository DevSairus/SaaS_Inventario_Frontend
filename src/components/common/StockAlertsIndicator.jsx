import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import useStockAlertsStore from '../../store/stockAlertsStore';

const StockAlertsIndicator = () => {
  const { stats, fetchStats } = useStockAlertsStore();

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const totalActive = stats.total_active || 0;
  const hasCritical = stats.critical > 0;

  if (totalActive === 0) {
    return null;
  }

  return (
    <Link
      to="/stock-alerts"
      className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      title={hasCritical ? 'Tienes alertas críticas de stock' : 'Alertas de stock'}
    >
      <Bell className={`w-5 h-5 ${hasCritical ? 'text-red-500' : 'text-orange-500'}`} />
      
      <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-2 text-xs font-bold text-white rounded-full ${
        hasCritical ? 'bg-red-600' : 'bg-orange-500'
      }`}>
        {totalActive > 99 ? '99+' : totalActive}
      </span>
    </Link>
  );
};

export default StockAlertsIndicator;
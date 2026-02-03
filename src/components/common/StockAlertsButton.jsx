import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useStockAlertsStore from '../../store/stockAlertsStore';

const StockAlertsButton = () => {
  const navigate = useNavigate();
  const { stats, fetchStats } = useStockAlertsStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (!stats?.total_active || stats.total_active === 0) return null;

  return (
    <button
      onClick={() => navigate('/stock-alerts')}
      title="Alertas de stock"
      className="
        fixed
        top-20 right-6
        z-50
        w-11 h-11
        rounded-full
        bg-white
        shadow-lg
        hover:bg-orange-50
        transition
        flex items-center justify-center
      "
    >
      <AlertTriangle className="w-6 h-6 text-orange-600" />

      <span
        className="
          absolute
          -top-1 -right-1
          min-w-[18px] h-[18px]
          px-1
          bg-red-600 text-white
          text-xs font-bold
          rounded-full
          flex items-center justify-center
        "
      >
        {stats.total_active}
      </span>
    </button>
  );
};

export default StockAlertsButton;

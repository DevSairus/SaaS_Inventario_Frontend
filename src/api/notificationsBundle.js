import axios from './axios';

// Reemplaza las 6 llamadas independientes (StockAlerts, PayableAlerts,
// AdvanceAlerts, CrmNotifications, QuoteNotificationsBell,
// AppointmentNotificationsBell) por una sola — ver notificationsBundleStore.js.
export const getNotificationsBundle = async () => {
  const response = await axios.get('/notifications/summary');
  return response.data;
};

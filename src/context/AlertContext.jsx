import { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext({});

export function useAlertContext() {
  return useContext(AlertContext);
}

export function AlertProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Dipanggil dari LiveMonitoring setiap ada alert baru
  const addNotification = useCallback((alert) => {
    setNotifications(prev => [{
      id: Date.now() + Math.random(),
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      details: alert.details || null,
      timestamp: new Date(),
      read: false,
    }, ...prev].slice(0, 50)); // max 50
  }, []);

  // Tandai semua sudah dibaca
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // Hapus semua
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Hapus satu
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AlertContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAllRead,
      clearAll,
      removeNotification,
    }}>
      {children}
    </AlertContext.Provider>
  );
}
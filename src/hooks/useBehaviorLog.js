import { useState, useEffect, useCallback } from 'react';
import { 
  generateDummyBehaviorLogs,
  saveBehaviorLog 
} from '../services/behaviorLogService';

export function useBehaviorLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    vehicleId: 'TRUCK_001',
    startDate: '',
    endDate: '',
    status: 'all',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 15,
    total: 0,
    totalPages: 0,
  });

  // Load dummy data for testing
  const loadLogs = useCallback(async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate dummy data
    let dummyLogs = generateDummyBehaviorLogs(100);
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      dummyLogs = dummyLogs.filter(log => log.status === filters.status);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      dummyLogs = dummyLogs.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      dummyLogs = dummyLogs.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    // Calculate pagination
    const total = dummyLogs.length;
    const totalPages = Math.ceil(total / pagination.pageSize);
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    
    // Get paginated data
    const paginatedLogs = dummyLogs.slice(startIndex, endIndex);
    
    setLogs(paginatedLogs);
    setPagination(prev => ({
      ...prev,
      total,
      totalPages,
    }));
    setLoading(false);
  }, [filters, pagination.currentPage, pagination.pageSize]);

  // Load logs on mount and when filters change
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  }, []);

  // Change page
  const changePage = useCallback((page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  }, []);

  // Get all logs for export (without pagination)
  const getAllLogsForExport = useCallback(async () => {
    let dummyLogs = generateDummyBehaviorLogs(100);
    
    // Apply filters
    if (filters.status && filters.status !== 'all') {
      dummyLogs = dummyLogs.filter(log => log.status === filters.status);
    }
    
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      dummyLogs = dummyLogs.filter(log => new Date(log.timestamp) >= startDate);
    }
    
    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      dummyLogs = dummyLogs.filter(log => new Date(log.timestamp) <= endDate);
    }
    
    return dummyLogs;
  }, [filters]);

  // Refresh logs
  const refreshLogs = useCallback(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    logs,
    loading,
    filters,
    pagination: {
      ...pagination,
      from: logs.length > 0 ? (pagination.currentPage - 1) * pagination.pageSize + 1 : 0,
      to: Math.min(pagination.currentPage * pagination.pageSize, pagination.total),
    },
    updateFilters,
    changePage,
    getAllLogsForExport,
    refreshLogs,
  };
}
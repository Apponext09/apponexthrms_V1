import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import { showToast } from '@/components/ui/toast';
import { useCompanyStore } from '@/features/settings/store/companyStore';

export interface GeofenceLocation {
  id: number;
  uuid: string;
  locationId: number;
  geofenceName: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  ipAddress?: string | null;
  isOfficeLocation: boolean;
  allowsRemoteWork: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useLocationManagement() {
  const { selectedCompanyId } = useCompanyStore();
  const [geofences, setGeofences] = useState<GeofenceLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [currentIp, setCurrentIp] = useState<string | null>(null);

  const fetchGeofences = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/attendance/geofences');
      const data = res.data?.data || res.data || [];
      setGeofences(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[useLocationManagement] Failed to fetch geofences:', e);
      setGeofences([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompanyId]);

  const fetchCurrentIp = useCallback(async () => {
    try {
      const res = await apiClient.get('/attendance/current-ip');
      const ip = res.data?.data?.ipAddress || res.data?.ipAddress;
      if (ip) {
        setCurrentIp(ip);
        return ip;
      }
    } catch (e) {
      console.warn('[useLocationManagement] Failed to detect current IP:', e);
    }
    return null;
  }, []);

  const createGeofence = async (payload: {
    geofenceName: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    ipAddress?: string;
    isOfficeLocation?: boolean;
    allowsRemoteWork?: boolean;
  }) => {
    setIsSaving(true);
    try {
      const res = await apiClient.post('/attendance/geofences', payload);
      showToast.success('Location geofence created successfully!');
      await fetchGeofences();
      return res.data?.data;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to create location geofence';
      showToast.error(msg);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const updateGeofence = async (
    id: number,
    payload: {
      geofenceName?: string;
      latitude?: number;
      longitude?: number;
      radiusMeters?: number;
      ipAddress?: string;
      isOfficeLocation?: boolean;
      allowsRemoteWork?: boolean;
    }
  ) => {
    setIsSaving(true);
    try {
      const res = await apiClient.put(`/attendance/geofences/${id}`, payload);
      showToast.success('Location geofence updated successfully!');
      await fetchGeofences();
      return res.data?.data;
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to update location geofence';
      showToast.error(msg);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteGeofence = async (id: number) => {
    setIsSaving(true);
    try {
      await apiClient.delete(`/attendance/geofences/${id}`);
      showToast.success('Location geofence deleted');
      await fetchGeofences();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to delete location geofence';
      showToast.error(msg);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  return {
    geofences,
    isLoading,
    isSaving,
    currentIp,
    fetchGeofences,
    fetchCurrentIp,
    createGeofence,
    updateGeofence,
    deleteGeofence,
  };
}

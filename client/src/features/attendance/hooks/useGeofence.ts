import { useState, useCallback } from 'react';
import { apiClient } from '@/config/api';

export function useGeofence() {
  const [locations, setLocations] = useState<any[]>([]);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [matchedOffice, setMatchedOffice] = useState<any>(null);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);
  const [radiusLimit, setRadiusLimit] = useState<number>(500);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateLocation = useCallback(
    async (latitude: number, longitude: number) => {
      setLoading(true);
      try {
        const response = await apiClient.post('/attendance/validate-location', {
          latitude,
          longitude,
        });
        const data = response.data.data || {};
        const valid = data.valid || false;
        setIsWithinGeofence(valid);
        setValidationMessage(data.message || null);
        setMatchedOffice(data.matchedOffice || null);
        setDistanceMeters(data.distanceMeters ?? null);
        setRadiusLimit(data.radiusLimit || 500);
        setError(null);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Validation failed');
        setIsWithinGeofence(false);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getAllLocations = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/attendance/locations', { params });
      setLocations(response.data.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createLocation = useCallback(async (locationData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/locations', locationData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createGeofence = useCallback(async (geofenceData: any) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/attendance/geofences', geofenceData);
      setError(null);
      return response.data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create geofence');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    locations,
    isWithinGeofence,
    validationMessage,
    matchedOffice,
    distanceMeters,
    radiusLimit,
    loading,
    error,
    validateLocation,
    getAllLocations,
    createLocation,
    createGeofence,
  };
}


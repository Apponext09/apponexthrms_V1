import axios from 'axios';

const rawApiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

export const getApiBaseUrl = (): string => {
  return rawApiUrl.replace('/api/v1', '');
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and company context header
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (!config.url?.includes('/auth/')) {
    try {
      const rawCompanyStorage = localStorage.getItem('company-context-storage');
      if (rawCompanyStorage) {
        const parsed = JSON.parse(rawCompanyStorage);
        const companyId = parsed?.state?.selectedCompanyId;
        if (companyId && typeof companyId === 'number') {
          config.headers['X-Company-Id'] = String(companyId);
        }
      }
    } catch (err) {
      // Ignore JSON parse error
    }
  }

  return config;
});

// Flag to prevent infinite loop of token refreshes
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor for error handling and transparent token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized — token expired, try refresh
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken: refreshToken || undefined },
          { withCredentials: true }
        );

        const newAccessToken = response.data?.data?.accessToken;
        const newRefreshToken = response.data?.data?.refreshToken;

        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        processQueue(null, newAccessToken || null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error('[API] Token refresh failed, clearing auth and redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 Forbidden — user lacks permission for this resource
    if (error.response?.status === 403) {
      console.warn('[API] Access forbidden (403)', {
        url: originalRequest?.url,
        method: originalRequest?.method,
        timestamp: new Date().toISOString(),
      });
      // Redirect to unauthorized page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/unauthorized')) {
        window.location.href = '/unauthorized';
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

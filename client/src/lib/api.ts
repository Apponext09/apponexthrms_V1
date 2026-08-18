import axios from 'axios';

const rawApiUrl = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:5000/api/v1';
const API_BASE_URL = rawApiUrl.endsWith('/v1') ? rawApiUrl : `${rawApiUrl}/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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

    // Check if the error is 401 and it's not a retry or an auth endpoint
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

      const isPublicRoute =
        typeof window !== 'undefined' && (
          window.location.pathname.startsWith('/public') ||
          window.location.pathname.startsWith('/liberation') ||
          window.location.pathname.startsWith('/careers') ||
          originalRequest.url?.includes('/public/')
        );

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // No refresh token available, logout user only if not on a public route
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Call the refresh endpoint to obtain a new token pair
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh token request fails (e.g. refresh token expired), clean up and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (!isPublicRoute) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;

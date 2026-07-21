import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/config/api';

export interface PerformanceMetricsData {
  totalEmployees: number;
  averageRating: number;
  averageGoalProgress: number;
  activeReviews: number;
  completedReviews: number;
  pendingApprovals: number;
}

export interface PerformanceDistributionData {
  rating: number;
  count: number;
  percentage: number;
  label: string;
}

export interface TalentMatrixData {
  highPerformers: number;
  solidPerformers: number;
  needsImprovement: number;
  unsatisfactory: number;
}

export interface GoalProgressData {
  totalGoals: number;
  onTrackGoals: number;
  atRiskGoals: number;
  completedGoals: number;
  cancelledGoals: number;
}

export interface DepartmentAnalytics {
  departmentId: number;
  departmentName: string;
  totalEmployees: number;
  averageRating: number;
  completionRate: number;
  topPerformers: number;
  bottomPerformers: number;
}

export interface ReviewCycleAnalytics {
  cycleId: number;
  cycleName: string;
  totalAppraisals: number;
  completedAppraisals: number;
  pendingAppraisals: number;
  completionPercentage: number;
  averageRating: number;
  startDate: string;
  endDate: string;
}

export interface SkillGapAnalytics {
  competency: string;
  employees: number;
  averageCurrentLevel: number;
  averageTargetLevel: number;
  gapScore: number;
  priority: 'high' | 'medium' | 'low';
}

export interface PerformanceTrendData {
  period: string;
  averageRating: number;
  reviewsCompleted: number;
  goalsOnTrack: number;
  feedbackSubmissions: number;
}

export interface SuccessionAnalyticsData {
  totalCriticalPositions: number;
  readySuccessors: number;
  needsDevelopment: number;
  noSuccessor: number;
  averageReadinessPercentage: number;
}

export const usePerformanceDashboard = () => {
  const dashboardQuery = useQuery({
    queryKey: ['performance-dashboard'],
    queryFn: () =>
      apiClient.get('/performance/analytics/dashboard')
  });

  const metricsQuery = useQuery({
    queryKey: ['performance-metrics'],
    queryFn: () =>
      apiClient.get('/performance/analytics/metrics')
  });

  return {
    dashboard: dashboardQuery.data?.data,
    metrics: metricsQuery.data?.data,
    isLoading: dashboardQuery.isLoading || metricsQuery.isLoading,
    error: dashboardQuery.error || metricsQuery.error
  };
};

export const usePerformanceDistribution = (cycleId?: number) => {
  return useQuery({
    queryKey: ['performance-distribution', cycleId],
    queryFn: () =>
      apiClient.get('/performance/analytics/distribution', {
        params: { cycleId }
      })
  });
};

export const useTalentMatrix = (cycleId?: number) => {
  return useQuery({
    queryKey: ['talent-matrix', cycleId],
    queryFn: () =>
      apiClient.get('/performance/analytics/talent-matrix', {
        params: { cycleId }
      })
  });
};

export const useGoalProgressAnalytics = (departmentId?: number, period?: string) => {
  return useQuery({
    queryKey: ['goal-progress-analytics', departmentId, period],
    queryFn: () =>
      apiClient.get('/performance/analytics/goal-progress', {
        params: { departmentId, period }
      })
  });
};

export const useDepartmentAnalytics = (departmentId?: number) => {
  return useQuery({
    queryKey: ['department-analytics', departmentId],
    queryFn: () =>
      apiClient.get('/performance/analytics/departments', {
        params: { departmentId }
      })
  });
};

export const useReviewCycleAnalytics = (cycleId?: number) => {
  return useQuery({
    queryKey: ['review-cycle-analytics', cycleId],
    queryFn: () =>
      apiClient.get('/performance/analytics/review-cycles', {
        params: { cycleId }
      })
  });
};

export const useSkillGapAnalytics = (departmentId?: number) => {
  return useQuery({
    queryKey: ['skill-gap-analytics', departmentId],
    queryFn: () =>
      apiClient.get('/performance/analytics/skill-gaps', {
        params: { departmentId }
      })
  });
};

export const usePerformanceTrends = (period: string = '12m') => {
  return useQuery({
    queryKey: ['performance-trends', period],
    queryFn: () =>
      apiClient.get('/performance/analytics/trends', {
        params: { period }
      })
  });
};

export const useSuccessionAnalytics = (departmentId?: number) => {
  return useQuery({
    queryKey: ['succession-analytics', departmentId],
    queryFn: () =>
      apiClient.get('/performance/analytics/succession', {
        params: { departmentId }
      })
  });
};

export const useTopPerformers = (limit: number = 10, departmentId?: number) => {
  return useQuery({
    queryKey: ['top-performers', limit, departmentId],
    queryFn: () =>
      apiClient.get('/performance/analytics/top-performers', {
        params: { limit, departmentId }
      })
  });
};

export const usePerformanceReports = (reportType: string) => {
  return useQuery({
    queryKey: ['performance-reports', reportType],
    queryFn: () =>
      apiClient.get('/performance/analytics/reports', {
        params: { type: reportType }
      })
  });
};

export const useExportPerformanceData = () => {
  const exportQuery = async (reportType: string, format: 'csv' | 'pdf' = 'csv') => {
    const response = await apiClient.get(
      '/performance/analytics/export',
      {
        params: { type: reportType, format },
        responseType: format === 'pdf' ? 'blob' : 'json'
      }
    );
    return response;
  };

  return { exportData: exportQuery };
};


export interface SuperAdminRecord {
  id: number;
  uuid: string;
  user_id?: number | null;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  access_level: 'owner' | 'superadmin' | 'auditor';
  status: 'active' | 'inactive' | 'suspended';
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuperAdminDashboardStats {
  totalOrganizations: number;
  activeSubscriptions: number;
  totalEmployees: number;
  monthlyRevenue: number;
  systemStatus: 'healthy' | 'degraded' | 'maintenance';
  growthData?: { month: string; organizations: number }[];
  platformUsage?: {
    securityShield: string;
    systemUptime: string;
    resourceLoad: string;
  };
}

export interface CreateTenantInput {
  name: string;
  code: string;
  ownerName: string;
  location: string;
  email: string;
  phone: string;
  password?: string;
  websiteUrl?: string;
  plan?: string;
  industry?: string;
}

import { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle,
  Zap,
  Shield,
  Layers,
  Plus,
  Edit,
  Calendar,
  FileText,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/config/api';

const ALL_ADMIN_MODULES = [
  'Core HR & Directory',
  'Attendance & Time Tracking',
  'Leave Management & Approvals',
  'Automated Payroll Processing',
  'Performance & OKRs',
  'Recruitment & ATS',
  'Asset Lifecycle Management',
  'Custom Workflow Builder',
  'Audit & Security Logs',
  'Settings & RBAC',
  'Marketplace & Add-ons',
];

export interface SubscriptionPlan {
  id?: number;
  name: string;
  price: string;
  startDate: string;
  endDate: string;
  description: string;
  status: string;
  modules: string[];
}

export function SuperAdminSubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  const fetchSubscriptions = async () => {
    try {
      const response = await apiClient.get('/superadmin/subscriptions');
      if (response.data?.data?.plans && Array.isArray(response.data.data.plans)) {
        setPlans(response.data.data.plans);
      }
    } catch (err) {
      console.error('Failed to fetch subscription plans from database:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const [formData, setFormData] = useState<SubscriptionPlan>({
    name: '',
    price: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    description: '',
    status: 'Active',
    modules: ['Core HR & Directory', 'Attendance & Time Tracking', 'Leave Management & Approvals'],
  });

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: '',
      status: 'Active',
      modules: ['Core HR & Directory', 'Attendance & Time Tracking', 'Leave Management & Approvals'],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormData({
      ...plan,
      modules: Array.isArray(plan.modules) ? plan.modules : [],
    });
    setIsModalOpen(true);
  };

  const toggleModule = (moduleName: string) => {
    setFormData((prev) => {
      const exists = prev.modules.includes(moduleName);
      return {
        ...prev,
        modules: exists ? prev.modules.filter((m) => m !== moduleName) : [...prev.modules, moduleName],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    try {
      if (editingPlan && editingPlan.id) {
        await apiClient.put(`/superadmin/subscriptions/${editingPlan.id}`, formData);
      } else {
        await apiClient.post('/superadmin/subscriptions', formData);
      }
      await fetchSubscriptions();
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save subscription plan in database:', err);
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Top Header Banner */}
      <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 mb-2">
            Plan Tier Management
          </Badge>
          <h1 className="text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
            Subscription Plan Engine
          </h1>
          <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 max-w-xl">
            Configure subscription tiers, custom pricing, feature entitlements, and module access checkboxes for tenant organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md gap-1.5 h-10 px-4"
          >
            <Plus className="w-4 h-4" /> Add Subscription Plan
          </Button>
        </div>
      </div>

      {/* Subscription Plans Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Available Subscription Plans
          </h2>
          <span className="text-xs text-muted-foreground dark:text-slate-400">{plans.length} Configured Tiers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id || plan.name}
              className="bg-card dark:bg-slate-900 border border-border dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-border/80 dark:hover:border-slate-700 transition"
            >
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-foreground dark:text-white">{plan.name}</CardTitle>
                    <Badge
                      className={
                        plan.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                      }
                    >
                      {plan.status}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-foreground dark:text-white">{plan.price}</span>
                    <span className="text-xs text-muted-foreground dark:text-slate-400">/ per month</span>
                  </div>

                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground dark:text-slate-400 bg-muted/40 dark:bg-slate-950/60 p-2 rounded-lg border border-border dark:border-slate-800">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                    <span>
                      {plan.startDate} to {plan.endDate}
                    </span>
                  </div>

                  <CardDescription className="text-muted-foreground dark:text-slate-400 text-xs mt-3 leading-relaxed">
                    {plan.description || 'No description provided.'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-3 border-t border-border/80 dark:border-slate-800/80 space-y-2">
                  <p className="text-xs font-semibold text-foreground dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Included Admin Modules ({plan.modules?.length || 0})
                  </p>
                  <div className="space-y-1.5 pt-1">
                    {plan.modules && plan.modules.length > 0 ? (
                      plan.modules.map((mod) => (
                        <div key={mod} className="text-xs text-foreground dark:text-slate-300 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          <span>{mod}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No specific modules selected.</p>
                    )}
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-4 border-t border-border dark:border-slate-800">
                <Button
                  onClick={() => openEditModal(plan)}
                  variant="outline"
                  className="w-full border-border dark:border-slate-700 text-foreground dark:text-slate-200 hover:bg-muted dark:hover:bg-slate-800 font-semibold text-xs gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Edit Plan Tier
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Add / Edit Subscription Plan Dialog Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              {editingPlan ? 'Edit Subscription Plan' : 'Add New Subscription Plan'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs">
              Configure subscription plan pricing, validity date range, status, and assign active admin modules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Row 1: Plan Name & Price */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Subscription Plan Name *</Label>
                <Input
                  required
                  placeholder="e.g. Professional Plus"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white placeholder:text-muted-foreground text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Pricing (₹ or Custom) *</Label>
                <Input
                  required
                  placeholder="e.g. ₹14,999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white placeholder:text-muted-foreground text-xs"
                />
              </div>
            </div>

            {/* Row 2: Start Date & End Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Start Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">End Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>
            </div>

            {/* Row 3: Description & Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Description</Label>
                <Input
                  placeholder="Brief description of the plan tier scope"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white placeholder:text-muted-foreground text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Status *</Label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground dark:text-white rounded-md h-9 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Row 4: Admin Modules Checklist (Checkboxes) */}
            <div className="space-y-2 pt-2 border-t border-border dark:border-slate-800">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-foreground dark:text-slate-200 font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Assign Admin Modules (Checkboxes)
                </Label>
                <span className="text-[11px] text-muted-foreground dark:text-slate-400">
                  {formData.modules.length} of {ALL_ADMIN_MODULES.length} Selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/40 dark:bg-slate-950 p-3 rounded-xl border border-border dark:border-slate-800 max-h-48 overflow-y-auto">
                {ALL_ADMIN_MODULES.map((modName) => {
                  const isChecked = formData.modules.includes(modName);
                  return (
                    <label
                      key={modName}
                      onClick={() => toggleModule(modName)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs border transition ${
                        isChecked
                          ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-700 dark:text-white font-medium'
                          : 'bg-card dark:bg-slate-900/60 border-border dark:border-slate-800 text-muted-foreground dark:text-slate-400 hover:text-foreground dark:hover:text-slate-200'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                      )}
                      <span>{modName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="border-border dark:border-slate-800 text-muted-foreground hover:text-foreground text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5">
                {editingPlan ? 'Save Changes' : 'Create Subscription Plan'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

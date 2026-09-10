import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Search,
  CheckCircle,
  Clock,
  MessageSquare,
  Building2,
  Mail,
  Phone,
  Plus,
  Filter,
  Eye,
  Send,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { apiClient } from '@/config/api';

export interface HelpDeskQuery {
  id: number;
  uuid: string;
  clientName: string;
  companyName: string;
  email: string;
  phone?: string;
  planInterest: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  isRead: boolean;
  createdAt: string;
}

export function SuperAdminHelpDeskPage() {
  const [queries, setQueries] = useState<HelpDeskQuery[]>([
    {
      id: 1,
      uuid: 'q-101',
      clientName: 'Rahul Verma',
      companyName: 'Apex Logistics Ltd',
      email: 'rahul.verma@apexlogistics.com',
      phone: '+91 9811223344',
      planInterest: 'Enterprise',
      message: 'Interested in enterprise subscription for 450 employees. Please send quote and demo details.',
      status: 'new',
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      uuid: 'q-102',
      clientName: 'Priya Sharma',
      companyName: 'NexGen Technologies',
      email: 'priya@nexgentech.io',
      phone: '+91 9822334455',
      planInterest: 'Professional',
      message: 'Would like to inquire about automated payroll setup and custom workflow builder feature.',
      status: 'in_progress',
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 3,
      uuid: 'q-103',
      clientName: 'Vikram Mehta',
      companyName: 'Starlight Tech',
      email: 'vikram@starlighttech.com',
      phone: '+91 9876599999',
      planInterest: 'Starter',
      message: 'Trial period ending soon. We want to convert to paid starter tier.',
      status: 'resolved',
      isRead: true,
      createdAt: new Date(Date.now() - 172800000).toISOString(),
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuery, setSelectedQuery] = useState<HelpDeskQuery | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // New Query Form State
  const [newQueryForm, setNewQueryForm] = useState({
    clientName: '',
    companyName: '',
    email: '',
    phone: '',
    planInterest: 'Enterprise',
    message: '',
  });

  useEffect(() => {
    async function fetchQueries() {
      try {
        const res = await apiClient.get('/superadmin/helpdesk/queries');
        if (res.data?.data && Array.isArray(res.data.data)) {
          setQueries(res.data.data);
        }
      } catch (err) {
        console.log('Using default helpdesk queries');
      }
    }
    fetchQueries();
  }, []);

  const handleUpdateStatus = async (queryId: number, newStatus: HelpDeskQuery['status']) => {
    try {
      await apiClient.patch(`/superadmin/helpdesk/queries/${queryId}/status`, { status: newStatus });
      setQueries((prev) =>
        prev.map((q) => (q.id === queryId ? { ...q, status: newStatus, isRead: true } : q))
      );
      if (selectedQuery && selectedQuery.id === queryId) {
        setSelectedQuery({ ...selectedQuery, status: newStatus, isRead: true });
      }
    } catch (err) {
      setQueries((prev) =>
        prev.map((q) => (q.id === queryId ? { ...q, status: newStatus, isRead: true } : q))
      );
    }
  };

  const handleNewQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryForm.clientName || !newQueryForm.email) return;

    try {
      const res = await apiClient.post('/superadmin/helpdesk/queries', newQueryForm);
      const created = res.data?.data || {
        ...newQueryForm,
        id: Date.now(),
        uuid: `q-${Date.now()}`,
        status: 'new' as const,
        isRead: false,
        createdAt: new Date().toISOString(),
      };
      setQueries((prev) => [created, ...prev]);
    } catch (err) {
      setQueries((prev) => [
        {
          ...newQueryForm,
          id: Date.now(),
          uuid: `q-${Date.now()}`,
          status: 'new' as const,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setNewQueryForm({
      clientName: '',
      companyName: '',
      email: '',
      phone: '',
      planInterest: 'Enterprise',
      message: '',
    });
    setIsSubmitModalOpen(false);
  };

  const filteredQueries = queries.filter((q) => {
    const matchesSearch =
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.planInterest.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: HelpDeskQuery['status']) => {
    switch (status) {
      case 'new':
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">New Inquiry</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">In Progress</Badge>;
      case 'resolved':
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Resolved</Badge>;
      case 'closed':
        return <Badge className="bg-slate-700 text-slate-300 border-slate-600">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-foreground">
      {/* Header Banner */}
      <div className="bg-card dark:bg-slate-900 p-6 rounded-2xl border border-border dark:border-slate-800 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30 mb-2">
            Client Inquiries & Sales Leads
          </Badge>
          <h1 className="text-2xl font-extrabold text-foreground dark:text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            SuperAdmin Help Desk & Purchase Requests
          </h1>
          <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 max-w-xl">
            Track and manage client inquiries for software purchases, subscription upgrades, custom feature requests, and demo inquiries.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsSubmitModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md gap-1.5 h-10 px-4"
          >
            <Plus className="w-4 h-4" /> Add Client Inquiry Query
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white shadow-xs dark:shadow-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 font-medium">Total Inquiries</p>
            <p className="text-2xl font-bold text-foreground dark:text-white mt-1">{queries.length}</p>
          </div>
          <MessageSquare className="w-8 h-8 text-indigo-500 dark:text-indigo-400 opacity-80" />
        </Card>

        <Card className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white shadow-xs dark:shadow-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 font-medium">New / Unread</p>
            <p className="text-2xl font-bold text-rose-500 dark:text-rose-400 mt-1">
              {queries.filter((q) => q.status === 'new' || !q.isRead).length}
            </p>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-500 dark:text-rose-400 opacity-80" />
        </Card>

        <Card className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white shadow-xs dark:shadow-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 font-medium">In Progress</p>
            <p className="text-2xl font-bold text-amber-500 dark:text-amber-400 mt-1">
              {queries.filter((q) => q.status === 'in_progress').length}
            </p>
          </div>
          <Clock className="w-8 h-8 text-amber-500 dark:text-amber-400 opacity-80" />
        </Card>

        <Card className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white shadow-xs dark:shadow-md p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground dark:text-slate-400 font-medium">Resolved / Converted</p>
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-400 mt-1">
              {queries.filter((q) => q.status === 'resolved').length}
            </p>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400 opacity-80" />
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-white shadow-sm dark:shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border dark:border-slate-800 pb-4">
          <div>
            <CardTitle className="text-base text-foreground dark:text-white font-semibold">Purchase & Subscription Queries</CardTitle>
            <CardDescription className="text-muted-foreground dark:text-slate-400 text-xs">
              Structured table of software inquiries from potential client organizations
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search client, email or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs pl-9 w-full sm:w-64 h-9"
              />
            </div>

            {/* Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground dark:text-slate-200 text-xs rounded-md px-3 h-9 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="new">New Inquiries</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 dark:bg-slate-950/80 text-muted-foreground dark:text-slate-400 font-semibold border-b border-border dark:border-slate-800">
                <tr>
                  <th className="p-4">Client & Company</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Plan Interest</th>
                  <th className="p-4">Date Received</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 dark:divide-slate-800">
                {filteredQueries.length > 0 ? (
                  filteredQueries.map((q) => (
                    <tr key={q.id} className="hover:bg-muted/50 dark:hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="font-bold text-foreground dark:text-white flex items-center gap-2">
                          {!q.isRead && <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />}
                          {q.clientName}
                        </div>
                        <div className="text-muted-foreground dark:text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                          {q.companyName}
                        </div>
                      </td>

                      <td className="p-4 space-y-0.5">
                        <div className="text-foreground/90 dark:text-slate-200 flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-muted-foreground" /> {q.email}
                        </div>
                        {q.phone && (
                          <div className="text-muted-foreground dark:text-slate-400 text-[11px] flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-muted-foreground/70" /> {q.phone}
                          </div>
                        )}
                      </td>

                      <td className="p-4">
                        <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30">
                          <Tag className="w-3 h-3 mr-1 text-indigo-500 dark:text-indigo-400" /> {q.planInterest} Tier
                        </Badge>
                      </td>

                      <td className="p-4 text-muted-foreground dark:text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="p-4">{getStatusBadge(q.status)}</td>

                      <td className="p-4 text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedQuery(q)}
                          className="border-border dark:border-slate-700 text-foreground dark:text-slate-300 hover:bg-muted text-[11px] h-7 px-2.5"
                        >
                          <Eye className="w-3 h-3 mr-1 text-indigo-500 dark:text-indigo-400" /> View Message
                        </Button>

                        {q.status === 'new' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(q.id, 'in_progress')}
                            className="bg-amber-600 hover:bg-amber-500 text-white text-[11px] h-7 px-2.5"
                          >
                            Mark In Progress
                          </Button>
                        )}

                        {q.status !== 'resolved' && q.status !== 'closed' && (
                          <Button
                            size="sm"
                            onClick={() => handleUpdateStatus(q.id, 'resolved')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] h-7 px-2.5"
                          >
                            Resolve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No software purchase or helpdesk queries found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Message Modal */}
      {selectedQuery && (
        <Dialog open={!!selectedQuery} onOpenChange={() => setSelectedQuery(null)}>
          <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-slate-100 max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground dark:text-white flex items-center justify-between">
                <span>Inquiry from {selectedQuery.clientName}</span>
                {getStatusBadge(selectedQuery.status)}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs">
                Software Purchase & Subscription Inquiry Details
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-muted/40 dark:bg-slate-950 p-3 rounded-xl border border-border dark:border-slate-800">
                <div>
                  <span className="text-muted-foreground dark:text-slate-500 block">Company Name</span>
                  <span className="text-foreground dark:text-white font-semibold">{selectedQuery.companyName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-slate-500 block">Interested Plan</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{selectedQuery.planInterest} Tier</span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-slate-500 block">Email Address</span>
                  <span className="text-foreground/90 dark:text-slate-200">{selectedQuery.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground dark:text-slate-500 block">Phone Number</span>
                  <span className="text-foreground/90 dark:text-slate-200">{selectedQuery.phone || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-muted-foreground dark:text-slate-400 font-semibold block">Client Inquiry Message:</span>
                <div className="bg-muted/40 dark:bg-slate-950 p-4 rounded-xl border border-border dark:border-slate-800 text-foreground/90 dark:text-slate-200 leading-relaxed italic">
                  "{selectedQuery.message}"
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-border dark:border-slate-800">
                <span className="text-muted-foreground dark:text-slate-500 text-[11px]">
                  Submitted on {new Date(selectedQuery.createdAt).toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedQuery.id, 'resolved')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Client Inquiry Query Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="bg-card dark:bg-slate-900 border-border dark:border-slate-800 text-foreground dark:text-slate-100 max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Add Client Purchase Inquiry
            </DialogTitle>
            <DialogDescription className="text-muted-foreground dark:text-slate-400 text-xs">
              Log a new client software purchase inquiry or sales lead.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNewQuerySubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Client Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newQueryForm.clientName}
                  onChange={(e) => setNewQueryForm({ ...newQueryForm, clientName: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Company Name *</Label>
                <Input
                  required
                  placeholder="e.g. Acme Corp"
                  value={newQueryForm.companyName}
                  onChange={(e) => setNewQueryForm({ ...newQueryForm, companyName: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Email Address *</Label>
                <Input
                  type="email"
                  required
                  placeholder="contact@company.com"
                  value={newQueryForm.email}
                  onChange={(e) => setNewQueryForm({ ...newQueryForm, email: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Phone Number</Label>
                <Input
                  placeholder="+91 9999988888"
                  value={newQueryForm.phone}
                  onChange={(e) => setNewQueryForm({ ...newQueryForm, phone: e.target.value })}
                  className="bg-background dark:bg-slate-950 border-border dark:border-slate-800 text-foreground dark:text-white text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Plan Interest *</Label>
              <select
                value={newQueryForm.planInterest}
                onChange={(e) => setNewQueryForm({ ...newQueryForm, planInterest: e.target.value })}
                className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground dark:text-white rounded-md h-9 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Starter">Starter Tier (₹4,999/mo)</option>
                <option value="Professional">Professional Tier (₹14,999/mo)</option>
                <option value="Enterprise">Enterprise Tier (Custom Quote)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-foreground dark:text-slate-300 font-semibold">Inquiry Message *</Label>
              <textarea
                required
                rows={3}
                placeholder="Details about client requirements, employee headcount, or feature questions..."
                value={newQueryForm.message}
                onChange={(e) => setNewQueryForm({ ...newQueryForm, message: e.target.value })}
                className="w-full bg-background dark:bg-slate-950 border border-border dark:border-slate-800 text-foreground dark:text-white text-xs rounded-md p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-border dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubmitModalOpen(false)}
                className="border-border dark:border-slate-800 text-muted-foreground text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5">
                Submit Client Inquiry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

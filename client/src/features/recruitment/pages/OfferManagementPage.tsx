import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Eye, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { useOffers, useCreateOffer } from '../hooks/useOffers';
import { useApplications } from '../hooks/useApplications';
import { useDepartments, useDesignations } from '@/features/settings/hooks';
import { GenerateOfferModal } from '../components/GenerateOfferModal';
import { OfferDetailsModal } from '../components/OfferDetailsModal';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';

export const OfferManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  // Queries
  const { data: offersResponse, isLoading, refetch } = useOffers({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { data: appsResponse } = useApplications({ pageSize: 100 });
  const { data: departmentsResponse } = useDepartments(1, 100);
  const { designations } = useDesignations();

  const createOfferMutation = useCreateOffer();

  // Data processing
  const offersList = Array.isArray(offersResponse?.data) 
    ? offersResponse.data 
    : (Array.isArray(offersResponse?.data?.items) ? offersResponse.data.items : (Array.isArray(offersResponse?.items) ? offersResponse.items : []));

  const applicationList = Array.isArray(appsResponse?.items) 
    ? appsResponse.items 
    : (Array.isArray(appsResponse?.data) ? appsResponse.data : (Array.isArray(appsResponse) ? appsResponse : []));

  const departmentList = Array.isArray(departmentsResponse?.items) 
    ? departmentsResponse.items 
    : (Array.isArray(departmentsResponse?.data) ? departmentsResponse.data : (Array.isArray(departmentsResponse) ? departmentsResponse : []));

  const designationList = Array.isArray(designations) 
    ? designations 
    : (Array.isArray((designations as any)?.items) ? (designations as any).items : (Array.isArray((designations as any)?.data) ? (designations as any).data : []));

  // KPI calculations (computed over the full offers list)
  const allOffers = Array.isArray(offersList) ? offersList : [];
  const totalOffersCount = allOffers.length;
  const sentOffersCount = allOffers.filter((o: any) => o.status === 'sent').length;
  const acceptedOffersCount = allOffers.filter((o: any) => o.status === 'accepted').length;
  const draftOffersCount = allOffers.filter((o: any) => o.status === 'draft').length;
  const expiredOffersCount = allOffers.filter((o: any) => o.status === 'expired' || o.status === 'rejected').length;
  const acceptanceRate = totalOffersCount > 0 
    ? Math.round((acceptedOffersCount / (totalOffersCount - draftOffersCount || totalOffersCount)) * 100) 
    : 0;

  // Actions
  const handleCreateOffer = async (payload: any) => {
    try {
      await createOfferMutation.mutateAsync(payload);
      toast.success('Professional Offer Generated & Saved as Draft!');
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate offer letter.');
    }
  };

  const handleSendOffer = async (offer: any) => {
    setIsActionPending(true);
    try {
      await apiClient.post(`/recruitment/offers/${offer.id}/send`);
      toast.success(`Offer Ref: ${offer.offer_code || offer.offerCode} sent successfully to candidate email!`);
      refetch();
      if (selectedOffer && selectedOffer.id === offer.id) {
        setSelectedOffer({ ...selectedOffer, status: 'sent' });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to dispatch offer.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleViewDetails = (offer: any) => {
    setSelectedOffer(offer);
    setIsDetailsOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-slate-100 text-slate-800 border-slate-200">Draft</Badge>;
      case 'sent': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Sent</Badge>;
      case 'accepted': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Accepted</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">Declined</Badge>;
      case 'expired': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOffers = allOffers.filter((o: any) => {
    if (!o) return false;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const candidateName = (o.candidate_name || o.candidateName || '').toLowerCase();
    const pos = (o.position_title || o.positionTitle || '').toLowerCase();
    const code = (o.offer_code || o.offerCode || '').toLowerCase();
    return candidateName.includes(query) || pos.includes(query) || code.includes(query);
  });

  return (
    <div className="flex-1 space-y-6 max-w-full overflow-hidden p-6 min-h-[calc(100vh-4rem)]">
      {/* ── Top Header Banner ────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border/80 shadow-2xs relative overflow-hidden">
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Offer Management
            </h1>
            <p className="text-xs text-muted-foreground">
              Generate structured compensation letters, calculate CTC breakdowns, and monitor candidate acceptance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full sm:w-auto">
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            className="h-9 px-4 text-xs font-bold gap-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" /> Create Offer Letter
          </Button>
        </div>
      </div>

      {/* ── KPI Stats Widgets ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Offers</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{totalOffersCount}</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Drafts: <span className="text-foreground font-bold">{draftOffersCount}</span></p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sent & Pending</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{sentOffersCount}</h3>
              <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 font-medium mt-1">Awaiting Candidate</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Send className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Accepted Offers</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{acceptedOffersCount}</h3>
              <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">Ready for Onboarding</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Acceptance Rate</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{acceptanceRate}%</h3>
              <p className="text-[11px] text-muted-foreground mt-1">Excludes Drafts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filter Row & Segmented Status Pills ──────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-card p-4 rounded-2xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-2 border border-border rounded-xl px-3 py-2 w-full max-w-sm bg-background">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search candidate, role, or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground"
          />
        </div>
        
        {/* Status Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold capitalize transition-all cursor-pointer ${
                statusFilter === status 
                  ? 'bg-primary text-primary-foreground shadow-xs' 
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted border border-border/80'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* ── Data Table ───────────────────────────────────────────────────────── */}
      <Card className="bg-card border-border/80 shadow-2xs rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1000px] border-collapse">
              <TableHeader className="bg-muted/50 border-b border-border/60">
                <TableRow className="border-border/60">
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Candidate & Code</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Offered Role</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Annual CTC</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Joining Target</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Expiry Date</TableHead>
                  <TableHead className="text-center text-[11px] font-bold uppercase tracking-wider py-3.5 px-4 text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-[11px] font-bold uppercase tracking-wider py-3.5 px-5 text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/60">
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs bg-background">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span>Loading official recruitment records...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOffers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground text-xs bg-background">
                      No offer records match the search parameters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOffers.map((o: any) => {
                    const rawCTC = o.cost_to_company || o.costToCompany;
                    const formattedCTC = rawCTC && !isNaN(parseFloat(rawCTC)) && parseFloat(rawCTC) > 0
                      ? `${o.currency || 'INR'} ${parseFloat(rawCTC).toLocaleString()}`
                      : 'N/A';

                    const candidateName = o.candidate_name || o.candidateName || 'Candidate';
                    const candidateEmail = o.candidate_email || o.candidateEmail || 'No Email';
                    const positionTitle = o.position_title || o.positionTitle || 'General Position';
                    const offerCode = o.offer_code || o.offerCode || 'DRAFT';
                    const initials = candidateName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                    const formatDate = (dateVal: any) => {
                      if (!dateVal) return 'N/A';
                      const str = String(dateVal);
                      return str.includes('T') ? str.split('T')[0] : str;
                    };
                    
                    return (
                      <TableRow key={o.id} className="border-border/60 hover:bg-muted/40 transition-colors">
                        <TableCell className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">{offerCode}</span>
                              <div className="font-bold text-foreground text-xs truncate">{candidateName}</div>
                              <div className="text-[11px] text-muted-foreground truncate font-mono">{candidateEmail}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-xs font-semibold text-foreground">
                          {positionTitle}
                        </TableCell>
                        <TableCell className="py-3.5 px-4">
                          <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            {formattedCTC}
                          </span>
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                          {formatDate(o.offer_start_date || o.offerStartDate)}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-xs text-muted-foreground font-mono">
                          {formatDate(o.offer_expiry_date || o.offerExpiryDate)}
                        </TableCell>
                        <TableCell className="py-3.5 px-4 text-center">
                          {getStatusBadge(o.status)}
                        </TableCell>
                        <TableCell className="text-right py-3.5 px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              onClick={() => handleViewDetails(o)}
                              className="h-8 w-8 rounded-lg border-border hover:bg-muted text-muted-foreground hover:text-foreground shadow-2xs"
                              title="View Offer Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {o.status === 'draft' && (
                              <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => handleSendOffer(o)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-8 px-3 rounded-lg shadow-2xs gap-1"
                              >
                                <Send className="h-3 w-3" /> Dispatch
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* OFFER CREATION DIALOG WIZARD */}
      <GenerateOfferModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateOffer}
        isSubmitting={createOfferMutation.isPending}
        applicationList={applicationList}
        departmentList={departmentList}
        designationList={designationList}
      />

      {/* OFFER DETAILS DIALOG VIEW */}
      <OfferDetailsModal
        offer={selectedOffer}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onSend={handleSendOffer}
        isSending={isActionPending}
        departmentList={departmentList}
        designationList={designationList}
      />

    </div>
  );
};

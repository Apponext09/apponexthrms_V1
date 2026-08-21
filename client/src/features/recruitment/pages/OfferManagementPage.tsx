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
    <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-indigo-600" />
            Offer Management
          </h1>
          <p className="text-slate-500 text-xs mt-1">Generate and manage candidate offer letters, salary structures, and acceptance statuses.</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)} 
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 shadow-sm font-medium text-xs"
        >
          <Plus className="h-4 w-4" /> Create Offer
        </Button>
      </div>

      {/* KPI Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Offers</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalOffersCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Drafts: <span className="text-slate-700 font-medium">{draftOffersCount}</span></p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Active / Sent Offers</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1">{sentOffersCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Awaiting candidate response</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Accepted Offers</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">{acceptedOffersCount}</h3>
              <p className="text-[11px] text-slate-400 mt-1">Ready for onboarding</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Acceptance Rate</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{acceptanceRate}%</h3>
              <p className="text-[11px] text-slate-400 mt-1">Excludes draft offers</p>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 w-full max-w-sm bg-slate-50/50 focus-within:bg-white focus-within:ring-1 focus-within:ring-indigo-500 transition">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by candidate, title, or ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none w-full bg-transparent text-xs text-slate-800"
          />
        </div>
        
        {/* Status Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3.5 py-1.5 rounded-lg border font-semibold capitalize transition ${
                statusFilter === status 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <Card className="border-slate-100 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-100">
              <TableRow>
                <TableHead className="text-slate-500 font-semibold text-xs py-3.5 pl-6">Ref Code & Candidate</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Official Role / Position</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Structured Annual CTC</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Joining Target</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Validity Expiry</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs">Current State</TableHead>
                <TableHead className="text-slate-500 font-semibold text-xs text-right pr-6">Action Control</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      Loading official recruitment records...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredOffers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-xs">
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

                  const formatDate = (dateVal: any) => {
                    if (!dateVal) return 'N/A';
                    const str = String(dateVal);
                    return str.includes('T') ? str.split('T')[0] : str;
                  };
                  
                  return (
                    <TableRow key={o.id} className="hover:bg-slate-50/50 transition">
                      <TableCell className="py-4 pl-6">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{offerCode}</span>
                          <div className="font-bold text-slate-900 text-xs mt-0.5">{candidateName}</div>
                          <div className="text-[10px] text-slate-500">{candidateEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-700">
                        {positionTitle}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-slate-900">
                        {formattedCTC}
                      </TableCell>
                      <TableCell className="text-xs text-slate-650">
                        {formatDate(o.offer_start_date || o.offerStartDate)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-650">
                        {formatDate(o.offer_expiry_date || o.offerExpiryDate)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(o.status)}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4 space-x-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleViewDetails(o)}
                          className="h-8 w-8 text-slate-600 border-slate-200 hover:text-indigo-650 hover:border-indigo-200"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {o.status === 'draft' && (
                          <Button 
                            variant="default" 
                            size="sm" 
                            onClick={() => handleSendOffer(o)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] h-8 px-3"
                          >
                            <Send className="h-3 w-3 mr-1" /> Dispatch
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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

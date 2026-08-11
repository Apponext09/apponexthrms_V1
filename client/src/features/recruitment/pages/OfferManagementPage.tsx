import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Eye } from 'lucide-react';
import { useOffers, useCreateOffer, useSendOffer } from '../hooks/useOffers';
import { useApplications } from '../hooks/useApplications';
import { useDepartments, useDesignations } from '@/features/settings/hooks';

export const OfferManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<any>(null);
  
  // Form State
  const [form, setForm] = useState({
    applicationId: '',
    positionTitle: '',
    departmentId: '',
    designationId: '',
    costToCompany: '',
    baseSalary: '',
    currency: 'INR',
    offerStartDate: '',
    offerExpiryDate: '',
  });

  const { data: offersResponse, isLoading } = useOffers({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { data: appsResponse } = useApplications({ pageSize: 100 });
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();

  const createOfferMutation = useCreateOffer();
  const sendOfferMutation = useSendOffer(selectedOffer?.id || 0);

  const offers = offersResponse?.data || [];
  const applications = appsResponse?.items || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicationId || !form.positionTitle) return;

    await createOfferMutation.mutateAsync({
      applicationId: parseInt(form.applicationId, 10),
      positionTitle: form.positionTitle,
      departmentId: form.departmentId ? parseInt(form.departmentId, 10) : undefined,
      designationId: form.designationId ? parseInt(form.designationId, 10) : undefined,
      costToCompany: form.costToCompany ? parseFloat(form.costToCompany) : undefined,
      baseSalary: form.baseSalary ? parseFloat(form.baseSalary) : undefined,
      currency: form.currency,
      offerStartDate: form.offerStartDate || undefined,
      offerExpiryDate: form.offerExpiryDate || undefined,
    });

    setIsCreateOpen(false);
    setForm({
      applicationId: '',
      positionTitle: '',
      departmentId: '',
      designationId: '',
      costToCompany: '',
      baseSalary: '',
      currency: 'INR',
      offerStartDate: '',
      offerExpiryDate: '',
    });
  };

  const handleSend = async (offer: any) => {
    await sendOfferMutation.mutateAsync();
    alert('Offer sent successfully to the candidate!');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="outline" className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'sent': return <Badge variant="outline" className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'accepted': return <Badge variant="outline" className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'rejected': return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'expired': return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Expired</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredOffers = offers.filter((o: any) => {
    const query = searchQuery.toLowerCase();
    const candidateName = (o.candidate_name || '').toLowerCase();
    const pos = (o.position_title || '').toLowerCase();
    return candidateName.includes(query) || pos.includes(query);
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Offer Management</h1>
          <p className="text-gray-500 mt-1">Generate, track, and manage official employment offer letters.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Generate New Offer
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-2 w-full max-w-sm bg-white">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by candidate name or job title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none w-full bg-transparent text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'draft', 'sent', 'accepted', 'rejected', 'expired'].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Candidate</TableHead>
                <TableHead>Position Title</TableHead>
                <TableHead>CTC (Annual)</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Loading offer records...
                  </TableCell>
                </TableRow>
              ) : filteredOffers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No offers found matching current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredOffers.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold text-gray-900">{o.candidate_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{o.candidate_email || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{o.position_title || o.positionTitle || 'N/A'}</TableCell>
                    <TableCell>{o.cost_to_company || o.costToCompany ? `${o.currency} ${parseFloat(o.cost_to_company || o.costToCompany).toLocaleString()}` : 'N/A'}</TableCell>
                    <TableCell>{o.offer_start_date || o.offerStartDate || 'N/A'}</TableCell>
                    <TableCell>{o.offer_expiry_date || o.offerExpiryDate || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(o.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="icon" onClick={() => setSelectedOffer(o)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {o.status === 'draft' && (
                        <Button variant="default" size="sm" onClick={() => handleSend(o)} className="bg-blue-600 hover:bg-blue-700">
                          <Send className="h-3 w-3 mr-1" /> Send
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* CREATE OFFER DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Offer Letter</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="applicationId">Select Candidate Application</Label>
              <Select value={form.applicationId} onValueChange={(val) => setForm(f => ({ ...f, applicationId: val }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((app: any) => (
                    <SelectItem key={app.id} value={app.id.toString()}>
                      {app.candidateName || `App #${app.id}`} - {app.jobTitle || 'General'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="positionTitle">Position Title</Label>
              <Input
                id="positionTitle"
                value={form.positionTitle}
                onChange={(e) => setForm(f => ({ ...f, positionTitle: e.target.value }))}
                placeholder="Software Engineer"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="departmentId">Department</Label>
                <Select value={form.departmentId} onValueChange={(val) => setForm(f => ({ ...f, departmentId: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="designationId">Designation</Label>
                <Select value={form.designationId} onValueChange={(val) => setForm(f => ({ ...f, designationId: val }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations?.map((d: any) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="costToCompany">CTC (Annual)</Label>
                <Input
                  id="costToCompany"
                  type="number"
                  value={form.costToCompany}
                  onChange={(e) => setForm(f => ({ ...f, costToCompany: e.target.value }))}
                  placeholder="1200000"
                />
              </div>
              <div>
                <Label htmlFor="baseSalary">Base Salary</Label>
                <Input
                  id="baseSalary"
                  type="number"
                  value={form.baseSalary}
                  onChange={(e) => setForm(f => ({ ...f, baseSalary: e.target.value }))}
                  placeholder="800000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offerStartDate">Start Date</Label>
                <Input
                  id="offerStartDate"
                  type="date"
                  value={form.offerStartDate}
                  onChange={(e) => setForm(f => ({ ...f, offerStartDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="offerExpiryDate">Expiry Date</Label>
                <Input
                  id="offerExpiryDate"
                  type="date"
                  value={form.offerExpiryDate}
                  onChange={(e) => setForm(f => ({ ...f, offerExpiryDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createOfferMutation.isPending}>
                {createOfferMutation.isPending ? 'Generating...' : 'Create Offer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL */}
      <Dialog open={!!selectedOffer} onOpenChange={() => setSelectedOffer(null)}>
        <DialogContent className="max-w-md">
          {selectedOffer && (
            <>
              <DialogHeader>
                <DialogTitle>Offer Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-bold text-gray-900 text-lg">{selectedOffer.candidate_name || 'Candidate'}</h3>
                  <p className="text-sm text-gray-500">{selectedOffer.candidate_email || 'No email'}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="font-semibold text-gray-500">Position:</div>
                  <div className="text-gray-900">{selectedOffer.position_title || 'N/A'}</div>
                  
                  <div className="font-semibold text-gray-500">CTC (Annual):</div>
                  <div className="text-gray-900">{selectedOffer.cost_to_company || selectedOffer.costToCompany ? `${selectedOffer.currency} ${parseFloat(selectedOffer.cost_to_company || selectedOffer.costToCompany).toLocaleString()}` : 'N/A'}</div>

                  <div className="font-semibold text-gray-500">Start Date:</div>
                  <div className="text-gray-900">{selectedOffer.offer_start_date || selectedOffer.offerStartDate || 'N/A'}</div>

                  <div className="font-semibold text-gray-500">Expiry Date:</div>
                  <div className="text-gray-900">{selectedOffer.offer_expiry_date || selectedOffer.offerExpiryDate || 'N/A'}</div>

                  <div className="font-semibold text-gray-500">Status:</div>
                  <div>{getStatusBadge(selectedOffer.status)}</div>
                </div>

                {selectedOffer.status === 'accepted' && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-green-800 text-xs flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Offer Accepted & Signed</p>
                      {selectedOffer.accepted_at && <p className="mt-0.5">Signed on: {new Date(selectedOffer.accepted_at).toLocaleString()}</p>}
                    </div>
                  </div>
                )}

                {selectedOffer.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-red-800 text-xs flex items-start gap-2">
                    <XCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-semibold">Offer Declined</p>
                      {selectedOffer.rejected_at && <p className="mt-0.5">Declined on: {new Date(selectedOffer.rejected_at).toLocaleString()}</p>}
                    </div>
                  </div>
                )}

                <div className="border-t pt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setSelectedOffer(null)}>Close</Button>
                  {selectedOffer.status === 'draft' && (
                    <Button variant="default" onClick={() => handleSend(selectedOffer)} className="bg-blue-600 hover:bg-blue-700">
                      <Send className="h-4 w-4 mr-1" /> Send to Candidate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

        </DialogContent>
      </Dialog>
    </div>
  );
};

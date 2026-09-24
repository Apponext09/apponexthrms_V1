import React, { useState, useEffect } from 'react';
import { policiesApi } from '../api/policiesApi';
import type { RolePolicyRecord } from '../types/policy';
import { PolicyStatusBadge } from '../components/PolicyStatusBadge';
import { PolicyReader } from '../components/PolicyReader';
import { MyQueriesList } from '../components/MyQueriesList';
import { PolicyAcknowledgementModal } from '../components/PolicyAcknowledgementModal';
import { AskQueryModal } from '../components/AskQueryModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Search,
  Eye,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RefreshCw,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export const EmployeeMyPoliciesPage: React.FC = () => {
  const [policies, setPolicies] = useState<RolePolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'archived' | 'queries'>('active');
  const [searchQuery, setSearchQuery] = useState('');

  // Reader & Modal states
  const [readerPolicy, setReaderPolicy] = useState<RolePolicyRecord | null>(null);
  const [acknowledgePolicy, setAcknowledgePolicy] = useState<RolePolicyRecord | null>(null);
  const [eSignPolicy, setESignPolicy] = useState<RolePolicyRecord | null>(null);
  const [askQueryPolicy, setAskQueryPolicy] = useState<RolePolicyRecord | null>(null);

  const fetchMyPolicies = async () => {
    try {
      setLoading(true);
      const list = await policiesApi.getMyPolicies();
      setPolicies(list);
    } catch (err) {
      console.error('Failed to load my policies:', err);
      toast.error('Could not load company policies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPolicies();
  }, []);

  const handleConfirmAcknowledgement = async (policyId: number, comments?: string) => {
    await policiesApi.acknowledgePolicy(policyId, comments);
    fetchMyPolicies();
  };

  const filteredPolicies = policies.filter((p) => {
    const isArchived = (p.status || '').toLowerCase() === 'archived';
    if (activeTab === 'active' && isArchived) return false;
    if (activeTab === 'archived' && !isArchived) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(q) ||
      (p.documentRef || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-xl p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> My Company Policies
            </h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[10px]">
              Assigned Scope
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Access official governance manuals, operational responsibilities, and HR policy frameworks assigned to your role.
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={fetchMyPolicies} className="h-8 text-xs font-bold gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh List
        </Button>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-2xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            type="button"
            variant={activeTab === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('active')}
            className="h-8 rounded-lg text-xs font-bold"
          >
            Active Policies ({policies.filter((p) => (p.status || '').toLowerCase() !== 'archived').length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'archived' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('archived')}
            className="h-8 rounded-lg text-xs font-bold"
          >
            Archived Policies ({policies.filter((p) => (p.status || '').toLowerCase() === 'archived').length})
          </Button>
          <Button
            type="button"
            variant={activeTab === 'queries' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('queries')}
            className="h-8 rounded-lg text-xs font-bold"
          >
            My Queries
          </Button>
        </div>

        {activeTab !== 'queries' && (
          <Input
            placeholder="Search policy name, ref, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs max-w-xs bg-background"
          />
        )}
      </div>

      {/* Main View */}
      {activeTab === 'queries' ? (
        <MyQueriesList />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-card border border-border rounded-xl space-y-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted-foreground">Loading your assigned policies...</p>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-card border border-border rounded-xl space-y-3 text-center">
          <FileText className="w-8 h-8 text-muted-foreground" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-foreground">No Policies Found</h3>
            <p className="text-xs text-muted-foreground max-w-md">
              There are no {activeTab} policies assigned to your role, department, or location.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map((p) => {
            const isAck = p.policyAccepted;
            const isSigned = p.signatureStatus === 'SIGNED';
            const mode = p.signatureMode || 'ACKNOWLEDGEMENT';

            return (
              <Card
                key={p.id}
                className="border-border/80 hover:border-primary/40 transition-all shadow-2xs flex flex-col justify-between"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        {p.documentRef || `POL-${String(p.id).padStart(3, '0')}`}
                      </span>
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase">
                        {mode === 'BOTH' ? 'Check + E-Sign' : mode === 'E_SIGNATURE' ? 'E-Signature Required' : 'Standard Policy'}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {p.version || 'v1.0'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-bold text-foreground leading-tight">
                    {p.title}
                  </CardTitle>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-4">
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {p.description || 'Formal governance document defining role obligations and workplace guidelines.'}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-border/50 text-[11px]">
                    <div className="flex items-center justify-between text-muted-foreground font-semibold">
                      <span>Category: <strong className="text-foreground">{p.category || 'HR Policies'}</strong></span>
                      <span>Effective: <strong className="text-foreground">{p.effectiveDate ? new Date(p.effectiveDate).toLocaleDateString() : 'Immediate'}</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-muted-foreground font-bold">Status:</span>
                      {isSigned ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Digitally Signed
                        </span>
                      ) : isAck ? (
                        <span className="flex items-center gap-1 font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Acknowledged
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Signature Pending
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReaderPolicy(p)}
                      className="w-full text-xs font-bold h-8 gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" /> View Policy
                    </Button>

                    {mode === 'E_SIGNATURE' && !isSigned && (
                      <Button
                        size="sm"
                        onClick={() => setReaderPolicy(p)}
                        className="w-full text-xs font-bold h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Sign Policy
                      </Button>
                    )}

                    {mode !== 'E_SIGNATURE' && !isAck && (
                      <Button
                        size="sm"
                        onClick={() => setAcknowledgePolicy(p)}
                        className="w-full text-xs font-bold h-8 gap-1 bg-primary text-primary-foreground"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Acknowledge
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAskQueryPolicy(p)}
                      className="w-full text-xs font-bold h-8 gap-1 text-muted-foreground border border-transparent hover:border-border"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Ask HR
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reader Modal */}
      {readerPolicy && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="max-w-4xl w-full">
            <PolicyReader
              policy={readerPolicy}
              canManage={false}
              onAcknowledge={(pol) => {
                setReaderPolicy(null);
                setAcknowledgePolicy(pol);
              }}
              onClose={() => setReaderPolicy(null)}
            />
          </div>
        </div>
      )}

      {/* Acknowledgement Modal */}
      {acknowledgePolicy && (
        <PolicyAcknowledgementModal
          policy={acknowledgePolicy}
          onConfirm={handleConfirmAcknowledgement}
          onClose={() => setAcknowledgePolicy(null)}
        />
      )}

      {/* Ask Query Modal */}
      {askQueryPolicy && (
        <AskQueryModal
          policy={askQueryPolicy}
          onClose={() => setAskQueryPolicy(null)}
        />
      )}
    </div>
  );
};


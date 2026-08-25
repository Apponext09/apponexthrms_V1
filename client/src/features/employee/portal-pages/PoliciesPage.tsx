import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  FileText,
  Download,
  ShieldCheck,
  Scale,
  Shield,
  Eye,
  CheckCircle2,
  Clock,
  Search,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useMyPolicies, UserPolicyView } from '../../policy/api/usePolicies';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PoliciesPage() {
  const { data: policies = [], isLoading } = useMyPolicies();
  const [selectedCat, setSelectedCat] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewPolicy, setPreviewPolicy] = useState<UserPolicyView | null>(null);

  const categories = ['All', ...Array.from(new Set(policies.map((p) => p.category || 'General')))];

  const filteredPolicies = policies.filter((p) => {
    const matchesCat = selectedCat === 'All' || p.category === selectedCat;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleDownload = (policy: UserPolicyView) => {
    if (!policy.fileUrl) {
      toast.error('No document file attached.');
      return;
    }

    if (policy.fileUrl.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = policy.fileUrl;
      link.download = policy.fileName || `${policy.title.replace(/\s+/g, '_')}_v${policy.version}.pdf`;
      link.click();
    } else {
      window.open(policy.fileUrl, '_blank');
    }
    toast.success(`Downloading policy: "${policy.title}"`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground font-semibold">Loading company policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 ring-1 ring-primary/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-foreground tracking-tight">Company Policies & Guidelines</h2>
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] font-bold">
                Governance
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Official company handbooks, security standards, and code of conduct manuals applicable to your role.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search policy title or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl bg-card border-border/80"
          />
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCat === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCat(cat)}
              className="h-8 text-xs font-bold rounded-lg border-border whitespace-nowrap"
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Policies Grid */}
      {filteredPolicies.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/80 rounded-2xl p-8">
          <Scale className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No Policies Available</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {searchQuery || selectedCat !== 'All'
              ? 'No policies matched your current filter.'
              : 'There are currently no active policies published for your role.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPolicies.map((p) => (
            <Card
              key={p.id}
              className="border border-border/80 rounded-xl shadow-2xs bg-card hover:border-primary/40 transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3 pt-4 px-4 border-b border-border/60">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    {p.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {p.isAccepted ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Accepted
                      </Badge>
                    ) : p.isMandatory ? (
                      <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10 text-[10px] font-bold gap-1">
                        <Clock className="w-3 h-3" /> Action Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-[10px] font-bold">
                        Informational
                      </Badge>
                    )}
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      v{p.version}
                    </span>
                  </div>
                </div>

                <CardTitle className="text-sm font-bold text-foreground mt-2 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-primary shrink-0" /> {p.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {p.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {p.description}
                  </p>
                )}

                {p.acceptedAt && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1 bg-muted/40 p-2 rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Acknowledged on <strong>{new Date(p.acceptedAt).toLocaleDateString()}</strong> (v{p.acceptedVersion || p.version})
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewPolicy(p)}
                    className="flex-1 h-8 text-xs font-bold gap-1.5 rounded-lg border-border"
                  >
                    <Eye className="w-3.5 h-3.5" /> Read Online
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleDownload(p)}
                    className="flex-1 h-8 text-xs font-bold gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" /> Download PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewPolicy} onOpenChange={() => setPreviewPolicy(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Scale className="w-5 h-5 text-primary" /> {previewPolicy?.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Version {previewPolicy?.version} • {previewPolicy?.category}
                </DialogDescription>
              </div>
              {previewPolicy && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(previewPolicy)}
                  className="h-8 text-xs font-semibold gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-auto my-4 rounded-xl border border-border bg-muted/20 min-h-[400px] flex items-center justify-center">
            {previewPolicy?.fileUrl ? (
              previewPolicy.fileUrl.startsWith('data:application/pdf') || previewPolicy.fileUrl.endsWith('.pdf') ? (
                <iframe
                  src={previewPolicy.fileUrl}
                  title={previewPolicy.title}
                  className="w-full h-full min-h-[500px] rounded-lg"
                />
              ) : previewPolicy.fileUrl.startsWith('data:image/') || /\.(jpg|jpeg|png|webp)$/i.test(previewPolicy.fileUrl) ? (
                <img
                  src={previewPolicy.fileUrl}
                  alt={previewPolicy.title}
                  className="max-h-[500px] object-contain mx-auto"
                />
              ) : (
                <div className="p-8 text-center space-y-3">
                  <FileText className="w-12 h-12 text-primary mx-auto opacity-70" />
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    {previewPolicy.description || 'Official company document attachment.'}
                  </p>
                  <Button onClick={() => handleDownload(previewPolicy)} size="sm" className="font-bold text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5" /> Download Document
                  </Button>
                </div>
              )
            ) : (
              <p className="text-xs text-muted-foreground">No document file attached.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

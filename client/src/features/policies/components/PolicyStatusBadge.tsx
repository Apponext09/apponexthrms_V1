import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, FileEdit, Archive, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PolicyStatusBadgeProps {
  status?: string;
  className?: string;
}

export const PolicyStatusBadge: React.FC<PolicyStatusBadgeProps> = ({ status = 'published', className = '' }) => {
  const norm = status.toLowerCase().trim();

  switch (norm) {
    case 'published':
      return (
        <Badge className={`bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold hover:bg-emerald-500/20 gap-1 ${className}`}>
          <ShieldCheck className="w-3 h-3 text-emerald-500" /> Published
        </Badge>
      );
    case 'draft':
      return (
        <Badge className={`bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold hover:bg-amber-500/20 gap-1 ${className}`}>
          <FileEdit className="w-3 h-3 text-amber-500" /> Draft
        </Badge>
      );
    case 'archived':
      return (
        <Badge className={`bg-slate-500/10 text-slate-600 border border-slate-500/20 font-bold hover:bg-slate-500/20 gap-1 ${className}`}>
          <Archive className="w-3 h-3 text-slate-500" /> Archived
        </Badge>
      );
    case 'pending':
      return (
        <Badge className={`bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold hover:bg-amber-500/20 gap-1 ${className}`}>
          <Clock className="w-3 h-3 text-amber-500" /> Pending
        </Badge>
      );
    case 'acknowledged':
      return (
        <Badge className={`bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold hover:bg-emerald-500/20 gap-1 ${className}`}>
          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Acknowledged
        </Badge>
      );
    case 'expired':
      return (
        <Badge className={`bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold hover:bg-rose-500/20 gap-1 ${className}`}>
          <AlertTriangle className="w-3 h-3 text-rose-500" /> Expired
        </Badge>
      );
    default:
      return (
        <Badge className={`bg-primary/10 text-primary border border-primary/20 font-bold capitalize ${className}`}>
          {status}
        </Badge>
      );
  }
};

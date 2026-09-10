import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText, Plus, Search, Send, CheckCircle, XCircle, Eye,
  Printer, TrendingUp, Sparkles, ShieldCheck, Briefcase,
  Calendar, RefreshCw, Layers, ArrowUpRight, Ban, User,
  Building2, CheckCircle2, Clock
} from 'lucide-react';
import { apiClient } from '@/config/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GenerateLetterModal } from '../components/GenerateLetterModal';
import { LetterViewerModal } from '../components/LetterViewerModal';
import { LETTER_STAGE_CONFIG, LetterCategory } from '@/features/settings/components/OfferTemplateMasterForm';

export const LetterManagementPage: React.FC = () => {
  const [letters, setLetters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filters
  const [activeStageTab, setActiveStageTab] = useState<'all' | LetterCategory>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [defaultStageForGenerate, setDefaultStageForGenerate] = useState<LetterCategory>('hiring');
  const [selectedLetter, setSelectedLetter] = useState<any>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Fetch Letters List
  const fetchLetters = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };
      if (activeStageTab !== 'all') params.letter_category = activeStageTab;
      if (statusFilter !== 'all') params.status = statusFilter;

      const res = await apiClient.get('/letters', { params });
      if (res.data?.success && Array.isArray(res.data.items)) {
        setLetters(res.data.items);
      } else if (Array.isArray(res.data?.data)) {
        setLetters(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch letters list', err);
      toast.error('Failed to load letters list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLetters();
  }, [activeStageTab, statusFilter]);

  // Filtered Letters
  const filteredLetters = useMemo(() => {
    return letters.filter((item) => {
      const matchSearch = !searchQuery.trim() ||
        item.letter_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.recipient_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.letter_type?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [letters, searchQuery]);

  // Statistics KPI calculations
  const totalCount = letters.length;
  const sentCount = letters.filter(l => l.status === 'sent').length;
  const draftCount = letters.filter(l => l.status === 'draft').length;
  const acknowledgedCount = letters.filter(l => l.status === 'acknowledged').length;

  const handleOpenGenerate = (stageKey?: LetterCategory) => {
    setDefaultStageForGenerate(stageKey || (activeStageTab === 'all' ? 'hiring' : activeStageTab));
    setIsGenerateOpen(true);
  };

  const handleViewLetter = (item: any) => {
    setSelectedLetter(item);
    setIsViewerOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold">Draft</Badge>;
      case 'sent':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold">Sent</Badge>;
      case 'acknowledged':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Acknowledged</Badge>;
      case 'signed':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Digitally Signed</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <span>Corporate Letter & Contract Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Generate, dispatch, and track official documents across all 4 stages of the employee lifecycle.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLetters}
            disabled={isLoading}
            className="h-9 px-3.5 text-xs font-semibold rounded-xl"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", isLoading && "animate-spin")} />
            Refresh
          </Button>

          <Button
            type="button"
            onClick={() => handleOpenGenerate()}
            className="h-9 px-4 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Letter</span>
          </Button>
        </div>
      </div>

      {/* 4 Stage Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(LETTER_STAGE_CONFIG) as LetterCategory[]).map((stageKey) => {
          const cfg = LETTER_STAGE_CONFIG[stageKey];
          const Icon = cfg.icon;
          const stageCount = letters.filter(l => l.letter_category === stageKey).length;

          return (
            <div
              key={stageKey}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between space-y-3 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center font-bold">
                  <Icon className="w-4 h-4" />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenGenerate(stageKey)}
                  className="h-7 px-2.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Generate</span>
                </Button>
              </div>

              <div>
                <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  {cfg.label}
                </span>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stageCount} <span className="text-xs font-normal text-slate-400">issued</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                  {cfg.types.map(t => t.name).join(', ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Directory Table Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        
        {/* Stage Tabs & Search Filter Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          
          {/* Stage Filter Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveStageTab('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border",
                activeStageTab === 'all'
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
              )}
            >
              All Stages ({totalCount})
            </button>
            {(Object.keys(LETTER_STAGE_CONFIG) as LetterCategory[]).map((stageKey) => (
              <button
                key={stageKey}
                type="button"
                onClick={() => setActiveStageTab(stageKey)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border",
                  activeStageTab === stageKey
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                {LETTER_STAGE_CONFIG[stageKey].label}
              </button>
            ))}
          </div>

          {/* Search Input & Status Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                placeholder="Search letters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8 text-xs w-48 rounded-xl"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="revoked">Revoked</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70 dark:bg-slate-800/50">
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Ref Code</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Recipient</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Document Type</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Subject</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Status</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500">Created Date</TableHead>
                <TableHead className="text-[11px] font-extrabold uppercase text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-indigo-600" />
                    <span>Loading generated letters...</span>
                  </TableCell>
                </TableRow>
              ) : filteredLetters.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-xs text-slate-400">
                    No letters found in this category. Click <strong>Generate New Letter</strong> to issue a formal document.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLetters.map((item) => (
                  <TableRow key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <TableCell className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                      <button
                        type="button"
                        onClick={() => handleViewLetter(item)}
                        className="hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <span>{item.letter_code}</span>
                      </button>
                    </TableCell>
                    
                    <TableCell>
                      <div className="font-bold text-xs text-slate-900 dark:text-white">
                        {item.recipient_name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {item.recipient_email || 'No email attached'}
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                        {item.letter_type?.replace(/_/g, ' ')}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {item.letter_category}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">
                      {item.subject || '—'}
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>

                    <TableCell className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLetter(item)}
                          className="h-7 px-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View & Print</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Generate Letter Modal */}
      <GenerateLetterModal
        open={isGenerateOpen}
        onOpenChange={setIsGenerateOpen}
        defaultStage={defaultStageForGenerate}
        onSuccess={() => fetchLetters()}
      />

      {/* View Letter Modal */}
      <LetterViewerModal
        open={isViewerOpen}
        onOpenChange={setIsViewerOpen}
        letter={selectedLetter}
        onUpdated={() => fetchLetters()}
      />
    </div>
  );
};

export default LetterManagementPage;

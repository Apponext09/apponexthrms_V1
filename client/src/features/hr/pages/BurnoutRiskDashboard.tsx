import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api';
import { Activity, ShieldAlert, Sparkles, Loader2, Search, ArrowRight, BrainCircuit, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface BurnoutRecord {
  employeeId: number;
  name: string;
  code: string;
  elBalance: number;
  slConsumed: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export function BurnoutRiskDashboard() {
  const [data, setData] = useState<BurnoutRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Forecast states
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [forecastLoading, setForecastLoading] = useState(false);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/leaves/reports/burnout-risk');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load burnout risk data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async () => {
    setForecastLoading(true);
    try {
      const res = await apiClient.get('/leaves/reports/forecast');
      if (res.data?.success) {
        setForecastData(res.data.forecast || []);
        setHistoryData(res.data.history || []);
      }
    } catch (err) {
      toast.error('Failed to load AI forecast data.');
      console.error(err);
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskData();
    fetchForecast();
  }, []);

  // Build combined chart data for Recharts (history + forecast)
  const chartData = [
    ...historyData.map((h: any) => ({ month: h.month, actual: h.daysTaken, predicted: null })),
    ...forecastData.map((f: any) => ({ month: f.month, actual: null, predicted: f.predictedDays })),
  ];

  const filteredData = data.filter(record => 
    record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const highRiskCount = data.filter(r => r.riskLevel === 'high').length;
  const mediumRiskCount = data.filter(r => r.riskLevel === 'medium').length;
  const avgRisk = data.length > 0 ? Math.round(data.reduce((sum, r) => sum + r.riskScore, 0) / data.length) : 0;

  const renderRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 border border-rose-500/25 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3 text-rose-500" /> High Risk
          </span>
        );
      case 'medium':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 border border-amber-500/25 flex items-center gap-1 w-fit">
            <ShieldAlert className="w-3 h-3 text-amber-500" /> Mod Risk
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 w-fit">
            Low Risk
          </span>
        );
    }
  };

  const getActionRecommendation = (record: BurnoutRecord) => {
    if (record.riskLevel === 'high') {
      return 'Nudge to schedule mandatory PTO; review current tasks.';
    }
    if (record.riskLevel === 'medium') {
      return 'Suggest taking a weekend extension or planning personal leave.';
    }
    return 'Maintained; healthy work-life balance.';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4 flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <BrainCircuit className="w-5.5 h-5.5 text-violet-600" /> AI-Powered Employee Burnout & Fatigue Analytics
          </h2>
          <p className="text-xs text-muted-foreground">Monitor employee leave utilization, sick leave consumption spikes, and wellness risk scoring.</p>
        </div>
        <Button onClick={fetchRiskData} variant="outline" className="text-xs font-bold gap-1.5 h-9 rounded-xl border border-violet-500/20 text-violet-600 hover:bg-violet-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Analytics
        </Button>
      </div>

      {/* Analytics Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Average Fatigue Index</p>
            <h3 className="text-2xl font-black text-foreground mt-1">{avgRisk} <span className="text-xs text-muted-foreground font-medium">/ 100</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">High Risk Cases</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{highRiskCount} <span className="text-xs text-muted-foreground font-medium">Employees</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
        </Card>

        <Card className="p-4 rounded-2xl bg-card border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Moderate Risk Cases</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{mediumRiskCount} <span className="text-xs text-muted-foreground font-medium">Employees</span></h3>
          </div>
          <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
        </Card>
      </div>

      {/* Burnout Risk Table */}
      <Card className="rounded-3xl border shadow-sm bg-card/75 backdrop-blur-sm flex flex-col overflow-hidden">
        <CardHeader className="pb-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground">Employee Fatigue Risk Records</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">Detailed calculation logs mapping leave balance accruals to work fatigue metrics.</CardDescription>
          </div>

          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-auto">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              <p className="text-xs font-bold">Computing burnout levels and leave profiles...</p>
            </div>
          ) : filteredData.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No matching records found.
            </div>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/40 border-b text-[10px] uppercase font-black tracking-wider text-muted-foreground">
                  <tr>
                    <th className="p-3 border-r">Employee</th>
                    <th className="p-3 border-r">Code</th>
                    <th className="p-3 border-r text-center">Unused EL Balance</th>
                    <th className="p-3 border-r text-center">Sick Leave Consumed</th>
                    <th className="p-3 border-r text-center">Fatigue Score</th>
                    <th className="p-3 border-r">Risk Level</th>
                    <th className="p-3">HR Action Suggestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-foreground font-semibold">
                  {filteredData.map((record) => (
                    <tr key={record.employeeId} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 border-r border-border font-bold">{record.name}</td>
                      <td className="p-3 border-r border-border font-mono text-[11px] text-muted-foreground">{record.code}</td>
                      <td className="p-3 border-r border-border text-center font-mono">{record.elBalance} days</td>
                      <td className="p-3 border-r border-border text-center font-mono">{record.slConsumed} days</td>
                      <td className="p-3 border-r border-border text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold">
                          <span className={`h-2 w-2 rounded-full ${
                            record.riskLevel === 'high' ? 'bg-rose-500' : record.riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span className="font-mono">{record.riskScore}</span>
                        </div>
                      </td>
                      <td className="p-3 border-r border-border">{renderRiskBadge(record.riskLevel)}</td>
                      <td className="p-3 text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span>{getActionRecommendation(record)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Leave Utilization Forecast */}
      <Card className="rounded-3xl border shadow-sm bg-card/75 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" /> AI Leave Utilization Forecast — Next 3 Months
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Gemini-powered prediction of organization-wide leave consumption trends based on the last 12 months of historical data.
            </CardDescription>
          </div>
          <Button onClick={fetchForecast} variant="outline" size="sm" disabled={forecastLoading} className="text-xs font-bold gap-1.5 h-8 rounded-xl border border-violet-500/20 text-violet-600 hover:bg-violet-50">
            {forecastLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Recalculate
          </Button>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {forecastLoading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
              <p className="text-xs font-bold">Running AI forecast model against historical leave data...</p>
            </div>
          ) : forecastData.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-xs font-bold">
              No forecast data available. Click Recalculate to generate predictions.
            </div>
          ) : (
            <>
              {/* Chart */}
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="historyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12 }} />
                    <Area type="monotone" dataKey="actual" name="Actual (days)" stroke="#7c3aed" fill="url(#historyGrad)" strokeWidth={2} dot={{ r: 3 }} />
                    <Area type="monotone" dataKey="predicted" name="Predicted (days)" stroke="#f59e0b" fill="url(#forecastGrad)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Forecast Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {forecastData.map((fc, idx) => (
                  <Card key={idx} className="p-4 rounded-2xl border border-amber-500/15 bg-amber-500/[0.03]">
                    <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">{fc.month}</p>
                    <h3 className="text-2xl font-black text-foreground mt-1">
                      {fc.predictedDays} <span className="text-xs text-muted-foreground font-medium">days predicted</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20">
                        CI: {fc.confidenceInterval?.low ?? '—'} – {fc.confidenceInterval?.high ?? '—'}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed font-medium">{fc.explanation}</p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search, Mail, Phone, MapPin, Building, ShieldCheck, Users, RefreshCw, UserCheck
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  manager: string;
  avatar: string;
  status: string;
}

export default function TeamDirectoryPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/employees', { params: { pageSize: 100 } });
      const raw = Array.isArray(res.data?.data) ? res.data.data : [];

      const formatted: Member[] = raw.map((e: any) => {
        const firstName = e.firstName || e.first_name || 'Employee';
        const lastName = e.lastName || e.last_name || '';
        const name = `${firstName} ${lastName}`.trim();
        const role = e.designation || e.jobTitle || 'Team Member';
        const department = e.department || 'Engineering';
        const email = e.email || '';
        const phone = e.phone || e.mobile || '+91 98765 43210';
        const manager = e.reportingManager || e.reporting_manager_name || 'Narendra Gaikwad';
        const avatar = `${firstName[0] || 'E'}${lastName[0] || 'M'}`;
        const status = e.status || 'active';

        return { id: e.id, name, role, department, email, phone, manager, avatar, status };
      });

      setMembers(formatted);
    } catch (err) {
      console.error('Failed to fetch team directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const departments = ['All', 'Engineering', 'Human Resources', 'Sales', 'Finance', 'Operations'];

  const filteredMembers = members.filter(m => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.manager.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || m.department.toLowerCase().includes(selectedDept.toLowerCase());
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" /> Company Team Directory
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Browse and connect with colleagues, managers, HR business partners, and department heads across the company.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchMembers} className="gap-1.5 text-xs font-bold rounded-xl shrink-0">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Directory
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search colleagues by name, role, email or manager..."
            className="pl-10 h-10 text-xs rounded-xl font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                selectedDept === dept
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground bg-card rounded-3xl border border-border">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
          <p className="text-xs font-bold">Loading team members and reporting relationships...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">No employees found matching your search filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((m) => (
            <Card
              key={m.id}
              className="p-5 rounded-2xl border border-border bg-card hover:border-violet-500/50 transition-all shadow-sm flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                      {m.avatar}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-foreground group-hover:text-violet-600 transition-colors">
                        {m.name}
                      </h4>
                      <p className="text-xs font-extrabold text-violet-600 dark:text-violet-400">{m.role}</p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                    Active
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-2 font-medium">
                    <Building className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="truncate">{m.department}</span>
                  </div>

                  <div className="flex items-center gap-2 font-medium">
                    <UserCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate text-foreground font-semibold">Reports to: {m.manager}</span>
                  </div>

                  <div className="flex items-center gap-2 font-mono">
                    <Mail className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                    <span className="truncate">{m.email}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-border flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${m.email}`)}
                  className="w-full text-xs font-extrabold rounded-xl gap-1.5 h-8"
                >
                  <Mail className="w-3.5 h-3.5 text-violet-600" /> Send Email
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

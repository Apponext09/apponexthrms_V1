import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, ChevronDown, ChevronRight, Sparkles, Building, RefreshCw, Shield, Mail, Phone
} from 'lucide-react';

interface EmployeeNode {
  id: number;
  name: string;
  role: string;
  department: string;
  email: string;
  avatar: string;
  children?: EmployeeNode[];
}

export default function OrgChartPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [treeData, setTreeData] = useState<EmployeeNode | null>(null);

  const fetchOrgHierarchy = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/employees', { params: { pageSize: 500 } });
      const rawItems: any[] = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);

      if (rawItems.length > 0) {
        // 1. Resolve CEO
        const ceoEmp = rawItems.find((e: any) => {
          const isCeo = Boolean(e.isCeo || e.is_ceo || e.isCeo === 1 || e.is_ceo === 1);
          const role = (e.accessRole || e.role || '').toLowerCase().trim();
          const desig = (e.designation || e.jobTitle || '').toLowerCase().trim();
          return isCeo || role === 'ceo' || desig === 'ceo' || desig.includes('chief executive');
        });

        const activeList = rawItems.filter((e: any) => !ceoEmp || e.id !== ceoEmp.id);

        const getCxoCat = (e: any): 'cfo' | 'coo' | 'cto' | 'cxo' | null => {
          const role = (e.accessRole || e.role || '').toLowerCase().trim();
          const desig = (e.designation || e.jobTitle || '').toLowerCase().trim();
          if (role === 'cfo' || desig === 'cfo' || desig.includes('chief financial') || desig.includes('finance head')) return 'cfo';
          if (role === 'coo' || desig === 'coo' || desig.includes('chief operating') || desig.includes('operations head')) return 'coo';
          if (role === 'cto' || desig === 'cto' || desig.includes('chief technology') || desig.includes('tech head') || desig.includes('head of engineering')) return 'cto';
          if (role === 'cxo' || desig.startsWith('chief ') || desig.includes('c-level')) return 'cxo';
          return null;
        };

        const cxoList = activeList.filter((e) => getCxoCat(e) !== null);
        const nonCxoList = activeList.filter((e) => getCxoCat(e) === null);

        // Group non-CXO employees by department
        const deptMap = new Map<string, any[]>();
        nonCxoList.forEach((e: any) => {
          const deptName = e.department || e.department_name || e.departmentName || 'General Operations';
          if (!deptMap.has(deptName)) deptMap.set(deptName, []);
          deptMap.get(deptName)!.push(e);
        });

        const buildDeptNode = (deptName: string, empList: any[]): EmployeeNode => {
          const lead = empList.find((e: any) => ['department_head', 'hr_manager', 'manager'].includes((e.accessRole || '').toLowerCase())) || empList[0];
          const members = empList.filter((e: any) => e.id !== lead.id);

          return {
            id: lead.id,
            name: `${lead.firstName || lead.first_name || 'Lead'} ${lead.lastName || lead.last_name || ''}`.trim(),
            role: lead.designation || lead.designation_name || lead.jobTitle || `${deptName} Head`,
            department: deptName,
            email: lead.email || '',
            avatar: `${(lead.firstName || lead.first_name || 'D')[0] || ''}${(lead.lastName || lead.last_name || 'L')[0] || ''}`.toUpperCase(),
            children: members.map((m: any) => ({
              id: m.id,
              name: `${m.firstName || m.first_name || 'Member'} ${m.lastName || m.last_name || ''}`.trim(),
              role: m.designation || m.designation_name || m.jobTitle || 'Team Member',
              department: deptName,
              email: m.email || '',
              avatar: `${(m.firstName || m.first_name || 'M')[0] || ''}${(m.lastName || m.last_name || 'T')[0] || ''}`.toUpperCase(),
            })),
          };
        };

        // Attach departments to their respective CXO by assigned department or direct reports
        const claimedDepts = new Set<string>();
        const cxoOrderMap: Record<string, number> = { cfo: 1, coo: 2, cto: 3, cxo: 4 };
        const sortedCxos = [...cxoList].sort((a, b) => {
          const ordA = cxoOrderMap[getCxoCat(a) || 'cxo'] || 99;
          const ordB = cxoOrderMap[getCxoCat(b) || 'cxo'] || 99;
          return ordA - ordB;
        });

        const cxoNodes: EmployeeNode[] = sortedCxos.map((cxo) => {
          const cxoDept = cxo.department || cxo.departmentName || '';
          const matchingDepts: string[] = [];

          if (cxoDept && deptMap.has(cxoDept) && !claimedDepts.has(cxoDept)) {
            matchingDepts.push(cxoDept);
            claimedDepts.add(cxoDept);
          }

          // Find other departments whose lead reports to this CXO
          deptMap.forEach((emps, dName) => {
            if (!claimedDepts.has(dName)) {
              const reportsToCxo = emps.some((e) => e.reportingManagerId === cxo.id);
              if (reportsToCxo) {
                matchingDepts.push(dName);
                claimedDepts.add(dName);
              }
            }
          });

          const deptChildren = matchingDepts.map((dName) => buildDeptNode(dName, deptMap.get(dName)!));

          return {
            id: cxo.id,
            name: `${cxo.firstName || ''} ${cxo.lastName || ''}`.trim() || 'Executive',
            role: cxo.designation || cxo.jobTitle || (getCxoCat(cxo)?.toUpperCase() ?? 'CXO'),
            department: cxoDept || 'C-Suite Executive',
            email: cxo.email || '',
            avatar: `${(cxo.firstName || 'C')[0] || ''}${(cxo.lastName || 'X')[0] || ''}`.toUpperCase(),
            children: deptChildren,
          };
        });

        // Remaining departments not assigned to CXO
        const unassignedDeptNodes: EmployeeNode[] = [];
        deptMap.forEach((emps, dName) => {
          if (!claimedDepts.has(dName)) {
            unassignedDeptNodes.push(buildDeptNode(dName, emps));
          }
        });

        const rootCeoNode: EmployeeNode = {
          id: ceoEmp?.id || 9999,
          name: ceoEmp ? `${ceoEmp.firstName || ''} ${ceoEmp.lastName || ''}`.trim() : 'Chief Executive Officer',
          role: 'CHIEF EXECUTIVE OFFICER (CEO)',
          department: ceoEmp?.department || 'Executive Management',
          email: ceoEmp?.email || '',
          avatar: 'CEO',
          children: [...cxoNodes, ...unassignedDeptNodes],
        };

        setTreeData(rootCeoNode);
        const expanded: Record<string, boolean> = { [rootCeoNode.name]: true };
        cxoNodes.forEach((n) => { expanded[n.name] = true; });
        unassignedDeptNodes.forEach((n) => { expanded[n.name] = true; });
        setExpandedNodes(expanded);
      }
    } catch (err) {
      console.error('Failed to fetch org hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgHierarchy();
  }, []);

  const toggleNode = (name: string) => {
    setExpandedNodes(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const renderNode = (node: EmployeeNode, isRoot: boolean = false) => {
    const isCurrentEmployee = Number(node.id) === Number(user?.employeeId);
    const isExpanded = expandedNodes[node.name] ?? true;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {!isRoot && <div className="w-px h-6 bg-border" />}

        <div className="relative group">
          <Card className={`w-72 p-4 rounded-2xl border shadow-sm transition-all bg-card/90 backdrop-blur-sm ${
            isRoot
              ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/20'
              : isCurrentEmployee ? 'border-primary shadow-md ring-2 ring-primary/20' : 'hover:border-violet-500/40 hover:shadow-md'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner ${
                isRoot
                  ? 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white'
                  : 'bg-violet-500/10 text-violet-600 border border-violet-500/20'
              }`}>
                {node.avatar}
              </div>

              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-black text-foreground truncate">{node.name}</h4>
                  {isRoot && (
                    <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-amber-500/10 text-amber-600 border border-amber-500/30">
                      Head
                    </span>
                  )}
                  {isCurrentEmployee && !isRoot && <span className="text-[9px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/25">You</span>}
                </div>
                <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 truncate">{node.role}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 font-semibold">
                  <Building className="w-3 h-3 text-muted-foreground" /> {node.department}
                </p>
              </div>
            </div>

            {node.email && (
              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-violet-500" /> {node.email}
                </span>
              </div>
            )}
          </Card>

          {hasChildren && (
            <button
              onClick={() => toggleNode(node.name)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-card border border-border shadow text-foreground flex items-center justify-center hover:bg-muted transition-all z-10"
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="flex flex-col items-center w-full mt-3">
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-wrap justify-center gap-6 relative pt-2">
              {node.children!.map((child) => renderNode(child, false))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex justify-between items-center pb-3 border-b flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-violet-600" /> Interactive Organization Chart
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            View-only reporting hierarchy. Your profile is highlighted in the structure.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchOrgHierarchy} className="gap-1.5 text-xs font-bold rounded-xl">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Hierarchy
        </Button>
      </div>

      {/* Org Tree Canvas */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-2 text-muted-foreground bg-card rounded-3xl border border-border">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
          <p className="text-xs font-bold">Building live organizational hierarchy tree...</p>
        </div>
      ) : treeData ? (
        <div className="p-8 bg-card rounded-3xl border border-border shadow-sm overflow-x-auto min-h-[500px] flex justify-center">
          {renderNode(treeData, true)}
        </div>
      ) : (
        <div className="p-12 text-center bg-card rounded-3xl border border-border space-y-3">
          <Users className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">No organizational hierarchy records found.</p>
        </div>
      )}
    </div>
  );
}

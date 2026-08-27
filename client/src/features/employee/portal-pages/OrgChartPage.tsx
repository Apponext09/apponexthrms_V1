import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
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
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [treeData, setTreeData] = useState<EmployeeNode | null>(null);

  const fetchOrgHierarchy = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/employees', { params: { pageSize: 100 } });
      const items = Array.isArray(res.data?.data) ? res.data.data : [];

      if (items.length > 0) {
        // Dynamic hierarchy tree builder with optional CXO layer
        const cxos = items.filter((e: any) =>
          ['cto', 'cfo', 'coo', 'cxo'].includes((e.accessRole || '').toLowerCase()) ||
          (e.designation || '').toLowerCase().includes('chief') ||
          (e.designation || '').toLowerCase().includes('cto') ||
          (e.designation || '').toLowerCase().includes('cfo') ||
          (e.designation || '').toLowerCase().includes('coo')
        );

        const managers = items.filter((e: any) =>
          ['department_head', 'hr_manager'].includes((e.accessRole || '').toLowerCase()) &&
          !cxos.some((c: any) => c.id === e.id)
        );

        const teamLeads = items.filter((e: any) =>
          (e.accessRole || '').toLowerCase() === 'team_lead'
        );

        const employees = items.filter((e: any) =>
          !['cto', 'cfo', 'coo', 'cxo', 'department_head', 'hr_manager', 'team_lead'].includes((e.accessRole || '').toLowerCase())
        );

        const claimedIds = new Set<number>();

        const mapNode = (e: any, children: EmployeeNode[] = []): EmployeeNode => {
          if (e.id) claimedIds.add(e.id);
          const fName = e.firstName || e.first_name || 'Employee';
          const lName = e.lastName || e.last_name || '';
          return {
            id: e.id,
            name: `${fName} ${lName}`.trim(),
            role: e.designation || e.jobTitle || e.accessRole || 'Staff',
            department: e.department || e.departmentName || 'General',
            email: e.email || '',
            avatar: `${fName[0] || 'E'}${lName[0] || 'M'}`,
            children: children.length > 0 ? children : undefined,
          };
        };

        // 1. Build Manager nodes
        const managerNodes = managers.map((m: any) => {
          const mDept = (m.department || m.departmentName || '').toLowerCase();
          const subLeads = teamLeads.filter((tl: any) =>
            !claimedIds.has(tl.id) &&
            (tl.reportingManagerId === m.id || (mDept && (tl.department || '').toLowerCase() === mDept))
          );

          const subEmps = employees.filter((emp: any) =>
            !claimedIds.has(emp.id) &&
            (emp.reportingManagerId === m.id || (mDept && (emp.department || '').toLowerCase() === mDept))
          );

          const leadNodes = subLeads.map((tl: any) => {
            const tlEmps = employees.filter((emp: any) =>
              !claimedIds.has(emp.id) && emp.reportingManagerId === tl.id
            );
            return mapNode(tl, tlEmps.map((e: any) => mapNode(e)));
          });

          return mapNode(m, [...leadNodes, ...subEmps.map((e: any) => mapNode(e))]);
        });

        // 2. Build CXO nodes (optional layer)
        const claimedManagerIds = new Set<number>();
        const cxoNodes = cxos.map((cxo: any) => {
          const cxoDept = (cxo.department || cxo.departmentName || '').toLowerCase();
          const cxoManagers = managerNodes.filter((mNode: EmployeeNode) => {
            if (claimedManagerIds.has(mNode.id)) return false;
            const rawM = managers.find((m: any) => m.id === mNode.id);
            return rawM?.reportingManagerId === cxo.id || (cxoDept && mNode.department.toLowerCase() === cxoDept);
          });

          cxoManagers.forEach((m: EmployeeNode) => claimedManagerIds.add(m.id));
          return mapNode(cxo, cxoManagers);
        });

        // 3. Managers not assigned under a CXO
        const unattachedManagerNodes = managerNodes.filter((m: EmployeeNode) => !claimedManagerIds.has(m.id));

        // 4. Root CEO node
        const topAdmin = items.find((e: any) =>
          ['ceo', 'organization_admin', 'super_admin'].includes((e.accessRole || '').toLowerCase())
        ) || {
          id: 1,
          firstName: 'Chief Executive',
          lastName: 'Officer',
          role: 'CEO & President',
          department: 'Executive Management',
          email: 'ceo@organization.com',
        };

        const rootNode = mapNode(topAdmin, [...cxoNodes, ...unattachedManagerNodes]);

        setTreeData(rootNode);
        setExpandedNodes({
          [rootNode.name]: true,
          ...cxoNodes.reduce((acc: Record<string, boolean>, c: EmployeeNode) => ({ ...acc, [c.name]: true }), {}),
        });
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
    const isExpanded = expandedNodes[node.name] ?? true;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="flex flex-col items-center">
        {!isRoot && <div className="w-px h-6 bg-border" />}

        <div className="relative group">
          <Card className={`w-72 p-4 rounded-2xl border shadow-sm transition-all bg-card/90 backdrop-blur-sm ${
            isRoot
              ? 'border-violet-500/50 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/20'
              : 'hover:border-violet-500/40 hover:shadow-md'
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
            Visualize reporting hierarchy, department leaders, managers, and reporting structures.
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

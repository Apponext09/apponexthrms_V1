import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ChevronDown, ChevronRight, Users, Sparkles } from 'lucide-react';

interface MemberNode {
  name: string;
  role: string;
  department: string;
  avatar: string;
  children?: MemberNode[];
}

export default function OrgChartPage() {
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'CEO': true,
    'VP Engineering': true,
  });

  const toggleNode = (name: string) => {
    setExpandedNodes(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const chartData: MemberNode = {
    name: 'Rajesh Sharma',
    role: 'Chief Executive Officer',
    department: 'Management',
    avatar: 'RS',
    children: [
      {
        name: 'Asha Deshmukh',
        role: 'VP Human Resources',
        department: 'HR',
        avatar: 'AD',
        children: [
          { name: 'Rohan Mehra', role: 'HR Manager', department: 'HR', avatar: 'RM' },
          { name: 'Kirti Patil', role: 'Recruiter', department: 'HR', avatar: 'KP' },
        ]
      },
      {
        name: 'Narendra Gaikwad',
        role: 'VP Engineering',
        department: 'Engineering',
        avatar: 'NG',
        children: [
          { name: 'Aqil Jamadar', role: 'Technical Lead', department: 'Engineering', avatar: 'AJ' },
          { name: 'Sneha Rao', role: 'Senior Developer', department: 'Engineering', avatar: 'SR' },
          { name: 'Vikram Singh', role: 'QA Engineer', department: 'Engineering', avatar: 'VS' },
        ]
      },
    ]
  };

  const renderNode = (node: MemberNode) => {
    const isExpanded = expandedNodes[node.role] ?? false;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.name} className="flex flex-col items-center">
        {/* Connection Line */}
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

        {/* Node Card */}
        <div 
          onClick={() => hasChildren && toggleNode(node.role)}
          className={`flex items-center gap-3 p-3 bg-card border rounded-2xl shadow-sm min-w-[200px] cursor-pointer hover:border-violet-600 transition-all ${
            hasChildren ? 'border-slate-200' : 'border-dashed border-slate-300'
          }`}
        >
          <div className="h-8 w-8 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs">
            {node.avatar}
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-xs font-bold text-foreground truncate max-w-[140px]">{node.name}</h4>
            <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{node.role}</p>
          </div>
          {hasChildren && (
            <button className="text-muted-foreground p-0.5 hover:bg-muted rounded-full">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="relative flex gap-6 mt-4">
            {/* Horizontal connect line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-slate-300 dark:bg-slate-700 pointer-events-none" />
            {node.children?.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b">
        <div>
          <h2 className="text-lg font-bold text-foreground">Organization Tree</h2>
          <p className="text-xs text-muted-foreground">Interactive display of employee reporting structure hierarchy.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold bg-muted px-3 py-1.5 rounded-lg border">
          <Users className="w-4 h-4 text-violet-500" />
          <span>Active Employees Directory Chart</span>
        </div>
      </div>

      <div className="bg-muted/10 border rounded-2xl p-6 shadow-sm overflow-x-auto min-h-[500px] flex justify-center items-start">
        <div className="flex flex-col items-center">
          {/* Root Card */}
          <div className="flex items-center gap-3 p-3 bg-violet-600 border border-violet-700 text-white rounded-2xl shadow-md min-w-[200px] cursor-pointer">
            <div className="h-8 w-8 rounded-lg bg-white/20 text-white flex items-center justify-center font-bold text-xs">
              {chartData.avatar}
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{chartData.name}</h4>
              <p className="text-[10px] text-violet-200 truncate max-w-[140px]">{chartData.role}</p>
            </div>
            <button className="text-white/80 p-0.5 hover:bg-white/10 rounded-full" onClick={() => toggleNode(chartData.role)}>
              {expandedNodes[chartData.role] ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>

          {expandedNodes[chartData.role] && (
            <div className="relative flex gap-12 mt-4">
              {/* Horizontal connect line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-slate-300 dark:bg-slate-700 pointer-events-none" />
              {chartData.children?.map(child => renderNode(child))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

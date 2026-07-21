import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface Approval {
  id: string;
  type: string;
  title: string;
  requester: string;
  date: string;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'high' | 'normal' | 'low';
  dueDate: string;
}

const mockApprovals: Approval[] = [
  // Leave Approvals
  {
    id: 'L001',
    type: 'Leave',
    title: 'Annual Leave Request',
    requester: 'John Doe',
    date: '2024-01-15',
    status: 'pending',
    priority: 'normal',
    dueDate: '2024-01-17',
  },
  {
    id: 'L002',
    type: 'Leave',
    title: 'Sick Leave Request',
    requester: 'Sarah Smith',
    date: '2024-01-14',
    status: 'pending',
    priority: 'high',
    dueDate: '2024-01-15',
  },

  // Attendance Regularization (Placeholder for Phase 2)
  {
    id: 'A001',
    type: 'Attendance',
    title: 'Attendance Regularization',
    requester: 'Mike Chen',
    date: '2024-01-13',
    status: 'pending',
    priority: 'normal',
    dueDate: '2024-01-20',
  },

  // Expense Approval (Placeholder for Phase 2)
  {
    id: 'E001',
    type: 'Expense',
    title: 'Conference Expense Report',
    requester: 'Emily Johnson',
    date: '2024-01-12',
    status: 'pending',
    priority: 'normal',
    dueDate: '2024-01-25',
  },

  // Travel Request (Placeholder for Phase 2)
  {
    id: 'T001',
    type: 'Travel',
    title: 'Business Trip Request',
    requester: 'David Wilson',
    date: '2024-01-11',
    status: 'pending',
    priority: 'high',
    dueDate: '2024-01-18',
  },

  // Asset Assignment (Placeholder for Phase 2)
  {
    id: 'AS001',
    type: 'Asset',
    title: 'Laptop Assignment Request',
    requester: 'Lisa Brown',
    date: '2024-01-10',
    status: 'pending',
    priority: 'normal',
    dueDate: '2024-01-22',
  },

  // Approved items
  {
    id: 'L003',
    type: 'Leave',
    title: 'Personal Leave Request',
    requester: 'Robert Taylor',
    date: '2024-01-09',
    status: 'approved',
    priority: 'normal',
    dueDate: '2024-01-09',
  },

  // Rejected items
  {
    id: 'E002',
    type: 'Expense',
    title: 'Entertainment Expense',
    requester: 'Amanda Davis',
    date: '2024-01-08',
    status: 'rejected',
    priority: 'low',
    dueDate: '2024-01-08',
  },
];

const approvalTypes = [
  { id: 'all', label: 'All Approvals', count: 0 },
  { id: 'leave', label: 'Leave', count: 0 },
  { id: 'attendance', label: 'Attendance', count: 0 },
  { id: 'expense', label: 'Expense', count: 0 },
  { id: 'travel', label: 'Travel', count: 0 },
  { id: 'asset', label: 'Asset', count: 0 },
  { id: 'recruitment', label: 'Recruitment', count: 0 },
  { id: 'document', label: 'Document', count: 0 },
  { id: 'performance', label: 'Performance', count: 0 },
  { id: 'promotion', label: 'Promotion', count: 0 },
];

export function ApprovalCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const filteredApprovals = mockApprovals.filter((approval) => {
    const matchesSearch =
      approval.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      approval.requester.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || approval.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || approval.priority === priorityFilter;
    const matchesType =
      activeTab === 'all' || approval.type.toLowerCase() === activeTab.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority && matchesType;
  });

  const pendingCount = mockApprovals.filter((a) => a.status === 'pending').length;
  const approvedCount = mockApprovals.filter((a) => a.status === 'approved').length;
  const rejectedCount = mockApprovals.filter((a) => a.status === 'rejected').length;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'approved':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-danger" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning/10 text-warning';
      case 'approved':
        return 'bg-success/10 text-success';
      case 'rejected':
        return 'bg-danger/10 text-danger';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-danger/10 text-danger';
      case 'normal':
        return 'bg-primary/10 text-primary';
      case 'low':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Approval Center</h1>
        <p className="text-muted-foreground mt-1">
          Manage all approvals in one centralized location
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Clock className="h-8 w-8 text-warning" />
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold">{approvedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <XCircle className="h-8 w-8 text-danger" />
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold">{rejectedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-10 gap-2 h-auto p-2">
          {approvalTypes.map((type) => (
            <TabsTrigger key={type.id} value={type.id} className="text-xs">
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or requester..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Approvals List */}
          <div className="space-y-4">
            {filteredApprovals.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">No approvals found</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredApprovals.map((approval) => (
                <Card key={approval.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1 flex items-start gap-3">
                        <div className="mt-1">{getStatusIcon(approval.status)}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{approval.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Requested by {approval.requester}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {new Date(approval.dueDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                        <Badge variant="outline">{approval.type}</Badge>
                        <Badge className={getPriorityColor(approval.priority)}>
                          {approval.priority.charAt(0).toUpperCase() + approval.priority.slice(1)}
                        </Badge>
                        <Badge className={getStatusColor(approval.status)}>
                          {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                        </Badge>
                      </div>

                      {approval.status === 'pending' && (
                        <div className="flex gap-2 md:ml-4">
                          <Button size="sm" variant="default">
                            Approve
                          </Button>
                          <Button size="sm" variant="outline">
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

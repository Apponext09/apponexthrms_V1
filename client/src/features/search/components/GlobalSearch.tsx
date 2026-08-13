import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, BarChart3, Briefcase, Clock, TrendingUp, FileText, Zap, X, Calendar } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: 'employees' | 'departments' | 'leave' | 'attendance' | 'recruitment' | 'assets' | 'reports' | 'policies' | 'documents' | 'workflows' | 'announcements' | 'settings' | 'approvals';
  icon: React.ReactNode;
  href: string;
}

const searchData: SearchResult[] = [
  // Employees
  { id: '1', title: 'Employee List', description: 'View all employees', category: 'employees', icon: <Users className="h-4 w-4" />, href: '/employees' },
  { id: '2', title: 'Add Employee', description: 'Onboard new employee', category: 'employees', icon: <Users className="h-4 w-4" />, href: '/employees/new' },
  { id: '3', title: 'My Profile', description: 'View your profile', category: 'employees', icon: <Users className="h-4 w-4" />, href: '/profile' },

  // Leave
  { id: '4', title: 'My Leave', description: 'View leave balance', category: 'leave', icon: <Calendar className="h-4 w-4" />, href: '/leaves' },
  { id: '5', title: 'Apply Leave', description: 'Request time off', category: 'leave', icon: <Clock className="h-4 w-4" />, href: '/leaves/apply' },
  { id: '6', title: 'Leave Approvals', description: 'Approve leave requests', category: 'leave', icon: <TrendingUp className="h-4 w-4" />, href: '/leaves/approvals' },

  // Attendance
  { id: '7', title: 'Attendance Dashboard', description: 'View attendance metrics', category: 'attendance', icon: <Clock className="h-4 w-4" />, href: '/attendance' },
  { id: '8', title: 'My Attendance', description: 'Check-in and out', category: 'attendance', icon: <Clock className="h-4 w-4" />, href: '/attendance/my-attendance' },

  // Recruitment
  { id: '10', title: 'MRF Request', description: 'Manpower Requisition Form', category: 'recruitment', icon: <Briefcase className="h-4 w-4" />, href: '/recruitment/mrf-request' },
  { id: '11', title: 'Candidate Report', description: 'View candidate reports', category: 'recruitment', icon: <Users className="h-4 w-4" />, href: '/recruitment/candidate-report' },
  { id: '11a', title: 'Resume Bank', description: 'Source and screen resumes', category: 'recruitment', icon: <Briefcase className="h-4 w-4" />, href: '/recruitment/resume-bank' },
  { id: '11b', title: 'Applicant Tracker', description: 'Track applicant statuses', category: 'recruitment', icon: <Briefcase className="h-4 w-4" />, href: '/recruitment/applicant-tracker' },
  { id: '11c', title: 'Interviewer Rating', description: 'View interviewer ratings', category: 'recruitment', icon: <Briefcase className="h-4 w-4" />, href: '/recruitment/interviewer-rating' },

  // Assets
  { id: '12', title: 'Asset Management', description: 'Manage company assets', category: 'assets', icon: <Zap className="h-4 w-4" />, href: '/assets' },
  { id: '13', title: 'My Assets', description: 'View assigned assets', category: 'assets', icon: <Zap className="h-4 w-4" />, href: '/assets/my-assets' },

  // Reports
  { id: '14', title: 'Reports & Analytics', description: 'View organizational reports', category: 'reports', icon: <BarChart3 className="h-4 w-4" />, href: '/analytics' },
  { id: '15', title: 'HR Reports', description: 'HR operations reports', category: 'reports', icon: <BarChart3 className="h-4 w-4" />, href: '/reports/hr' },

  // Policies
  { id: '16', title: 'Work from Home Policy', description: 'Remote work guidelines', category: 'policies', icon: <FileText className="h-4 w-4" />, href: '/policies/work-from-home' },
  { id: '17', title: 'Code of Conduct', description: 'Employee code of conduct', category: 'policies', icon: <FileText className="h-4 w-4" />, href: '/policies/code-of-conduct' },
  { id: '18', title: 'Leave Policy', description: 'Leave entitlements and rules', category: 'policies', icon: <FileText className="h-4 w-4" />, href: '/policies/leave' },
  { id: '19', title: 'Travel Policy', description: 'Business travel guidelines', category: 'policies', icon: <FileText className="h-4 w-4" />, href: '/policies/travel' },

  // Documents
  { id: '20', title: 'Employee Handbook', description: 'Company policies and procedures', category: 'documents', icon: <FileText className="h-4 w-4" />, href: '/documents/handbook' },
  { id: '21', title: 'Offer Letters', description: 'View offer letter templates', category: 'documents', icon: <FileText className="h-4 w-4" />, href: '/documents/offer-letters' },
  { id: '22', title: 'My Documents', description: 'Access your documents', category: 'documents', icon: <FileText className="h-4 w-4" />, href: '/documents/my-documents' },

  // Workflows
  { id: '23', title: 'Workflow Builder', description: 'Create and manage workflows', category: 'workflows', icon: <Zap className="h-4 w-4" />, href: '/hr-operations/workflow-builder' },
  { id: '24', title: 'Approval Workflows', description: 'Manage approval processes', category: 'workflows', icon: <TrendingUp className="h-4 w-4" />, href: '/approvals' },

  // Announcements
  { id: '25', title: 'Company Announcements', description: 'Latest news and updates', category: 'announcements', icon: <TrendingUp className="h-4 w-4" />, href: '/announcements' },
  { id: '26', title: 'Create Announcement', description: 'Post new announcement', category: 'announcements', icon: <TrendingUp className="h-4 w-4" />, href: '/announcements/new' },

  // Settings
  { id: '27', title: 'Organization Settings', description: 'Configure organization', category: 'settings', icon: <Zap className="h-4 w-4" />, href: '/settings/organization' },
  { id: '28', title: 'Department Management', description: 'Manage departments', category: 'settings', icon: <Users className="h-4 w-4" />, href: '/settings/departments' },
  { id: '29', title: 'Holiday Calendar', description: 'Company holidays', category: 'settings', icon: <Calendar className="h-4 w-4" />, href: '/settings/holidays' },
  { id: '30', title: 'Notification Preferences', description: 'Manage your notifications', category: 'settings', icon: <Zap className="h-4 w-4" />, href: '/settings/notifications' },

  // Approvals
  { id: '31', title: 'My Approvals', description: 'Pending approvals for you', category: 'approvals', icon: <TrendingUp className="h-4 w-4" />, href: '/approvals/inbox' },
  { id: '32', title: 'Approval Dashboard', description: 'All approvals overview', category: 'approvals', icon: <BarChart3 className="h-4 w-4" />, href: '/approvals/dashboard' },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setQuery('');
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter results based on query
  useEffect(() => {
    if (!query) {
      setResults(searchData.slice(0, 8)); // Show recent items
      return;
    }

    const filtered = searchData.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description?.toLowerCase().includes(query.toLowerCase())
    );

    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.href);
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      employees: 'Employees',
      departments: 'Organization',
      leave: 'Leave',
      attendance: 'Attendance',
      recruitment: 'Recruitment',
      assets: 'Assets',
      reports: 'Reports',
      policies: 'Policies',
      documents: 'Documents',
      workflows: 'Workflows',
      announcements: 'Announcements',
      settings: 'Settings',
      approvals: 'Approvals',
    };
    return labels[category] || category;
  };

  const groupedResults = results.reduce((acc, result) => {
    const category = getCategoryLabel(result.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0 shadow-soft-lg">
        <div className="flex flex-col max-h-[500px]">
          {/* Search Input */}
          <div className="flex items-center border-b border-border px-4 py-3 gap-2">
            <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search employees, leave, recruitment..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="border-0 focus-visible:ring-0 focus-visible:outline-none"
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap">ESC</span>
          </div>

          {/* Results */}
          <div className="overflow-y-auto flex-1">
            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No results found</p>
              </div>
            ) : (
              <div className="space-y-1 p-3">
                {Object.entries(groupedResults).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </div>
                    {items.map((result, index) => {
                      const globalIndex = Object.values(groupedResults)
                        .slice(0, Object.keys(groupedResults).indexOf(category))
                        .reduce((sum, arr) => sum + arr.length, 0) + index;

                      return (
                        <motion.button
                          key={result.id}
                          onClick={() => handleSelect(result)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-left',
                            globalIndex === selectedIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'text-foreground hover:bg-muted'
                          )}
                          whileHover={{ x: 4 }}
                        >
                          <div className="flex-shrink-0">{result.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            {result.description && (
                              <p className={cn(
                                'text-xs truncate',
                                globalIndex === selectedIndex
                                  ? 'text-primary-foreground/80'
                                  : 'text-muted-foreground'
                              )}>
                                {result.description}
                              </p>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Help */}
          {results.length > 0 && (
            <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Navigate with ↑↓ • Select with ↵</span>
              <span>Type to search</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export button component for Topbar
export function GlobalSearchButton() {
  return (
    <button
      onClick={() => {
        const event = new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        });
        window.dispatchEvent(event);
      }}
      className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-muted/50 hover:bg-muted text-muted-foreground text-sm transition-colors w-full md:w-64"
    >
      <Search className="h-4 w-4" />
      <span className="hidden md:inline">Search...</span>
      <span className="ml-auto text-xs opacity-50">⌘K</span>
    </button>
  );
}

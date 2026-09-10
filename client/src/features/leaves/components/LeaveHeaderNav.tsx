import { Link, useLocation } from 'react-router-dom';
import { Palmtree, Plus, BarChart2, CheckCircle2, Clock, CreditCard } from 'lucide-react';

export function LeaveHeaderNav() {
  const location = useLocation();

  const navItems = [
    {
      name: 'My Leaves',
      href: '/leaves',
      icon: Palmtree,
      exact: true,
    },
    {
      name: 'Apply Leave',
      href: '/leaves/apply',
      icon: Plus,
    },
    {
      name: 'Leave Balances',
      href: '/leaves/balance',
      icon: BarChart2,
    },
    {
      name: 'Leave Encashment',
      href: '/leaves/encashment',
      icon: CreditCard,
    },
    {
      name: 'Approval Inbox',
      href: '/leaves/approvals',
      icon: CheckCircle2,
    },

  ];

  return (
    <div className="bg-card border-b border-border/80 mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex space-x-1.5 overflow-x-auto py-2.5 no-scrollbar">
          {navItems.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.href
              : location.pathname.startsWith(item.href);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

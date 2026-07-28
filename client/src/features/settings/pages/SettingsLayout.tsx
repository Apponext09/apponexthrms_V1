import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { useEffect } from 'react';

const MODULES = [
  { id: 'company-profile', label: 'Company Profile', icon: '🏢' },
  { id: 'branches', label: 'Branches', icon: '🏤' },
  { id: 'locations', label: 'Locations', icon: '📍' },
  { id: 'departments', label: 'Departments', icon: '👥' },
  { id: 'designations', label: 'Designations', icon: '💼' },
  { id: 'cost-centers', label: 'Cost Centers', icon: '💰' },
  { id: 'holidays', label: 'Holiday Calendars', icon: '📅' },
  { id: 'attendance-policies', label: 'Attendance Policies', icon: '⏱️' },
  { id: 'leave-policies', label: 'Leave Policies', icon: '🎯' },
  { id: 'payroll-policies', label: 'Payroll Policies', icon: '💸' },
  { id: 'work-policies', label: 'Work Policies', icon: '🏢' },
  { id: 'branding', label: 'Branding', icon: '🎨' },
  { id: 'email-templates', label: 'Email Templates', icon: '📧' },
  { id: 'organization-settings', label: 'Settings', icon: '⚙️' },
  { id: 'history', label: 'Change History', icon: '📜' },
];

export function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeModule, setActiveModule } = useSettingsStore();

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    if (MODULES.find((m) => m.id === lastPart)) {
      setActiveModule(lastPart as any);
    }
  }, [location.pathname, setActiveModule]);

  return (
    <div className="flex h-screen gap-0 bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
        <nav className="space-y-1 px-3">
          {MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => {
                setActiveModule(module.id as any);
                navigate(`/settings/${module.id}`);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeModule === module.id
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span className="mr-2">{module.icon}</span>
              {module.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}


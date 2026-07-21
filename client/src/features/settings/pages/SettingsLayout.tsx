import { Outlet } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';

const MODULES = [
  { id: 'company-profile', label: 'Company Profile', icon: 'ðŸ¢' },
  { id: 'branches', label: 'Branches', icon: 'ðŸª' },
  { id: 'locations', label: 'Locations', icon: 'ðŸ“' },
  { id: 'departments', label: 'Departments', icon: 'ðŸ‘¥' },
  { id: 'designations', label: 'Designations', icon: 'ðŸ’¼' },
  { id: 'cost-centers', label: 'Cost Centers', icon: 'ðŸ’°' },
  { id: 'holidays', label: 'Holiday Calendars', icon: 'ðŸ“…' },
  { id: 'attendance-policies', label: 'Attendance Policies', icon: 'â°' },
  { id: 'leave-policies', label: 'Leave Policies', icon: 'ðŸŽ¯' },
  { id: 'payroll-policies', label: 'Payroll Policies', icon: 'ðŸ’µ' },
  { id: 'work-policies', label: 'Work Policies', icon: 'ðŸ ' },
  { id: 'branding', label: 'Branding', icon: 'ðŸŽ¨' },
  { id: 'email-templates', label: 'Email Templates', icon: 'ðŸ“§' },
  { id: 'organization-settings', label: 'Settings', icon: 'âš™ï¸' },
  { id: 'history', label: 'Change History', icon: 'ðŸ“œ' },
];

export function SettingsLayout() {
  const { activeModule, setActiveModule } = useSettingsStore();

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
              onClick={() => setActiveModule(module.id as any)}
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


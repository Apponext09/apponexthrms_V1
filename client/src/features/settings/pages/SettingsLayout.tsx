import { Outlet } from 'react-router-dom';

export function SettingsLayout() {
  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <Outlet />
    </div>
  );
}


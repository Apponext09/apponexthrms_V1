import { useLocation, useSearchParams } from 'react-router-dom';
import { SETTINGS_CONFIGURATION_TABS } from '@apponexthrms/shared';
import { useMenuAccess } from '@/features/access/useMenuAccess';

export function useConfigurationTabAccess<T extends { id: string; label: string }>(tabs: T[]) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const access = useMenuAccess();
  const allowedTabs = tabs.filter((tab) => access.canAccessPath(`${pathname}?tab=${tab.id}`)).map((tab) => ({
    ...tab, label: SETTINGS_CONFIGURATION_TABS.find((entry) => entry.id === tab.id)?.label ?? tab.label,
  }));
  const requested = params.get('tab');
  const activeTab = allowedTabs.find((tab) => tab.id === requested)?.id ?? allowedTabs[0]?.id;
  const setActiveTab = (id: string) => {
    if (!allowedTabs.some((tab) => tab.id === id)) return;
    const next = new URLSearchParams(params);
    next.set('tab', id);
    setParams(next);
  };
  return { allowedTabs, activeTab, setActiveTab, ready: access.ready };
}

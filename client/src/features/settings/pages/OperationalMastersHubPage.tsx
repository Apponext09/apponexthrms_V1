import { useState, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';

// Lazy-load all operational master components
const GeneralShiftMasterForm = lazy(() => import('../components/GeneralShiftMasterForm').then(m => ({ default: m.GeneralShiftMasterForm })));
const RosterShiftMasterForm = lazy(() => import('../components/RosterShiftMasterForm').then(m => ({ default: m.RosterShiftMasterForm })));
const OTRulePage = lazy(() => import('../components/ot-rules/OTRulePage').then(m => ({ default: m.OTRulePage })));
const BreakMasterForm = lazy(() => import('../components/BreakMasterForm').then(m => ({ default: m.BreakMasterForm })));
const HolidayMasterForm = lazy(() => import('../components/HolidayMasterForm').then(m => ({ default: m.HolidayMasterForm })));
const EventMasterForm = lazy(() => import('../components/EventMasterForm').then(m => ({ default: m.EventMasterForm })));
const NotificationTemplateMasterForm = lazy(() => import('../components/NotificationTemplateMasterForm').then(m => ({ default: m.NotificationTemplateMasterForm })));
const NotificationMergeCodeMasterForm = lazy(() => import('../components/NotificationMergeCodeMasterForm').then(m => ({ default: m.NotificationMergeCodeMasterForm })));
const OfferTemplateMasterForm = lazy(() => import('../components/OfferTemplateMasterForm').then(m => ({ default: m.OfferTemplateMasterForm })));
const AccessRolesMasterForm = lazy(() => import('../components/AccessRolesMasterForm').then(m => ({ default: m.AccessRolesMasterForm })));
const KraMasterForm = lazy(() => import('../components/KraMasterForm').then(m => ({ default: m.KraMasterForm })));
const ResourcePlanMasterForm = lazy(() => import('../components/ResourcePlanMasterForm').then(m => ({ default: m.ResourcePlanMasterForm })));

function MasterTabLoader() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground gap-3 text-sm font-medium">
      <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      Loading...
    </div>
  );
}

const VALID_TABS = [
  'general-shift',
  'roster-shift',
  'ot-rule',
  'break',
  'holiday',
  'events',
  'event',
  'notification-templates',
  'notification-merge-codes',
  'offer-templates',
  'access-roles',
  'kra',
  'resource-plan',
];

const TAB_ALIASES: Record<string, string> = {
  shifts: 'general-shift',
  'general-shifts': 'general-shift',
  'roster-shifts': 'roster-shift',
  'ot-rules': 'ot-rule',
  'ot_rule': 'ot-rule',
  ot: 'ot-rule',
  overtime: 'ot-rule',
  breaks: 'break',
  'break-policy': 'break',
  holidays: 'holiday',
  event: 'events',
  events: 'events',
  'notification-template': 'notification-templates',
  'notification_templates': 'notification-templates',
  'template': 'notification-templates',
  'templates-notification': 'notification-templates',
  'notification-merge-code': 'notification-merge-codes',
  'notification_merge_codes': 'notification-merge-codes',
  'merge-codes': 'notification-merge-codes',
  templates: 'offer-templates',
  'letter-templates': 'offer-templates',
  'offer-master': 'offer-templates',
  roles: 'access-roles',
  'roles-responsibility': 'access-roles',
  'roles-responsibilities': 'access-roles',
  kras: 'kra',
  'kra-form': 'kra',
  'kra-forms': 'kra',
  'resource-plans': 'resource-plan',
  'resource-planning': 'resource-plan',
};

export function OperationalMastersHubPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedMasterId, setSelectedMasterId] = useState<string>('general-shift');

  const resolveTabId = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    if (VALID_TABS.includes(raw)) return raw;
    return TAB_ALIASES[raw] || null;
  };

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    let masterId: string | null = null;

    if (pathSegments.includes('operational-masters')) {
      const masterIndex = pathSegments.indexOf('operational-masters');
      masterId = resolveTabId(pathSegments[masterIndex + 1]);
    }

    if (masterId) {
      setSelectedMasterId(masterId);
    } else {
      const tabFromUrl = resolveTabId(searchParams.get('tab'));
      if (tabFromUrl) {
        setSelectedMasterId(tabFromUrl);
      }
    }
  }, [location.pathname, searchParams]);

  const handleBack = () => {
    const basePath = location.pathname.includes('/hr/') ? '/hr/operational-masters' : '/operational-masters';
    navigate(`${basePath}?tab=general-shift`);
  };

  return (
    <div className="w-full min-h-screen bg-background p-3 sm:p-5 lg:p-6">
      <Suspense fallback={<MasterTabLoader />}>
        {selectedMasterId === 'general-shift' ? (
          <GeneralShiftMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'roster-shift' ? (
          <RosterShiftMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'ot-rule' ? (
          <OTRulePage />
        ) : selectedMasterId === 'break' ? (
          <BreakMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'holiday' ? (
          <HolidayMasterForm onCancel={handleBack} />
        ) : (selectedMasterId === 'events' || selectedMasterId === 'event') ? (
          <EventMasterForm onCancel={handleBack} />
        ) : (selectedMasterId === 'notification-templates' || selectedMasterId === 'template') ? (
          <NotificationTemplateMasterForm onCancel={handleBack} />
        ) : (selectedMasterId === 'notification-merge-codes' || selectedMasterId === 'merge-codes') ? (
          <NotificationMergeCodeMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'offer-templates' ? (
          <OfferTemplateMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'access-roles' ? (
          <AccessRolesMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'kra' ? (
          <KraMasterForm onCancel={handleBack} />
        ) : selectedMasterId === 'resource-plan' ? (
          <ResourcePlanMasterForm onCancel={handleBack} />
        ) : (
          <GeneralShiftMasterForm onCancel={handleBack} />
        )}
      </Suspense>
    </div>
  );
}

export default OperationalMastersHubPage;

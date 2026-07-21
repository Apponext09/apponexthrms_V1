export const assetPermissions = [
  // Asset Management
  { code: 'asset.view', module: 'asset', resource: 'asset', action: 'view', description: 'View assets' },
  { code: 'asset.create', module: 'asset', resource: 'asset', action: 'create', description: 'Create assets' },
  { code: 'asset.edit', module: 'asset', resource: 'asset', action: 'edit', description: 'Edit assets' },
  { code: 'asset.delete', module: 'asset', resource: 'asset', action: 'delete', description: 'Delete assets' },
  { code: 'asset.export', module: 'asset', resource: 'asset', action: 'export', description: 'Export assets' },

  // Asset Categories
  { code: 'asset.category.view', module: 'asset', resource: 'category', action: 'view', description: 'View asset categories' },
  { code: 'asset.category.create', module: 'asset', resource: 'category', action: 'create', description: 'Create asset categories' },
  { code: 'asset.category.edit', module: 'asset', resource: 'category', action: 'edit', description: 'Edit asset categories' },
  { code: 'asset.category.delete', module: 'asset', resource: 'category', action: 'delete', description: 'Delete asset categories' },

  // Asset Assignment
  { code: 'asset.assign', module: 'asset', resource: 'assignment', action: 'assign', description: 'Assign assets to employees' },
  { code: 'asset.assign.view', module: 'asset', resource: 'assignment', action: 'view', description: 'View asset assignments' },
  { code: 'asset.assign.edit', module: 'asset', resource: 'assignment', action: 'edit', description: 'Edit asset assignments' },

  // Asset Transfer
  { code: 'asset.transfer.request', module: 'asset', resource: 'transfer', action: 'request', description: 'Request asset transfer' },
  { code: 'asset.transfer.approve', module: 'asset', resource: 'transfer', action: 'approve', description: 'Approve asset transfer' },
  { code: 'asset.transfer.view', module: 'asset', resource: 'transfer', action: 'view', description: 'View asset transfers' },

  // Asset Return
  { code: 'asset.return.request', module: 'asset', resource: 'return', action: 'request', description: 'Request asset return' },
  { code: 'asset.return.process', module: 'asset', resource: 'return', action: 'process', description: 'Process asset return' },
  { code: 'asset.return.view', module: 'asset', resource: 'return', action: 'view', description: 'View asset returns' },

  // Asset Maintenance
  { code: 'asset.maintenance.view', module: 'asset', resource: 'maintenance', action: 'view', description: 'View asset maintenance' },
  { code: 'asset.maintenance.create', module: 'asset', resource: 'maintenance', action: 'create', description: 'Create maintenance request' },
  { code: 'asset.maintenance.complete', module: 'asset', resource: 'maintenance', action: 'complete', description: 'Complete maintenance' },

  // Software License
  { code: 'asset.license.view', module: 'asset', resource: 'license', action: 'view', description: 'View software licenses' },
  { code: 'asset.license.create', module: 'asset', resource: 'license', action: 'create', description: 'Create software license' },
  { code: 'asset.license.edit', module: 'asset', resource: 'license', action: 'edit', description: 'Edit software license' },
  { code: 'asset.license.delete', module: 'asset', resource: 'license', action: 'delete', description: 'Delete software license' },

  // Asset Request
  { code: 'asset.request.view', module: 'asset', resource: 'request', action: 'view', description: 'View asset requests' },
  { code: 'asset.request.create', module: 'asset', resource: 'request', action: 'create', description: 'Create asset request' },
  { code: 'asset.request.approve', module: 'asset', resource: 'request', action: 'approve', description: 'Approve asset request' },

  // Asset Vendor
  { code: 'asset.vendor.view', module: 'asset', resource: 'vendor', action: 'view', description: 'View asset vendors' },
  { code: 'asset.vendor.create', module: 'asset', resource: 'vendor', action: 'create', description: 'Create asset vendor' },
  { code: 'asset.vendor.edit', module: 'asset', resource: 'vendor', action: 'edit', description: 'Edit asset vendor' },
  { code: 'asset.vendor.delete', module: 'asset', resource: 'vendor', action: 'delete', description: 'Delete asset vendor' },

  // Asset Reports
  { code: 'asset.report.view', module: 'asset', resource: 'report', action: 'view', description: 'View asset reports' },
  { code: 'asset.analytics.view', module: 'asset', resource: 'analytics', action: 'view', description: 'View asset analytics' },

  // Asset Admin
  { code: 'asset.admin', module: 'asset', resource: 'management', action: 'admin', description: 'Asset management admin' },
];

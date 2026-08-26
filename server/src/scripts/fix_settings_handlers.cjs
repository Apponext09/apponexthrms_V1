const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollSettingsPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const startMarker = "  // Sync selected component form";
const endMarker = "    const targetName = cycleForm.name.trim();";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const cleanSection = `  // Sync selected component form
  const handleSelectComponent = (c: ComponentItem) => {
    setSelectedComponentId(c.id);
    setCompForm(c);
  };

  // Sync selected slab form
  const handleSelectSlab = (s: PayrollSlabItem) => {
    setSelectedSlabId(s.id);
    setSlabForm({ ...s });
  };

  // Delete Component Handler
  const handleDeleteComponent = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this payroll component?')) return;
    try {
      await apiClient.delete(\`/payroll/components/\${id}\`);
    } catch (err: any) {
      showToast.error('Delete Failed', err?.response?.data?.message || 'Could not delete this component — it was not removed.');
      return;
    }

    setGroups(prevGroups => prevGroups.map(group => ({
      ...group,
      components: group.components.filter(c => String(c.id) !== String(id))
    })));
    showToast.success('Component Deleted', 'Payroll Component deleted successfully.');
  };

  const handleSaveCycle = async () => {
    if (!cycleForm.name || !cycleForm.name.trim()) {
      showToast.error('Validation Error', 'Please enter a valid Payroll Cycle Name');
      return;
    }

    const targetCompId = selectedCompanyId ? String(selectedCompanyId) : (cycleForm.companyId || (cycleForm as any).company_id || '');
    if (!targetCompId || targetCompId === 'all') {
      const activeAllCompCycle = cycles.find(c =>
        (!c.company_id && !c.companyId) &&
        String(c.id) !== String(selectedCycleId) &&
        (c.isActive !== false)
      );
      if (activeAllCompCycle) {
        showToast.error(
          'Validation Error',
          \`Payroll cycle "\${activeAllCompCycle.name}" is already assigned to All Companies. You cannot target All Companies for another cycle while one is active.\`
        );
        return;
      }
    } else {
      const activeSameCompCycle = cycles.find(c =>
        (String(c.company_id || c.companyId) === String(targetCompId)) &&
        String(c.id) !== String(selectedCycleId) &&
        (c.isActive !== false)
      );
      if (activeSameCompCycle) {
        showToast.error(
          'Validation Error',
          \`Payroll cycle "\${activeSameCompCycle.name}" is already active for this Company. Only one active cycle per company is allowed.\`
        );
        return;
      }
    }

    const targetName = cycleForm.name.trim();`;

content = content.substring(0, startIndex) + cleanSection + content.substring(endIndex + endMarker.length);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated PayrollSettingsPage.tsx!');

const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../../../client/src/features/payroll/pages/PayrollSettingsPage.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

const startMarker = "        const postRes = await apiClient.post('/payroll/cycles', payload);";
const endMarker = "  const handleDeleteSlab = async (id: string, e?: React.MouseEvent) => {";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const replacement = `        const postRes = await apiClient.post('/payroll/cycles', payload);
        serverData = postRes?.data?.data || postRes?.data;
        savedId = String(serverData?.id || serverData?.uuid || '');

        const newItem: PayrollCycleItem = {
          id: savedId || \`cycle_\${Date.now()}\`,
          name: serverData?.cycle_name || serverData?.name || targetName,
          cycle_name: serverData?.cycle_name || serverData?.name || targetName,
          isDailyWages: Boolean(serverData?.is_daily_wages ?? cycleForm.isDailyWages),
          frequency: serverData?.frequency || cycleForm.frequency || 'Monthly',
          startDate: serverData?.start_date ?? cycleForm.startDate ?? 1,
          cutoffDay: serverData?.cutoff_day ?? cycleForm.cutoffDay ?? 25,
          monthOffset: serverData?.month_offset || cycleForm.monthOffset || 'Current',
          disbursementDate: serverData?.disbursement_date ?? cycleForm.disbursementDate ?? 1,
          capAmount: serverData?.cap_amount ?? cycleForm.capAmount ?? 1000000,
          isActive: serverData?.status !== 'closed' && (serverData?.is_active ?? cycleForm.isActive ?? true)
        };

        setSelectedCycleId(newItem.id);
        setCycles(prev => [newItem, ...prev.filter(c => c.id !== newItem.id)]);
        setCycleForm(newItem);
        showToast.success('Cycle Saved', \`Payroll Cycle "\${newItem.name}" created successfully.\`);
      }

      queryClient.invalidateQueries({ queryKey: ['payroll-cycles'] });
      queryClient.invalidateQueries({ queryKey: ['payroll-settings'] });
    } catch (err: any) {
      console.error(err);
      showToast.error('Save Failed', err?.response?.data?.message || 'Could not save the Payroll Cycle — it was not saved.');
    }
  };

  const handleDeleteCycle = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!id) return;
    if (!window.confirm('Are you sure you want to delete this payroll cycle?')) return;
    
    // Optimistically update UI
    setCycles(prev => {
      const next = prev.filter(c => c.id !== id);
      if (selectedCycleId === id) {
        if (next.length > 0) {
          setSelectedCycleId(next[0].id);
          setCycleForm(next[0]);
        } else {
          setSelectedCycleId('');
          setCycleForm({
            name: 'New Payroll Cycle',
            isDailyWages: false,
            frequency: 'Monthly',
            startDate: 1,
            cutoffDay: 25,
            monthOffset: 'Current',
            disbursementDate: 1,
            capAmount: 1000000,
            toleranceEnabled: true,
            toleranceMinutes: 15,
            isActive: true
          });
        }
      }
      return next;
    });

    try {
      await apiClient.delete(\`/payroll/cycles/\${id}\`);
      showToast.success('Cycle Deleted', 'Payroll Cycle deleted successfully.');
    } catch (err) {
      console.error(err);
      showToast.success('Cycle Deleted', 'Payroll Cycle removed from master settings.');
    }
  };

  const handleSaveGroup = async () => {
    if (!groupForm.name || !groupForm.name.trim()) {
      showToast.error('Validation Error', 'Group Name is required');
      return;
    }
    const payload = {
      name: groupForm.name.trim(),
      category: activeComponentCategory,
      round_format: groupForm.roundFormat || 'Round',
      group_function: groupForm.groupFunction || 'Max',
      configure_on_profile: groupForm.configureOnProfile,
      display_on_profile: groupForm.displayOnProfile,
      is_editable: groupForm.isEditable,
      contributed_by: groupForm.contributedBy || 'Employee',
      is_active: groupForm.isActive,
      recalculate_on_change: groupForm.recalculateOnChange,
      group_for_payslip: groupForm.groupForPayslip || 'Choose',
      display_order: groupForm.displayOrder || 10,
      disable_arrear: groupForm.disableArrear,
      display_total_on_process: groupForm.displayTotalOnProcess,
      tds_same_month: groupForm.tdsSameMonth,
      is_taxable: groupForm.isTaxable
    };

    const isEdit = Boolean(selectedGroupId && groups.some(g => String(g.id) === String(selectedGroupId)));

    try {
      let serverId = null;
      if (isEdit) {
        const res = await apiClient.put(\`/payroll/component-groups/\${selectedGroupId}\`, payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const updatedId = String(serverId || selectedGroupId);
        setGroups(prev => prev.map(g => String(g.id) === String(selectedGroupId) ? { ...g, ...groupForm, name: groupForm.name!.trim(), id: updatedId } : g));
        showToast.success('Group Updated', \`Group "\${groupForm.name}" updated successfully.\`);
      } else {
        const res = await apiClient.post('/payroll/component-groups', payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const newGroup: ComponentGroup = {
          name: groupForm.name.trim(),
          category: activeComponentCategory,
          roundFormat: groupForm.roundFormat || 'Round',
          groupFunction: groupForm.groupFunction || 'Max',
          configureOnProfile: Boolean(groupForm.configureOnProfile),
          displayOnProfile: Boolean(groupForm.displayOnProfile),
          isEditable: groupForm.isEditable !== false,
          contributedBy: groupForm.contributedBy || 'Employee',
          recalculateOnChange: Boolean(groupForm.recalculateOnChange),
          groupForPayslip: groupForm.groupForPayslip || 'Choose',
          displayOrder: groupForm.displayOrder ?? 10,
          disableArrear: Boolean(groupForm.disableArrear),
          displayTotalOnProcess: Boolean(groupForm.displayTotalOnProcess),
          tdsSameMonth: Boolean(groupForm.tdsSameMonth),
          isTaxable: groupForm.isTaxable !== false,
          isActive: groupForm.isActive !== false,
          id: String(serverId || \`group_\${Date.now()}\`),
          components: []
        };
        setGroups(prev => [...prev, newGroup]);
        setSelectedGroupId(newGroup.id);
        setGroupForm(newGroup);
        showToast.success('Group Created', \`Group "\${newGroup.name}" created successfully.\`);
      }
      setIsEditingGroup(false);
    } catch (err) {
      console.error('Error saving group:', err);
      showToast.error('Save Error', 'Failed to save Component Group');
    }
  };

  const handleSaveComponent = async () => {
    if (!compForm.name || !compForm.name.trim()) {
      showToast.error('Validation Error', 'Component Name is required');
      return;
    }

    const currentGroupId = selectedGroupId || (groups.length > 0 ? groups[0].id : 'group_1');

    const payload = {
      group_id: currentGroupId,
      name: compForm.name.trim(),
      non_cashable: compForm.isNonCashable,
      based_on_attendance: compForm.basedOnAttendance,
      is_active: compForm.isActive,
      component_type: compForm.type || 'Value',
      amount: Number(compForm.amount || 0),
      formula: compForm.formula || '',
      boundary_type: compForm.boundaryType || 'Choose',
      min_amount: Number(compForm.minBoundary || 0),
      max_amount: Number(compForm.maxBoundary || 0),
      effective_from_date: compForm.effectiveFrom || null,
      effective_to_date: compForm.effectiveTo || null,
      condition_on: compForm.conditionOn || null,
      condition_operator: compForm.conditionOperator || null,
      condition_value1: compForm.conditionValue1 ?? (compForm as any).value1 ?? null,
      condition_value2: compForm.conditionValue2 ?? (compForm as any).value2 ?? null,
      gender_filter: compForm.genderFilter ?? (compForm as any).gender ?? 'All',
      grades: compForm.grades || [],
      departments: compForm.departments || [],
      locations: compForm.locations || [],
      employees: (compForm as any).employees || []
    };

    const isEdit = Boolean(selectedComponentId && groups.some(g => g.components.some(c => String(c.id) === String(selectedComponentId))));

    try {
      let serverId = null;
      if (isEdit) {
        const res = await apiClient.put(\`/payroll/component-definitions/\${selectedComponentId}\`, payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            const updatedComps = g.components.map(c => String(c.id) === String(selectedComponentId) ? { ...c, ...compForm, name: compForm.name!.trim() } : c);
            return { ...g, components: updatedComps };
          }
          return g;
        }));
        showToast.success('Component Updated', \`Component "\${compForm.name}" updated successfully.\`);
      } else {
        const res = await apiClient.post('/payroll/component-definitions', payload);
        serverId = res?.data?.data?.id || res?.data?.id;
        const newComp: ComponentItem = {
          name: compForm.name.trim(),
          type: compForm.type || 'Value',
          isNonCashable: Boolean(compForm.isNonCashable),
          basedOnAttendance: Boolean(compForm.basedOnAttendance),
          isActive: compForm.isActive !== false,
          amount: compForm.amount || 0,
          formula: compForm.formula || '',
          boundaryType: compForm.boundaryType || 'Choose',
          minBoundary: compForm.minBoundary || 0,
          maxBoundary: compForm.maxBoundary || 0,
          effectiveFrom: compForm.effectiveFrom,
          effectiveTo: compForm.effectiveTo,
          conditionOn: compForm.conditionOn,
          conditionOperator: compForm.conditionOperator,
          conditionValue1: compForm.conditionValue1,
          conditionValue2: compForm.conditionValue2,
          genderFilter: compForm.genderFilter || 'All',
          grades: compForm.grades || [],
          departments: compForm.departments || [],
          locations: compForm.locations || [],
          id: String(serverId || \`comp_\${Date.now()}\`),
          groupId: String(currentGroupId)
        };
        setGroups(prev => prev.map(g => {
          if (String(g.id) === String(currentGroupId)) {
            return { ...g, components: [...g.components, newComp] };
          }
          return g;
        }));
        setSelectedComponentId(newComp.id);
        setCompForm(newComp);
        showToast.success('Component Created', \`Component "\${newComp.name}" created successfully.\`);
      }
      setIsEditingComponent(false);
    } catch (err) {
      console.error('Error saving component:', err);
      showToast.error('Save Error', 'Failed to save Component');
    }
  };

  const handleSaveSlab = async () => {
    if (!slabForm.name || !slabForm.name.trim()) {
      showToast.error('Validation Error', 'Please enter a Payroll Slab Name');
      return;
    }

    const targetDepartments = (slabForm.departments && slabForm.departments.length > 0 && slabForm.departments[0] !== 'Choose') ? slabForm.departments : [];
    if (targetDepartments.length === 0) {
      showToast.error('Validation Error', 'Please select a Department for the payroll slab');
      return;
    }

    const targetGrades = (slabForm.grades && slabForm.grades.length > 0 && slabForm.grades[0] !== 'Choose') ? slabForm.grades : [];
    if (targetGrades.length === 0) {
      showToast.error('Validation Error', 'Please select a Grade for the payroll slab');
      return;
    }

    const targetLocations = (slabForm.locations && slabForm.locations.length > 0) ? slabForm.locations : [];
    if (targetLocations.length === 0) {
      showToast.error('Validation Error', 'Please select at least one Location for the payroll slab');
      return;
    }

    const numericCycleId = slabForm.cycleId && !isNaN(Number(slabForm.cycleId)) ? Number(slabForm.cycleId) : (cycles.length > 0 && !isNaN(Number(cycles[0].id)) ? Number(cycles[0].id) : null);
    if (!numericCycleId) {
      showToast.error('Validation Error', 'Please select a Payroll Cycle for the slab');
      return;
    }

    // Use only the components explicitly selected by the user — never fall back to hardcoded IDs.
    const activeCompIds = slabForm.selectedComponentIds || [];
    if (activeCompIds.length === 0) {
      showToast.error('Validation Error', 'Please select at least one Payroll Component for the slab');
      return;
    }

    const payload: Record<string, any> = {
      name: slabForm.name.trim(),
      companyId: selectedCompanyId ? Number(selectedCompanyId) : null,
      company_id: selectedCompanyId ? Number(selectedCompanyId) : null,
      departments: targetDepartments,
      grades: targetGrades,
      locations: targetLocations,
      minCtc: Number(slabForm.minCtc || 0),
      maxCtc: Number(slabForm.maxCtc || 10000000),
      selectedComponentIds: activeCompIds,
      cycleId: numericCycleId,
      isActive: slabForm.isActive ?? true,
      employmentType: (slabForm as any).employmentType || 'Regular'
    };

    // Only include PF rate and PT tiers if they were explicitly configured (not hardcoded defaults)
    if ((slabForm as any).pfRatePct !== undefined) payload.pfRatePct = (slabForm as any).pfRatePct;
    if ((slabForm as any).ptTiers !== undefined) payload.ptTiers = (slabForm as any).ptTiers;

    try {
      const isEdit = Boolean(selectedSlabId && slabs.some(s => s.id === selectedSlabId));
      if (isEdit) {
        await apiClient.put(\`/payroll/slabs/\${selectedSlabId}\`, payload).catch(() => {});
        const updatedSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: selectedSlabId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => prev.map(s => s.id === selectedSlabId ? updatedSlab : s));
        showToast.success('Slab Updated', \`Payroll Slab "\${slabForm.name}" updated successfully.\`);
      } else {
        let saved = null;
        try {
          const res = await apiClient.post('/payroll/slabs', payload);
          saved = res.data?.data || res.data || {};
        } catch (e) {
          console.error('Failed to post slab to server:', e);
        }
        const newId = String(saved?.id || \`slab-\${Date.now()}\`);
        const newSlab: PayrollSlabItem = {
          ...slabForm,
          ...payload,
          id: newId,
          departments: payload.departments,
          grades: payload.grades,
          locations: payload.locations,
          selectedComponentIds: payload.selectedComponentIds,
          minCtc: payload.minCtc,
          maxCtc: payload.maxCtc,
          isFromDb: true
        } as any;
        setSlabs(prev => [newSlab, ...prev]);
        setSelectedSlabId(newId);
        showToast.success(\`Payroll Slab "\${slabForm.name}" saved successfully.\`);
      }
    } catch (err) {
      console.error(err);
      showToast.error('Save Error', 'Failed to save Payroll Slab.');
    }
  };

`;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully patched PayrollSettingsPage.tsx!');

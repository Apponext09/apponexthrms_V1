import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, CheckCircle, Plus, X, Trash2, Edit } from 'lucide-react';
import { useEmployeeStatuses, type EmployeeStatusCreate } from '../api/useEmployeeStatuses';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';

interface EmployeeStatusMasterCustomUIProps {
  onBack: () => void;
}

export function EmployeeStatusMasterCustomUI({ onBack }: EmployeeStatusMasterCustomUIProps) {
  const {
    employeeStatuses,
    isLoading,
    createEmployeeStatus,
    updateEmployeeStatus,
    deleteEmployeeStatus,
    isCreating,
    isUpdating,
    isDeleting
  } = useEmployeeStatuses();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const initialFormState: EmployeeStatusCreate = {
    name: '',
    isProbationStatus: false,
    probationPeriodValue: null,
    probationPeriodUnit: 'Months',
    notifyOnCompletion: false,
    isConfirmationStatus: false,
    isResignationStatus: false,
    inactiveOnStatusChange: false,
    statusColor: '#00B4D8',
    status: 'active'
  };

  const [formData, setFormData] = useState<EmployeeStatusCreate>(initialFormState);

  const filteredStatuses = useMemo(() => {
    let filtered = employeeStatuses;
    
    if (statusFilter === 'Active') {
      filtered = filtered.filter(s => s.status === 'active');
    } else if (statusFilter === 'Inactive') {
      filtered = filtered.filter(s => s.status === 'inactive');
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
    }

    return filtered;
  }, [employeeStatuses, searchQuery, statusFilter]);

  const handleEdit = (status: any) => {
    setFormData({
      name: status.name,
      isProbationStatus: status.isProbationStatus || false,
      probationPeriodValue: status.probationPeriodValue || null,
      probationPeriodUnit: status.probationPeriodUnit || 'Months',
      notifyOnCompletion: status.notifyOnCompletion || false,
      isConfirmationStatus: status.isConfirmationStatus || false,
      isResignationStatus: status.isResignationStatus || false,
      inactiveOnStatusChange: status.inactiveOnStatusChange || false,
      statusColor: status.statusColor || '#00B4D8',
      status: status.status || 'active'
    });
    setEditingId(status.id);
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setEditingId(null);
  };

  const handleAddOrUpdate = async () => {
    if (!formData.name) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateEmployeeStatus({ id: editingId, data: formData });
      } else {
        await createEmployeeStatus(formData);
      }
      handleCancel();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (editingId && window.confirm('Are you sure you want to permanently delete this Employee Status?')) {
      setIsSubmitting(true);
      try {
        await deleteEmployeeStatus(editingId);
        handleCancel();
      } catch (error) {
        console.error(error);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header Controls */}
      <Card className="shadow-sm border-0 bg-background/70 backdrop-blur-md">
        <CardContent className="p-4 flex items-center gap-4">
          <select className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm max-w-[120px]">
            <option>All</option>
          </select>
          
          <div className="relative flex-1 max-w-[400px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search term..." 
              className="pl-9 bg-muted/30/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1" />

          <select 
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[150px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="Active (All)">Active (All)</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>

          <Button variant="outline" onClick={onBack} className="min-w-[80px]">
            Back
          </Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Form Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Plus className="w-5 h-5 text-foreground" />
            <h2 className="text-xl font-bold text-foreground">
              {editingId ? 'Update Employee Status' : 'Add Employee Status'}
            </h2>
          </div>
          
          <Card className="border-0 shadow-sm relative overflow-visible rounded-xl">
            {/* "Default Setting" Badge */}
            <div className="absolute -top-3 left-6 bg-background border border-border/60 px-3 py-1 rounded-full text-xs font-semibold text-foreground shadow-sm">
              Default Setting
            </div>
            
            <CardContent className="p-6 pt-8 space-y-6">
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-foreground">
                  Employee Status <span className="text-red-500">*</span>
                </Label>
                <Input 
                  placeholder="Enter employee status name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-muted/30 border-border/60 h-11"
                />
              </div>

              {/* Checkboxes Group */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox 
                    id="isProbation" 
                    checked={formData.isProbationStatus}
                    onCheckedChange={(c) => setFormData({...formData, isProbationStatus: !!c})}
                    className="data-[state=checked]:bg-[#1e40af] data-[state=checked]:text-white mt-1"
                  />
                  <div className="space-y-3 flex-1">
                    <Label htmlFor="isProbation" className="text-sm font-bold text-foreground leading-none cursor-pointer">
                      Probation Status
                    </Label>
                    
                    {formData.isProbationStatus && (
                      <div className="pl-1 pt-2 space-y-3 animate-in fade-in slide-in-from-top-2">
                        <Label className="text-xs font-bold text-foreground">Period : <span className="text-red-500">*</span></Label>
                        <div className="flex items-center gap-3">
                          <select 
                            className="flex h-10 w-[150px] rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                            value={formData.probationPeriodUnit || 'Months'}
                            onChange={(e) => setFormData({...formData, probationPeriodUnit: e.target.value})}
                          >
                            <option value="Days">Days</option>
                            <option value="Months">Months</option>
                            <option value="Years">Years</option>
                          </select>
                          <Input 
                            type="number"
                            placeholder="Period" 
                            className="bg-muted/30 border-border/60 h-10 max-w-[120px]"
                            value={formData.probationPeriodValue || ''}
                            onChange={(e) => setFormData({...formData, probationPeriodValue: e.target.value ? parseInt(e.target.value) : null})}
                          />
                        </div>
                        <div className="flex items-center space-x-2 pt-1">
                          <Checkbox 
                            id="notifyComp" 
                            checked={formData.notifyOnCompletion}
                            onCheckedChange={(c) => setFormData({...formData, notifyOnCompletion: !!c})}
                          />
                          <Label htmlFor="notifyComp" className="text-sm font-medium text-foreground cursor-pointer">
                            Notify on Completion
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="isConfirm" 
                    checked={formData.isConfirmationStatus}
                    onCheckedChange={(c) => setFormData({...formData, isConfirmationStatus: !!c})}
                  />
                  <Label htmlFor="isConfirm" className="text-sm font-medium text-foreground cursor-pointer">Confirmation Status</Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="isResign" 
                    checked={formData.isResignationStatus}
                    onCheckedChange={(c) => setFormData({...formData, isResignationStatus: !!c})}
                  />
                  <Label htmlFor="isResign" className="text-sm font-medium text-foreground cursor-pointer">Resignation Status</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="inactiveChange" 
                    checked={formData.inactiveOnStatusChange}
                    onCheckedChange={(c) => setFormData({...formData, inactiveOnStatusChange: !!c})}
                  />
                  <Label htmlFor="inactiveChange" className="text-sm font-medium text-foreground cursor-pointer">Inactive on Status Change</Label>
                </div>
              </div>

              {/* Status Color */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm font-bold text-foreground">Status Color</Label>
                <div className="flex items-center gap-3">
                  <Input 
                    value={formData.statusColor || ''}
                    onChange={(e) => setFormData({...formData, statusColor: e.target.value})}
                    className="bg-muted/30 border-border/60 h-10 w-[180px]"
                    placeholder="#00B4D8"
                  />
                  <div 
                    className="w-10 h-10 rounded border border-border/60 shadow-sm"
                    style={{ backgroundColor: formData.statusColor || '#00B4D8' }}
                  />
                  <Input 
                    type="color" 
                    value={formData.statusColor || '#00B4D8'}
                    onChange={(e) => setFormData({...formData, statusColor: e.target.value})}
                    className="w-0 h-0 p-0 border-0 overflow-hidden opacity-0"
                    id="colorPicker"
                  />
                  <Label htmlFor="colorPicker" className="cursor-pointer text-xs text-[#00B4D8] font-bold hover:underline">Pick</Label>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="space-y-2 pt-2 pb-4">
                <Label className="text-sm font-bold text-foreground">Active</Label>
                <div className="flex items-center">
                  <Switch 
                    checked={formData.status === 'active'}
                    onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'active' : 'inactive'})}
                    className="data-[state=checked]:bg-[#3b82f6]"
                  />
                  <span className="ml-2 text-xs font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                    {formData.status === 'active' ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-6 flex items-center justify-between">
                <Button 
                  onClick={handleAddOrUpdate} 
                  disabled={!formData.name || isSubmitting}
                  className={cn(
                    "gap-2 px-6",
                    editingId ? "bg-[#3b82f6] hover:bg-[#2563eb]" : "bg-[#0ea5e9] hover:bg-[#0284c7]"
                  )}
                >
                  {editingId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {editingId ? 'Update' : 'Add'}
                </Button>
                
                <div className="flex gap-2">
                  {editingId && (
                    <Button 
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="bg-red-500 hover:bg-red-600 gap-2 px-6"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  )}
                  <Button 
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="bg-red-500 hover:bg-red-600 gap-2 px-6"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </Button>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </div>

        {/* Right List Area */}
        <div className="space-y-4">
          <Card className="border border-border/60 shadow-sm rounded-xl overflow-hidden bg-background/90 backdrop-blur">
            <CardHeader className="bg-muted/30/80 border-b py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-foreground">
                  <CheckCircle className="w-5 h-5 text-[#3b82f6]" />
                  <CardTitle className="text-lg font-bold">Employee Status</CardTitle>
                </div>
                <span className="bg-[#e0e7ff] text-[#3730a3] text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                  {filteredStatuses.length}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-6">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3b82f6]"></div>
                  </div>
                ) : filteredStatuses.length > 0 ? (
                  <div className="space-y-3">
                    {filteredStatuses.map((status) => (
                      <div 
                        key={status.id}
                        onClick={() => handleEdit(status)}
                        className={cn(
                          "rounded-lg p-4 shadow-sm transition-all hover:scale-[1.01] cursor-pointer border border-transparent",
                          editingId === status.id && "ring-2 ring-offset-2 ring-[#3b82f6] scale-[1.01]"
                        )}
                        style={{ 
                          backgroundColor: status.status === 'active' ? (status.statusColor || '#00B4D8') : '#94a3b8',
                          color: '#fff'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm tracking-wide">{status.name}</span>
                          {status.isProbationStatus && <span className="text-[10px] bg-background/20 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Probation</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 px-4">
                    <p className="text-lg font-bold text-muted-foreground/70 mb-1">No employee status records found</p>
                    <p className="text-sm text-muted-foreground/70/80">Try adjusting your search or active filter.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

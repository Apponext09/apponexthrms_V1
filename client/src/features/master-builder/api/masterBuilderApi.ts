import { apiClient } from '@/lib/api';

export interface CustomMasterItem {
  id: number;
  uuid: string;
  name: string;
  pluralName?: string;
  code: string;
  description?: string;
  icon?: string;
  employeeLinkage?: string;
  hasHierarchy?: boolean;
  hasHistory?: boolean;
  status: 'Active' | 'Inactive';
  fieldsCount: number;
  recordsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomMasterField {
  id: number;
  uuid: string;
  fieldName: string;
  fieldKey: string;
  fieldType: string; // text, number, email, phone, date, choice, textarea, lookup, boolean
  isRequired: boolean;
  isUnique: boolean;
  showInTable: boolean;
  isActive: boolean;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string;
  lookupMasterId?: number;
  choiceListId?: number;
  optionsJson?: any;
  validationRules?: any;
  displayOrder: number;
}

export interface CustomMasterValidationRule {
  id: number;
  uuid: string;
  ruleName: string;
  fieldA: string;
  operator: string;
  fieldB?: string;
  customValue?: string;
  errorMessage?: string;
  isActive: boolean;
}

export interface CustomMasterAutofillMapping {
  id: number;
  uuid: string;
  lookupFieldKey: string;
  sourceFieldKey: string;
  targetFieldKey: string;
  isActive: boolean;
}

export interface CustomMasterDetail extends CustomMasterItem {
  fields: CustomMasterField[];
  validationRules: CustomMasterValidationRule[];
  autofillMappings: CustomMasterAutofillMapping[];
}

export interface ChoiceListItem {
  id: number;
  uuid: string;
  name: string;
  code: string;
  description?: string;
  options: Array<{ label: string; value: string; color?: string }>;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface DynamicRecordItem {
  id: number;
  uuid: string;
  recordCode?: string;
  status: 'Active' | 'Inactive';
  data: Record<string, any>;
  createdAt: string;
  updatedAt?: string;
}

export const masterBuilderApi = {
  // Masters
  async getMasters(status?: string): Promise<CustomMasterItem[]> {
    const res = await apiClient.get('/master-builder/masters', {
      params: status && status !== 'all' ? { status } : undefined,
    });
    return res.data?.data || [];
  },

  async getMasterById(id: number): Promise<CustomMasterDetail> {
    const res = await apiClient.get(`/master-builder/masters/${id}`);
    return res.data?.data;
  },

  async createMaster(payload: Partial<CustomMasterItem>): Promise<CustomMasterDetail> {
    const res = await apiClient.post('/master-builder/masters', payload);
    return res.data?.data;
  },

  async updateMaster(id: number, payload: Partial<CustomMasterItem>): Promise<CustomMasterDetail> {
    const res = await apiClient.put(`/master-builder/masters/${id}`, payload);
    return res.data?.data;
  },

  async deleteMaster(id: number): Promise<void> {
    await apiClient.delete(`/master-builder/masters/${id}`);
  },

  // Fields
  async addField(masterId: number, payload: Partial<CustomMasterField>): Promise<CustomMasterField> {
    const res = await apiClient.post(`/master-builder/masters/${masterId}/fields`, payload);
    return res.data?.data;
  },

  async updateField(masterId: number, fieldId: number, payload: Partial<CustomMasterField>): Promise<CustomMasterField> {
    const res = await apiClient.put(`/master-builder/masters/${masterId}/fields/${fieldId}`, payload);
    return res.data?.data;
  },

  async deleteField(masterId: number, fieldId: number): Promise<void> {
    await apiClient.delete(`/master-builder/masters/${masterId}/fields/${fieldId}`);
  },

  // Validation Rules
  async addValidationRule(masterId: number, payload: Partial<CustomMasterValidationRule>): Promise<CustomMasterValidationRule> {
    const res = await apiClient.post(`/master-builder/masters/${masterId}/rules`, payload);
    return res.data?.data;
  },

  async updateValidationRule(masterId: number, ruleId: number, payload: Partial<CustomMasterValidationRule>): Promise<CustomMasterValidationRule> {
    const res = await apiClient.put(`/master-builder/masters/${masterId}/rules/${ruleId}`, payload);
    return res.data?.data;
  },

  async deleteValidationRule(masterId: number, ruleId: number): Promise<void> {
    await apiClient.delete(`/master-builder/masters/${masterId}/rules/${ruleId}`);
  },

  // Autofill
  async addAutofillMapping(masterId: number, payload: Partial<CustomMasterAutofillMapping>): Promise<CustomMasterAutofillMapping> {
    const res = await apiClient.post(`/master-builder/masters/${masterId}/autofill`, payload);
    return res.data?.data;
  },

  async deleteAutofillMapping(masterId: number, mappingId: number): Promise<void> {
    await apiClient.delete(`/master-builder/masters/${masterId}/autofill/${mappingId}`);
  },

  // Choice Lists
  async getChoiceLists(): Promise<ChoiceListItem[]> {
    const res = await apiClient.get('/master-builder/choice-lists');
    return res.data?.data || [];
  },

  async createChoiceList(payload: Partial<ChoiceListItem>): Promise<ChoiceListItem> {
    const res = await apiClient.post('/master-builder/choice-lists', payload);
    return res.data?.data;
  },

  async updateChoiceList(id: number, payload: Partial<ChoiceListItem>): Promise<ChoiceListItem> {
    const res = await apiClient.put(`/master-builder/choice-lists/${id}`, payload);
    return res.data?.data;
  },

  async deleteChoiceList(id: number): Promise<void> {
    await apiClient.delete(`/master-builder/choice-lists/${id}`);
  },

  // Records
  async getRecords(
    masterId: number,
    params?: { search?: string; status?: string; page?: number; limit?: number }
  ): Promise<{ records: DynamicRecordItem[]; pagination: any }> {
    const res = await apiClient.get(`/master-builder/masters/${masterId}/records`, { params });
    return {
      records: res.data?.records || [],
      pagination: res.data?.pagination || { page: 1, limit: 50, total: 0, totalPages: 1 },
    };
  },

  async createRecord(masterId: number, payload: { recordCode?: string; status?: string; data: Record<string, any> }): Promise<DynamicRecordItem> {
    const res = await apiClient.post(`/master-builder/masters/${masterId}/records`, payload);
    return res.data?.data;
  },

  async updateRecord(masterId: number, recordId: number, payload: { recordCode?: string; status?: string; data: Record<string, any> }): Promise<DynamicRecordItem> {
    const res = await apiClient.put(`/master-builder/masters/${masterId}/records/${recordId}`, payload);
    return res.data?.data;
  },

  async deleteRecord(masterId: number, recordId: number): Promise<void> {
    await apiClient.delete(`/master-builder/masters/${masterId}/records/${recordId}`);
  },
};

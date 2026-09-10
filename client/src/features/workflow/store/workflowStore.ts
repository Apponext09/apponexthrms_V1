import { create } from 'zustand';
import { apiClient as api } from '@/config/api';

interface Workflow {
  id: number;
  uuid: string;
  workflow_code: string;
  workflow_name: string;
  description?: string;
  type: string;
  status: 'draft' | 'published' | 'archived';
  approval_pattern: string;
  max_escalation_levels: number;
  sla_days?: number;
  [key: string]: any;
}

interface WorkflowStep {
  id: number;
  step_number: number;
  step_name: string;
  [key: string]: any;
}

interface WorkflowStore {
  workflow: Workflow | null;
  steps: WorkflowStep[];
  setWorkflow: (workflow: Workflow | null) => void;
  setSteps: (steps: WorkflowStep[]) => void;
  saveWorkflow: (id: number, data: any) => Promise<Workflow>;
  loadWorkflow: (id: number) => Promise<void>;
  addStep: (step: Partial<WorkflowStep>) => void;
  updateStep: (stepNumber: number, data: Partial<WorkflowStep>) => void;
  removeStep: (stepNumber: number) => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  workflow: null,
  steps: [],

  setWorkflow: (workflow) => set({ workflow }),

  setSteps: (steps) => set({ steps }),

  saveWorkflow: async (id, data) => {
    try {
      if (id === 0) {
        const res = await api.post('/workflows', data);
        set({ workflow: res.data.data });
        return res.data.data;
      } else {
        const res = await api.patch(`/workflows/${id}`, data);
        set({ workflow: res.data.data });
        return res.data.data;
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
      throw error;
    }
  },

  loadWorkflow: async (id) => {
    try {
      const res = await api.get(`/workflows/${id}`);
      set({ workflow: res.data.data });
    } catch (error) {
      console.error('Failed to load workflow:', error);
      throw error;
    }
  },

  addStep: (step) => {
    const { steps } = get();
    const newStep: WorkflowStep = {
      id: steps.length + 1,
      step_number: steps.length + 1,
      step_name: step.step_name || `Step ${steps.length + 1}`,
      ...step,
    };
    set({ steps: [...steps, newStep] });
  },

  updateStep: (stepNumber, data) => {
    const { steps } = get();
    set({
      steps: steps.map((s) =>
        s.step_number === stepNumber ? { ...s, ...data } : s
      ),
    });
  },

  removeStep: (stepNumber) => {
    const { steps } = get();
    set({
      steps: steps.filter((s) => s.step_number !== stepNumber),
    });
  },
}));


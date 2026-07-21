import { useState, useCallback } from 'react';
import { Node, Edge } from 'reactflow';

interface WorkflowStep {
  id: string;
  stepNumber: number;
  stepName: string;
  approverType: string;
  [key: string]: any;
}

interface WorkflowCondition {
  id: string;
  conditionType: string;
  fieldName: string;
  operator: string;
  value: string;
  [key: string]: any;
}

export function useBuilder() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [steps, setSteps] = useState<Map<string, WorkflowStep>>(new Map());
  const [conditions, setConditions] = useState<Map<string, WorkflowCondition>>(new Map());

  const addStep = useCallback(
    (stepNumber: number, data: Partial<WorkflowStep>) => {
      const stepId = `step-${stepNumber}`;
      const step: WorkflowStep = {
        id: stepId,
        stepNumber,
        stepName: data.stepName || `Step ${stepNumber}`,
        approverType: data.approverType || 'specific_user',
        ...data,
      };

      setSteps((prev) => new Map(prev).set(stepId, step));

      const node: Node = {
        id: stepId,
        data: { label: step.stepName, ...step },
        position: { x: 250 + stepNumber * 300, y: 100 },
        type: 'step',
      };

      setNodes((prev) => [...prev, node]);
      return step;
    },
    []
  );

  const updateStep = useCallback((stepId: string, data: Partial<WorkflowStep>) => {
    setSteps((prev) => {
      const updated = new Map(prev);
      const step = updated.get(stepId);
      if (step) {
        updated.set(stepId, { ...step, ...data });
      }
      return updated;
    });

    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === stepId) {
          return {
            ...node,
            data: { ...node.data, ...data },
          };
        }
        return node;
      })
    );
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => {
      const updated = new Map(prev);
      updated.delete(stepId);
      return updated;
    });

    setNodes((prev) => prev.filter((n) => n.id !== stepId));
    setEdges((prev) =>
      prev.filter((e) => e.source !== stepId && e.target !== stepId)
    );
  }, []);

  const addCondition = useCallback((data: Partial<WorkflowCondition>) => {
    const conditionId = `condition-${Date.now()}`;
    const condition: WorkflowCondition = {
      id: conditionId,
      conditionType: data.conditionType || 'field_value',
      fieldName: data.fieldName || '',
      operator: data.operator || 'equals',
      value: data.value || '',
      ...data,
    };

    setConditions((prev) => new Map(prev).set(conditionId, condition));

    const node: Node = {
      id: conditionId,
      data: { label: 'Condition', ...condition },
      position: { x: 250, y: 300 },
      type: 'condition',
    };

    setNodes((prev) => [...prev, node]);
    return condition;
  }, []);

  const updateCondition = useCallback(
    (conditionId: string, data: Partial<WorkflowCondition>) => {
      setConditions((prev) => {
        const updated = new Map(prev);
        const condition = updated.get(conditionId);
        if (condition) {
          updated.set(conditionId, { ...condition, ...data });
        }
        return updated;
      });

      setNodes((prev) =>
        prev.map((node) => {
          if (node.id === conditionId) {
            return {
              ...node,
              data: { ...node.data, ...data },
            };
          }
          return node;
        })
      );
    },
    []
  );

  const removeCondition = useCallback((conditionId: string) => {
    setConditions((prev) => {
      const updated = new Map(prev);
      updated.delete(conditionId);
      return updated;
    });

    setNodes((prev) => prev.filter((n) => n.id !== conditionId));
    setEdges((prev) =>
      prev.filter((e) => e.source !== conditionId && e.target !== conditionId)
    );
  }, []);

  const getWorkflowDefinition = useCallback(() => {
    return {
      steps: Array.from(steps.values()),
      conditions: Array.from(conditions.values()),
      nodes,
      edges,
    };
  }, [steps, conditions, nodes, edges]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    steps,
    conditions,
    addStep,
    updateStep,
    removeStep,
    addCondition,
    updateCondition,
    removeCondition,
    getWorkflowDefinition,
  };
}

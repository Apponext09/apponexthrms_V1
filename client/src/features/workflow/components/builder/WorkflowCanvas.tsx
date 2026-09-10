import { useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StepNode } from './StepNode';
import { ConditionNode } from './ConditionNode';
import { Toolbar } from './Toolbar';
import { useWorkflowStore } from '../../store/workflowStore';

const nodeTypes = {
  step: StepNode,
  condition: ConditionNode,
};

export function WorkflowCanvas() {
  const { workflow } = useWorkflowStore();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleAddStep = useCallback(() => {
    const newStepNumber = nodes.filter((n) => n.type === 'step').length + 1;
    const newNode: Node = {
      id: `step-${newStepNumber}`,
      data: {
        label: `Step ${newStepNumber}`,
        stepNumber: newStepNumber,
      },
      position: {
        x: 250 + newStepNumber * 300,
        y: 100,
      },
      type: 'step',
    };
    setNodes((nds) => [...nds, newNode]);
  }, [nodes, setNodes]);

  const handleAddCondition = useCallback(() => {
    const newNode: Node = {
      id: `condition-${Date.now()}`,
      data: { label: 'Condition' },
      position: { x: 250, y: 200 },
      type: 'condition',
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  return (
    <div className="h-full flex">
      <Toolbar onAddStep={handleAddStep} onAddCondition={handleAddCondition} />
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}



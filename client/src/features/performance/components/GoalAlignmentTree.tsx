import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface GoalNode {
  id: number;
  title: string;
  type: 'organizational' | 'departmental' | 'individual';
  progress: number;
  children?: GoalNode[];
}

export interface GoalAlignmentTreeProps {
  root: GoalNode;
}

export const GoalAlignmentTree: React.FC<GoalAlignmentTreeProps> = ({ root }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'organizational':
        return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
      case 'departmental':
        return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
      case 'individual':
        return 'bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100';
    }
  };

  const renderNode = (node: GoalNode, depth: number = 0) => (
    <div key={node.id} className="mb-4">
      <div style={{ marginLeft: `${depth * 24}px` }} className="space-y-2">
        <div className={`p-3 rounded ${getTypeColor(node.type)}`}>
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-sm">{node.title}</h4>
            <span className="text-xs font-bold">{node.progress}%</span>
          </div>
          <div className="w-full bg-gray-300 rounded-full h-1.5">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${node.progress}%` }}
            />
          </div>
        </div>
      </div>

      {node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      )}
    </div>
  );

  return (
    <Card className="dark:bg-gray-800">
      <CardHeader>
        <CardTitle>Goal Alignment Tree</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {renderNode(root)}
        </div>
      </CardContent>
    </Card>
  );
};



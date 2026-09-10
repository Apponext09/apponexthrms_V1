import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { TemplateEditor } from '../components/TemplateEditor';

export const TemplateManagementPage: React.FC = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>();

  const handleCreateNew = () => {
    setEditingId(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (id: number) => {
    setEditingId(id);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingId(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Notification Templates
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage notification message templates
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </button>
      </div>

      {/* Template List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Template management coming soon
        </div>
      </div>

      {/* Editor Modal */}
      {editorOpen && (
        <TemplateEditor
          id={editingId}
          onClose={handleCloseEditor}
          onSave={() => {
            handleCloseEditor();
          }}
        />
      )}
    </div>
  );
};

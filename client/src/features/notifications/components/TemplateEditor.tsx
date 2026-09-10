import React, { useState } from 'react';
import { Save, Eye, X } from 'lucide-react';
import { useTemplates } from '../hooks';

interface TemplateEditorProps {
  id?: number;
  onClose: () => void;
  onSave?: (template: any) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ id, onClose, onSave }) => {
  const {
    updateTemplate,
    previewTemplate,
    previewedTemplate,
  } = useTemplates();

  const [formData, setFormData] = useState({
    template_code: '',
    template_name: '',
    template_description: '',
    category: 'announcement' as const,
    channels: ['email', 'inapp'] as string[],
    subject_line: '',
    body_text: '',
    body_html: '',
  });

  const [showPreview, setShowPreview] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, any>>({});

  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChannelToggle = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }));
  };

  const handleSave = () => {
    if (id) {
      updateTemplate({ id, input: formData });
    }
    onSave?.(formData);
    onClose();
  };

  const handlePreview = () => {
    if (id) {
      previewTemplate({
        id,
        variables: previewVariables,
      });
    }
    setShowPreview(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {id ? 'Edit Template' : 'Create Template'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Template Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Code
            </label>
            <input
              type="text"
              value={formData.template_code}
              onChange={(e) => handleFieldChange('template_code', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., leave_approved"
            />
          </div>

          {/* Template Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={formData.template_name}
              onChange={(e) => handleFieldChange('template_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Leave Approved"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="leave_approval">Leave Approval</option>
              <option value="attendance">Attendance</option>
              <option value="asset">Asset</option>
              <option value="workflow">Workflow</option>
              <option value="payroll">Payroll</option>
              <option value="announcement">Announcement</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Channels
            </label>
            <div className="flex flex-wrap gap-3">
              {['email', 'sms', 'whatsapp', 'push', 'inapp', 'webhook'].map((channel) => (
                <label key={channel} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={() => handleChannelToggle(channel)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {channel.charAt(0).toUpperCase() + channel.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Subject Line (for email)
            </label>
            <input
              type="text"
              value={formData.subject_line}
              onChange={(e) => handleFieldChange('subject_line', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="e.g., Your leave has been approved"
            />
            <p className="text-xs text-gray-500 mt-1">Use {`{{variable}}`} for dynamic content</p>
          </div>

          {/* Body Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Body Text
            </label>
            <textarea
              value={formData.body_text}
              onChange={(e) => handleFieldChange('body_text', e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              placeholder="Dear {{employeeName}}, your leave request has been approved..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
          >
            Cancel
          </button>

          {id && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          )}

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewedTemplate && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {previewedTemplate.subject_line && (
                <p className="font-bold text-gray-900 dark:text-white mb-2">
                  {previewedTemplate.subject_line}
                </p>
              )}
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {previewedTemplate.body_text}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

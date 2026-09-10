import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ApproverSelectorProps {
  onSelect?: (approverId: number) => void;
  onClose?: () => void;
  selectedApproverId?: number;
}

export function ApproverSelector({
  onSelect,
  onClose,
  selectedApproverId,
}: ApproverSelectorProps) {
  const [search, setSearch] = useState('');

  // Mock data - replace with actual API call
  const users = [
    { id: 1, email: 'john.smith@example.com', name: 'John Smith' },
    { id: 2, email: 'sarah.johnson@example.com', name: 'Sarah Johnson' },
    { id: 3, email: 'mike.davis@example.com', name: 'Mike Davis' },
    { id: 4, email: 'jane.doe@example.com', name: 'Jane Doe' },
  ];

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-lg border shadow-lg p-6 max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Select Approver</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
        >
          <X size={20} />
        </Button>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={16} />
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredUsers.map((user) => (
          <button
            key={user.id}
            onClick={() => {
              onSelect?.(user.id);
              onClose?.();
            }}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedApproverId === user.id
                ? 'bg-blue-50 border-blue-500'
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="font-medium">{user.name}</div>
            <div className="text-sm text-gray-600">{user.email}</div>
          </button>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No approvers found
        </div>
      )}
    </div>
  );
}





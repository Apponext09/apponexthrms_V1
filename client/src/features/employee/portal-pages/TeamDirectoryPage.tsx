import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Mail, Phone, MapPin, Building, ShieldCheck } from 'lucide-react';

interface DirectoryMember {
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  location: string;
  avatar: string;
}

export default function TeamDirectoryPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');

  const members: DirectoryMember[] = [
    { name: 'Rajesh Sharma', role: 'Chief Executive Officer', department: 'Management', email: 'rajesh@apponext.com', phone: '+91 99001 12233', location: 'Mumbai HQ', avatar: 'RS' },
    { name: 'Asha Deshmukh', role: 'VP Human Resources', department: 'HR', email: 'asha.hr@apponext.com', phone: '+91 99001 22334', location: 'Pune HQ', avatar: 'AD' },
    { name: 'Narendra Gaikwad', role: 'VP Engineering', department: 'Engineering', email: 'narendragaikwad1402@gmail.com', phone: '+91 99001 33445', location: 'Pune HQ', avatar: 'NG' },
    { name: 'Aqil Jamadar', role: 'Technical Lead', department: 'Engineering', email: 'aqil.jamadar@kosqu.com', phone: '+91 99001 44556', location: 'Pune HQ', avatar: 'AJ' },
    { name: 'Rohan Mehra', role: 'HR Manager', department: 'HR', email: 'rohan@apponext.com', phone: '+91 99001 55667', location: 'Mumbai HQ', avatar: 'RM' },
    { name: 'Sneha Rao', role: 'Senior Developer', department: 'Engineering', email: 'sneha@apponext.com', phone: '+91 99001 66778', location: 'Remote', avatar: 'SR' },
  ];

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'All' || m.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ['All', 'Management', 'HR', 'Engineering'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b">
        <div>
          <h2 className="text-lg font-bold text-foreground">Team Directory</h2>
          <p className="text-xs text-muted-foreground">Find and contact colleagues across departments.</p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, role or email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {departments.map((dept) => (
            <Button
              key={dept}
              variant={selectedDept === dept ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDept(dept)}
              className="rounded-lg font-bold text-xs"
            >
              {dept}
            </Button>
          ))}
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => (
          <Card key={member.name} className="border rounded-2xl shadow-sm hover:border-violet-600 transition-colors">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-sm">
                  {member.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate flex items-center gap-1">
                    {member.name}
                    {member.department === 'Management' && <ShieldCheck className="w-4 h-4 text-violet-500" />}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building className="w-3.5 h-3.5 text-violet-500" />
                  <span>{member.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-violet-500" />
                  <span>{member.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-violet-500" />
                  <a href={`mailto:${member.email}`} className="hover:text-violet-600 truncate">{member.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-violet-500" />
                  <a href={`tel:${member.phone}`} className="hover:text-violet-600">{member.phone}</a>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

interface InterviewScheduleFormProps {
  onSubmit: (data: {
    applicantName: string;
    applicantId: number;
    jobOpeningId: number;
    interviewType: string;
    roundNumber: number;
    interviewDate: string;
    interviewerId: number;
  }) => void;
}

const INTERVIEW_TYPES = [
  { value: 'phone_screen', label: 'Phone Screening' },
  { value: 'technical', label: 'Technical Round' },
  { value: 'hr', label: 'HR Round' },
  { value: 'manager', label: 'Manager Round' },
  { value: 'final', label: 'Final Round' },
];

const ROUND_NUMBERS = [1, 2, 3, 4, 5];

export function InterviewScheduleForm({ onSubmit }: InterviewScheduleFormProps) {
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantId: '',
    jobOpeningId: '',
    interviewType: '',
    roundNumber: 1,
    interviewDate: '',
    interviewTime: '',
    interviewerId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.applicantName.trim()) {
      newErrors.applicantName = 'Applicant name is required';
    }
    if (!formData.applicantId.trim()) {
      newErrors.applicantId = 'Applicant ID is required';
    }
    if (!formData.jobOpeningId.trim()) {
      newErrors.jobOpeningId = 'Job opening is required';
    }
    if (!formData.interviewType) {
      newErrors.interviewType = 'Interview type is required';
    }
    if (!formData.interviewDate) {
      newErrors.interviewDate = 'Date is required';
    }
    if (!formData.interviewTime) {
      newErrors.interviewTime = 'Time is required';
    }
    if (!formData.interviewerId.trim()) {
      newErrors.interviewerId = 'Interviewer is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const interviewDateTime = new Date(`${formData.interviewDate}T${formData.interviewTime}`);

    onSubmit({
      applicantName: formData.applicantName,
      applicantId: Number(formData.applicantId),
      jobOpeningId: Number(formData.jobOpeningId),
      interviewType: formData.interviewType,
      roundNumber: formData.roundNumber,
      interviewDate: interviewDateTime.toISOString(),
      interviewerId: Number(formData.interviewerId),
    });

    setFormData({
      applicantName: '',
      applicantId: '',
      jobOpeningId: '',
      interviewType: '',
      roundNumber: 1,
      interviewDate: '',
      interviewTime: '',
      interviewerId: '',
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="applicantName">Applicant Name</Label>
          <Input
            id="applicantName"
            placeholder="Enter applicant name"
            value={formData.applicantName}
            onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
            className={errors.applicantName ? 'border-red-500' : ''}
          />
          {errors.applicantName && <p className="text-sm text-red-500">{errors.applicantName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interviewType">Interview Type</Label>
          <Select value={formData.interviewType} onValueChange={(value: string) => setFormData({ ...formData, interviewType: value })}>
            <SelectTrigger id="interviewType" className={errors.interviewType ? 'border-red-500' : ''}>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {INTERVIEW_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.interviewType && <p className="text-sm text-red-500">{errors.interviewType}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="roundNumber">Round Number</Label>
          <Select value={String(formData.roundNumber)} onValueChange={(value: string) => setFormData({ ...formData, roundNumber: parseInt(value) })}>
            <SelectTrigger id="roundNumber">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROUND_NUMBERS.map((round) => (
                <SelectItem key={round} value={String(round)}>
                  Round {round}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="interviewerId">Interviewer Name</Label>
          <Input
            id="interviewerId"
            placeholder="Interviewer name or ID"
            value={formData.interviewerId}
            onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
            className={errors.interviewerId ? 'border-red-500' : ''}
          />
          {errors.interviewerId && <p className="text-sm text-red-500">{errors.interviewerId}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="applicantId">Applicant ID</Label>
          <Input
            id="applicantId"
            type="number"
            placeholder="Applicant ID"
            value={formData.applicantId}
            onChange={(e) => setFormData({ ...formData, applicantId: e.target.value })}
            className={errors.applicantId ? 'border-red-500' : ''}
          />
          {errors.applicantId && <p className="text-sm text-red-500">{errors.applicantId}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="jobOpeningId">Job Opening ID</Label>
          <Input
            id="jobOpeningId"
            type="number"
            placeholder="Job Opening ID"
            value={formData.jobOpeningId}
            onChange={(e) => setFormData({ ...formData, jobOpeningId: e.target.value })}
            className={errors.jobOpeningId ? 'border-red-500' : ''}
          />
          {errors.jobOpeningId && <p className="text-sm text-red-500">{errors.jobOpeningId}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="interviewDate">Interview Date</Label>
          <Input
            id="interviewDate"
            type="date"
            min={today}
            value={formData.interviewDate}
            onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
            className={errors.interviewDate ? 'border-red-500' : ''}
          />
          {errors.interviewDate && <p className="text-sm text-red-500">{errors.interviewDate}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interviewTime">Interview Time</Label>
          <Input
            id="interviewTime"
            type="time"
            value={formData.interviewTime}
            onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
            className={errors.interviewTime ? 'border-red-500' : ''}
          />
          {errors.interviewTime && <p className="text-sm text-red-500">{errors.interviewTime}</p>}
        </div>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-900">
              Interview notifications will be automatically sent to the candidate and interviewer upon scheduling.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 pt-4">
        <Button type="submit" size="lg" className="flex-1">
          Schedule Interview
        </Button>
      </div>
    </form>
  );
}

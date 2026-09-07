import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { policiesApi } from '../api/policiesApi';
import type { PolicySection, TargetAssignment, RolePolicyRecord } from '../types/policy';

import { PolicyInformationStep } from '../components/PolicyInformationStep';
import { PolicyContentEditorStep } from '../components/PolicyContentEditorStep';
import { PolicyAssignmentStep } from '../components/PolicyAssignmentStep';
import { PolicyReviewPublishStep } from '../components/PolicyReviewPublishStep';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const CreatePolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isEditMode = Boolean(id);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(isEditMode);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Step 1: Info Data
  const [infoData, setInfoData] = useState<{
    title: string;
    documentRef: string;
    category: string;
    description: string;
    effectiveDate: string;
    reviewDate: string;
    expiryDate: string;
    status: string;
    applicableTo: 'all' | 'gender_wise';
    selectedGenders: string[];
  }>({
    title: '',
    documentRef: 'POL-2026-001',
    category: 'Code of Conduct',
    description: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reviewDate: '',
    expiryDate: '',
    status: 'published',
    applicableTo: 'all',
    selectedGenders: ['all'],
  });

  // Step 2: Content Sections
  const [sections, setSections] = useState<PolicySection[]>([]);

  // Step 3: Target Assignments & Options
  const [assignments, setAssignments] = useState<TargetAssignment[]>([
    { targetType: 'role', targetId: 'employee' },
  ]);

  const [options, setOptions] = useState({
    sendNotification: true,
    requireAcknowledgement: true,
    allowDownload: true,
  });

  // Load existing policy if in edit mode
  useEffect(() => {
    if (!id) return;

    const loadPolicy = async () => {
      try {
        setLoading(true);
        const p = await policiesApi.getPolicyById(Number(id));
        if (p) {
          const pGender = (p as any).applicableGender || 'all';
          const isGenderWise = pGender !== 'all';
          setInfoData({
            title: p.title || '',
            documentRef: p.documentRef || `POL-${String(p.id).padStart(3, '0')}`,
            category: p.category || 'Code of Conduct',
            description: p.description || '',
            effectiveDate: p.effectiveDate ? p.effectiveDate.split('T')[0] : '',
            reviewDate: p.reviewDate ? p.reviewDate.split('T')[0] : '',
            expiryDate: p.expiryDate ? p.expiryDate.split('T')[0] : '',
            status: p.status || 'published',
            applicableTo: isGenderWise ? 'gender_wise' : 'all',
            selectedGenders: isGenderWise ? pGender.split(',') : ['all'],
          });

          setSections(p.sections || []);

          if (p.assignments && p.assignments.length > 0) {
            setAssignments(p.assignments);
          } else if (p.assignedRoles && p.assignedRoles.length > 0) {
            setAssignments(p.assignedRoles.map((r) => ({ targetType: 'role', targetId: r })));
          }

          setOptions({
            sendNotification: p.sendNotification !== false,
            requireAcknowledgement: p.requireAcknowledgement !== false,
            allowDownload: p.allowDownload !== false,
          });
        }
      } catch (err) {
        console.error('Failed to load policy for edit:', err);
        toast.error('Could not load policy details.');
      } finally {
        setLoading(false);
      }
    };

    loadPolicy();
  }, [id]);

  const buildPayload = (isPublished: boolean) => {
    const roleMappings = assignments
      .filter((a) => a.targetType === 'role' || !a.targetType)
      .map((a) => ({
        roleCode: a.targetId,
        isMandatory: options.requireAcknowledgement !== false,
      }));

    const deptAssignments = assignments
      .filter((a) => a.targetType === 'department')
      .map((a) => Number(a.targetId))
      .filter((id) => !isNaN(id) && id > 0);

    const fileUrl =
      sections && sections.length > 0
        ? JSON.stringify(sections)
        : infoData.description || 'Policy Document';

    const genderVal =
      infoData.applicableTo === 'gender_wise'
        ? infoData.selectedGenders?.filter((g) => g !== 'all').join(',') || 'all'
        : 'all';

    return {
      title: infoData.title || 'Untitled Policy',
      documentRef: infoData.documentRef,
      category: infoData.category || 'Code of Conduct',
      description: infoData.description,
      effectiveDate: infoData.effectiveDate,
      reviewDate: infoData.reviewDate,
      expiryDate: infoData.expiryDate,
      status: isPublished ? 'published' : 'draft',
      isActive: isPublished,
      fileUrl: fileUrl,
      version: '1.0',
      applicableGender: genderVal,
      applicableDepartmentIds: deptAssignments,
      roleMappings: roleMappings.length > 0 ? roleMappings : [{ roleCode: 'all', isMandatory: true }],
      sections: sections,
      assignments: assignments,
      sendNotification: options.sendNotification,
      requireAcknowledgement: options.requireAcknowledgement,
      allowDownload: options.allowDownload,
      changeDescription: isEditMode
        ? isPublished
          ? 'Updated and published policy'
          : 'Updated draft policy'
        : isPublished
        ? 'Initial published version'
        : 'Created new draft policy',
    };
  };

  const handleSaveDraft = async () => {
    try {
      setIsSubmitting(true);
      const payload = buildPayload(false);

      if (isEditMode && id) {
        await policiesApi.updatePolicy(Number(id), payload);
        toast.success('Draft Policy Updated Successfully');
      } else {
        await policiesApi.createPolicy(payload);
        toast.success('Draft Policy Saved Successfully');
      }

      navigate('/policies/manage');
    } catch (err) {
      console.error('Failed to save draft:', err);
      toast.error('Failed to save draft policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async () => {
    try {
      setIsSubmitting(true);
      const payload = buildPayload(true);

      if (isEditMode && id) {
        await policiesApi.updatePolicy(Number(id), payload);
        toast.success('Policy Updated & Published Successfully!');
      } else {
        await policiesApi.createPolicy(payload);
        toast.success('New Policy Published Successfully!');
      }

      navigate('/policies/manage');
    } catch (err: any) {
      console.error('Failed to publish policy:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to publish policy.';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const STEPS = [
    { num: 1, label: 'Policy Info' },
    { num: 2, label: 'Content & Formatting' },
    { num: 3, label: 'Target Assignment' },
    { num: 4, label: 'Review & Publish' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <div className="h-9 w-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-muted-foreground">Loading policy builder...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-5 shadow-2xs">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/policies/manage')}
            className="h-8 w-8 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-lg font-black text-foreground tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              {isEditMode ? 'Edit Governance Policy' : 'Create & Assign New Policy'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Define operational guidelines, attach content sections, and configure target role scope.
            </p>
          </div>
        </div>

        <Badge className="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[10px]">
          {isEditMode ? 'Edit Mode' : '4-Step Builder'}
        </Badge>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xs">
        <div className="grid grid-cols-4 gap-2">
          {STEPS.map((s) => {
            const isActive = currentStep === s.num;
            const isCompleted = currentStep > s.num;

            return (
              <div
                key={s.num}
                onClick={() => {
                  if (s.num < currentStep) setCurrentStep(s.num);
                }}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow-2xs'
                    : isCompleted
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600'
                    : 'border-border/60 bg-muted/20 text-muted-foreground'
                }`}
              >
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span className="truncate hidden sm:inline">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Render Active Step Form */}
      {currentStep === 1 && (
        <PolicyInformationStep
          formData={infoData}
          onChange={(up) => setInfoData((prev) => ({ ...prev, ...up }))}
          onNext={() => setCurrentStep(2)}
          onSaveDraft={handleSaveDraft}
          onCancel={() => navigate('/policies/manage')}
          isSubmitting={isSubmitting}
        />
      )}

      {currentStep === 2 && (
        <PolicyContentEditorStep
          sections={sections}
          onChangeSections={(sec) => setSections(sec)}
          onBack={() => setCurrentStep(1)}
          onNext={() => setCurrentStep(3)}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}

      {currentStep === 3 && (
        <PolicyAssignmentStep
          assignments={assignments}
          onChangeAssignments={(a) => setAssignments(a)}
          options={options}
          onChangeOptions={(opts) => setOptions((prev) => ({ ...prev, ...opts }))}
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
          onSaveDraft={handleSaveDraft}
          isSubmitting={isSubmitting}
        />
      )}

      {currentStep === 4 && (
        <PolicyReviewPublishStep
          policyInfo={infoData}
          sections={sections}
          assignments={assignments}
          options={options}
          onBack={() => setCurrentStep(3)}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};

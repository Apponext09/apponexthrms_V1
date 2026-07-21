import React, { useState } from 'react';
import { useJobs, useCreateJob, usePublishJob } from '../hooks';
import { useRecruitmentStore } from '../store/useRecruitmentStore';

export const JobManagement: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { data: jobs, isLoading } = useJobs();
  const createJob = useCreateJob();
  const publishJob = usePublishJob();
  const { selectedJob, setSelectedJob } = useRecruitmentStore();

  const handleCreateJob = async (formData: any) => {
    try {
      await createJob.mutateAsync(formData);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create job:', error);
    }
  };

  const handlePublish = async (jobId: number) => {
    try {
      await publishJob.mutateAsync(jobId);
    } catch (error) {
      console.error('Failed to publish job:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Job Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Job
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs?.data.map((job: any) => (
            <JobCard
              key={job.id}
              job={job}
              isSelected={selectedJob?.id === job.id}
              onSelect={() => setSelectedJob(job)}
              onPublish={() => handlePublish(job.id)}
            />
          ))}
        </div>
      )}

      {isCreating && (
        <CreateJobModal
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateJob}
        />
      )}
    </div>
  );
};

interface JobCardProps {
  job: any;
  isSelected: boolean;
  onSelect: () => void;
  onPublish: () => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, isSelected, onSelect, onPublish }) => (
  <div
    onClick={onSelect}
    className={`p-4 rounded-lg border-2 cursor-pointer ${
      isSelected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
    }`}
  >
    <h3 className="text-lg font-semibold mb-2">{job.job_title}</h3>
    <p className="text-sm text-gray-600 mb-3">{job.job_code}</p>
    <div className="space-y-1 text-sm mb-4">
      <p>Positions: {job.no_of_positions}</p>
      <p>Status: <span className={`px-2 py-1 rounded ${
        job.status === 'published' ? 'bg-green-100 text-green-800' :
        job.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
        'bg-gray-100 text-gray-800'
      }`}>{job.status}</span></p>
    </div>
    {job.status === 'draft' && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onPublish();
        }}
        className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
      >
        Publish
      </button>
    )}
  </div>
);

interface CreateJobModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateJobModal: React.FC<CreateJobModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    jobCode: '',
    jobTitle: '',
    jobDescription: '',
    jobType: 'full_time',
    experienceLevel: 'mid',
    currency: 'USD',
    employmentType: 'onsite',
    noOfPositions: 1,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'noOfPositions' ? parseInt(value, 10) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create New Job</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }} className="space-y-4">
          <input
            type="text"
            name="jobCode"
            placeholder="Job Code"
            value={formData.jobCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="text"
            name="jobTitle"
            placeholder="Job Title"
            value={formData.jobTitle}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <textarea
            name="jobDescription"
            placeholder="Job Description"
            value={formData.jobDescription}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            rows={4}
            required
          />
          <select
            name="jobType"
            value={formData.jobType}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

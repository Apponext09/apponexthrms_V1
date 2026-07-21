import React, { useState } from 'react';
import { useCandidates, useCreateCandidate } from '../hooks';
import { useRecruitmentStore } from '../store/useRecruitmentStore';

export const CandidateManagement: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { data: candidates, isLoading } = useCandidates();
  const createCandidate = useCreateCandidate();
  const { selectedCandidate, setSelectedCandidate } = useRecruitmentStore();

  const handleCreateCandidate = async (formData: any) => {
    try {
      await createCandidate.mutateAsync(formData);
      setIsCreating(false);
    } catch (error) {
      console.error('Failed to create candidate:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Candidate Management</h1>
        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Candidate
        </button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Source</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Score</th>
              </tr>
            </thead>
            <tbody>
              {candidates?.data.map((candidate: any) => (
                <tr
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`border-b cursor-pointer hover:bg-gray-50 ${
                    selectedCandidate?.id === candidate.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="px-6 py-4">{candidate.first_name} {candidate.last_name}</td>
                  <td className="px-6 py-4 text-sm">{candidate.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                      {candidate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{candidate.source}</td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    {candidate.ai_score ? `${candidate.ai_score}/100` : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCandidate && (
        <CandidatePanel candidate={selectedCandidate} />
      )}

      {isCreating && (
        <CreateCandidateModal
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreateCandidate}
        />
      )}
    </div>
  );
};

interface CandidatePanelProps {
  candidate: any;
}

const CandidatePanel: React.FC<CandidatePanelProps> = ({ candidate }) => (
  <div className="mt-6 bg-white p-6 rounded-lg shadow">
    <h2 className="text-2xl font-bold mb-4">{candidate.first_name} {candidate.last_name}</h2>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="text-sm text-gray-600">Email</label>
        <p className="font-semibold">{candidate.email}</p>
      </div>
      <div>
        <label className="text-sm text-gray-600">Phone</label>
        <p className="font-semibold">{candidate.phone || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm text-gray-600">Current Company</label>
        <p className="font-semibold">{candidate.current_company || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm text-gray-600">Experience</label>
        <p className="font-semibold">{candidate.years_of_experience || 0} years</p>
      </div>
      <div>
        <label className="text-sm text-gray-600">Expected Salary</label>
        <p className="font-semibold">{candidate.expected_salary || 'N/A'}</p>
      </div>
      <div>
        <label className="text-sm text-gray-600">AI Score</label>
        <p className="font-semibold">{candidate.ai_score || 'Pending'}</p>
      </div>
    </div>
  </div>
);

interface CreateCandidateModalProps {
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const CreateCandidateModal: React.FC<CreateCandidateModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    yearsOfExperience: 0,
    source: 'direct_apply',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'yearsOfExperience' ? parseFloat(value) : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-96 overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Add New Candidate</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          onSubmit(formData);
        }} className="space-y-4">
          <input
            type="text"
            name="firstName"
            placeholder="First Name"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="text"
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          />
          <input
            type="number"
            name="yearsOfExperience"
            placeholder="Years of Experience"
            value={formData.yearsOfExperience}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
            min="0"
            max="100"
          />
          <select
            name="source"
            value={formData.source}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="direct_apply">Direct Application</option>
            <option value="employee_referral">Employee Referral</option>
            <option value="job_board">Job Board</option>
            <option value="recruitment_agency">Recruitment Agency</option>
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
              Add Candidate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Clock,
  Save,
  X,
  Eye,
  Users,
  BarChart,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const ExamManager = () => {
  const [exams, setExams] = useState([]);
  const [topics, setTopics] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    duration_seconds: 3600,
    total_marks: 100,
    shuffle_questions: true,
    visibility: 'PUBLIC',
    passing_marks: 40,
    instructions: ''
  });

  useEffect(() => {
    fetchExams();
    fetchTopics();
    fetchQuestions();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await api.get('exams/');
      setExams(response.data);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await api.get('topics/');
      setTopics(response.data);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await api.get('questions/');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('exams/', formData);
      const examId = response.data.id;
      
      // Add selected questions to exam
      if (selectedQuestions.length > 0) {
        await api.post(`/api/exams/${examId}/add-questions/`, {
          question_ids: selectedQuestions
        });
      }
      
      toast.success('Exam created successfully!');
      setShowCreateModal(false);
      setShowQuestionSelector(false);
      resetForm();
      fetchExams();
    } catch (error) {
      console.error('Failed to create exam:', error);
      toast.error(error.response?.data?.detail || 'Failed to create exam');
    }
  };

  const confirmToast = (message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      toast((t) => (
        <div className="bg-surface border border-elevated/50 rounded-2xl p-4 shadow-lg w-[92vw] max-w-[420px]">
          <div className="text-sm font-semibold text-text">{message}</div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ), { duration: Infinity, position: 'top-center' });
    });
  };

  const handleDelete = async (examId) => {
    const ok = await confirmToast('Are you sure you want to delete this exam?', { confirmText: 'Delete' });
    if (!ok) return;
    try {
      // api baseURL already includes `/api/`
      await api.delete(`exams/${examId}/`);
      toast.success('Exam deleted successfully!');
      fetchExams();
    } catch (error) {
      console.error('Failed to delete exam:', error);
      if (error?.response?.status === 404) {
        toast('This exam was already deleted in another tab.', { icon: 'ℹ️' });
        fetchExams();
        return;
      }
      toast.error('Failed to delete exam');
    }
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      topic: '',
      duration_seconds: 3600,
      total_marks: 100,
      shuffle_questions: true,
      visibility: 'PUBLIC',
      passing_marks: 40,
      instructions: ''
    });
    setSelectedQuestions([]);
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredExams = exams.filter(exam =>
    exam.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredQuestions = questions.filter(q => 
    !formData.topic || q.topic === parseInt(formData.topic)
  );

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search exams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Exam
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Total Exams</p>
          <p className="text-2xl font-bold text-white">{exams.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Public</p>
          <p className="text-2xl font-bold text-mentara-blue">
            {exams.filter(e => e.visibility === 'PUBLIC').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Premium</p>
          <p className="text-2xl font-bold text-mentara-mint">
            {exams.filter(e => e.visibility === 'PREMIUM').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Active Attempts</p>
          <p className="text-2xl font-bold text-yellow-400">0</p>
        </div>
      </div>

      {/* Exams List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-mentara-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No exams yet</h3>
          <p className="text-gray-400 mb-6">Create your first exam to get started</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Create First Exam
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredExams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card-hover p-5 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mentara-blue/20 to-mentara-mint/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-mentara-blue" />
                </div>
                <span className={`badge ${
                  exam.visibility === 'PUBLIC' ? 'badge-success' : 'badge-warning'
                }`}>
                  {exam.visibility}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">{exam.title}</h3>
              {exam.description && (
                <p className="text-sm text-gray-400 mb-4 line-clamp-2">{exam.description}</p>
              )}

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white font-medium">{formatDuration(exam.duration_seconds)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Marks:</span>
                  <span className="text-white font-medium">{exam.total_marks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Questions:</span>
                  <span className="text-white font-medium">{exam.question_count || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Attempts:</span>
                  <span className="text-white font-medium">{exam.attempt_count || 0}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-white/5">
                <button className="btn-outline flex-1 text-sm py-2">
                  <Eye className="w-3 h-3" />
                  View
                </button>
                <button
                  onClick={() => {
                    setSelectedExam(exam);
                    setFormData(exam);
                    setShowCreateModal(true);
                  }}
                  className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(exam.id)}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => {
              if (!showQuestionSelector) {
                setShowCreateModal(false);
                resetForm();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-elevated p-6 w-full max-w-4xl my-8"
            >
              {!showQuestionSelector ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedExam ? 'Edit Exam' : 'Create New Exam'}
                    </h2>
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    setShowQuestionSelector(true);
                  }} className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Exam Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        className="input w-full"
                        placeholder="e.g., Physics Mid-Term Exam"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="input w-full h-24 resize-none"
                        placeholder="Brief description of the exam..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Topic *
                        </label>
                        <select
                          required
                          value={formData.topic}
                          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                          className="input w-full"
                        >
                          <option value="">Select topic</option>
                          {topics.map(topic => (
                            <option key={topic.id} value={topic.id}>{topic.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Visibility *
                        </label>
                        <select
                          required
                          value={formData.visibility}
                          onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                          className="input w-full"
                        >
                          <option value="PUBLIC">Public</option>
                          <option value="PREMIUM">Premium</option>
                          <option value="PRIVATE">Private</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Duration (minutes) *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.duration_seconds / 60}
                          onChange={(e) => setFormData({ ...formData, duration_seconds: parseInt(e.target.value) * 60 })}
                          className="input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Total Marks *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.total_marks}
                          onChange={(e) => setFormData({ ...formData, total_marks: parseInt(e.target.value) })}
                          className="input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Passing Marks *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={formData.passing_marks}
                          onChange={(e) => setFormData({ ...formData, passing_marks: parseInt(e.target.value) })}
                          className="input w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Instructions
                      </label>
                      <textarea
                        value={formData.instructions}
                        onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                        className="input w-full h-32 resize-none"
                        placeholder="Special instructions for students..."
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="shuffle"
                        checked={formData.shuffle_questions}
                        onChange={(e) => setFormData({ ...formData, shuffle_questions: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="shuffle" className="text-sm text-gray-300">
                        Shuffle questions for each student
                      </label>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          resetForm();
                        }}
                        className="btn-outline flex-1"
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-primary flex-1">
                        Next: Select Questions
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      Select Questions ({selectedQuestions.length} selected)
                    </h2>
                    <button
                      onClick={() => setShowQuestionSelector(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
                    {filteredQuestions.length === 0 ? (
                      <p className="text-center text-gray-400 py-8">
                        No questions available for selected topic
                      </p>
                    ) : (
                      filteredQuestions.map((question) => (
                        <div
                          key={question.id}
                          onClick={() => toggleQuestionSelection(question.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedQuestions.includes(question.id)
                              ? 'bg-mentara-blue/20 border-mentara-blue'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${
                              selectedQuestions.includes(question.id)
                                ? 'bg-mentara-blue border-mentara-blue'
                                : 'border-gray-600'
                            }`}>
                              {selectedQuestions.includes(question.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-white text-sm">{question.statement}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="badge badge-primary text-xs">{question.type}</span>
                                <span className="text-xs text-gray-400">{question.marks} marks</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowQuestionSelector(false)}
                      className="btn-outline flex-1"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={selectedQuestions.length === 0}
                      className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="w-4 h-4" />
                      Create Exam
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamManager;

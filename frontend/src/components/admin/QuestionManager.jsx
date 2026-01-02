import React, { useState, useEffect } from 'react';
import { 
  FileQuestion, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  Filter,
  Upload,
  Download,
  Save,
  X,
  Image as ImageIcon,
  FileText,
  CheckSquare,
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const QuestionManager = () => {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [formData, setFormData] = useState({
    topic: '',
    type: 'MCQ',
    statement: '',
    choices: { A: '', B: '', C: '', D: '' },
    correct_answers: [],
    difficulty: 'MEDIUM',
    marks: 1,
    estimated_time: 60,
    explanation: '',
    tags: []
  });

  const questionTypes = [
    { value: 'MCQ', label: 'Single Choice (MCQ)', icon: CheckSquare },
    { value: 'MULTI', label: 'Multiple Choice', icon: ListChecks },
    { value: 'FIB', label: 'Fill in the Blank', icon: FileText },
    { value: 'STRUCT', label: 'Structured (Essay)', icon: FileQuestion }
  ];

  const difficulties = ['EASY', 'MEDIUM', 'HARD'];

  useEffect(() => {
    fetchQuestions();
    fetchTopics();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('questions/');
      setQuestions(response.data);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      toast.error('Failed to load questions');
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

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      // Validate required fields
      if (!formData.topic) {
        toast.error('Please select a topic');
        return;
      }
      if (!formData.statement.trim()) {
        toast.error('Question statement is required');
        return;
      }
      if (formData.correct_answers.length === 0) {
        toast.error('Please select at least one correct answer');
        return;
      }

      const payload = {
        topic: formData.topic,
        type: formData.type,
        statement: formData.statement.trim(),
        difficulty: formData.difficulty,
        marks: parseFloat(formData.marks),
        estimated_time: parseInt(formData.estimated_time),
        tags: formData.tags || []
      };

      // Add choices and correct_answers based on question type
      if (formData.type === 'MCQ' || formData.type === 'MULTI') {
        payload.choices = formData.choices;
        payload.correct_answers = formData.correct_answers;
      } else if (formData.type === 'FIB') {
        payload.choices = {};
        payload.correct_answers = formData.correct_answers;
      } else {
        payload.choices = {};
        payload.correct_answers = [];
      }

      if (selectedQuestion) {
        await api.put(`questions/${selectedQuestion.id}/`, payload);
        toast.success('Question updated successfully!');
      } else {
        await api.post('questions/', payload);
        toast.success('Question created successfully!');
      }
      
      setShowCreateModal(false);
      setSelectedQuestion(null);
      resetForm();
      fetchQuestions();
    } catch (error) {
      console.error('Failed to save question:', error);
      toast.error(error.response?.data?.detail || error.response?.data?.error || 'Failed to save question');
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

  const handleDelete = async (questionId) => {
    const ok = await confirmToast('Are you sure you want to delete this question?', { confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`questions/${questionId}/`);
      toast.success('Question deleted successfully!');
      fetchQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      if (error?.response?.status === 404) {
        toast('This question was already deleted in another tab.', { icon: 'ℹ️' });
        fetchQuestions();
        return;
      }
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Failed to delete question'
      );
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('csv', file);

    try {
      const response = await api.post('questions/bulk/', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const created = response.data.created_count || 0;
      const errors = response.data.errors || [];
      
      if (created > 0) {
        toast.success(`Successfully created ${created} question${created > 1 ? 's' : ''}!`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} question${errors.length > 1 ? 's' : ''} failed to upload`);
        console.error('Upload errors:', errors);
      }
      
      setShowBulkUploadModal(false);
      fetchQuestions();
    } catch (error) {
      console.error('Failed to upload questions:', error);
      toast.error(error.response?.data?.error || 'Failed to upload questions');
    }
  };

  const resetForm = () => {
    setFormData({
      topic: '',
      type: 'MCQ',
      statement: '',
      choices: { A: '', B: '', C: '', D: '' },
      correct_answers: [],
      difficulty: 'MEDIUM',
      marks: 1,
      estimated_time: 60,
      explanation: '',
      tags: []
    });
    setSelectedQuestion(null);
  };

  const updateChoice = (key, value) => {
    setFormData({ 
      ...formData, 
      choices: { ...formData.choices, [key]: value } 
    });
  };

  const addChoice = () => {
    const keys = Object.keys(formData.choices);
    const lastKey = keys[keys.length - 1];
    const nextKey = String.fromCharCode(lastKey.charCodeAt(0) + 1);
    setFormData({ 
      ...formData, 
      choices: { ...formData.choices, [nextKey]: '' } 
    });
  };

  const removeChoice = (key) => {
    const newChoices = { ...formData.choices };
    delete newChoices[key];
    // Also remove from correct_answers if present
    const updatedCorrectAnswers = formData.correct_answers.filter(a => a !== key);
    setFormData({ ...formData, choices: newChoices, correct_answers: updatedCorrectAnswers });
  };

  const toggleCorrectAnswer = (key) => {
    const currentAnswers = formData.correct_answers;
    if (formData.type === 'MCQ') {
      // Single correct answer
      setFormData({ ...formData, correct_answers: [key] });
    } else {
      // Multiple correct answers
      if (currentAnswers.includes(key)) {
        setFormData({ 
          ...formData, 
          correct_answers: currentAnswers.filter(a => a !== key) 
        });
      } else {
        setFormData({ 
          ...formData, 
          correct_answers: [...currentAnswers, key] 
        });
      }
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.statement.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = filterTopic === 'all' || q.topic === parseInt(filterTopic);
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    return matchesSearch && matchesTopic && matchesDifficulty;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="input"
          >
            <option value="all">All Topics</option>
            {topics.map(topic => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>

          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="input"
          >
            <option value="all">All Difficulties</option>
            {difficulties.map(diff => (
              <option key={diff} value={diff}>{diff}</option>
            ))}
          </select>

          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="btn-outline"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </button>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Total Questions</p>
          <p className="text-2xl font-bold text-white">{questions.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Easy</p>
          <p className="text-2xl font-bold text-green-400">
            {questions.filter(q => q.difficulty === 'EASY').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Medium</p>
          <p className="text-2xl font-bold text-yellow-400">
            {questions.filter(q => q.difficulty === 'MEDIUM').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Hard</p>
          <p className="text-2xl font-bold text-red-400">
            {questions.filter(q => q.difficulty === 'HARD').length}
          </p>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-mentara-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="card p-12 text-center">
          <FileQuestion className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No questions yet</h3>
          <p className="text-gray-400 mb-6">Start building your question bank</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add First Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="card-hover p-5 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-mentara-blue/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-mentara-blue">Q{index + 1}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <p className="text-white font-medium line-clamp-2">{question.statement}</p>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setSelectedQuestion(question);
                          setFormData(question);
                          setShowCreateModal(true);
                        }}
                        className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(question.id)}
                        className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${
                      question.difficulty === 'EASY' ? 'badge-success' :
                      question.difficulty === 'MEDIUM' ? 'badge-warning' :
                      'badge-danger'
                    }`}>
                      {question.difficulty}
                    </span>
                    <span className="badge badge-primary">{question.type}</span>
                    <span className="text-xs text-gray-400">{question.marks} marks</span>
                    <span className="text-xs text-gray-400">~{question.estimated_time}s</span>
                    {question.topic_name && (
                      <span className="badge badge-secondary">{question.topic_name}</span>
                    )}
                  </div>
                </div>
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
              setShowCreateModal(false);
              resetForm();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-elevated p-6 w-full max-w-3xl my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {selectedQuestion ? 'Edit Question' : 'Create New Question'}
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

              <form onSubmit={handleCreate} className="space-y-5">
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
                      Question Type *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="input w-full"
                    >
                      {questionTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Question Statement *
                  </label>
                  <textarea
                    required
                    value={formData.statement}
                    onChange={(e) => setFormData({ ...formData, statement: e.target.value })}
                    className="input w-full h-32 resize-none"
                    placeholder="Enter the question..."
                  />
                </div>

                {(formData.type === 'MCQ' || formData.type === 'MULTI') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Answer Choices *
                    </label>
                    <div className="space-y-2">
                      {Object.entries(formData.choices).map(([key, value]) => (
                        <div key={key} className="flex gap-2 items-center">
                          <div className="flex items-center gap-2">
                            <input
                              type={formData.type === 'MCQ' ? 'radio' : 'checkbox'}
                              checked={formData.correct_answers.includes(key)}
                              onChange={() => toggleCorrectAnswer(key)}
                              className="w-4 h-4 text-mentara-blue"
                            />
                            <span className="w-8 text-sm font-semibold text-gray-400">{key}.</span>
                          </div>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => updateChoice(key, e.target.value)}
                            className="input flex-1"
                            placeholder={`Choice ${key}`}
                            required
                          />
                          {Object.keys(formData.choices).length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeChoice(key)}
                              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      {Object.keys(formData.choices).length < 8 && (
                        <button
                          type="button"
                          onClick={addChoice}
                          className="btn-outline w-full"
                        >
                          <Plus className="w-4 h-4" />
                          Add Choice
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {formData.type === 'MCQ' 
                        ? 'Select ONE correct answer using radio button' 
                        : 'Select MULTIPLE correct answers using checkboxes'}
                    </p>
                  </div>
                )}

                {formData.type === 'FIB' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Correct Answer(s) *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.correct_answers[0] || ''}
                      onChange={(e) => setFormData({ ...formData, correct_answers: [e.target.value] })}
                      className="input w-full"
                      placeholder="Enter the correct answer (e.g., 9.8 or Newton)"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      For multiple acceptable answers, separate with commas
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Difficulty *
                    </label>
                    <select
                      required
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="input w-full"
                    >
                      {difficulties.map(diff => (
                        <option key={diff} value={diff}>{diff}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Marks *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Time (seconds) *
                    </label>
                    <input
                      type="number"
                      required
                      min="10"
                      value={formData.estimated_time}
                      onChange={(e) => setFormData({ ...formData, estimated_time: parseInt(e.target.value) })}
                      className="input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Explanation (Optional)
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                    className="input w-full h-24 resize-none"
                    placeholder="Provide an explanation for the answer..."
                  />
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
                    <Save className="w-4 h-4" />
                    {selectedQuestion ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowBulkUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-elevated p-6 w-full max-w-lg"
            >
              <h2 className="text-2xl font-bold text-white mb-4">Bulk Upload Questions</h2>
              <p className="text-gray-400 mb-6">
                Upload a CSV or JSON file with questions. Download the template to see the required format.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Topic
                  </label>
                  <select
                    value={filterTopic}
                    onChange={(e) => setFilterTopic(e.target.value)}
                    className="input w-full"
                  >
                    <option value="">Select topic</option>
                    {topics.map(topic => (
                      <option key={topic.id} value={topic.id}>{topic.name}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-400 mb-4">Drop your file here or click to browse</p>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleBulkUpload}
                    className="hidden"
                    id="bulkUpload"
                  />
                  <label htmlFor="bulkUpload" className="btn-primary cursor-pointer">
                    Choose File
                  </label>
                </div>

                <button className="btn-outline w-full">
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionManager;

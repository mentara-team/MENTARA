import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Plus, Edit2, Trash2, Search, Save, X, Calendar, Clock, 
  Target, Users, TrendingUp, Eye, Copy, Settings, CheckSquare, 
  Sparkles, AlertCircle, BarChart3, Award, PlayCircle, GripVertical,
  ListChecks, FileQuestion, Layers, Archive, Send, Check
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
// Prefer maintained fork; keep compat by installing only one DnD lib.
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const Modal = ({ show, onClose, onSubmit, title, children, size = 'lg' }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full ${size === 'xl' ? 'max-w-6xl' : size === '2xl' ? 'max-w-7xl' : 'max-w-2xl'} bg-[#1A1B23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8`}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          {onSubmit ? (
            <form onSubmit={onSubmit} className="p-6 space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {children}
              <div className="flex gap-3 pt-4 sticky bottom-0 bg-[#1A1B23] border-t border-white/10 mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 btn-premium"
                >
                  <Save className="w-4 h-4 inline mr-2" />
                  Save Changes
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            </form>
          ) : (
            <div className="p-6 max-h-[calc(100vh-12rem)] overflow-y-auto">
              {children}
            </div>
          )}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const ExamManagerNew = () => {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [examQuestions, setExamQuestions] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: '',
    duration_minutes: 60,
    total_marks: 100,
    passing_marks: 40,
    status: 'DRAFT',
    scheduled_date: '',
    instructions: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, questionsRes, topicsRes] = await Promise.all([
        api.get('exams/'),
        api.get('questions/'),
        api.get('topics/')
      ]);

      const normalizeQuestion = (q) => {
        const type = q?.question_type ?? q?.type ?? 'MCQ';
        const statement = (q?.question_text ?? q?.statement ?? '').toString();
        return { ...q, question_text: statement, statement, question_type: type, type };
      };

      const statusFromBackend = (exam) => {
        if (exam?.is_active === false) return 'ARCHIVED';
        const visibility = (exam?.visibility || 'PUBLIC').toString();
        if (visibility === 'PRIVATE') return 'DRAFT';
        return 'PUBLISHED';
      };

      const normalizeExam = (exam) => {
        const durationMinutes =
          exam?.duration != null
            ? Number(exam.duration)
            : exam?.duration_minutes != null
              ? Number(exam.duration_minutes)
              : exam?.duration_seconds != null
                ? Math.round(Number(exam.duration_seconds) / 60)
                : 60;

        return {
          ...exam,
          status: exam?.status ?? statusFromBackend(exam),
          duration_minutes: durationMinutes,
          questions_count: exam?.questions_count ?? exam?.question_count ?? 0,
          attempts_count: exam?.attempts_count ?? exam?.attempt_count ?? 0,
          average_score: exam?.average_score ?? 0,
        };
      };

      const normalizedExams = Array.isArray(examsRes.data) ? examsRes.data.map(normalizeExam) : [];
      const normalizedQuestions = Array.isArray(questionsRes.data) ? questionsRes.data.map(normalizeQuestion) : [];

      setExams(normalizedExams);
      setQuestions(normalizedQuestions);
      setTopics(Array.isArray(topicsRes.data) ? topicsRes.data : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const backendPayloadFromForm = (data) => {
    const minutes = Number(data.duration_minutes || 0);
    const duration_seconds = Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : 3600;

    // UI `status` is mapped onto backend (visibility, is_active). Backend doesn't persist `status`/`scheduled_date`.
    let is_active = true;
    let visibility = 'PUBLIC';
    switch (data.status) {
      case 'ARCHIVED':
        is_active = false;
        visibility = 'PRIVATE';
        break;
      case 'DRAFT':
        is_active = true;
        visibility = 'PRIVATE';
        break;
      case 'SCHEDULED':
        is_active = true;
        visibility = 'PRIVATE';
        break;
      case 'PUBLISHED':
      default:
        is_active = true;
        visibility = 'PUBLIC';
        break;
    }

    return {
      title: data.title,
      description: data.description,
      topic: data.topic,
      duration_seconds,
      total_marks: data.total_marks,
      passing_marks: data.passing_marks,
      instructions: data.instructions,
      visibility,
      is_active,
      shuffle_questions: true,
    };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = backendPayloadFromForm(formData);
      await api.post('exams/', payload);
      toast.success('✨ Exam created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create exam:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to create exam');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = backendPayloadFromForm(formData);
      await api.put(`exams/${selectedExam.id}/`, payload);
      toast.success('✨ Exam updated successfully!');
      setShowEditModal(false);
      setSelectedExam(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to update exam:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to update exam');
    }
  };

  const handleDelete = async (examId) => {
    if (!window.confirm('Are you sure you want to delete this exam?')) {
      return;
    }
    try {
      await api.delete(`exams/${examId}/`);
      toast.success('🗑️ Exam deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete exam:', error);
      toast.error('Failed to delete exam');
    }
  };

  const handleDuplicate = async (exam) => {
    try {
      const duplicateData = {
        title: `${exam.title} (Copy)`,
        description: exam.description || '',
        topic: exam.topic,
        duration_seconds:
          exam.duration_seconds != null
            ? exam.duration_seconds
            : Math.round(Number(exam.duration_minutes || 60) * 60),
        total_marks: exam.total_marks,
        passing_marks: exam.passing_marks,
        instructions: exam.instructions || '',
        visibility: 'PRIVATE',
        is_active: true,
        shuffle_questions: true,
      };
      await api.post('exams/', duplicateData);
      toast.success('✨ Exam duplicated successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to duplicate exam');
    }
  };

  const handleAddQuestions = async () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    try {
      await api.post(`exams/${selectedExam.id}/add-questions/`, {
        question_ids: selectedQuestions
      });
      toast.success(`✨ ${selectedQuestions.length} question(s) added successfully!`);
      setShowQuestionModal(false);
      setSelectedQuestions([]);
      fetchData();
    } catch (error) {
      console.error('Failed to add questions:', error);
      toast.error('Failed to add questions');
    }
  };

  const openEditModal = (exam) => {
    setSelectedExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description || '',
      topic: exam.topic || '',
      duration_minutes: exam.duration_minutes,
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks,
      status: exam.status,
      scheduled_date: exam.scheduled_date || '',
      instructions: exam.instructions || ''
    });
    setShowEditModal(true);
  };

  const openQuestionModal = (exam) => {
    setSelectedExam(exam);
    setSelectedQuestions([]);
    setShowQuestionModal(true);
  };

  const openPreviewModal = (exam) => {
    setSelectedExam(exam);
    // Backend does not provide `question_ids` today; keep preview stable.
    // If your API later returns exam questions, wire it here.
    setExamQuestions([]);
    setShowPreviewModal(true);
  };

  const openAnalyticsModal = (exam) => {
    setSelectedExam(exam);
    setShowAnalyticsModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      topic: '',
      duration_minutes: 60,
      total_marks: 100,
      passing_marks: 40,
      status: 'DRAFT',
      scheduled_date: '',
      instructions: ''
    });
  };

  const toggleQuestionSelection = (questionId) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'DRAFT': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'SCHEDULED': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'ARCHIVED': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PUBLISHED': return <Send className="w-3 h-3" />;
      case 'DRAFT': return <Edit2 className="w-3 h-3" />;
      case 'SCHEDULED': return <Calendar className="w-3 h-3" />;
      case 'ARCHIVED': return <Archive className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  const filteredExams = exams.filter(exam => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: exams.length,
    published: exams.filter(e => e.status === 'PUBLISHED').length,
    draft: exams.filter(e => e.status === 'DRAFT').length,
    scheduled: exams.filter(e => e.status === 'SCHEDULED').length,
    totalAttempts: exams.reduce((acc, e) => acc + (e.attempts_count || 0), 0),
    avgScore: exams.length > 0 
      ? (exams.reduce((acc, e) => acc + (e.average_score || 0), 0) / exams.length).toFixed(1)
      : 0
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(examQuestions);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setExamQuestions(items);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-purple-400" />
            Exam Manager
          </h1>
          <p className="text-gray-400 mt-1">Create and manage your examinations</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="btn-premium"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Create Exam
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total Exams', value: stats.total, icon: FileText, color: 'purple' },
          { label: 'Published', value: stats.published, icon: Send, color: 'green' },
          { label: 'Drafts', value: stats.draft, icon: Edit2, color: 'gray' },
          { label: 'Scheduled', value: stats.scheduled, icon: Calendar, color: 'blue' },
          { label: 'Attempts', value: stats.totalAttempts, icon: Users, color: 'pink' },
          { label: 'Avg Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'yellow' }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="premium-card p-4"
          >
            <div className={`w-10 h-10 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 text-${stat.color}-400`} />
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="premium-card">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search exams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
              />
            </div>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="all">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="premium-card h-64 shimmer" />
          ))
        ) : filteredExams.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 premium-card text-center py-16">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No exams found</p>
            <p className="text-gray-500 text-sm mb-6">Create your first exam to get started</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="btn-premium"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Exam
            </motion.button>
          </div>
        ) : (
          filteredExams.map((exam, index) => (
            <motion.div
              key={exam.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="premium-card group"
            >
              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(exam.status)} flex items-center gap-1`}>
                  {getStatusIcon(exam.status)}
                  {exam.status}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openAnalyticsModal(exam)}
                    className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 transition-colors"
                    title="Analytics"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openPreviewModal(exam)}
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDuplicate(exam)}
                    className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEditModal(exam)}
                    className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(exam.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2">{exam.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {exam.description || 'No description provided'}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Duration</p>
                  <p className="text-sm font-semibold text-white">{exam.duration_minutes}m</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <Target className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Marks</p>
                  <p className="text-sm font-semibold text-white">{exam.total_marks}</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-lg">
                  <FileQuestion className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-400">Questions</p>
                  <p className="text-sm font-semibold text-white">{exam.questions_count || 0}</p>
                </div>
              </div>

              {exam.scheduled_date && (
                <div className="flex items-center gap-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blue-400">
                    {new Date(exam.scheduled_date).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openQuestionModal(exam)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white rounded-lg border border-purple-500/30 transition-all text-sm font-semibold"
                >
                  <ListChecks className="w-4 h-4 inline mr-1" />
                  Add Questions
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => openPreviewModal(exam)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
              </div>

              {(exam.attempts_count > 0 || exam.average_score > 0) && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{exam.attempts_count || 0} attempts</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Award className="w-4 h-4" />
                      <span>Avg: {exam.average_score?.toFixed(1) || 0}%</span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        show={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
          resetForm();
        }}
        onSubmit={showCreateModal ? handleCreate : handleUpdate}
        title={showCreateModal ? 'Create New Exam' : 'Edit Exam'}
        size="xl"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Exam Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              placeholder="e.g., Mid-Term Mathematics Exam"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Topic *
            </label>
            <select
              required
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="">Select a topic</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>{topic.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              rows="3"
              placeholder="Brief description of the exam..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Duration (minutes) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.duration_minutes}
              onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Total Marks *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.total_marks}
              onChange={(e) => setFormData({ ...formData, total_marks: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Passing Marks *
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.passing_marks}
              onChange={(e) => setFormData({ ...formData, passing_marks: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Status *
            </label>
            <select
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Scheduled Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Instructions (Optional)
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              rows="4"
              placeholder="Exam instructions for students..."
            />
          </div>
        </div>
      </Modal>

      {/* Question Selection Modal */}
      <Modal
        show={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setSelectedQuestions([]);
        }}
        onSubmit={null}
        title="Add Questions to Exam"
        size="2xl"
      >
        <div className="mb-4">
          <p className="text-gray-400 mb-4">
            Select questions to add to <span className="text-white font-semibold">{selectedExam?.title}</span>
          </p>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-400">
              {selectedQuestions.length} question(s) selected
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddQuestions}
              disabled={selectedQuestions.length === 0}
              className="btn-premium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Add Selected
            </motion.button>
          </div>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {questions.map(question => (
            <motion.button
              key={question.id}
              type="button"
              whileHover={{ scale: 1.01 }}
              className={`w-full text-left p-4 rounded-lg border cursor-pointer transition-all ${
                selectedQuestions.includes(question.id)
                  ? 'bg-purple-500/20 border-purple-500/50'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
              onClick={() => toggleQuestionSelection(question.id)}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedQuestions.includes(question.id)
                      ? 'bg-purple-500 border-purple-500'
                      : 'border-gray-400'
                  }`}
                >
                  {selectedQuestions.includes(question.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400">
                      {question.question_type}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                      {question.difficulty}
                    </span>
                    <span className="text-xs text-gray-400">{question.marks} marks</span>
                  </div>
                  <p className="text-white font-medium line-clamp-2">
                    {question.question_text}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        show={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        onSubmit={null}
        title={`Preview: ${selectedExam?.title}`}
        size="2xl"
      >
        <div className="space-y-6">
          <div className="premium-card bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white">{selectedExam?.title}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedExam?.status)}`}>
                {selectedExam?.status}
              </span>
            </div>
            <p className="text-gray-300 mb-4">{selectedExam?.description}</p>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <Clock className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Duration</p>
                <p className="text-sm font-semibold text-white">{selectedExam?.duration_minutes}m</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <Target className="w-5 h-5 text-pink-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Total Marks</p>
                <p className="text-sm font-semibold text-white">{selectedExam?.total_marks}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <Award className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Passing</p>
                <p className="text-sm font-semibold text-white">{selectedExam?.passing_marks}</p>
              </div>
              <div className="text-center p-3 bg-white/5 rounded-lg">
                <FileQuestion className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">Questions</p>
                <p className="text-sm font-semibold text-white">{examQuestions.length}</p>
              </div>
            </div>
          </div>

          {selectedExam?.instructions && (
            <div className="premium-card">
              <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Instructions
              </h4>
              <p className="text-gray-300">{selectedExam.instructions}</p>
            </div>
          )}

          <div>
            <h4 className="text-lg font-semibold text-white mb-4">Questions</h4>
            {examQuestions.length === 0 ? (
              <div className="premium-card text-center py-8">
                <FileQuestion className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No questions added yet</p>
              </div>
            ) : (
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="questions">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                      {examQuestions.map((question, index) => (
                        <Draggable key={question.id} draggableId={String(question.id)} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="premium-card flex gap-4"
                            >
                              <div className="flex items-center">
                                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                                    Q{index + 1}
                                  </span>
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-blue-500/20 text-blue-400">
                                    {question.question_type}
                                  </span>
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                                    {question.difficulty}
                                  </span>
                                  <span className="text-xs text-gray-400">{question.marks} marks</span>
                                </div>
                                <p className="text-white font-medium">{question.question_text}</p>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </div>
        </div>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        show={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        onSubmit={null}
        title={`Analytics: ${selectedExam?.title}`}
        size="xl"
      >
        <div className="space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Total Attempts', value: selectedExam?.attempts_count || 0, icon: Users, color: 'purple' },
              { label: 'Average Score', value: `${selectedExam?.average_score?.toFixed(1) || 0}%`, icon: TrendingUp, color: 'green' },
              { label: 'Pass Rate', value: `${selectedExam?.pass_rate?.toFixed(1) || 0}%`, icon: Award, color: 'yellow' },
              { label: 'Completion', value: `${selectedExam?.completion_rate?.toFixed(1) || 0}%`, icon: CheckSquare, color: 'blue' }
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="premium-card text-center"
              >
                <div className={`w-12 h-12 rounded-lg bg-${stat.color}-500/20 flex items-center justify-center mx-auto mb-3`}>
                  <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="premium-card">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Performance Overview
            </h4>
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">Detailed analytics coming soon</p>
              <p className="text-gray-500 text-sm">Track student performance and question difficulty</p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExamManagerNew;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileQuestion, Plus, Edit2, Trash2, Search, Save, X, Upload, 
  Image as ImageIcon, AlertCircle, Check, Filter, Tag, Sparkles,
  FileText, CheckSquare, ListChecks, PenTool, Zap, TrendingUp,
  Download, RefreshCw, Eye, Copy
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import HierarchyTopicSelector from '../ui/HierarchyTopicSelector';

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
          className={`w-full ${size === 'xl' ? 'max-w-4xl' : 'max-w-2xl'} bg-[#1A1B23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8`}
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
                Save Question
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
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const QuestionManagerNew = () => {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [topicMeta, setTopicMeta] = useState({ pathLabel: '', isComplete: false });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterTopic, setFilterTopic] = useState('');
  const [filterTopicMeta, setFilterTopicMeta] = useState({ pathLabel: '' });

  const confirmToast = (message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      toast((t) => (
        <div className="bg-[#1A1B23] border border-white/10 rounded-2xl p-4 shadow-2xl w-[92vw] max-w-[520px]">
          <div className="text-sm font-semibold text-white whitespace-pre-line">{message}</div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="btn-premium text-sm"
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'MCQ',
    difficulty: 'MEDIUM',
    marks: 1,
    topic: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: '',
    explanation: '',
    image: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const topicById = React.useMemo(() => {
    const m = new Map();
    (topics || []).forEach((t) => {
      if (t?.id != null) m.set(String(t.id), t);
    });
    return m;
  }, [topics]);

  const topicPathById = React.useMemo(() => {
    const out = new Map();

    const build = (topicId) => {
      const id = String(topicId);
      if (out.has(id)) return out.get(id);
      const node = topicById.get(id);
      if (!node) {
        out.set(id, null);
        return null;
      }

      const parts = [];
      const curriculumName = node?.curriculum_name ? String(node.curriculum_name) : '';

      let cur = node;
      let guard = 0;
      while (cur && guard < 50) {
        parts.unshift(cur?.name || '');
        const parentId = cur?.parent_id ?? cur?.parent;
        if (!parentId) break;
        cur = topicById.get(String(parentId));
        guard += 1;
      }

      const label = parts.filter(Boolean).join(' → ');
      const full = curriculumName ? `${curriculumName} • ${label}` : label;
      out.set(id, full || null);
      return out.get(id);
    };

    (topics || []).forEach((t) => {
      if (t?.id != null) build(t.id);
    });
    return out;
  }, [topics, topicById]);

  const isTopicInSubtree = React.useCallback(
    (topicId, ancestorId) => {
      if (!ancestorId) return true;
      if (!topicId) return false;
      let curId = String(topicId);
      const anc = String(ancestorId);
      let guard = 0;
      while (curId && guard < 50) {
        if (curId === anc) return true;
        const node = topicById.get(curId);
        const parentId = node?.parent_id ?? node?.parent;
        curId = parentId ? String(parentId) : '';
        guard += 1;
      }
      return false;
    },
    [topicById]
  );

  const uiTypeFromBackend = (backendType) => {
    switch (backendType) {
      case 'FIB':
        return 'FILL';
      case 'STRUCT':
        return 'STRUCTURED';
      default:
        return backendType;
    }
  };

  const backendTypeFromUi = (uiType) => {
    switch (uiType) {
      case 'FILL':
        return 'FIB';
      case 'STRUCTURED':
        return 'STRUCT';
      default:
        return uiType;
    }
  };

  const normalizeQuestion = (q) => {
    const rawType = q?.question_type ?? q?.type ?? 'MCQ';
    const uiType = uiTypeFromBackend(rawType);
    const statement = (q?.question_text ?? q?.statement ?? '').toString();
    const choices = q?.choices && typeof q.choices === 'object' ? q.choices : {};
    const correctAnswers = Array.isArray(q?.correct_answers) ? q.correct_answers : [];

    return {
      ...q,
      question_text: statement,
      statement,
      question_type: uiType,
      type: rawType,
      option_a: q?.option_a ?? choices?.A ?? '',
      option_b: q?.option_b ?? choices?.B ?? '',
      option_c: q?.option_c ?? choices?.C ?? '',
      option_d: q?.option_d ?? choices?.D ?? '',
      correct_answer:
        q?.correct_answer ??
        (correctAnswers.length ? correctAnswers.join(',') : ''),
    };
  };

  const buildQuestionFormData = (data) => {
    const form = new FormData();

    const backendType = backendTypeFromUi(data.question_type);
    const statement = (data.question_text ?? '').toString();

    const payload = {
      topic: data.topic,
      type: backendType,
      statement,
      difficulty: data.difficulty,
      marks: data.marks,
      is_active: true,
    };

    const shouldSendChoices = backendType === 'MCQ' || backendType === 'MULTI';
    const choices = shouldSendChoices
      ? {
          ...(data.option_a ? { A: data.option_a } : {}),
          ...(data.option_b ? { B: data.option_b } : {}),
          ...(data.option_c ? { C: data.option_c } : {}),
          ...(data.option_d ? { D: data.option_d } : {}),
        }
      : {};

    const correctAnswers = shouldSendChoices
      ? (data.correct_answer || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    Object.entries(payload).forEach(([k, v]) => {
      if (v !== null && v !== undefined && v !== '') form.append(k, v);
    });

    if (Object.keys(choices).length) {
      form.append('choices', JSON.stringify(choices));
    }
    if (correctAnswers.length) {
      form.append('correct_answers', JSON.stringify(correctAnswers));
    }

    if (data.image) {
      form.append('image', data.image);
    }

    return form;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [questionsRes, topicsRes] = await Promise.all([
        api.get('questions/'),
        api.get('topics/')
      ]);
      const normalized = Array.isArray(questionsRes.data)
        ? questionsRes.data.map(normalizeQuestion)
        : [];
      setQuestions(normalized);
      setTopics(topicsRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = buildQuestionFormData(formData);
      if (!formData.topic) {
        toast.error('Please select a topic');
        return;
      }
      if (formData.topic && topicMeta && topicMeta.isComplete === false) {
        toast.error('Please select the deepest sub-topic (complete the full hierarchy).');
        return;
      }
      await api.post('questions/', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('✨ Question created successfully!');
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create question:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to create question');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = buildQuestionFormData(formData);
      if (!formData.topic) {
        toast.error('Please select a topic');
        return;
      }
      if (formData.topic && topicMeta && topicMeta.isComplete === false) {
        toast.error('Please select the deepest sub-topic (complete the full hierarchy).');
        return;
      }
      await api.put(`questions/${selectedQuestion.id}/`, formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('✨ Question updated successfully!');
      setShowEditModal(false);
      setSelectedQuestion(null);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to update question:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to update question');
    }
  };

  const handleDelete = async (questionId) => {
    const ok = await confirmToast('Are you sure you want to delete this question?', { confirmText: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`questions/${questionId}/`);
      toast.success('🗑️ Question deleted successfully!');
      fetchData();
    } catch (error) {
      console.error('Failed to delete question:', error);
      if (error?.response?.status === 404) {
        toast('This question was already deleted in another tab.', { icon: 'ℹ️' });
        fetchData();
        return;
      }
      toast.error('Failed to delete question');
    }
  };

  const handleDuplicate = async (question) => {
    try {
      const normalized = normalizeQuestion(question);
      const backendType = backendTypeFromUi(normalized.question_type);
      const shouldSendChoices = backendType === 'MCQ' || backendType === 'MULTI';
      const choices = shouldSendChoices
        ? {
            ...(normalized.option_a ? { A: normalized.option_a } : {}),
            ...(normalized.option_b ? { B: normalized.option_b } : {}),
            ...(normalized.option_c ? { C: normalized.option_c } : {}),
            ...(normalized.option_d ? { D: normalized.option_d } : {}),
          }
        : {};
      const correctAnswers = shouldSendChoices
        ? (normalized.correct_answer || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const duplicatePayload = {
        topic: normalized.topic,
        type: backendType,
        statement: `${normalized.question_text} (Copy)`,
        difficulty: normalized.difficulty,
        marks: normalized.marks,
        is_active: true,
        ...(Object.keys(choices).length ? { choices } : {}),
        ...(correctAnswers.length ? { correct_answers: correctAnswers } : {}),
      };

      await api.post('questions/', duplicatePayload);
      toast.success('✨ Question duplicated successfully!');
      fetchData();
    } catch (error) {
      toast.error('Failed to duplicate question');
    }
  };

  const openEditModal = (question) => {
    const q = normalizeQuestion(question);
    setSelectedQuestion(q);
    setFormData({
      question_text: q.question_text,
      question_type: q.question_type,
      difficulty: q.difficulty,
      marks: q.marks,
      topic: q.topic,
      option_a: q.option_a || '',
      option_b: q.option_b || '',
      option_c: q.option_c || '',
      option_d: q.option_d || '',
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || '',
      image: null
    });
    if (q.image) {
      setImagePreview(q.image);
    }
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      question_text: '',
      question_type: 'MCQ',
      difficulty: 'MEDIUM',
      marks: 1,
      topic: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      explanation: '',
      image: null
    });
    setImagePreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'MCQ': return <CheckSquare className="w-4 h-4" />;
      case 'MULTI': return <ListChecks className="w-4 h-4" />;
      case 'FILL': return <PenTool className="w-4 h-4" />;
      case 'STRUCTURED': return <FileText className="w-4 h-4" />;
      default: return <FileQuestion className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'MCQ': return 'from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400';
      case 'MULTI': return 'from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400';
      case 'FILL': return 'from-pink-500/20 to-pink-600/20 border-pink-500/30 text-pink-400';
      case 'STRUCTURED': return 'from-green-500/20 to-green-600/20 border-green-500/30 text-green-400';
      default: return 'from-gray-500/20 to-gray-600/20 border-gray-500/30 text-gray-400';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'EASY': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'HARD': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const filteredQuestions = questions.filter(q => {
    const text = (q?.question_text ?? q?.statement ?? '').toString();
    const matchesSearch = text.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || (q?.difficulty ?? '') === filterDifficulty;
    const matchesType = filterType === 'all' || (q?.question_type ?? q?.type ?? '') === filterType;
    const matchesTopic =
      !filterTopic || isTopicInSubtree(q?.topic, filterTopic);
    return matchesSearch && matchesDifficulty && matchesType && matchesTopic;
  });

  const stats = {
    total: questions.length,
    easy: questions.filter(q => (q?.difficulty ?? '') === 'EASY').length,
    medium: questions.filter(q => (q?.difficulty ?? '') === 'MEDIUM').length,
    hard: questions.filter(q => (q?.difficulty ?? '') === 'HARD').length,
    mcq: questions.filter(q => (q?.question_type ?? q?.type ?? '') === 'MCQ').length,
    multi: questions.filter(q => (q?.question_type ?? q?.type ?? '') === 'MULTI').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileQuestion className="w-8 h-8 text-purple-400" />
            Question Bank
          </h1>
          <p className="text-gray-400 mt-1">Manage your question repository</p>
        </div>
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBulkUploadModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 text-white rounded-lg border border-pink-500/30 transition-all"
          >
            <Upload className="w-5 h-5 inline mr-2" />
            Bulk Upload
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-premium"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Create Question
          </motion.button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileQuestion, color: 'purple' },
          { label: 'Easy', value: stats.easy, icon: Check, color: 'green' },
          { label: 'Medium', value: stats.medium, icon: Zap, color: 'yellow' },
          { label: 'Hard', value: stats.hard, icon: TrendingUp, color: 'red' },
          { label: 'MCQ', value: stats.mcq, icon: CheckSquare, color: 'blue' },
          { label: 'Multi', value: stats.multi, icon: ListChecks, color: 'pink' }
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
        <div className="grid md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
              />
            </div>
          </div>
          <div>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="all">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="MCQ">MCQ</option>
              <option value="MULTI">Multi-select</option>
              <option value="FILL">Fill in Blank</option>
              <option value="STRUCTURED">Structured</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <div className="text-sm font-semibold text-gray-300 mb-2">Filter by Path</div>
            <HierarchyTopicSelector
              value={filterTopic}
              onChange={(topicId) => setFilterTopic(topicId)}
              onMetaChange={(meta) => setFilterTopicMeta(meta)}
              selectClassName="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              labelClassName="block text-xs font-semibold text-gray-400 mb-2"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <div className="truncate">
                {filterTopic ? (filterTopicMeta?.pathLabel ? `Selected: ${filterTopicMeta.pathLabel}` : 'Selected') : 'All topics'}
              </div>
              {filterTopic ? (
                <button
                  type="button"
                  onClick={() => { setFilterTopic(''); setFilterTopicMeta({ pathLabel: '' }); }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="premium-card h-64 shimmer" />
          ))
        ) : filteredQuestions.length === 0 ? (
          <div className="md:col-span-2 premium-card text-center py-16">
            <FileQuestion className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No questions found</p>
            <p className="text-gray-500 text-sm mb-6">Create your first question to get started</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className="btn-premium"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Create Question
            </motion.button>
          </div>
        ) : (
          filteredQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="premium-card group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border bg-gradient-to-r ${getTypeColor(question.question_type)} flex items-center gap-1`}>
                    {getTypeIcon(question.question_type)}
                    {question.question_type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDuplicate(question)}
                    className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openEditModal(question)}
                    className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDelete(question.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-white font-medium line-clamp-3 mb-2">
                  {question.question_text}
                </p>
                {question.image && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <ImageIcon className="w-4 h-4" />
                    <span>Image attached</span>
                  </div>
                )}
              </div>

              {question.question_type === 'MCQ' && (
                <div className="space-y-2 mb-4">
                  {['option_a', 'option_b', 'option_c', 'option_d'].filter(opt => question[opt]).map((opt, i) => (
                    <div
                      key={opt}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        question.correct_answer === String.fromCharCode(65 + i)
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + i)}.</span>
                      {question[opt]}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Tag className="w-4 h-4" />
                  <span>Marks: {question.marks}</span>
                </div>
                <div className="text-sm text-gray-500">
                  {topicPathById.get(String(question.topic)) || topics.find(t => t.id === question.topic)?.name || 'No topic'}
                </div>
              </div>
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
        title={showCreateModal ? 'Create New Question' : 'Edit Question'}
        size="xl"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Question Text *
            </label>
            <textarea
              required
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              rows="4"
              placeholder="Enter your question here..."
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Question Type *
            </label>
            <select
              required
              value={formData.question_type}
              onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="MCQ">Multiple Choice (MCQ)</option>
              <option value="MULTI">Multi-select</option>
              <option value="FILL">Fill in Blank</option>
              <option value="STRUCTURED">Structured</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Difficulty *
            </label>
            <select
              required
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Marks *
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.marks}
              onChange={(e) => setFormData({ ...formData, marks: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Topic *
            </label>
            <HierarchyTopicSelector
              required
              value={formData.topic}
              onChange={(topicId) => setFormData({ ...formData, topic: topicId })}
              onMetaChange={(meta) => setTopicMeta(meta)}
              className="mt-2"
            />
            {formData.topic && !topicMeta?.isComplete && (
              <div className="mt-2 text-xs text-amber-300">
                Please select the deepest sub-topic (complete the full hierarchy).
              </div>
            )}
          </div>

          {(formData.question_type === 'MCQ' || formData.question_type === 'MULTI') && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Options</label>
                <div className="space-y-3">
                  {['option_a', 'option_b', 'option_c', 'option_d'].map((opt, i) => (
                    <div key={opt} className="flex gap-2">
                      <span className="px-3 py-3 bg-purple-500/20 text-purple-400 rounded-lg font-semibold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <input
                        type="text"
                        value={formData[opt]}
                        onChange={(e) => setFormData({ ...formData, [opt]: e.target.value })}
                        className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Correct Answer *
                </label>
                <input
                  type="text"
                  required
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                  placeholder="e.g., A or A,B,C for multi-select"
                />
              </div>
            </>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Explanation (Optional)
            </label>
            <textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              rows="3"
              placeholder="Explain the correct answer..."
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 mb-2">
              Question Image (Optional)
            </label>
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <div className="px-4 py-8 bg-white/5 border-2 border-dashed border-white/10 rounded-lg hover:border-purple-500/50 transition-all text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">Click to upload image</p>
                  <p className="text-gray-600 text-xs mt-1">PNG, JPG up to 5MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              {imagePreview && (
                <div className="w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal
        show={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSubmit={(e) => {
          e.preventDefault();
          toast.info('Bulk upload feature coming soon!');
          setShowBulkUploadModal(false);
        }}
        title="Bulk Upload Questions"
      >
        <div className="text-center py-8">
          <Upload className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Upload CSV or Excel File</h3>
          <p className="text-gray-400 mb-6">
            Download our template to format your questions correctly
          </p>
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 text-white rounded-lg border border-blue-500/30 transition-all"
            >
              <Download className="w-5 h-5 inline mr-2" />
              Download Template
            </motion.button>
            <label className="block cursor-pointer">
              <div className="px-6 py-8 bg-white/5 border-2 border-dashed border-white/10 rounded-lg hover:border-purple-500/50 transition-all">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-400">Drop your file here or click to browse</p>
              </div>
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" />
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuestionManagerNew;

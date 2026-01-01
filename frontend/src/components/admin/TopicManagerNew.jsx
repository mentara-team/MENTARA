import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Search, 
  Save, X, FolderPlus, BookOpen, Sparkles, Check, AlertCircle, RotateCcw
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const TopicTreeView = React.memo(function TopicTreeView({
  loading,
  topics,
  searchTerm,
  expandedTopics,
  onToggleExpand,
  onOpenEditModal,
  onDelete,
}) {
  const topicTree = useMemo(() => {
    const topicMap = {};
    const rootTopics = [];

    topics.forEach((topic) => {
      topicMap[topic.id] = { ...topic, children: [] };
    });

    topics.forEach((topic) => {
      const parentId = topic.parent_id ?? topic.parent;
      if (parentId && topicMap[parentId]) {
        topicMap[parentId].children.push(topicMap[topic.id]);
      } else {
        rootTopics.push(topicMap[topic.id]);
      }
    });

    return rootTopics;
  }, [topics]);

  const filteredTree = useMemo(() => {
    if (!searchTerm) return topicTree;
    const term = searchTerm.toLowerCase();
    return topicTree.filter((topic) => topic.name.toLowerCase().includes(term));
  }, [searchTerm, topicTree]);

  const renderTopicItem = useCallback(
    (topic, level = 0) => {
      const hasChildren = topic.children && topic.children.length > 0;
      const isExpanded = expandedTopics.has(topic.id);

      return (
        <motion.div
          key={topic.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2"
        >
          <div
            className={`flex items-center gap-3 p-4 rounded-xl border transition-all group hover:shadow-lg ${
              level === 0
                ? 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-white/10 hover:border-purple-500/50'
                : 'bg-white/5 border-white/5 hover:border-white/20'
            }`}
            style={{ marginLeft: `${level * 24}px` }}
          >
            {hasChildren ? (
              <button
                onClick={() => onToggleExpand(topic.id)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-purple-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ) : (
              <div className="w-6" />
            )}

            <div className="text-2xl">{topic.icon}</div>

            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold truncate">{topic.name}</h3>
              {topic.description && (
                <p className="text-gray-400 text-sm truncate">{topic.description}</p>
              )}
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenEditModal(topic)}
                className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(topic.id)}
                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          <AnimatePresence>
            {isExpanded && hasChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                {topic.children.map((child) => renderTopicItem(child, level + 1))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      );
    },
    [expandedTopics, onDelete, onOpenEditModal, onToggleExpand]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-white/5 rounded-xl shimmer" />
        ))}
      </div>
    );
  }

  if (filteredTree.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 text-lg">No topics found</p>
        <p className="text-gray-500 text-sm">Create your first topic to get started</p>
      </div>
    );
  }

  return <div className="space-y-2">{filteredTree.map((topic) => renderTopicItem(topic))}</div>;
});

const Modal = ({ show, onClose, onSubmit, title, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-[#1A1B23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
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
          <form onSubmit={onSubmit} className="p-6 space-y-4">
            {children}
            <div className="flex gap-3 pt-4">
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
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const TopicManagerNew = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.is_staff;

  const [topics, setTopics] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [showCreateCurriculumModal, setShowCreateCurriculumModal] = useState(false);
  const [showScaffoldModal, setShowScaffoldModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [curriculumForm, setCurriculumForm] = useState({ name: '', description: '' });
  const [scaffoldForm, setScaffoldForm] = useState({ subject_name: '' });
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    parent: null,
    curriculum: null
  });

  const selectedCurriculum = useMemo(
    () => (curriculums || []).find((c) => String(c.id) === String(selectedCurriculumId)) || null,
    [curriculums, selectedCurriculumId]
  );
  const selectedCurriculumArchived = Boolean(selectedCurriculum && selectedCurriculum.is_active === false);

  const parentOptions = useMemo(() => {
    const map = new Map();
    const roots = [];
    topics.forEach((t) => map.set(t.id, { ...t, children: [] }));
    topics.forEach((t) => {
      const parentId = t.parent_id ?? t.parent;
      const node = map.get(t.id);
      if (!node) return;
      if (parentId && map.has(parentId)) {
        map.get(parentId).children.push(node);
      } else {
        roots.push(node);
      }
    });

    const result = [];
    const walk = (node, depth) => {
      const prefix = depth > 0 ? `${'—'.repeat(Math.min(depth, 6))} ` : '';
      result.push({ id: node.id, label: `${prefix}${node.name}` });
      const kids = Array.isArray(node.children) ? node.children : [];
      kids.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)));
      kids.forEach((c) => walk(c, depth + 1));
    };
    roots
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || String(a.name).localeCompare(String(b.name)))
      .forEach((r) => walk(r, 0));
    return result;
  }, [topics]);

  useEffect(() => {
    fetchCurriculums();
  }, []);

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurriculumId]);

  const fetchCurriculums = async () => {
    try {
      const response = await api.get('curriculums/', {
        params: isAdmin ? { include_archived: 1 } : {},
      });
      const data = response?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setCurriculums(list);
      const prev = selectedCurriculumId;
      if (list.length > 0) {
        const keep = prev && list.some((c) => String(c.id) === String(prev));
        if (keep) {
          setSelectedCurriculumId(String(prev));
        } else {
          const firstActive = list.find((c) => c && c.is_active !== false);
          setSelectedCurriculumId(String((firstActive || list[0]).id));
        }
      } else {
        setSelectedCurriculumId('');
      }
    } catch (error) {
      console.error('Failed to fetch curriculums:', error);
      setCurriculums([]);
      setSelectedCurriculumId('');
    }
  };

  const handleArchiveCurriculum = async () => {
    if (!isAdmin) {
      toast.error('Only admins can delete curriculums');
      return;
    }
    if (!selectedCurriculumId) {
      toast.error('Select a curriculum first');
      return;
    }

    const curriculum = curriculums.find((c) => String(c.id) === String(selectedCurriculumId));
    const name = curriculum?.name || `#${selectedCurriculumId}`;
    const ok = window.confirm(
      `Archive curriculum "${name}"?\n\nThis will hide it from dropdowns, but will NOT delete historical exams/attempts.`
    );
    if (!ok) return;

    try {
      toast.loading('Archiving curriculum…', { id: 'archive-curriculum' });
      await api.delete(`curriculums/${selectedCurriculumId}/`);
      toast.success('Curriculum archived', { id: 'archive-curriculum' });
      await fetchCurriculums();
      await fetchTopics();
    } catch (error) {
      console.error('Failed to archive curriculum:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to archive curriculum', { id: 'archive-curriculum' });
    }
  };

  const handleRestoreCurriculum = async () => {
    if (!isAdmin) {
      toast.error('Only admins can restore curriculums');
      return;
    }
    if (!selectedCurriculumId) {
      toast.error('Select a curriculum first');
      return;
    }
    const curriculum = curriculums.find((c) => String(c.id) === String(selectedCurriculumId));
    const name = curriculum?.name || `#${selectedCurriculumId}`;
    const ok = window.confirm(`Restore curriculum "${name}"?`);
    if (!ok) return;
    try {
      toast.loading('Restoring curriculum…', { id: 'restore-curriculum' });
      await api.post(`curriculums/${selectedCurriculumId}/restore/`);
      toast.success('Curriculum restored', { id: 'restore-curriculum' });
      await fetchCurriculums();
      await fetchTopics();
    } catch (error) {
      console.error('Failed to restore curriculum:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to restore curriculum', { id: 'restore-curriculum' });
    }
  };

  const handlePurgeCurriculum = async () => {
    if (!isAdmin) {
      toast.error('Only admins can permanently delete curriculums');
      return;
    }
    if (!selectedCurriculumId) {
      toast.error('Select a curriculum first');
      return;
    }
    const curriculum = curriculums.find((c) => String(c.id) === String(selectedCurriculumId));
    const name = curriculum?.name || `#${selectedCurriculumId}`;
    const ok = window.confirm(
      `PERMANENTLY delete curriculum "${name}"?\n\nThis will delete ALL topics, questions, exams and attempts under it. This cannot be undone.`
    );
    if (!ok) return;

    try {
      toast.loading('Permanently deleting curriculum…', { id: 'purge-curriculum' });
      await api.delete(`curriculums/${selectedCurriculumId}/purge/`, { params: { force: 1 } });
      toast.success('Curriculum permanently deleted', { id: 'purge-curriculum' });
      await fetchCurriculums();
      await fetchTopics();
    } catch (error) {
      console.error('Failed to permanently delete curriculum:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);

      const sharedCount = Number(data?.shared_questions || 0);
      if (error.response?.status === 409 && sharedCount > 0) {
        const ok2 = window.confirm(
          `This curriculum has ${sharedCount} question(s) used in other exams/attempts.\n\n` +
          `To permanently delete the curriculum without breaking history, we can MOVE those shared questions into a Shared Question Pool and continue.\n\nProceed?`
        );
        if (!ok2) {
          toast.error('Permanent delete cancelled', { id: 'purge-curriculum' });
          return;
        }
        try {
          toast.loading('Deleting curriculum (keeping shared questions)…', { id: 'purge-curriculum' });
          await api.delete(`curriculums/${selectedCurriculumId}/purge/`, { params: { force: 1, keep_shared: 1 } });
          toast.success('Curriculum permanently deleted', { id: 'purge-curriculum' });
          await fetchCurriculums();
          await fetchTopics();
          return;
        } catch (error2) {
          console.error('Failed to delete curriculum with keep_shared:', error2);
          const data2 = error2.response?.data;
          const detail2 = data2?.detail || (data2 ? JSON.stringify(data2) : null);
          toast.error(detail2 || 'Failed to permanently delete curriculum', { id: 'purge-curriculum' });
          return;
        }
      }

      toast.error(detail || 'Failed to permanently delete curriculum', { id: 'purge-curriculum' });
    }
  };

  const handleCreateCurriculum = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only admins can create curriculums');
      return;
    }
    try {
      const payload = {
        name: curriculumForm.name,
        description: curriculumForm.description,
        is_active: true,
      };
      const res = await api.post('curriculums/', payload);
      toast.success('✨ Curriculum created successfully!');
      setShowCreateCurriculumModal(false);
      setCurriculumForm({ name: '', description: '' });
      await fetchCurriculums();
      const newId = res?.data?.id;
      if (newId) setSelectedCurriculumId(String(newId));
    } catch (error) {
      console.error('Failed to create curriculum:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to create curriculum');
    }
  };

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await api.get('topics/', {
        params: selectedCurriculumId ? { curriculum: selectedCurriculumId } : {},
      });
      setTopics(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        curriculum: selectedCurriculumId ? Number(selectedCurriculumId) : formData.curriculum,
      };
      await api.post('topics/', payload);
      toast.success('✨ Topic created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', icon: '📚', parent: null, curriculum: null });
      fetchTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Failed to create topic'
      );
    }
  };

  const handleScaffoldIb = async (e) => {
    e.preventDefault();
    if (!selectedCurriculumId) {
      toast.error('Please create/select a curriculum first');
      return;
    }
    const subject = scaffoldForm.subject_name.trim();
    if (!subject) {
      toast.error('Enter a subject name');
      return;
    }

    const curriculumId = Number(selectedCurriculumId);
    try {
      toast.loading('Creating IB structure…', { id: 'scaffold' });

      const subjectRes = await api.post('topics/', {
        name: subject,
        description: '',
        icon: '📘',
        parent: null,
        curriculum: curriculumId,
        order: 0,
      });
      const subjectId = subjectRes?.data?.id;

      const slRes = await api.post('topics/', {
        name: 'SL',
        description: 'Standard Level',
        icon: '🟦',
        parent: subjectId,
        curriculum: curriculumId,
        order: 1,
      });
      const hlRes = await api.post('topics/', {
        name: 'HL',
        description: 'Higher Level',
        icon: '🟥',
        parent: subjectId,
        curriculum: curriculumId,
        order: 2,
      });

      const slId = slRes?.data?.id;
      const hlId = hlRes?.data?.id;

      const createPapers = async (parentId) => {
        await api.post('topics/', { name: 'Paper 1', description: '', icon: '📄', parent: parentId, curriculum: curriculumId, order: 1 });
        await api.post('topics/', { name: 'Paper 2', description: '', icon: '📄', parent: parentId, curriculum: curriculumId, order: 2 });
        await api.post('topics/', { name: 'Paper 3', description: '', icon: '📄', parent: parentId, curriculum: curriculumId, order: 3 });
      };

      if (slId) await createPapers(slId);
      if (hlId) await createPapers(hlId);

      toast.success('✅ IB structure created (Subject → SL/HL → Papers)', { id: 'scaffold' });
      setShowScaffoldModal(false);
      setScaffoldForm({ subject_name: '' });
      fetchTopics();
    } catch (error) {
      console.error('Failed to scaffold IB structure:', error);
      const data = error.response?.data;
      const detail = data?.detail || (data ? JSON.stringify(data) : null);
      toast.error(detail || 'Failed to create IB structure', { id: 'scaffold' });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`topics/${selectedTopic.id}/`, formData);
      toast.success('✨ Topic updated successfully!');
      setShowEditModal(false);
      setSelectedTopic(null);
      fetchTopics();
    } catch (error) {
      console.error('Failed to update topic:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Failed to update topic'
      );
    }
  };

  const handleDelete = useCallback(async (topicId) => {
    if (!window.confirm('Are you sure you want to delete this topic? This will also delete all subtopics and associated content.')) {
      return;
    }
    try {
      await api.delete(`topics/${topicId}/`);
      toast.success('🗑️ Topic deleted successfully!');
      fetchTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Failed to delete topic'
      );
    }
  }, []);

  const openEditModal = useCallback((topic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || '📚',
      parent: topic.parent ?? topic.parent_id ?? null,
      curriculum: topic.curriculum ?? topic.curriculum_id ?? null,
    });
    setShowEditModal(true);
  }, []);

  const toggleExpand = useCallback((topicId) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FolderTree className="w-8 h-8 text-purple-400" />
            Topics & Structure
          </h1>
          <p className="text-gray-400 mt-1">Organize your content hierarchy</p>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateCurriculumModal(true)}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
            >
              + Curriculum
            </motion.button>
          )}

          <select
            value={selectedCurriculumId}
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            disabled={curriculums.length === 0}
            aria-label="Select curriculum"
          >
            {curriculums.length === 0 ? (
              <option value="">No curriculums</option>
            ) : (
              curriculums.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}{c.is_active === false ? ' (Archived)' : ''}
                </option>
              ))
            )}
          </select>

          {isAdmin && selectedCurriculumArchived && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRestoreCurriculum}
              disabled={!selectedCurriculumId}
              title={!selectedCurriculumId ? 'Select a curriculum first' : 'Restore this curriculum'}
              className="p-3 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-300 transition-colors border border-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Restore curriculum"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          )}

          {isAdmin && !selectedCurriculumArchived && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleArchiveCurriculum}
              disabled={!selectedCurriculumId}
              title={!selectedCurriculumId ? 'Select a curriculum first' : 'Archive this curriculum'}
              className="p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Archive curriculum"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          )}

          {isAdmin && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handlePurgeCurriculum}
              disabled={!selectedCurriculumId}
              title={!selectedCurriculumId ? 'Select a curriculum first' : 'Permanently delete this curriculum'}
              className="p-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 transition-colors border border-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Permanently delete curriculum"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-premium"
            disabled={selectedCurriculumArchived}
            title={
              selectedCurriculumArchived
                ? 'This curriculum is archived. Restore it to manage topics.'
                : undefined
            }
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Create Topic
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowScaffoldModal(true)}
            className="px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
            disabled={!selectedCurriculumId || selectedCurriculumArchived}
            title={
              !selectedCurriculumId
                ? 'Select a curriculum first'
                : selectedCurriculumArchived
                  ? 'This curriculum is archived. Restore it to scaffold topics.'
                  : 'Quickly create IB subject → SL/HL → Paper 1/2/3'
            }
          >
            <FolderPlus className="w-5 h-5 inline mr-2" />
            Quick IB
          </motion.button>
        </div>
      </div>

      {selectedCurriculumArchived && (
        <div className="premium-card border border-warning/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-text font-semibold">This curriculum is archived</div>
              <div className="text-sm text-text-secondary mt-1">
                Restore it to view/edit topics and use it in dropdowns. Permanently deleting will remove all content under it.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="premium-card">
        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-400"
          />
        </div>
      </div>

      {/* Topics List */}
      <div className="premium-card">
        <TopicTreeView
          loading={loading}
          topics={topics}
          searchTerm={searchTerm}
          expandedTopics={expandedTopics}
          onToggleExpand={toggleExpand}
          onOpenEditModal={openEditModal}
          onDelete={handleDelete}
        />
      </div>

      {/* Create Modal */}
      <Modal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        title="Create New Topic"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Topic Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            placeholder="e.g., Mathematics, Physics"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
            rows="3"
            placeholder="Brief description of this topic"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Icon Emoji</label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            placeholder="📚"
            maxLength="2"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Parent Topic (Optional)</label>
          <select
            value={formData.parent || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, parent: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          >
            <option value="">No Parent (Root Topic)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Quick IB Scaffold Modal */}
      <Modal
        show={showScaffoldModal}
        onClose={() => setShowScaffoldModal(false)}
        onSubmit={handleScaffoldIb}
        title="Quick IB Structure"
      >
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <div className="text-white font-semibold">Creates folders automatically</div>
              <div className="text-sm text-gray-400 mt-1">
                Subject → SL + HL → Paper 1 / Paper 2 / Paper 3
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Subject Name *</label>
          <input
            type="text"
            required
            value={scaffoldForm.subject_name}
            onChange={(e) => setScaffoldForm((prev) => ({ ...prev, subject_name: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            placeholder="e.g., IB Physics"
          />
        </div>
      </Modal>

      {/* Create Curriculum Modal (Admin only) */}
      {isAdmin && (
        <Modal
          show={showCreateCurriculumModal}
          onClose={() => setShowCreateCurriculumModal(false)}
          onSubmit={handleCreateCurriculum}
          title="Create Curriculum"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Curriculum Name *</label>
            <input
              type="text"
              required
              value={curriculumForm.name}
              onChange={(e) => setCurriculumForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
              placeholder="e.g., IB"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
            <textarea
              value={curriculumForm.description}
              onChange={(e) => setCurriculumForm((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              rows="3"
              placeholder="Optional"
            />
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSubmit={handleUpdate}
        title="Edit Topic"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Topic Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
            rows="3"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-2">Icon Emoji</label>
          <input
            type="text"
            value={formData.icon}
            onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            maxLength="2"
          />
        </div>
      </Modal>
    </div>
  );
};

export default TopicManagerNew;

import React, { useState, useEffect } from 'react';
import { 
  FolderTree, 
  Plus, 
  Edit2, 
  Trash2, 
  FolderPlus, 
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Upload,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const TopicManager = () => {
  const [topics, setTopics] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculumId, setSelectedCurriculumId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📚',
    parent: null,
    curriculum: null
  });

  useEffect(() => {
    fetchCurriculums();
  }, []);

  useEffect(() => {
    fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCurriculumId]);

  const fetchCurriculums = async () => {
    try {
      const response = await api.get('curriculums/');
      const data = response?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
      setCurriculums(list);
      if (list.length > 0) {
        setSelectedCurriculumId(String(list[0].id));
      }
    } catch (error) {
      console.error('Failed to fetch curriculums:', error);
      setCurriculums([]);
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
      toast.success('Topic created successfully!');
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        curriculum: selectedCurriculumId ? Number(selectedCurriculumId) : formData.curriculum,
      };
      await api.put(`topics/${selectedTopic.id}/`, payload);
      toast.success('Topic updated successfully!');
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

  const confirmToast = (message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      toast((t) => (
        <div className="bg-surface border border-elevated/50 rounded-2xl p-4 shadow-lg w-[92vw] max-w-[520px]">
          <div className="text-sm font-semibold text-text whitespace-pre-line">{message}</div>
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

  const handleDelete = async (topicId) => {
    const ok = await confirmToast(
      'Are you sure you want to delete this topic? This will also delete all subtopics and associated content.',
      { confirmText: 'Delete' }
    );
    if (!ok) return;
    try {
      await api.delete(`topics/${topicId}/`);
      toast.success('Topic deleted successfully!');
      fetchTopics();
    } catch (error) {
      console.error('Failed to delete topic:', error);
      if (error?.response?.status === 404) {
        toast('This topic was already deleted in another tab.', { icon: 'ℹ️' });
        fetchTopics();
        return;
      }
      toast.error(
        error.response?.data?.detail ||
          error.response?.data?.error ||
          'Failed to delete topic'
      );
    }
  };

  const openEditModal = (topic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || '📚',
      parent: topic.parent ?? topic.parent_id ?? null,
      curriculum: topic.curriculum ?? topic.curriculum_id ?? null,
    });
    setShowEditModal(true);
  };

  const toggleExpand = (topicId) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const buildTopicTree = (topics) => {
    const topicMap = {};
    const rootTopics = [];

    topics.forEach(topic => {
      topicMap[topic.id] = { ...topic, children: [] };
    });

    topics.forEach(topic => {
      const parentId = topic.parent_id ?? topic.parent;
      if (parentId && topicMap[parentId]) {
        topicMap[parentId].children.push(topicMap[topic.id]);
      } else {
        rootTopics.push(topicMap[topic.id]);
      }
    });

    return rootTopics;
  };

  const renderTopicItem = (topic, level = 0) => {
    const hasChildren = topic.children && topic.children.length > 0;
    const isExpanded = expandedTopics.has(topic.id);

    return (
      <div key={topic.id} className="mb-2">
        <div 
          className="flex items-center gap-3 p-4 bg-mentara-surface hover:bg-white/5 border border-white/5 rounded-xl transition-all group"
          style={{ marginLeft: `${level * 24}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(topic.id)}
              className="p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-mentara-blue/20 to-mentara-mint/20 flex items-center justify-center text-xl">
              {topic.icon || '📚'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">{topic.name}</h3>
              {topic.description && (
                <p className="text-sm text-gray-400 mt-0.5">{topic.description}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-2 py-1 bg-mentara-blue/20 text-mentara-blue rounded-full">
                  {topic.question_count || 0} Questions
                </span>
                <span className="text-xs px-2 py-1 bg-mentara-mint/20 text-mentara-mint rounded-full">
                  {topic.exam_count || 0} Exams
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setFormData((prev) => ({ ...prev, parent: topic.id }));
                setShowCreateModal(true);
              }}
              className="p-2 hover:bg-mentara-blue/20 text-mentara-blue rounded-lg transition-colors"
              title="Add Subtopic"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openEditModal(topic)}
              className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(topic.id)}
              className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            {topic.children.map(child => renderTopicItem(child, level + 1))}
          </motion.div>
        )}
      </div>
    );
  };

  const filteredTopics = topics.filter(topic =>
    topic.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topicTree = buildTopicTree(filteredTopics);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search topics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <select
            value={selectedCurriculumId}
            onChange={(e) => setSelectedCurriculumId(e.target.value)}
            className="input"
            disabled={curriculums.length === 0}
            aria-label="Select curriculum"
          >
            {curriculums.length === 0 ? (
              <option value="">No curriculums</option>
            ) : (
              curriculums.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))
            )}
          </select>
          <button className="btn-outline">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', icon: '📚', parent: null, curriculum: null });
              setShowCreateModal(true);
            }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Topic
          </button>
        </div>
      </div>

      {/* Topics List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-mentara-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : topicTree.length === 0 ? (
        <div className="card p-12 text-center">
          <FolderTree className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No topics yet</h3>
          <p className="text-gray-400 mb-6">Create your first topic to organize questions and exams</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create First Topic
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {topicTree.map(topic => renderTopicItem(topic))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="card-elevated p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {showEditModal ? 'Edit Topic' : 'Create New Topic'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={showEditModal ? handleUpdate : handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Topic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="input w-full"
                    placeholder="e.g., Mathematics, Physics, Chemistry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="input w-full h-24 resize-none"
                    placeholder="Brief description of this topic..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
                    className="input w-full"
                    placeholder="📚"
                    maxLength={2}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                    }}
                    className="btn-outline flex-1"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary flex-1">
                    <Save className="w-4 h-4" />
                    {showEditModal ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TopicManager;

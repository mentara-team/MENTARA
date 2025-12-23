import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderTree, Plus, Edit2, Trash2, ChevronRight, ChevronDown, Search, 
  Save, X, FolderPlus, BookOpen, Sparkles, Check, AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

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
      if (topic.parent_id && topicMap[topic.parent_id]) {
        topicMap[topic.parent_id].children.push(topicMap[topic.id]);
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
  const [topics, setTopics] = useState([]);
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
    parent_id: null
  });

  useEffect(() => {
    fetchTopics();
  }, []);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const response = await api.get('topics/');
      setTopics(response.data);
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
      await api.post('topics/', formData);
      toast.success('✨ Topic created successfully!');
      setShowCreateModal(false);
      setFormData({ name: '', description: '', icon: '📚', parent_id: null });
      fetchTopics();
    } catch (error) {
      console.error('Failed to create topic:', error);
      toast.error(error.response?.data?.detail || 'Failed to create topic');
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
      toast.error('Failed to update topic');
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
      toast.error('Failed to delete topic');
    }
  }, []);

  const openEditModal = useCallback((topic) => {
    setSelectedTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description || '',
      icon: topic.icon || '📚',
      parent_id: topic.parent_id
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
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="btn-premium"
        >
          <Plus className="w-5 h-5 inline mr-2" />
          Create Topic
        </motion.button>
      </div>

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
            value={formData.parent_id || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, parent_id: e.target.value || null }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
          >
            <option value="">No Parent (Root Topic)</option>
            {topics.filter(t => !t.parent_id).map(topic => (
              <option key={topic.id} value={topic.id}>{topic.name}</option>
            ))}
          </select>
        </div>
      </Modal>

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

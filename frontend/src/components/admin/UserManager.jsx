import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Plus, Edit2, Trash2, Shield, GraduationCap, User } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const confirmToast = (message, { confirmText = 'Confirm', cancelText = 'Cancel' } = {}) => {
    return new Promise((resolve) => {
      toast((t) => (
        <div className="bg-[#1A1B23] border border-white/10 rounded-2xl p-4 shadow-2xl w-[min(92vw,520px)]">
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
              className="px-4 py-2 bg-red-500/80 hover:bg-red-500 text-white rounded-lg transition-colors text-sm"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      ), { duration: Infinity });
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('admin/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    const ok = await confirmToast('Are you sure you want to delete this user?', { confirmText: 'Delete' });
    if (!ok) return;
    try {
      // api baseURL already includes `/api/`
      await api.delete(`admin/users/${userId}/`);
      toast.success('User deleted successfully!');
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <Shield className="w-4 h-4" />;
      case 'TEACHER': return <GraduationCap className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'from-red-500 to-pink-500';
      case 'TEACHER': return 'from-blue-500 to-cyan-500';
      default: return 'from-green-500 to-emerald-500';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10 w-full"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="input"
          >
            <option value="all">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="ADMIN">Admins</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Total Users</p>
          <p className="text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Students</p>
          <p className="text-2xl font-bold text-mentara-mint">
            {users.filter(u => u.role === 'STUDENT').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Teachers</p>
          <p className="text-2xl font-bold text-mentara-blue">
            {users.filter(u => u.role === 'TEACHER').length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-gray-400 text-sm mb-1">Admins</p>
          <p className="text-2xl font-bold text-red-400">
            {users.filter(u => u.role === 'ADMIN').length}
          </p>
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-12 h-12 border-4 border-mentara-blue border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">User</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">Role</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">Status</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">Points</th>
                  <th className="text-left p-4 text-sm font-semibold text-gray-400">Joined</th>
                  <th className="text-right p-4 text-sm font-semibold text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getRoleColor(user.role)} flex items-center justify-center text-white font-bold`}>
                          {user.first_name?.[0] || user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-medium">{user.first_name} {user.last_name}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r ${getRoleColor(user.role)} bg-opacity-20 text-white text-sm`}>
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`badge ${user.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-white font-medium">{user.total_points || 0}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-gray-400">
                        {new Date(user.date_joined).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;

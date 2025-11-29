import React, { useState, useEffect, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Shield, Trash2, Edit2, Plus, Lock, Unlock, Eye, EyeOff, Search, Filter,
  Loader2, XCircle, UserCheck
} from 'lucide-react';
import apiClient from '../api/client';
import toast, { Toaster } from 'react-hot-toast'; // Import react-hot-toast

/**
 * Reducer for managing form state (add/edit user)
 */
const formReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_FORM_DATA':
      return { ...action.payload };
    case 'RESET_FORM':
      return { email: '', phone: '', role: 'user', status: 'active' };
    default:
      return state;
  }
};

const initialFormState = {
  email: '',
  phone: '',
  role: 'user',
  status: 'active'
};

/**
 * SuperAdminPanel - لوحة تحكم Super Admin المتقدمة
 */
const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // New filter for status

  const [showUserModal, setShowUserModal] = useState(false); // Unified modal for add/edit
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, dispatch] = useReducer(formReducer, initialFormState);

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/api/v1/admin/users');
      setUsers(response.data?.users || []);
    } catch (err) {
      setError('فشل في تحميل المستخدمين: ' + (err.response?.data?.message || err.message));
      toast.error('فشل في تحميل المستخدمين');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle form input changes
  const handleFormChange = (e) => {
    dispatch({ type: 'UPDATE_FIELD', field: e.target.name, value: e.target.value });
  };

  // Validate form data
  const validateFormData = () => {
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('الرجاء إدخال بريد إلكتروني صحيح.');
      return false;
    }
    if (!formData.phone && isEditing) { // Phone can be optional for existing users
        // No validation if phone is empty and editing
    } else if (formData.phone && !/^\+?[0-9]{7,15}$/.test(formData.phone)) {
        toast.error('الرجاء إدخال رقم هاتف صحيح.');
        return false;
    }
    return true;
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!validateFormData()) return;

    try {
      const response = await apiClient.post('/api/v1/admin/users', formData);
      setUsers([...users, response.data?.user]);
      dispatch({ type: 'RESET_FORM' });
      setShowUserModal(false);
      toast.success('تم إضافة المستخدم بنجاح!');
    } catch (err) {
      toast.error('فشل في إضافة المستخدم: ' + (err.response?.data?.message || err.message));
      console.error('Error adding user:', err);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!validateFormData()) return;

    try {
      const response = await apiClient.put(`/api/v1/admin/users/${selectedUser._id}`, formData);
      setUsers(users.map(u => u._id === selectedUser._id ? response.data?.user : u));
      setShowUserModal(false);
      setSelectedUser(null);
      dispatch({ type: 'RESET_FORM' });
      toast.success('تم تحديث المستخدم بنجاح!');
    } catch (err) {
      toast.error('فشل في تحديث المستخدم: ' + (err.response?.data?.message || err.message));
      console.error('Error updating user:', err);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      toast.error('الرجاء إدخال كلمة مرور جديدة.');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('يجب أن تكون كلمة المرور 6 أحرف على الأقل.');
      return;
    }
    try {
      await apiClient.put(`/api/v1/admin/users/${selectedUser._id}/password`, { password: newPassword });
      setShowPasswordModal(false);
      setNewPassword('');
      toast.success('تم تغيير كلمة المرور بنجاح!');
    } catch (err) {
      toast.error('فشل في تغيير كلمة المرور: ' + (err.response?.data?.message || err.message));
      console.error('Error changing password:', err);
    }
  };

  // Toggle Super Admin role
  const handleToggleSuperAdmin = async (userId, currentRole) => {
    const newRole = currentRole === 'super_admin' ? 'user' : 'super_admin';
    const confirmMessage = currentRole === 'super_admin'
      ? 'هل أنت متأكد من سحب صلاحيات Super Admin من هذا المستخدم؟'
      : 'هل أنت متأكد من منح صلاحيات Super Admin لهذا المستخدم؟';

    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await apiClient.put(`/api/v1/admin/users/${userId}/role`, { role: newRole });
      setUsers(users.map(u => u._id === userId ? response.data?.user : u));
      toast.success(newRole === 'super_admin' ? 'تم منح صلاحيات Super Admin بنجاح!' : 'تم سحب صلاحيات Super Admin بنجاح!');
    } catch (err) {
      toast.error('فشل في تغيير الصلاحيات: ' + (err.response?.data?.message || err.message));
      console.error('Error toggling Super Admin role:', err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد تمامًا من حذف هذا المستخدم؟ لا يمكن التراجع عن هذا الإجراء!')) return;
    try {
      await apiClient.delete(`/api/v1/admin/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
      toast.success('تم حذف المستخدم بنجاح!');
    } catch (err) {
      toast.error('فشل في حذف المستخدم: ' + (err.response?.data?.message || err.message));
      console.error('Error deleting user:', err);
    }
  };

  // Filtered users based on search term, role, and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.phone && user.phone.includes(searchTerm));
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Function to open add user modal
  const openAddUserModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    dispatch({ type: 'RESET_FORM' });
    setShowUserModal(true);
  };

  // Function to open edit user modal
  const openEditUserModal = (user) => {
    setIsEditing(true);
    setSelectedUser(user);
    dispatch({ type: 'SET_FORM_DATA', payload: { email: user.email, phone: user.phone || '', role: user.role, status: user.status } });
    setShowUserModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 font-sans">
      <Toaster position="top-right" reverseOrder={false} /> {/* Toast notifications */}
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Shield className="w-10 h-10 text-cyan-400" />
              <h1 className="text-4xl font-extrabold text-white">لوحة تحكم Super Admin</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddUserModal}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                إضافة مستخدم جديد
              </button>
              <button
                onClick={() => navigate('/dashboard/joe')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-lg font-bold shadow-lg transition-all"
              >
                إغلاق
              </button>
            </div>
          </div>
          <p className="text-gray-400 text-lg">إدارة شاملة للمستخدمين، الصلاحيات، والأدوار في نظامك.</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="ابحث عن المستخدم (البريد أو الهاتف)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
            >
              <option value="all">جميع الأدوار</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">مستخدم</option>
            </select>
          </div>
          <div className="relative">
            <UserCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">معطل</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 flex items-center gap-3">
            <XCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-cyan-400" />
              <p className="text-xl">جاري تحميل المستخدمين، الرجاء الانتظار...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-xl">لا توجد مستخدمون مطابقون لمعايير البحث أو التصفية.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-900/70">
                  <tr>
                    <th className="px-6 py-3 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">البريد الإلكتروني</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">الهاتف</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">الدور</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">الحالة</th>
                    <th className="px-6 py-3 text-right text-xs font-bold text-cyan-400 uppercase tracking-wider">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-700/40 transition-colors duration-200">
                      <td className="px-6 py-4 whitespace-nowrap text-white">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">{user.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === 'super_admin'
                            ? 'bg-red-500/20 text-red-400'
                            : user.role === 'admin'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'مستخدم'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          {/* Edit button */}
                          <button
                            onClick={() => openEditUserModal(user)}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md transition-all transform hover:scale-110"
                            title="تعديل"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Change password button */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowPasswordModal(true);
                              setNewPassword('');
                            }}
                            className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-md transition-all transform hover:scale-110"
                            title="تغيير كلمة المرور"
                          >
                            <Lock className="w-4 h-4" />
                          </button>

                          {/* Toggle Super Admin role button */}
                          <button
                            onClick={() => handleToggleSuperAdmin(user._id, user.role)}
                            className={`p-2 rounded-md transition-all transform hover:scale-110 ${
                              user.role === 'super_admin'
                                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                                : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                            }`}
                            title={user.role === 'super_admin' ? 'سحب صلاحيات Super Admin' : 'منح صلاحيات Super Admin'}
                          >
                            {user.role === 'super_admin' ? <Unlock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md transition-all transform hover:scale-110"
                            title="حذف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit User Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">
                {isEditing ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
              </h2>
              <form onSubmit={isEditing ? handleUpdateUser : handleAddUser} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">الدور</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                  >
                    <option value="user">مستخدم</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-2">الحالة</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white appearance-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">معطل</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-5">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-105"
                  >
                    {isEditing ? 'تحديث' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-105"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 max-w-md w-full shadow-2xl animate-scale-in">
              <h2 className="text-3xl font-bold text-white mb-6 text-center">تغيير كلمة المرور</h2>
              <p className="text-gray-400 mb-5 text-center">للمستخدم: <span className="font-semibold text-cyan-300">{selectedUser?.email}</span></p>
              <div className="mb-6 relative">
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">كلمة المرور الجديدة</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition-colors"
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 mt-4 text-gray-400 hover:text-gray-200 transition-colors"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleChangePassword}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-105"
                >
                  تغيير
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg shadow-md transition-all transform hover:scale-105"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPanel;

import React, { useState, useEffect } from 'react';
import { Users, Shield, Trash2, Edit2, Plus, Lock, Unlock, Eye, EyeOff, Search, Filter } from 'lucide-react';
import axios from 'axios';

/**
 * SuperAdminPanel - لوحة تحكم Super Admin المتقدمة
 * تتضمن:
 * - إدارة المستخدمين (إضافة، تعديل، حذف)
 * - إدارة الصلاحيات
 * - تغيير كلمات المرور
 * - منح/سحب صلاحيات Super Admin
 * - البحث والتصفية
 * - عرض السجلات
 */
const SuperAdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form state for adding/editing user
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    role: 'user',
    status: 'active'
  });

  // Fetch users
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/admin/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        }
      });
      setUsers(response.data.users || []);
      setError('');
    } catch (err) {
      setError('فشل في تحميل المستخدمين');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new user
  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/v1/admin/users', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        }
      });
      setUsers([...users, response.data.user]);
      setFormData({ email: '', phone: '', role: 'user', status: 'active' });
      setShowAddUser(false);
      alert('تم إضافة المستخدم بنجاح');
    } catch (err) {
      alert('فشل في إضافة المستخدم: ' + err.response?.data?.message);
    }
  };

  // Update user
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`/api/admin/users/${selectedUser._id}`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        }
      });
      setUsers(users.map(u => u._id === selectedUser._id ? response.data.user : u));
      setShowEditUser(false);
      setSelectedUser(null);
      alert('تم تحديث المستخدم بنجاح');
    } catch (err) {
      alert('فشل في تحديث المستخدم: ' + err.response?.data?.message);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (!newPassword.trim()) {
      alert('الرجاء إدخال كلمة مرور جديدة');
      return;
    }
    try {
      await axios.put(`/api/admin/users/${selectedUser._id}/password`, 
        { password: newPassword },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        }
      );
      setShowPasswordModal(false);
      setNewPassword('');
      alert('تم تغيير كلمة المرور بنجاح');
    } catch (err) {
      alert('فشل في تغيير كلمة المرور: ' + err.response?.data?.message);
    }
  };

  // Toggle Super Admin role
  const handleToggleSuperAdmin = async (userId, isSuperAdmin) => {
    try {
      const response = await axios.put(`/api/admin/users/${userId}/role`, 
        { role: isSuperAdmin ? 'user' : 'super_admin' },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
          }
        }
      );
      setUsers(users.map(u => u._id === userId ? response.data.user : u));
      alert(isSuperAdmin ? 'تم سحب صلاحيات Super Admin' : 'تم منح صلاحيات Super Admin');
    } catch (err) {
      alert('فشل في تغيير الصلاحيات: ' + err.response?.data?.message);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sessionToken')}`
        }
      });
      setUsers(users.filter(u => u._id !== userId));
      alert('تم حذف المستخدم بنجاح');
    } catch (err) {
      alert('فشل في حذف المستخدم: ' + err.response?.data?.message);
    }
  };

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone?.includes(searchTerm);
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              <h1 className="text-4xl font-bold text-white">لوحة تحكم Super Admin</h1>
            </div>
            <button
              onClick={() => {
                setShowAddUser(true);
                setFormData({ email: '', phone: '', role: 'user', status: 'active' });
              }}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-6 py-2 rounded-lg font-bold transition-all"
            >
              <Plus className="w-5 h-5" />
              إضافة مستخدم جديد
            </button>
          </div>
          <p className="text-gray-400">إدارة المستخدمين والصلاحيات والأدوار</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="ابحث عن المستخدم (البريد أو الهاتف)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="all">جميع الأدوار</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">مستخدم</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="inline-block animate-spin">
                <Users className="w-8 h-8" />
              </div>
              <p className="mt-2">جاري تحميل المستخدمين...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد مستخدمون</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700 bg-gray-900/50">
                    <th className="px-6 py-3 text-right text-sm font-bold text-cyan-400">البريد الإلكتروني</th>
                    <th className="px-6 py-3 text-right text-sm font-bold text-cyan-400">الهاتف</th>
                    <th className="px-6 py-3 text-right text-sm font-bold text-cyan-400">الدور</th>
                    <th className="px-6 py-3 text-right text-sm font-bold text-cyan-400">الحالة</th>
                    <th className="px-6 py-3 text-right text-sm font-bold text-cyan-400">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 text-white">{user.email}</td>
                      <td className="px-6 py-4 text-gray-400">{user.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          user.role === 'super_admin' 
                            ? 'bg-red-500/20 text-red-400' 
                            : user.role === 'admin'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'مستخدم'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          user.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.status === 'active' ? 'نشط' : 'معطل'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {/* Edit button */}
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setFormData({ email: user.email, phone: user.phone, role: user.role, status: user.status });
                              setShowEditUser(true);
                            }}
                            className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded transition-all"
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
                            className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded transition-all"
                            title="تغيير كلمة المرور"
                          >
                            <Lock className="w-4 h-4" />
                          </button>

                          {/* Toggle Super Admin button */}
                          <button
                            onClick={() => handleToggleSuperAdmin(user._id, user.role === 'super_admin')}
                            className={`p-2 rounded transition-all ${
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
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-all"
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
        {(showAddUser || showEditUser) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">
                {showAddUser ? 'إضافة مستخدم جديد' : 'تعديل المستخدم'}
              </h2>
              <form onSubmit={showAddUser ? handleAddUser : handleUpdateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">الهاتف</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">الدور</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="user">مستخدم</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-lg transition-all"
                  >
                    {showAddUser ? 'إضافة' : 'تحديث'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUser(false);
                      setShowEditUser(false);
                      setSelectedUser(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-all"
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-white mb-4">تغيير كلمة المرور</h2>
              <p className="text-gray-400 mb-4">للمستخدم: {selectedUser?.email}</p>
              <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-300 mb-2">كلمة المرور الجديدة</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="أدخل كلمة المرور الجديدة"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 text-gray-400 hover:text-gray-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleChangePassword}
                  className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 rounded-lg transition-all"
                >
                  تغيير
                </button>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                  }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition-all"
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

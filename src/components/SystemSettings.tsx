/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SheetSyncConfig, Student, ViolationRecord, WeeklyPlan, StudentTask, ViolationType, Teacher, SchoolYear, ClassItem, SystemUser } from '../types';
import { Settings, Users, ShieldAlert, Database, Plus, Trash2, CheckCircle2, Save, User, Calendar, BookOpen, GraduationCap, Edit2, Check, X, Sparkles, Key } from 'lucide-react';
import { getWeekConfig, saveWeekConfig } from '../utils/weekUtils';
import { db, onSnapshot, doc, setDoc, collection, getDocs } from '../lib/firebase';

interface SystemSettingsProps {
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  schoolYears: SchoolYear[];
  onUpdateSchoolYears: (years: SchoolYear[]) => void;
  classes: ClassItem[];
  onUpdateClasses: (classes: ClassItem[]) => void;
  activeSchoolYearId: string;
  onUpdateActiveSchoolYearId: (id: string) => void;
  activeClassId: string;
  onUpdateActiveClassId: (id: string) => void;
  violationTypes: ViolationType[];
  onUpdateViolationTypes: (types: ViolationType[]) => void;
  
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  violations: ViolationRecord[];
  onUpdateViolations: (violations: ViolationRecord[]) => void;
  plans: WeeklyPlan[];
  onUpdatePlans: (plans: WeeklyPlan[]) => void;
  tasks: StudentTask[];
  onUpdateTasks: (tasks: StudentTask[]) => void;
  adminPin: string;
  onUpdateAdminPin: (pin: string) => void;

  currentUser: SystemUser | null;
  onUpdateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  users: SystemUser[];
  onAddUser: (user: SystemUser) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
}

export default function SystemSettings({
  teachers,
  onUpdateTeachers,
  schoolYears,
  onUpdateSchoolYears,
  classes,
  onUpdateClasses,
  activeSchoolYearId,
  onUpdateActiveSchoolYearId,
  activeClassId,
  onUpdateActiveClassId,
  violationTypes,
  onUpdateViolationTypes,
  students,
  onUpdateStudents,
  violations,
  onUpdateViolations,
  plans,
  onUpdatePlans,
  tasks,
  onUpdateTasks,
  adminPin,
  onUpdateAdminPin,
  currentUser,
  onUpdateUserPassword,
  users,
  onAddUser,
  onDeleteUser
}: SystemSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'officers' | 'violations' | 'cleanup' | 'security'>('profile');

  // --- BAN CÁN SỰ LỚP (OFFICERS) STATE & HANDLERS IN SETTINGS ---
  const classStudents = students.filter(s => s.classId === activeClassId && (s.status === 'Đang học' || !s.status || s.status.trim() === ''));

  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [customRoles, setCustomRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    classStudents.forEach(s => {
      initial[s.id] = s.role || '';
    });
    setCustomRoles(initial);
  }, [students, activeClassId]);

  const handleAssignRoleSettings = (roleName: string, studentId: string) => {
    // Find previous officer of this role and clear it
    const updatedStudents = students.map(s => {
      if (s.classId === activeClassId && s.role === roleName) {
        return { ...s, role: undefined };
      }
      return s;
    });

    // If a student is selected (not empty), assign the role to them
    const finalStudents = updatedStudents.map(s => {
      if (s.id === studentId) {
        return { ...s, role: roleName };
      }
      return s;
    });

    onUpdateStudents(finalStudents);
    triggerMessage(`Đã cập nhật chức vụ ${roleName}`);
  };

  const handleUpdateStudentRoleSettings = (studentId: string, newRole: string) => {
    const finalStudents = students.map(s => {
      if (s.id === studentId) {
        return { ...s, role: newRole || undefined };
      }
      return s;
    });
    onUpdateStudents(finalStudents);
    triggerMessage(`Đã cập nhật chức vụ cho học sinh`);
  };

  // Password change states
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    
    if (!newPasswordInput) {
      setPasswordError('Mật khẩu mới không được trống!');
      return;
    }
    if (newPasswordInput.length < 6) {
      setPasswordError('Mật khẩu mới phải từ 6 ký tự trở lên!');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    try {
      if (currentUser && onUpdateUserPassword) {
        await onUpdateUserPassword(currentUser.id, newPasswordInput);
        setNewPasswordInput('');
        setConfirmPasswordInput('');
        triggerMessage('Đã cập nhật mật khẩu thành công!');
      } else {
        setPasswordError('Không thể thay đổi mật khẩu: Người dùng chưa xác thực.');
      }
    } catch (err) {
      setPasswordError('Đã xảy ra lỗi khi cập nhật mật khẩu!');
    }
  };

  // Support accounts states & handlers
  const [supportUsername, setSupportUsername] = useState('');
  const [supportPassword, setSupportPassword] = useState('');
  const [supportError, setSupportError] = useState('');

  const handleAddSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupportError('');
    if (!supportUsername.trim() || !supportPassword.trim()) {
      setSupportError('Vui lòng điền đầy đủ Tên đăng nhập và Mật khẩu!');
      return;
    }
    const cleanUsername = supportUsername.trim().toLowerCase();
    
    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,15}$/.test(cleanUsername)) {
      setSupportError('Tên đăng nhập chỉ gồm chữ, số, gạch dưới, từ 3-15 ký tự!');
      return;
    }

    if (users.some(u => u.ten.toLowerCase() === cleanUsername)) {
      setSupportError('Tên đăng nhập này đã tồn tại!');
      return;
    }
    if (supportPassword.length < 6) {
      setSupportError('Mật khẩu phải từ 6 ký tự trở lên!');
      return;
    }

    try {
      const newUser: SystemUser = {
        id: 'U' + Date.now(),
        stt: users.length + 1,
        ten: cleanUsername,
        matkhau: supportPassword,
        quyen: 'hotro'
      };
      await onAddUser(newUser);
      setSupportUsername('');
      setSupportPassword('');
      triggerMessage(`Đã thêm tài khoản hỗ trợ: ${cleanUsername}`);
    } catch (err) {
      setSupportError('Đã xảy ra lỗi khi thêm tài khoản!');
    }
  };

  const handleDeleteSupportUser = async (userId: string, username: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản hỗ trợ "${username}" không?`)) {
      try {
        await onDeleteUser(userId);
        triggerMessage(`Đã xóa tài khoản hỗ trợ: ${username}`);
      } catch (err) {
        triggerMessage(`Lỗi khi xóa tài khoản: ${err}`);
      }
    }
  };
  
  // Local inputs for additions
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newSchoolYearName, setNewSchoolYearName] = useState('');
  
  const [newClassName, setNewClassName] = useState('');
  const [newClassSchoolYearId, setNewClassSchoolYearId] = useState(activeSchoolYearId || schoolYears[0]?.id || '');
  const [newClassTeacherId, setNewClassTeacherId] = useState(teachers[0]?.id || '');

  // Local states for inline editing
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editingTeacherName, setEditingTeacherName] = useState('');

  const [editingSchoolYearId, setEditingSchoolYearId] = useState<string | null>(null);
  const [editingSchoolYearName, setEditingSchoolYearName] = useState('');

  // Local states for adding new violation types
  const [newViolationId, setNewViolationId] = useState('');
  const [newViolationLabel, setNewViolationLabel] = useState('');
  const [newViolationPoints, setNewViolationPoints] = useState(1);
  const [editingViolationTypeId, setEditingViolationTypeId] = useState<string | null>(null);

  // States for cleanup verification
  const [confirmDeleteRecords, setConfirmDeleteRecords] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);

  // Backup / Migrate States
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const triggerMessage = (text: string, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExportDatabase = async () => {
    try {
      setIsExporting(true);
      triggerMessage('Đang trích xuất dữ liệu từ Firestore...');
      
      const collectionsToExport = [
        'teachers',
        'schoolYears',
        'classes',
        'students',
        'violations',
        'violationTypes',
        'plans',
        'tasks',
        'academicUpdates',
        'users',
        'announcements'
      ];
      
      const exportData: Record<string, any> = {};
      
      for (const colName of collectionsToExport) {
        const querySnapshot = await getDocs(collection(db, colName));
        const docsList: any[] = [];
        querySnapshot.forEach((docSnap) => {
          docsList.push({ ...docSnap.data() });
        });
        exportData[colName] = docsList;
      }
      
      // Also get settings/global
      try {
        const settingsSnap = await getDocs(collection(db, 'settings'));
        const settingsList: any[] = [];
        settingsSnap.forEach((docSnap) => {
          settingsList.push({ id: docSnap.id, ...docSnap.data() });
        });
        exportData['settings'] = settingsList;
      } catch (err) {
        console.warn('Không thể xuất cấu hình global:', err);
      }

      // Create downloadable JSON blob
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `Du_Lieu_Quan_Ly_Hoc_Sinh_Firestore_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      triggerMessage('Đã xuất dữ liệu sao lưu thành công!');
    } catch (error: any) {
      console.error('Lỗi khi xuất dữ liệu:', error);
      triggerMessage(`Lỗi xuất dữ liệu: ${error.message || error}`, true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setIsImporting(true);
      setImportError(null);
      triggerMessage('Đang đọc tệp sao lưu...');
      
      const fileText = await file.text();
      const parsedData = JSON.parse(fileText);
      
      // Basic schema check
      if (!parsedData || typeof parsedData !== 'object') {
        throw new Error('Tệp JSON không hợp lệ.');
      }
      
      triggerMessage('Đang nhập dữ liệu vào Firestore (vui lòng chờ)...');
      
      // Clean and import teachers
      if (Array.isArray(parsedData.teachers)) {
        for (const t of parsedData.teachers) {
          if (t.id) await setDoc(doc(db, 'teachers', t.id), t);
        }
      }
      
      // Import schoolYears
      if (Array.isArray(parsedData.schoolYears)) {
        for (const sy of parsedData.schoolYears) {
          if (sy.id) await setDoc(doc(db, 'schoolYears', sy.id), sy);
        }
      }
      
      // Import classes
      if (Array.isArray(parsedData.classes)) {
        for (const c of parsedData.classes) {
          if (c.id) await setDoc(doc(db, 'classes', c.id), c);
        }
      }
      
      // Import students
      if (Array.isArray(parsedData.students)) {
        for (const s of parsedData.students) {
          if (s.id) await setDoc(doc(db, 'students', s.id), s);
        }
      }
      
      // Import violations
      if (Array.isArray(parsedData.violations)) {
        for (const v of parsedData.violations) {
          if (v.id) await setDoc(doc(db, 'violations', v.id), v);
        }
      }
      
      // Import violationTypes
      if (Array.isArray(parsedData.violationTypes)) {
        for (const vt of parsedData.violationTypes) {
          if (vt.id) await setDoc(doc(db, 'violationTypes', vt.id), vt);
        }
      }
      
      // Import plans
      if (Array.isArray(parsedData.plans)) {
        for (const p of parsedData.plans) {
          if (p.id) await setDoc(doc(db, 'plans', p.id), p);
        }
      }
      
      // Import tasks
      if (Array.isArray(parsedData.tasks)) {
        for (const t of parsedData.tasks) {
          if (t.id) await setDoc(doc(db, 'tasks', t.id), t);
        }
      }

      // Import academicUpdates
      if (Array.isArray(parsedData.academicUpdates)) {
        for (const au of parsedData.academicUpdates) {
          if (au.id) await setDoc(doc(db, 'academicUpdates', au.id), au);
        }
      }
      
      // Import users
      if (Array.isArray(parsedData.users)) {
        for (const u of parsedData.users) {
          if (u.id) await setDoc(doc(db, 'users', u.id), u);
        }
      }
      
      // Import announcements
      if (Array.isArray(parsedData.announcements)) {
        for (const ann of parsedData.announcements) {
          if (ann.id) await setDoc(doc(db, 'announcements', ann.id), ann);
        }
      }
      
      // Import settings
      if (Array.isArray(parsedData.settings)) {
        for (const setItem of parsedData.settings) {
          if (setItem.id) {
            const { id, ...rest } = setItem;
            await setDoc(doc(db, 'settings', id), rest);
          }
        }
      }
      
      triggerMessage('Nhập dữ liệu thành công! Ứng dụng đang tự động đồng bộ lại...', false);
      
      // Clear local storage items so they reload from Firestore freshly
      const keysToClear = [
        'app_students', 'app_violations', 'app_plans', 'app_tasks', 
        'app_teachers', 'app_school_years', 'app_classes', 
        'app_violation_types', 'app_academic_updates', 'app_users',
        'app_announcements'
      ];
      keysToClear.forEach(k => localStorage.removeItem(k));
      
      // Reload page to force immediate re-fetch of fresh Firestore data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Lỗi khi nhập dữ liệu:', error);
      setImportError(error.message || 'Lỗi không xác định khi tải tệp dữ liệu.');
      triggerMessage(`Lỗi nhập dữ liệu: ${error.message || error}`, true);
    } finally {
      setIsImporting(false);
      // Reset input value
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Local states for School Weeks dynamic distribution
  const [schoolYearStartDate, setSchoolYearStartDate] = useState(() => {
    return localStorage.getItem('schoolYearStartDate') || '2025-10-27';
  });
  const [totalSchoolWeeks, setTotalSchoolWeeks] = useState(() => {
    return parseInt(localStorage.getItem('totalSchoolWeeks') || '37', 10);
  });

  // Subscribe to real-time week configuration in Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'weeks'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startDate !== undefined) {
          setSchoolYearStartDate(data.startDate);
          localStorage.setItem('schoolYearStartDate', data.startDate);
        }
        if (data.totalWeeks !== undefined) {
          setTotalSchoolWeeks(data.totalWeeks);
          localStorage.setItem('totalSchoolWeeks', data.totalWeeks.toString());
        }
      }
    });
    return () => unsub();
  }, []);

  const handleSaveWeekConfig = () => {
    if (!schoolYearStartDate) {
      triggerMessage('Vui lòng chọn ngày bắt đầu của Tuần 1', true);
      return;
    }
    saveWeekConfig(schoolYearStartDate, totalSchoolWeeks);
    
    // Also save to Firestore!
    setDoc(doc(db, 'settings', 'weeks'), {
      startDate: schoolYearStartDate,
      totalWeeks: totalSchoolWeeks
    })
      .then(() => {
        triggerMessage('Đã cập nhật và đồng bộ cấu hình ngày bắt đầu học lên Web Công khai thành công!');
      })
      .catch(e => {
        console.error('Lỗi khi lưu cấu hình tuần lên Firestore:', e);
        triggerMessage('Có lỗi xảy ra khi đồng bộ lên máy chủ, nhưng đã lưu trên trình duyệt của bạn.', true);
      });
  };

  // 1. Teacher Management
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeacherName.trim();
    if (!name) return;
    if (teachers.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      triggerMessage('Giáo viên này đã tồn tại trong danh sách', true);
      return;
    }
    const newId = `GV0${teachers.length + 1}`;
    const updated = [...teachers, { id: newId, name }];
    onUpdateTeachers(updated);
    setNewTeacherName('');
    triggerMessage(`Đã thêm giáo viên: ${name}`);
  };

  const handleDeleteTeacher = (id: string) => {
    if (teachers.length <= 1) {
      triggerMessage('Danh sách phải có ít nhất một giáo viên', true);
      return;
    }
    // Check if being used by classes
    if (classes.some(c => c.teacherId === id)) {
      triggerMessage('Giáo viên này đang chủ nhiệm lớp học khác, không thể xóa!', true);
      return;
    }
    const updated = teachers.filter(t => t.id !== id);
    onUpdateTeachers(updated);
    triggerMessage(`Đã xóa giáo viên khỏi danh sách`);
  };

  const handleSaveTeacherEdit = (id: string) => {
    const trimmedName = editingTeacherName.trim();
    if (!trimmedName) {
      triggerMessage('Tên giáo viên không được để trống', true);
      return;
    }
    if (teachers.some(t => t.id !== id && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      triggerMessage('Giáo viên này đã tồn tại trong danh sách', true);
      return;
    }
    const updated = teachers.map(t => t.id === id ? { ...t, name: trimmedName } : t);
    onUpdateTeachers(updated);
    setEditingTeacherId(null);
    setEditingTeacherName('');
    triggerMessage(`Đã cập nhật tên giáo viên thành: ${trimmedName}`);
  };

  // 2. School Year Management
  const handleAddSchoolYear = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSchoolYearName.trim();
    if (!name) return;
    if (schoolYears.some(sy => sy.name === name)) {
      triggerMessage('Niên khóa này đã tồn tại', true);
      return;
    }
    const newId = `NH0${schoolYears.length + 1}`;
    const updated = [...schoolYears, { id: newId, name }];
    onUpdateSchoolYears(updated);
    setNewSchoolYearName('');
    triggerMessage(`Đã thêm niên khóa: ${name}`);
  };

  const handleDeleteSchoolYear = (id: string) => {
    if (schoolYears.length <= 1) {
      triggerMessage('Danh sách phải có ít nhất một niên khóa', true);
      return;
    }
    if (classes.some(c => c.schoolYearId === id)) {
      triggerMessage('Niên khóa này đang có các lớp học liên kết, không thể xóa!', true);
      return;
    }
    const updated = schoolYears.filter(sy => sy.id !== id);
    onUpdateSchoolYears(updated);
    if (activeSchoolYearId === id) {
      onUpdateActiveSchoolYearId(updated[0].id);
    }
    triggerMessage(`Đã xóa niên khóa`);
  };

  const handleSaveSchoolYearEdit = (id: string) => {
    const trimmedName = editingSchoolYearName.trim();
    if (!trimmedName) {
      triggerMessage('Tên niên khóa không được để trống', true);
      return;
    }
    if (schoolYears.some(sy => sy.id !== id && sy.name === trimmedName)) {
      triggerMessage('Niên khóa này đã tồn tại', true);
      return;
    }
    const updated = schoolYears.map(sy => sy.id === id ? { ...sy, name: trimmedName } : sy);
    onUpdateSchoolYears(updated);
    setEditingSchoolYearId(null);
    setEditingSchoolYearName('');
    triggerMessage(`Đã cập nhật tên niên khóa thành: ${trimmedName}`);
  };

  // 3. Class Management
  const handleAddClassItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newClassName.trim();
    const syId = newClassSchoolYearId || activeSchoolYearId || schoolYears[0]?.id;
    const tId = newClassTeacherId || teachers[0]?.id;

    if (!name) {
      triggerMessage('Vui lòng điền tên lớp', true);
      return;
    }
    if (!syId || !tId) {
      triggerMessage('Niên khóa hoặc giáo viên chưa sẵn sàng', true);
      return;
    }

    // Check duplicate class in same school year
    if (classes.some(c => c.name.toLowerCase() === name.toLowerCase() && c.schoolYearId === syId)) {
      triggerMessage(`Lớp học "${name}" đã tồn tại trong niên khóa này`, true);
      return;
    }

    const newId = `LH_${name.replace(/\s+/g, '')}_${schoolYears.find(y => y.id === syId)?.name.replace('-', '_') || 'NH'}`;
    const newClass: ClassItem = {
      id: newId,
      name,
      schoolYearId: syId,
      teacherId: tId
    };

    const updated = [...classes, newClass];
    onUpdateClasses(updated);
    setNewClassName('');
    triggerMessage(`Đã tạo liên kết thành công lớp ${name}!`);
  };

  const handleDeleteClassItem = (id: string) => {
    if (classes.length <= 1) {
      triggerMessage('Phải giữ lại ít nhất một lớp học', true);
      return;
    }
    const updated = classes.filter(c => c.id !== id);
    onUpdateClasses(updated);
    if (activeClassId === id) {
      onUpdateActiveClassId(updated[0].id);
    }
    triggerMessage(`Đã xóa lớp học`);
  };

  // Violation Catalog managers
  const handleAddViolationType = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newViolationId.trim();
    const label = newViolationLabel.trim();
    if (!id || !label) {
      triggerMessage('Vui lòng điền đầy đủ Mã lỗi và Tên lỗi vi phạm', true);
      return;
    }

    if (editingViolationTypeId) {
      // Check duplicate ID other than the one being edited
      if (id.toLowerCase() !== editingViolationTypeId.toLowerCase() &&
          violationTypes.some(vt => vt.id.toLowerCase() === id.toLowerCase())) {
        triggerMessage(`Mã lỗi "${id}" đã tồn tại ở hành vi khác!`, true);
        return;
      }
      const updated = violationTypes.map(vt => 
        vt.id === editingViolationTypeId 
          ? { id, label, defaultPoints: -Math.abs(newViolationPoints) }
          : vt
      );
      onUpdateViolationTypes(updated);
      setEditingViolationTypeId(null);
      triggerMessage(`Đã cập nhật lỗi vi phạm "${label}"`);
    } else {
      if (violationTypes.some(vt => vt.id.toLowerCase() === id.toLowerCase())) {
        triggerMessage(`Mã lỗi "${id}" đã tồn tại!`, true);
        return;
      }
      const newType: ViolationType = {
        id,
        label,
        defaultPoints: -Math.abs(newViolationPoints) // Ensure negative subtraction
      };
      onUpdateViolationTypes([...violationTypes, newType]);
      triggerMessage(`Đã thêm lỗi vi phạm "${label}"`);
    }
    setNewViolationId('');
    setNewViolationLabel('');
    setNewViolationPoints(1);
  };

  const startEditViolationType = (vt: ViolationType) => {
    setEditingViolationTypeId(vt.id);
    setNewViolationId(vt.id);
    setNewViolationLabel(vt.label);
    setNewViolationPoints(Math.abs(vt.defaultPoints));
  };

  const handleDeleteViolationType = (id: string) => {
    if (violationTypes.length <= 1) {
      triggerMessage('Phải giữ lại ít nhất một loại lỗi vi phạm mặc định', true);
      return;
    }
    onUpdateViolationTypes(violationTypes.filter(vt => vt.id !== id));
    if (editingViolationTypeId === id) {
      setEditingViolationTypeId(null);
      setNewViolationId('');
      setNewViolationLabel('');
      setNewViolationPoints(1);
    }
    triggerMessage(`Đã xóa lỗi vi phạm mã: ${id}`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm animate-fadeIn space-y-6">
      
      {/* Settings Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
        <div>
          <h3 className="text-lg font-serif italic text-slate-800 flex items-center gap-2">
            <Settings size={18} className="text-amber-500" /> Cài đặt & Quản lý Hệ thống
          </h3>
          <p className="text-xs text-slate-500 mt-1">Cơ sở dữ liệu dạng cây liên kết: Giáo viên - Niên khóa - Lớp chủ nhiệm - Học sinh</p>
        </div>
        
        {/* Sub tabs select controls */}
        <div className="flex flex-wrap gap-1 bg-slate-50 border border-slate-200 p-1 rounded-full text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'profile' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={14} /> Bảng Liên Kết & Quản Lý
          </button>
          <button
            onClick={() => setActiveSubTab('officers')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'officers' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User size={14} /> Ban Cán Sự Lớp
          </button>
          <button
            onClick={() => setActiveSubTab('violations')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'violations' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert size={14} /> Danh mục lỗi phạt
          </button>
          <button
            onClick={() => setActiveSubTab('cleanup')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'cleanup' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trash2 size={14} /> Dọn dẹp dữ liệu
          </button>
          <button
            onClick={() => setActiveSubTab('security')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'security' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key size={14} /> Bảo mật tài khoản
          </button>
        </div>
      </div>

      {/* Action Notification Alert Toast */}
      {message && (
        <div className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
          message.isError ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <CheckCircle2 size={16} />
          <span>{message.text}</span>
        </div>
      )}

      {/* SUB TAB CONTENT */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          
          {/* Quick Active Selectors for convenience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block">Niên khóa Đang xem</label>
              <select
                id="settings-active-year-select"
                value={activeSchoolYearId}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateActiveSchoolYearId(val);
                  // Auto choose first class in this year
                  const firstClass = classes.find(c => c.schoolYearId === val);
                  if (firstClass) onUpdateActiveClassId(firstClass.id);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
              >
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block">Lớp Đang xem (Lọc theo Niên khóa)</label>
              <select
                id="settings-active-class-select"
                value={activeClassId}
                onChange={(e) => onUpdateActiveClassId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {classes.filter(c => c.schoolYearId === activeSchoolYearId).map(c => {
                  const teacher = teachers.find(t => t.id === c.teacherId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {teacher ? `(${teacher.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Cấu hình Tuần học Niên khóa (Dynamic Distribution) */}
          <div className="bg-slate-50 border border-amber-200 hover:border-amber-300 p-5 rounded-3xl space-y-4 shadow-sm transition-all">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200">
              <Calendar size={18} className="text-amber-600" />
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cấu hình Tuần học Niên khóa</h3>
                <p className="text-[10px] text-slate-500">Thiết lập ngày bắt đầu của tuần học đầu tiên để tự động phân phối 37/38 tuần thực học cho toàn năm học.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block">Ngày bắt đầu Tuần 1 (Thứ Hai) <span className="text-rose-500">*</span></label>
                <input
                  type="date"
                  value={schoolYearStartDate}
                  onChange={(e) => setSchoolYearStartDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block">Số tuần thực học của năm</label>
                <select
                  value={totalSchoolWeeks}
                  onChange={(e) => setTotalSchoolWeeks(parseInt(e.target.value, 10))}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={35}>35 Tuần (Học kỳ I: 18 tuần, Học kỳ II: 17 tuần)</option>
                  <option value={36}>36 Tuần (Thời lượng kéo dài)</option>
                  <option value={37}>37 Tuần (Thời lượng tiêu chuẩn THPT)</option>
                  <option value={38}>38 Tuần (Thời lượng mở rộng THPT)</option>
                  <option value={39}>39 Tuần (Thời lượng bổ trợ)</option>
                  <option value={40}>40 Tuần (Thời lượng tăng cường)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveWeekConfig}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-black font-bold rounded-xl transition text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <Sparkles size={14} /> Lưu Cấu hình Tuần học
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Column 1: School Years Manager */}
            <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                  <Calendar size={16} className="text-amber-500" />
                  <h4 className="text-xs uppercase tracking-widest text-white font-semibold">1. Niên khóa (School Years)</h4>
                </div>
                
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {schoolYears.map(sy => (
                    editingSchoolYearId === sy.id ? (
                      <div key={sy.id} className="flex items-center justify-between p-2 bg-white/[0.03] border border-amber-500/30 rounded-xl transition text-sm gap-2">
                        <input
                          type="text"
                          value={editingSchoolYearName}
                          onChange={(e) => setEditingSchoolYearName(e.target.value)}
                          className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveSchoolYearEdit(sy.id);
                            if (e.key === 'Escape') setEditingSchoolYearId(null);
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveSchoolYearEdit(sy.id)}
                            className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-500/10 transition"
                            title="Lưu"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSchoolYearId(null)}
                            className="text-white/40 hover:text-white/60 p-1 rounded hover:bg-white/10 transition"
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={sy.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl transition text-sm">
                        <span className={activeSchoolYearId === sy.id ? 'text-amber-500 font-semibold font-mono' : 'text-white/80 font-mono'}>
                          {sy.name} {activeSchoolYearId === sy.id && ' (Active)'}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSchoolYearId(sy.id);
                              setEditingSchoolYearName(sy.name);
                            }}
                            className="text-white/20 hover:text-amber-400 p-1 rounded-lg hover:bg-amber-500/5 transition"
                            title="Sửa niên khóa"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSchoolYear(sy.id)}
                            className="text-white/20 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/5 transition"
                            title="Xóa niên khóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Form to add School Year */}
              <form onSubmit={handleAddSchoolYear} className="flex gap-2 pt-2 border-t border-white/5">
                <input
                  id="settings-new-year-input"
                  type="text"
                  value={newSchoolYearName}
                  onChange={(e) => setNewSchoolYearName(e.target.value)}
                  placeholder="Ví dụ: 2026-2027"
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Thêm
                </button>
              </form>
            </div>

            {/* Column 2: Teachers Manager */}
            <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                  <User size={16} className="text-amber-500" />
                  <h4 className="text-xs uppercase tracking-widest text-white font-semibold">2. Giáo viên (Teachers)</h4>
                </div>
                
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {teachers.map(t => (
                    editingTeacherId === t.id ? (
                      <div key={t.id} className="flex items-center justify-between p-2 bg-white/[0.03] border border-amber-500/30 rounded-xl transition text-sm gap-2">
                        <input
                          type="text"
                          value={editingTeacherName}
                          onChange={(e) => setEditingTeacherName(e.target.value)}
                          className="flex-1 bg-black/40 border border-white/10 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveTeacherEdit(t.id);
                            if (e.key === 'Escape') setEditingTeacherId(null);
                          }}
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSaveTeacherEdit(t.id)}
                            className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-emerald-500/10 transition"
                            title="Lưu"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTeacherId(null)}
                            className="text-white/40 hover:text-white/60 p-1 rounded hover:bg-white/10 transition"
                            title="Hủy"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div key={t.id} className="flex items-center justify-between p-2.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl transition text-sm">
                        <span className="text-white font-medium">{t.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTeacherId(t.id);
                              setEditingTeacherName(t.name);
                            }}
                            className="text-white/20 hover:text-amber-400 p-1 rounded-lg hover:bg-amber-500/5 transition"
                            title="Sửa tên giáo viên"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="text-white/20 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/5 transition"
                            title="Xóa giáo viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Form to add Teacher */}
              <form onSubmit={handleAddTeacher} className="flex gap-2 pt-2 border-t border-white/5">
                <input
                  id="settings-new-teacher-input"
                  type="text"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  placeholder="Ví dụ: Thầy Trần Hùng"
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-1 shrink-0"
                >
                  <Plus size={14} /> Thêm
                </button>
              </form>
            </div>

            {/* Column 3: Classes Linked Manager */}
            <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
                  <GraduationCap size={16} className="text-amber-500" />
                  <h4 className="text-xs uppercase tracking-widest text-white font-semibold">3. Lớp & Liên kết (Classes)</h4>
                </div>
                
                <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {classes.map(c => {
                    const sy = schoolYears.find(y => y.id === c.schoolYearId);
                    const teacher = teachers.find(t => t.id === c.teacherId);
                    return (
                      <div key={c.id} className="flex flex-col p-2.5 bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 rounded-xl transition text-xs space-y-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className={activeClassId === c.id ? 'text-amber-500 font-semibold text-sm' : 'text-white/80 text-sm'}>
                            {c.name} {activeClassId === c.id && ' (Active)'}
                          </span>
                          <button
                            onClick={() => handleDeleteClassItem(c.id)}
                            className="text-white/20 hover:text-rose-400 p-1 rounded-lg group-hover:opacity-100 transition absolute right-2 top-2"
                            title="Xóa lớp học"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="text-[10px] text-white/40 flex justify-between pr-6 font-mono">
                          <span>Năm: {sy ? sy.name : 'N/A'}</span>
                          <span>GVCN: {teacher ? teacher.name : 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form to add Linked Class */}
              <form onSubmit={handleAddClassItem} className="space-y-2 pt-2 border-t border-white/5">
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    id="new-class-year"
                    value={newClassSchoolYearId}
                    onChange={(e) => setNewClassSchoolYearId(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/5 rounded-xl px-2 py-1 text-[10px] text-white/80 font-mono cursor-pointer"
                  >
                    <option value="">-- Niên khóa --</option>
                    {schoolYears.map(y => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                  <select
                    id="new-class-teacher"
                    value={newClassTeacherId}
                    onChange={(e) => setNewClassTeacherId(e.target.value)}
                    className="bg-[#1a1a1a] border border-white/5 rounded-xl px-2 py-1 text-[10px] text-white/80 cursor-pointer"
                  >
                    <option value="">-- GVCN --</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-1.5">
                  <input
                    id="settings-new-class-input"
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="Ví dụ: Lớp 11A3"
                    className="flex-1 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center gap-0.5 shrink-0"
                  >
                    <Plus size={12} /> Liên kết
                  </button>
                </div>
              </form>
            </div>

          </div>



        </div>
      )}

      {activeSubTab === 'officers' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block font-bold">Niên khóa</label>
              <select
                value={activeSchoolYearId}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateActiveSchoolYearId(val);
                  const firstClass = classes.find(c => c.schoolYearId === val);
                  if (firstClass) onUpdateActiveClassId(firstClass.id);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer font-mono"
              >
                {schoolYears.map(y => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 block font-bold">Lớp chủ nhiệm</label>
              <select
                value={activeClassId}
                onChange={(e) => onUpdateActiveClassId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                {classes.filter(c => c.schoolYearId === activeSchoolYearId).map(c => {
                  const teacher = teachers.find(t => t.id === c.teacherId);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {teacher ? `(${teacher.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {classStudents.length === 0 ? (
            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <ShieldAlert className="mx-auto text-amber-500" size={32} />
              <h4 className="text-sm font-bold text-slate-800">Chưa có học sinh cho lớp này</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Vui lòng chuyển sang tab <strong>Bảng Liên Kết & Quản Lý</strong> để thêm danh sách học sinh trước khi phân công chức vụ.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Grid of Key Officer Assignments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ban cán sự chủ chốt */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="border-b border-slate-200 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
                      <User size={14} /> Ban Cán Sự Chủ Chốt (Cả Lớp)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Lớp trưởng', roleName: 'Lớp trưởng' },
                      { label: 'Lớp phó Học tập', roleName: 'Lớp phó Học tập' },
                      { label: 'Lớp phó Kỷ luật', roleName: 'Lớp phó Kỷ luật' },
                      { label: 'Lớp phó Lao động', roleName: 'Lớp phó Lao động' },
                      { label: 'Lớp phó Văn thể mỹ', roleName: 'Lớp phó Văn thể mỹ' },
                      { label: 'Thủ quỹ', roleName: 'Thủ quỹ' },
                      { label: 'Bí thư Chi đoàn', roleName: 'Bí thư Chi đoàn' }
                    ].map(role => {
                      const currentOfficer = classStudents.find(s => s.role === role.roleName);
                      return (
                        <div key={role.roleName} className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 block">{role.label}</label>
                          <select
                            value={currentOfficer?.id || ''}
                            onChange={(e) => handleAssignRoleSettings(role.roleName, e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="">-- Chưa phân công --</option>
                            {classStudents.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ban cán sự Tổ */}
                <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                  <div className="border-b border-slate-200 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-2">
                      <Users size={14} /> Ban Cán Sự Tổ (Tổ Trưởng & Tổ Phó)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Tổ trưởng Tổ 1', roleName: 'Tổ trưởng Tổ 1', group: 'Tổ 1' },
                      { label: 'Tổ phó Tổ 1', roleName: 'Tổ phó Tổ 1', group: 'Tổ 1' },
                      { label: 'Tổ trưởng Tổ 2', roleName: 'Tổ trưởng Tổ 2', group: 'Tổ 2' },
                      { label: 'Tổ phó Tổ 2', roleName: 'Tổ phó Tổ 2', group: 'Tổ 2' },
                      { label: 'Tổ trưởng Tổ 3', roleName: 'Tổ trưởng Tổ 3', group: 'Tổ 3' },
                      { label: 'Tổ phó Tổ 3', roleName: 'Tổ phó Tổ 3', group: 'Tổ 3' },
                      { label: 'Tổ trưởng Tổ 4', roleName: 'Tổ trưởng Tổ 4', group: 'Tổ 4' },
                      { label: 'Tổ phó Tổ 4', roleName: 'Tổ phó Tổ 4', group: 'Tổ 4' }
                    ].map(role => {
                      const groupStudents = classStudents.filter(s => s.groupName === role.group);
                      const currentOfficer = classStudents.find(s => s.role === role.roleName);
                      return (
                        <div key={role.roleName} className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-500 block">
                            {role.label} <span className="text-slate-400">({role.group})</span>
                          </label>
                          <select
                            value={currentOfficer?.id || ''}
                            onChange={(e) => handleAssignRoleSettings(role.roleName, e.target.value)}
                            className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="">-- Chưa phân công --</option>
                            {groupStudents.map(s => (
                              <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                            ))}
                          </select>
                          {groupStudents.length === 0 && (
                            <span className="text-[9px] text-rose-500 block">Chưa phân tổ hoặc chưa có học sinh trong {role.group}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Detailed custom list */}
              <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Danh sách chức danh chi tiết học sinh
                    </h4>
                    <p className="text-[10px] text-slate-400">Nhập trực tiếp để thay đổi hoặc đặt chức vụ tùy chỉnh nhanh cho học sinh.</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Tìm kiếm học sinh..."
                      value={officerSearchQuery}
                      onChange={(e) => setOfficerSearchQuery(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Mã HS</th>
                        <th className="py-2.5 px-3">Họ và Tên</th>
                        <th className="py-2.5 px-3">Tổ</th>
                        <th className="py-2.5 px-3">Chức vụ hiện tại</th>
                        <th className="py-2.5 px-3 w-1/3">Cập nhật chức vụ tùy chỉnh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents
                        .filter(s => {
                          if (!officerSearchQuery.trim()) return true;
                          const q = officerSearchQuery.toLowerCase();
                          return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
                        })
                        .map(s => {
                          return (
                            <tr key={s.id} className="text-xs hover:bg-slate-100/50">
                              <td className="py-3 px-3 font-mono text-slate-400">{s.id}</td>
                              <td className="py-3 px-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="py-3 px-3">
                                {s.groupName ? (
                                  <span className="px-2 py-0.5 bg-slate-200/60 rounded text-[10px] text-slate-600">
                                    {s.groupName}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">Chưa phân tổ</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {s.role ? (
                                  <span className="px-2 py-0.5 bg-amber-100 border border-amber-200 text-amber-700 rounded text-[10px] font-bold">
                                    {s.role}
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">Học sinh</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  placeholder="Nhập chức vụ khác..."
                                  value={customRoles[s.id] ?? ''}
                                  onChange={(e) => {
                                    setCustomRoles(prev => ({ ...prev, [s.id]: e.target.value }));
                                  }}
                                  onBlur={() => {
                                    const newRole = customRoles[s.id]?.trim();
                                    if ((newRole || undefined) !== s.role) {
                                      handleUpdateStudentRoleSettings(s.id, newRole);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'violations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add custom violation catalog item */}
          <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
              {editingViolationTypeId ? (
                <Edit2 size={16} className="text-amber-500" />
              ) : (
                <Plus size={16} className="text-amber-500" />
              )}
              <h4 className="text-xs uppercase tracking-widest text-white font-semibold">
                {editingViolationTypeId ? 'Cập nhật hành vi vi phạm' : 'Thêm hành vi vi phạm mới'}
              </h4>
            </div>
            
            <form onSubmit={handleAddViolationType} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block">Mã lỗi vi phạm (Không dấu, viết liền)</label>
                <input
                  id="settings-violation-id"
                  type="text"
                  value={newViolationId}
                  onChange={(e) => setNewViolationId(e.target.value)}
                  placeholder="Ví dụ: DiDong, DiTre, NoiChuyen"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block">Tên lỗi vi phạm cụ thể</label>
                <input
                  id="settings-violation-label"
                  type="text"
                  value={newViolationLabel}
                  onChange={(e) => setNewViolationLabel(e.target.value)}
                  placeholder="Ví dụ: Sử dụng điện thoại trong giờ học"
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block">Số điểm trừ mặc định</label>
                <input
                  id="settings-violation-points"
                  type="number"
                  min="1"
                  max="10"
                  value={newViolationPoints}
                  onChange={(e) => setNewViolationPoints(parseInt(e.target.value) || 1)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-[10px] text-rose-400 italic">Hệ thống sẽ trừ {newViolationPoints} điểm khi học sinh mắc lỗi này.</span>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  {editingViolationTypeId ? <Save size={14} /> : <Plus size={14} />}
                  <span>{editingViolationTypeId ? 'Cập nhật' : 'Thêm vào danh mục'}</span>
                </button>
                {editingViolationTypeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingViolationTypeId(null);
                      setNewViolationId('');
                      setNewViolationLabel('');
                      setNewViolationPoints(1);
                    }}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition text-xs border border-white/10"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* List custom violation catalog items */}
          <div className="bg-[#121212] rounded-2xl border border-white/5 p-5 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2 mb-2 border-b border-white/5 pb-2">
              <ShieldAlert size={16} className="text-amber-500" />
              <h4 className="text-xs uppercase tracking-widest text-white font-semibold">Danh mục lỗi vi phạm hiện hành</h4>
            </div>

            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-white/5 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-white/[0.02] text-white/40 font-mono uppercase tracking-widest border-b border-white/5">
                    <th className="p-3">Mã lỗi</th>
                    <th className="p-3">Tên hành vi vi phạm</th>
                    <th className="p-3 text-center">Mức phạt (Điểm)</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {violationTypes.map(vt => (
                    <tr key={vt.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-500">{vt.id}</td>
                      <td className="p-3 text-white/80 font-medium">{vt.label}</td>
                      <td className="p-3 text-center font-mono text-rose-400 font-semibold">{vt.defaultPoints}đ</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEditViolationType(vt)}
                            className="text-white/20 hover:text-amber-400 p-1.5 rounded-lg hover:bg-amber-500/5 transition"
                            title="Sửa lỗi vi phạm"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteViolationType(vt.id)}
                            className="text-white/20 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/5 transition"
                            title="Xóa loại vi phạm"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}



      {activeSubTab === 'cleanup' && (
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4">
            <span className="text-amber-500 shrink-0 text-2xl">⚠️</span>
            <div>
              <h4 className="text-sm font-bold text-white">Cảnh báo quan trọng trước khi xóa dữ liệu</h4>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">
                Tất cả dữ liệu bị xóa tại đây sẽ mất vĩnh viễn trên thiết bị này và không thể phục hồi. 
                Thao tác này sẽ dọn dẹp sạch cơ sở dữ liệu Firestore và bộ nhớ cục bộ của bạn.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Option 1: Clear records, keep setup */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-lg">🧹</span>
                  <h4 className="text-sm font-semibold text-white">1. Chỉ xóa dữ liệu học sinh & hồ sơ nề nếp</h4>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Lựa chọn này sẽ xóa hoàn toàn danh sách học sinh, lịch sử vi phạm, kế hoạch tuần và nhiệm vụ được giao. 
                  Tuy nhiên, nó sẽ <strong className="text-emerald-400">giữ nguyên cấu trúc các lớp học, niên khóa và giáo viên</strong> mà bạn đã tạo lập.
                </p>
                <div className="bg-white/[0.02] p-3 rounded-xl border border-white/5 text-[11px] text-white/40 space-y-1">
                  <div>• Học sinh hiện có: <strong className="text-white">{students.length}</strong> học sinh</div>
                  <div>• Bản ghi nề nếp: <strong className="text-white">{violations.length}</strong> bản ghi</div>
                  <div>• Kế hoạch tuần: <strong className="text-white">{plans.length}</strong> kế hoạch</div>
                  <div>• Nhiệm vụ: <strong className="text-white">{tasks.length}</strong> nhiệm vụ</div>
                </div>
              </div>

              <div className="pt-2">
                {!confirmDeleteRecords ? (
                  <button
                    onClick={() => setConfirmDeleteRecords(true)}
                    className="w-full py-2.5 bg-rose-950 hover:bg-rose-900 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    🗑️ Xóa sạch Hồ sơ học sinh & Nề nếp
                  </button>
                ) : (
                  <div className="space-y-2 animate-fadeIn">
                    <p className="text-[10px] text-rose-400 text-center font-semibold">⚠️ Xác nhận: Bạn chắc chắn muốn xóa vĩnh viễn toàn bộ học sinh & nề nếp?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onUpdateStudents([]);
                          onUpdateViolations([]);
                          onUpdatePlans([]);
                          onUpdateTasks([]);
                          setConfirmDeleteRecords(false);
                          triggerMessage('Đã dọn dẹp sạch toàn bộ hồ sơ học sinh & nề nếp!');
                        }}
                        className="py-2 bg-rose-600 hover:bg-rose-500 text-black text-xs font-bold rounded-xl transition"
                      >
                        Đúng, Xóa Ngay
                      </button>
                      <button
                        onClick={() => setConfirmDeleteRecords(false)}
                        className="py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Option 2: Full reset */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                  <span className="text-lg font-bold">🔥</span>
                  <h4 className="text-sm font-semibold text-white text-rose-400">2. Reset toàn bộ hệ thống về con số 0</h4>
                </div>
                <p className="text-xs text-white/50 leading-relaxed">
                  Thực hiện khôi phục hệ thống về trạng thái trắng tinh nguyên bản. Xóa sạch mọi dữ liệu bao gồm cả học sinh, nề nếp, kế hoạch, nhiệm vụ, cũng như <strong className="text-rose-400">tất cả lớp học, niên khóa và danh sách giáo viên</strong>.
                </p>
                <p className="text-[11px] text-amber-400/80 leading-relaxed italic">
                  * Hệ thống sẽ tự động khôi phục một niên khóa mẫu (2025-2026) và một lớp học mẫu (Lớp 11A1 - Cô Nguyễn Tuyết Mai) trống để tránh các lỗi logic hiển thị.
                </p>
              </div>

              <div className="pt-2">
                {!confirmResetAll ? (
                  <button
                    onClick={() => setConfirmResetAll(true)}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    🔥 Khôi phục cài đặt gốc (Reset tuyệt đối)
                  </button>
                ) : (
                  <div className="space-y-2 animate-fadeIn">
                    <p className="text-[10px] text-rose-400 text-center font-semibold">⚠️ CẢNH BÁO: Thao tác này sẽ xóa sạch cả danh mục lớp và giáo viên!</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          onUpdateStudents([]);
                          onUpdateViolations([]);
                          onUpdatePlans([]);
                          onUpdateTasks([]);
                          
                          const defaultTeachers = [{ id: 'GV01', name: 'Cô Nguyễn Tuyết Mai' }];
                          const defaultYears = [{ id: 'NH01', name: '2025-2026' }];
                          const defaultClasses = [{
                            id: 'LH_LH01_2025_2026',
                            name: 'Lớp 11A1',
                            schoolYearId: 'NH01',
                            teacherId: 'GV01'
                          }];

                          onUpdateTeachers(defaultTeachers);
                          onUpdateSchoolYears(defaultYears);
                          onUpdateClasses(defaultClasses);
                          onUpdateActiveSchoolYearId('NH01');
                          onUpdateActiveClassId('LH_LH01_2025_2026');

                          setConfirmResetAll(false);
                          triggerMessage('Hệ thống đã được khôi phục về trạng thái trống ban đầu!');
                        }}
                        className="py-2 bg-red-600 hover:bg-red-500 text-black text-xs font-bold rounded-xl transition"
                      >
                        Xác nhận Reset Gốc
                      </button>
                      <button
                        onClick={() => setConfirmResetAll(false)}
                        className="py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Section 3: Backup & Migration to Vercel/Production */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm text-left mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">💾</span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Sao lưu & Di chuyển dữ liệu (Backup / Migration)</h4>
                  <p className="text-[10px] text-slate-500">Xuất toàn bộ cơ sở dữ liệu Firestore ra tệp JSON để lưu trữ hoặc nhập sang ứng dụng đã deploy trên Vercel khác</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Export Panel */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between space-y-3 shadow-inner">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    📤 Xuất dữ liệu (Export)
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Tải về tệp sao lưu dạng <strong className="font-mono text-slate-700">.json</strong> chứa toàn bộ thông tin niên khóa, giáo viên, học sinh, hồ sơ nề nếp, kế hoạch tuần và tin tức hiện hành từ Firestore.
                  </p>
                </div>
                <button
                  onClick={handleExportDatabase}
                  disabled={isExporting}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
                >
                  {isExporting ? '⏳ Đang xử lý...' : '⬇️ Tải về tệp dữ liệu .json'}
                </button>
              </div>

              {/* Import Panel */}
              <div className="bg-white border border-slate-200 p-5 rounded-xl flex flex-col justify-between space-y-3 shadow-inner">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
                    📥 Nhập dữ liệu (Import / Restore)
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Chọn tệp sao lưu <strong className="font-mono text-slate-700">.json</strong> từ máy của bạn để ghi đè hoặc khôi phục lại cơ sở dữ liệu Firestore của ứng dụng này. 
                  </p>
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">
                    ⚠️ Lưu ý: Thao tác này sẽ ghi đè và làm mới lại toàn bộ dữ liệu hiện có trong Firestore!
                  </p>
                </div>
                
                <div className="relative">
                  <input
                    type="file"
                    accept=".json"
                    id="import-backup-file"
                    onChange={handleImportDatabase}
                    disabled={isImporting}
                    className="hidden"
                  />
                  <label
                    htmlFor="import-backup-file"
                    className={`w-full py-2.5 border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/80 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                      isImporting ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    {isImporting ? '⏳ Đang ghi dữ liệu...' : '📁 Tải tệp lên & Khôi phục'}
                  </label>
                </div>
              </div>
            </div>

            {importError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                Lỗi nhập dữ liệu: {importError}
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'security' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-fadeIn text-left">
          {/* Card 1: Đổi mật khẩu (Only for caocap admin or if requested) */}
          {currentUser?.quyen === 'caocap' ? (
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <Key size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Đổi Mật Khẩu Quản Trị</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Thay đổi mật khẩu đăng nhập cho tài khoản Quản trị cao cấp</p>
                </div>
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tài khoản</label>
                  <input
                    type="text"
                    value={currentUser?.ten || 'admin'}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-500 cursor-not-allowed font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                    value={newPasswordInput}
                    onChange={(e) => {
                      setNewPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-sans shadow-inner"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPasswordInput}
                    onChange={(e) => {
                      setConfirmPasswordInput(e.target.value);
                      setPasswordError('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 font-sans shadow-inner"
                    required
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-rose-600 font-semibold">{passwordError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-md shadow-amber-500/15"
                >
                  <Save size={13} />
                  <span>Cập nhật mật khẩu</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
                  <User size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Tài khoản hỗ trợ</h4>
                  <p className="text-[10px] text-slate-500">Thông tin tài khoản đang đăng nhập</p>
                </div>
              </div>
              <div className="bg-blue-500/5 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed space-y-2">
                <p>🙋‍♂️ Bạn đang đăng nhập bằng tài khoản hỗ trợ: <strong className="font-bold uppercase text-blue-900">{currentUser?.ten}</strong></p>
                <p className="text-slate-600 text-[11px]">Tài khoản hỗ trợ không tự ý thay đổi mật khẩu. Nếu cần cấp đổi mật khẩu hoặc cập nhật quyền hạn, vui lòng liên hệ quản trị viên chính thức (admin caocap).</p>
              </div>
            </div>
          )}

          {/* Card 2: Quản lý tài khoản Hỗ trợ (Only for caocap) */}
          {currentUser?.quyen === 'caocap' && (
            <div className="flex-[1.2] bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-200">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl">
                  <Users size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Quản Lý Tài Khoản Hỗ Trợ</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Tạo mới hoặc xóa bỏ tài khoản phụ cho nhân viên hỗ trợ (hotro)</p>
                </div>
              </div>

              {/* Form thêm tài khoản */}
              <form onSubmit={handleAddSupportSubmit} className="space-y-3.5 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                <h5 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">Thêm tài khoản mới</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Tên đăng nhập</label>
                    <input
                      type="text"
                      placeholder="vd: hotro2, thuthu"
                      value={supportUsername}
                      onChange={(e) => {
                        setSupportUsername(e.target.value);
                        setSupportError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Mật khẩu ban đầu</label>
                    <input
                      type="text"
                      placeholder="Mật khẩu (tối thiểu 6 ký tự)"
                      value={supportPassword}
                      onChange={(e) => {
                        setSupportPassword(e.target.value);
                        setSupportError('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {supportError && (
                  <p className="text-xs text-rose-600 font-semibold">{supportError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-extrabold text-[11px] rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider shadow-md shadow-emerald-500/15"
                >
                  <Plus size={13} />
                  <span>Tạo tài khoản hotro</span>
                </button>
              </form>

              {/* Danh sách tài khoản hiện có */}
              <div className="space-y-2">
                <h5 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">Danh sách tài khoản hỗ trợ</h5>
                <div className="max-h-[200px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                  {users.filter(u => u.quyen === 'hotro').map(u => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl text-xs shadow-sm hover:bg-slate-100 transition">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="font-bold text-slate-800 uppercase">{u.ten}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-medium">Mật khẩu: {u.matkhau}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSupportUser(u.id, u.ten)}
                        className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition cursor-pointer"
                        title="Xóa tài khoản"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {users.filter(u => u.quyen === 'hotro').length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4 bg-white border border-dashed border-slate-200 rounded-xl">Chưa có tài khoản hỗ trợ nào được tạo.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

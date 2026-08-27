/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Phone, 
  Calendar, 
  MapPin, 
  Award, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  BookOpen, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Grid, 
  FileText, 
  MessageSquare, 
  Send, 
  ChevronLeft, 
  Sparkles, 
  Heart, 
  Smile, 
  Layers, 
  ExternalLink,
  Printer,
  Compass,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart2,
  Camera,
  Star,
  Activity,
  Lock,
  Key,
  ShieldCheck
} from 'lucide-react';
import { 
  Student, 
  ClassItem, 
  ViolationRecord, 
  WeeklyPlan, 
  StudentTask, 
  AcademicUpdate, 
  Teacher, 
  Announcement,
  PhotoAlbum
} from '../types';
import { normalizeImageUrl } from '../lib/imageUtils';
import { db, doc, onSnapshot, setDoc, getDoc } from '../lib/firebase';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar
} from 'recharts';

interface StudentPortalDetailProps {
  student: Student;
  allStudents: Student[];
  currentClass?: ClassItem;
  teacher?: Teacher;
  violations: ViolationRecord[];
  tasks: StudentTask[];
  academicUpdates: AcademicUpdate[];
  plans: WeeklyPlan[];
  timetable?: Array<{ day: string; period: number; session: 'Sáng' | 'Chiều'; subject: string }>;
  dutySchedule?: Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }>;
  reminderText?: string;
  announcements?: Announcement[];
  albums?: PhotoAlbum[];
  onBack: () => void;
  onSelectStudent?: (student: Student) => void;
  onUpdateStudent?: (student: Student) => void;
}

export default function StudentPortalDetail({
  student,
  allStudents,
  currentClass,
  teacher,
  violations,
  tasks,
  academicUpdates,
  plans,
  timetable = [],
  dutySchedule = {},
  reminderText = '',
  announcements = [],
  albums = [],
  onBack,
  onSelectStudent,
  onUpdateStudent
}: StudentPortalDetailProps) {
  // Navigation tabs within the student portal
  const [activePortalTab, setActivePortalTab] = useState<'profile' | 'diligence' | 'academics' | 'activities' | 'communication' | 'custom'>('profile');

  // Password Change Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [oldPasswordInput, setOldPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);

  // Parent Message / Communication State
  const [parentMessage, setParentMessage] = useState<string>('');
  const [parentSenderName, setParentSenderName] = useState<string>(() => {
    return student.fatherName || student.motherName || 'Phụ huynh học sinh';
  });
  const [parentPhoneInput, setParentPhoneInput] = useState<string>(student.parentPhone || '');
  const [messageCategory, setMessageCategory] = useState<'Xin phép nghỉ học' | 'Trao đổi học tập' | 'Ý kiến đóng góp' | 'Khác'>('Trao đổi học tập');
  const [messagesList, setMessagesList] = useState<Array<{
    id: string;
    date: string;
    sender: string;
    category: string;
    content: string;
    status: 'Đã gửi' | 'GV đã tiếp nhận' | 'Đã phản hồi';
    teacherReply?: string;
  }>>([]);
  const [sendSuccess, setSendSuccess] = useState<boolean>(false);

  // Real-time synchronization of parent-teacher messages for this specific student
  useEffect(() => {
    const msgDocId = `parent_msg_${student.id}`;
    const savedLocal = localStorage.getItem(`app_parent_messages_${student.id}`);
    if (savedLocal) {
      try {
        setMessagesList(JSON.parse(savedLocal));
      } catch (e) {}
    }

    const unsub = onSnapshot(doc(db, 'parentMessages', msgDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.messages && Array.isArray(data.messages)) {
          setMessagesList(data.messages);
          localStorage.setItem(`app_parent_messages_${student.id}`, JSON.stringify(data.messages));
        }
      }
    });

    return () => unsub();
  }, [student.id]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const currentPwd = student.password || '123';
    if (oldPasswordInput.trim() !== currentPwd) {
      setPasswordError('Mật khẩu hiện tại không chính xác! (Mặc định ban đầu là 123)');
      return;
    }

    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 3) {
      setPasswordError('Mật khẩu mới phải có tối thiểu 3 ký tự!');
      return;
    }

    if (newPasswordInput.trim() !== confirmPasswordInput.trim()) {
      setPasswordError('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    const updatedStudent: Student = {
      ...student,
      password: newPasswordInput.trim()
    };

    if (onUpdateStudent) {
      onUpdateStudent(updatedStudent);
    }

    try {
      await setDoc(doc(db, 'students', student.id), updatedStudent, { merge: true });
    } catch (err) {
      console.warn('Lỗi khi lưu mật khẩu học sinh vào Firestore:', err);
    }

    setPasswordSuccess(true);
    setOldPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentMessage.trim()) return;

    const newMsg = {
      id: `msg_${Date.now()}`,
      date: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      sender: parentSenderName.trim() || 'Phụ huynh',
      category: messageCategory,
      content: parentMessage.trim(),
      status: 'Đã gửi' as const,
      teacherReply: ''
    };

    const updated = [newMsg, ...messagesList];
    setMessagesList(updated);
    localStorage.setItem(`app_parent_messages_${student.id}`, JSON.stringify(updated));
    setParentMessage('');
    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 4000);

    try {
      await setDoc(doc(db, 'parentMessages', `parent_msg_${student.id}`), {
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        messages: updated,
        lastUpdated: new Date().toISOString()
      });
    } catch (err) {
      console.error('Error saving parent message:', err);
    }
  };

  // Student specific data calculations
  const studentViolations = useMemo(() => {
    return violations.filter(v => v.studentId === student.id);
  }, [violations, student.id]);

  const totalDeducted = useMemo(() => {
    return studentViolations.reduce((sum, v) => sum + Math.abs(v.points), 0);
  }, [studentViolations]);

  const diligenceScore = Math.max(0, 100 - totalDeducted);
  const diligenceRating = diligenceScore >= 90 ? 'Tốt / Xuất sắc' : diligenceScore >= 75 ? 'Khá' : diligenceScore >= 60 ? 'Trung bình' : 'Cần rèn luyện thêm';
  const diligenceColor = diligenceScore >= 90 ? 'text-emerald-600' : diligenceScore >= 75 ? 'text-blue-600' : diligenceScore >= 60 ? 'text-amber-500' : 'text-rose-600';
  const diligenceBg = diligenceScore >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : diligenceScore >= 75 ? 'bg-blue-50 text-blue-700 border-blue-200' : diligenceScore >= 60 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200';

  const studentTasks = useMemo(() => {
    return tasks.filter(t => t.studentId === student.id || t.studentId === 'Tất cả');
  }, [tasks, student.id]);

  const studentAcademics = useMemo(() => {
    return academicUpdates.filter(a => a.studentId === student.id);
  }, [academicUpdates, student.id]);

  // Latest GPA summary
  const latestAcademic = useMemo(() => {
    if (studentAcademics.length === 0) return null;
    return [...studentAcademics].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [studentAcademics]);

  // Seating calculation
  const seatRow = student.seatRow !== undefined ? student.seatRow : -1;
  const seatCol = student.seatCol !== undefined ? student.seatCol : -1;
  const classStudents = useMemo(() => {
    return allStudents.filter(s => s.classId === student.classId);
  }, [allStudents, student.classId]);

  const activeRows = Math.max(5, ...classStudents.filter(s => s.seatRow !== undefined).map(s => s.seatRow! + 1), seatRow + 1);
  const activeCols = Math.max(4, ...classStudents.filter(s => s.seatCol !== undefined).map(s => s.seatCol! + 1), seatCol + 1);

  // Desk neighbor finder
  const deskNeighbor = useMemo(() => {
    if (seatRow === -1 || seatCol === -1) return null;
    // Check adjacent column in same row
    return classStudents.find(s => s.id !== student.id && s.seatRow === seatRow && (s.seatCol === seatCol - 1 || s.seatCol === seatCol + 1));
  }, [classStudents, student.id, seatRow, seatCol]);

  // Academic chart preparation
  const academicChartData = useMemo(() => {
    if (studentAcademics.length === 0) return [];
    const sorted = [...studentAcademics].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map(item => ({
      name: item.title || item.semester,
      'Điểm TB': parseFloat(item.averageGpa.toFixed(2))
    }));
  }, [studentAcademics]);

  const studentAvatar = normalizeImageUrl(student.avatarUrl);

  const tabsConfig = [
    { id: 'profile', label: '1. Thông tin học sinh', icon: User, desc: 'Hồ sơ cá nhân, gia đình & vị trí lớp' },
    { id: 'diligence', label: '2. Chuyên cần & Nề nếp', icon: ShieldAlert, desc: 'Điểm rèn luyện, vi phạm & nhiệm vụ tuần' },
    { id: 'academics', label: '3. Thông tin học tập', icon: BookOpen, desc: 'Bảng điểm chi tiết, ĐTB & tiến trình' },
    { id: 'activities', label: '4. Phong trào & Tập thể', icon: Sparkles, desc: 'Hoạt động đoàn đội, kỷ niệm & kế hoạch' },
    { id: 'communication', label: '5. Kênh liên hệ GVCN', icon: Phone, desc: 'Hotline, dặn dò & thông tin giáo viên' },
    { id: 'custom', label: '6. Mở rộng khác', icon: Layers, desc: 'Các tiện ích & thông tin bổ trợ' },
  ] as const;

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* 1. TOP NAVIGATION / BACK BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-4 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
        >
          <ChevronLeft size={16} /> Quay lại danh sách tìm kiếm
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setIsPasswordModalOpen(true);
              setPasswordError('');
              setPasswordSuccess(false);
            }}
            className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            title="Đổi mật khẩu bảo mật tra cứu"
          >
            <Key size={14} /> <span>Đổi Mật Khẩu</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="In sổ liên lạc điện tử"
          >
            <Printer size={14} /> <span>In Sổ Liên Lạc</span>
          </button>

          <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-2xl">
            SỔ LIÊN LẠC ĐIỆN TỬ
          </span>
        </div>
      </div>

      {/* 2. STUDENT IDENTITY BANNER (HEADER HERO CARD - BRIGHT & MODERN LIGHT THEME) */}
      <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white border border-blue-200/90 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden text-slate-800">
        {/* Subtle decorative background accents */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Avatar & Main Info */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            {studentAvatar ? (
              <img
                src={studentAvatar}
                alt={student.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-white shadow-md shrink-0 ring-1 ring-blue-100"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-3xl flex items-center justify-center border-4 border-white shadow-md shrink-0 ring-1 ring-blue-100">
                {student.name.split(' ').pop()?.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="px-3 py-1 bg-amber-500 text-slate-950 text-[11px] font-black rounded-full uppercase tracking-wider shadow-xs">
                  MÃ HS: {student.id}
                </span>
                {student.role ? (
                  <span className="px-3 py-1 bg-blue-100 border border-blue-200 text-blue-900 text-[11px] font-black rounded-full flex items-center gap-1 shadow-2xs">
                    <Star size={12} className="text-amber-500 fill-amber-500" /> {student.role}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-full border border-slate-200">
                    Học sinh
                  </span>
                )}
                <span className="px-3 py-1 bg-emerald-100 border border-emerald-300/80 text-emerald-800 text-[11px] font-bold rounded-full">
                  {student.status || 'Đang học'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
                {student.name}
              </h1>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-slate-600 font-semibold">
                <span>Lớp: <strong className="text-blue-950 font-black">{currentClass?.name || '---'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Tổ: <strong className="text-blue-950 font-black">{student.groupName || 'Chưa phân tổ'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Ngày sinh: <strong className="text-slate-800 font-black">{student.dob || '---'}</strong></span>
                <span className="text-slate-300">•</span>
                <span>Giới tính: <strong className="text-slate-800 font-black">{student.gender}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Teacher Connect & Password Change */}
          <div className="w-full lg:w-auto bg-white border border-blue-200/80 rounded-2xl p-4 flex flex-col sm:flex-row lg:flex-col justify-between gap-3 shrink-0 shadow-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Giáo viên chủ nhiệm</span>
              <p className="text-sm font-black text-slate-900">{teacher?.name || 'Chưa phân công'}</p>
            </div>

            <div className="flex items-center gap-2 pt-2 sm:pt-0 lg:pt-2 border-t sm:border-t-0 lg:border-t border-slate-100">
              <a
                href={`tel:0909091634`}
                className="flex-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
              >
                <Phone size={13} className="stroke-[2.5]" /> Gọi GVCN
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                className="flex-1 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer border border-blue-200 active:scale-95"
              >
                <Lock size={13} /> Đổi mật khẩu
              </button>
            </div>
          </div>

        </div>

        {/* 4 Core Quick Metric Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-blue-100 text-xs">
          <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Điểm Nề Nếp</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-emerald-600">{diligenceScore} / 100</span>
              <span className="text-[10px] text-slate-500 font-semibold">({diligenceRating})</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">ĐTB Học Tập Mới Nhất</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-blue-700">
                {latestAcademic ? latestAcademic.averageGpa.toFixed(2) : 'Chưa có'}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[100px]">{latestAcademic?.title || '---'}</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Nhiệm Vụ Tuần</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-amber-600">{studentTasks.length} việc</span>
              <span className="text-[10px] text-slate-500 font-semibold">
                ({studentTasks.filter(t => t.status === 'Đã hoàn thành').length} xong)
              </span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-3.5 border border-blue-100 shadow-2xs">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Vị Trí Chỗ Ngồi</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-black text-indigo-700">
                {seatRow !== -1 ? `Hàng ${seatRow + 1} - Cột ${seatCol + 1}` : 'Chưa xếp'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: ĐỔI MẬT KHẨU SỔ LIÊN LẠC */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-2xl space-y-5 animate-scaleUp text-slate-800 text-left">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">Đổi Mật Khẩu Truy Cập</h3>
                  <p className="text-xs text-slate-400">Học sinh: {student.name} ({student.id})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {passwordSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold space-y-2 text-center">
                <CheckCircle size={24} className="mx-auto text-emerald-600" />
                <p>Đổi mật khẩu thành công!</p>
                <p className="text-[11px] font-normal text-emerald-700">
                  Mật khẩu mới đã được cập nhật. Vui lòng ghi nhớ mật khẩu này cho các lần tra cứu tiếp theo.
                </p>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                {passwordError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                    {passwordError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={oldPasswordInput}
                    onChange={(e) => setOldPasswordInput(e.target.value)}
                    placeholder="Mặc định ban đầu là 123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Nếu chưa từng đổi, mật khẩu mặc định là 123</p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Mật khẩu mới</label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-600 block">Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsPasswordModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Lưu mật khẩu mới
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3. MODULAR PORTAL TABS NAVIGATION */}
      <div className="bg-white border border-slate-200 rounded-3xl p-2 shadow-sm overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabsConfig.map(t => {
            const Icon = t.icon;
            const isActive = activePortalTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActivePortalTab(t.id as any)}
                className={`px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/60'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* ========================================================================= */}
      {/* TAB 1: THÔNG TIN HỌC SINH & GIA ĐÌNH */}
      {/* ========================================================================= */}
      {activePortalTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Card 1.1: Personal Records */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <User size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Hồ sơ cá nhân học sinh</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Mã định danh HS:</span>
                <span className="font-extrabold text-blue-700">{student.id}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Họ và tên:</span>
                <span className="font-bold text-slate-800">{student.name}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Giới tính:</span>
                <span className="font-bold text-slate-800">{student.gender}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Ngày sinh:</span>
                <span className="font-bold text-slate-800">{student.dob || '---'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Lớp học:</span>
                <span className="font-extrabold text-blue-900">{currentClass?.name || '---'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Phân tổ sinh hoạt:</span>
                <span className="font-bold text-slate-800">{student.groupName || 'Chưa phân tổ'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Chức vụ cán sự:</span>
                <span className="font-bold text-amber-600">{student.role || 'Thành viên lớp'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Trạng thái học tập:</span>
                <span className="font-extrabold text-emerald-600">{student.status || 'Đang học'}</span>
              </div>
            </div>
          </div>

          {/* Card 1.2: Family & Parent Contact */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Phone size={18} className="text-blue-600" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Thông tin liên lạc Phụ huynh</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Họ tên Cha:</span>
                <span className="font-bold text-slate-800">{student.fatherName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Nghề nghiệp Cha:</span>
                <span className="font-bold text-slate-700">{student.fatherJob || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Họ tên Mẹ:</span>
                <span className="font-bold text-slate-800">{student.motherName || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">Nghề nghiệp Mẹ:</span>
                <span className="font-bold text-slate-700">{student.motherJob || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 font-semibold">SĐT Phụ huynh:</span>
                <span className="font-extrabold text-blue-700">{student.parentPhone || '---'}</span>
              </div>
              <div className="py-1.5 border-b border-slate-50 space-y-1">
                <span className="text-slate-400 font-semibold block">Địa chỉ liên hệ:</span>
                <p className="font-bold text-slate-800 leading-relaxed">{student.address || 'Chưa cập nhật địa chỉ'}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-[11px] text-blue-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <CheckCircle size={14} className="text-blue-600" /> Kênh liên lạc chính thống
              </p>
              <p className="text-blue-600/80 leading-relaxed">
                Mọi thông báo từ nhà trường và GVCN sẽ được đồng bộ và gửi qua số điện thoại này.
              </p>
            </div>
          </div>

          {/* Card 1.3: Seating Position & Visual Grid */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Grid size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Vị trí chỗ ngồi</h3>
              </div>
              <span className="text-[10px] font-black px-2.5 py-1 bg-blue-100 text-blue-800 rounded-xl">
                {seatRow !== -1 ? `H${seatRow + 1} - C${seatCol + 1}` : 'Chưa xếp'}
              </span>
            </div>

            {/* Visual Mini Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
              <div className="bg-slate-300 h-2 w-2/3 mx-auto mb-4 rounded-md text-[9px] text-slate-600 font-bold flex items-center justify-center uppercase">
                BẢNG GIẢNG ĐƯỜNG
              </div>

              <div className="overflow-auto max-h-[220px] max-w-full pb-2 px-1 custom-scrollbar border border-slate-200/50 rounded-xl bg-white/60">
                <div 
                  className="grid gap-2 mx-auto pt-2"
                  style={{
                    gridTemplateColumns: `repeat(${activeCols}, minmax(48px, 1fr))`,
                    width: 'max-content',
                    maxWidth: '100%'
                  }}
                >
                  {Array.from({ length: activeRows }).map((_, rIndex) => (
                    Array.from({ length: activeCols }).map((_, cIndex) => {
                      const isHisSeat = (seatRow === rIndex && seatCol === cIndex);
                      return (
                        <div 
                          key={`${rIndex}-${cIndex}`}
                          className={`p-1.5 rounded-lg text-[8px] font-bold text-center border transition flex flex-col items-center justify-center h-10 ${
                            isHisSeat 
                              ? 'bg-blue-600 border-blue-700 text-white shadow-md animate-pulse ring-2 ring-blue-300 font-black' 
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          <Grid size={8} className={isHisSeat ? 'text-white' : 'text-slate-300'} />
                          <span className="mt-0.5">
                            {isHisSeat ? 'BẠN' : `H${rIndex+1}-C${cIndex+1}`}
                          </span>
                        </div>
                      );
                    })
                  ))}
                </div>
              </div>

              <div className="mt-3 text-[11px] text-slate-600 space-y-1 text-left">
                <p>• <strong>Vị trí:</strong> {seatRow !== -1 ? `Hàng ${seatRow + 1}, Cột ${seatCol + 1}` : 'Chưa xếp'}</p>
                {deskNeighbor && (
                  <p>• <strong>Bạn cùng bàn:</strong> <span className="font-bold text-blue-700">{deskNeighbor.name}</span></p>
                )}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CHUYÊN CẦN, KỶ LUẬT & NHIỆM VỤ */}
      {/* ========================================================================= */}
      {activePortalTab === 'diligence' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className={`border rounded-3xl p-6 shadow-sm flex flex-col justify-between ${diligenceBg}`}>
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest block opacity-70">Đánh giá Chuyên cần & Nề nếp</span>
                <h4 className="text-3xl font-black tracking-tight">{diligenceScore} <span className="text-base font-bold">/ 100 điểm</span></h4>
              </div>
              <div className="mt-4 pt-3 border-t border-current/10 flex items-center justify-between text-xs font-black">
                <span>Xếp loại:</span>
                <span className="uppercase">{diligenceRating}</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Ghi nhận vi phạm</span>
                <h4 className="text-3xl font-black text-rose-600">{studentViolations.length} <span className="text-base font-bold text-slate-500">lần</span></h4>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>Tổng điểm trừ:</span>
                <span className="font-black text-rose-600">-{totalDeducted} điểm</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Nhiệm vụ tuần được giao</span>
                <h4 className="text-3xl font-black text-blue-600">{studentTasks.length} <span className="text-base font-bold text-slate-500">việc</span></h4>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                <span>Đã hoàn thành:</span>
                <span className="font-black text-emerald-600">
                  {studentTasks.filter(t => t.status === 'Đã hoàn thành').length} / {studentTasks.length}
                </span>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Violation / Nề nếp records log */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={18} className="text-rose-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Nhật ký nề nếp & vi phạm ({studentViolations.length})
                  </h3>
                </div>
              </div>

              {studentViolations.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {studentViolations.map((v, idx) => (
                    <div key={v.id || idx} className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-black text-rose-800 text-xs block">{v.type}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">Ngày: {v.date}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-black text-[10px]">
                          {v.points} điểm
                        </span>
                      </div>
                      {v.note && (
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          <strong>Ghi chú:</strong> {v.note}
                        </p>
                      )}
                      {v.resolution && (
                        <div className="bg-white/80 p-2 rounded-xl border border-rose-200/60 text-[10px] text-slate-700">
                          <strong>Hướng giải quyết / Biện pháp rèn luyện:</strong> {v.resolution}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-emerald-50/60 border border-emerald-100 rounded-2xl space-y-2">
                  <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                  <p className="text-xs font-black text-emerald-800 uppercase">Ý thức nề nếp hoàn hảo</p>
                  <p className="text-[11px] text-emerald-600">Học sinh luôn chấp hành tốt nội quy, không có ghi nhận vi phạm nề nếp nào.</p>
                </div>
              )}
            </div>

            {/* Right: Assigned Tasks & Week Duties */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle size={18} className="text-blue-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Nhiệm vụ & Công việc được giao ({studentTasks.length})
                  </h3>
                </div>
              </div>

              {studentTasks.length > 0 ? (
                <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                  {studentTasks.map(t => (
                    <div key={t.id} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="font-black text-slate-800 text-xs">{t.taskTitle}</h5>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                          t.status === 'Đã hoàn thành' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : t.status === 'Đang thực hiện' 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-slate-500 text-[11px] leading-relaxed">{t.description}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 text-[10px] text-slate-400 font-semibold">
                        <span>Hạn chót: <strong className="text-slate-700">{t.deadline || 'Trong tuần'}</strong></span>
                        {t.feedback && (
                          <span className="text-blue-600 font-bold">GV đã nhận xét</span>
                        )}
                      </div>
                      {t.feedback && (
                        <div className="bg-blue-50/70 p-2 rounded-xl border border-blue-100 text-[10px] text-blue-900">
                          <strong>Nhận xét của GV:</strong> {t.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-semibold">
                  Hiện tại không có nhiệm vụ cụ thể nào được giao.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: THÔNG TIN HỌC TẬP & ĐIỂM SỐ */}
      {/* ========================================================================= */}
      {activePortalTab === 'academics' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Academic Chart Progress */}
          {academicChartData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Biểu đồ tiến trình học tập qua các đợt kiểm tra
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-400">Thang điểm 10</span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={academicChartData} margin={{ top: 10, right: 30, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                    <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontSize: '12px' }}
                      itemStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Điểm TB" 
                      stroke="#2563eb" 
                      strokeWidth={4} 
                      activeDot={{ r: 8, stroke: '#60a5fa', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Academic Score Cards Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" /> Bảng điểm chi tiết từng đợt
            </h3>

            {studentAcademics.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {studentAcademics.map(update => (
                  <div key={update.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{update.semester}</span>
                        <h4 className="text-base font-black text-slate-800">{update.title}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold">Cập nhật ngày: {update.date}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">ĐTB</span>
                        <span className="text-2xl font-black text-blue-700">{update.averageGpa.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Subject scores list */}
                    {update.gpaList && update.gpaList.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {update.gpaList.map((gpa, gIdx) => (
                          <div key={gIdx} className="p-2 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                            <span className="text-slate-600 font-bold">{gpa.subject}</span>
                            <span className={`font-black ${gpa.score >= 8 ? 'text-emerald-600' : gpa.score >= 6.5 ? 'text-blue-600' : gpa.score >= 5 ? 'text-amber-600' : 'text-rose-600'}`}>
                              {gpa.score}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Chưa có chi tiết danh sách môn học.</p>
                    )}

                    {update.teacherRemarks && (
                      <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 space-y-1">
                        <p className="font-black text-[10px] uppercase tracking-wider text-amber-800">Lời phê / Nhận xét của Giáo viên:</p>
                        <p className="leading-relaxed">{update.teacherRemarks}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 space-y-2">
                <BookOpen size={36} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold">Chưa có dữ liệu điểm số cập nhật cho học sinh này.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: HOẠT ĐỘNG PHONG TRÀO & TẬP THỂ */}
      {/* ========================================================================= */}
      {activePortalTab === 'activities' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left: Class Announcements & Movement Events */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles size={18} className="text-amber-500" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Hoạt động phong trào & Thi đua lớp
                </h3>
              </div>

              {announcements.filter(a => a.category === 'Phong trào' || a.category === 'Nề nếp').length > 0 ? (
                <div className="space-y-3">
                  {announcements.filter(a => a.category === 'Phong trào' || a.category === 'Nề nếp').map(ann => (
                    <div key={ann.id} className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-black text-[9px] rounded-full uppercase">
                          {ann.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">{ann.date}</span>
                      </div>
                      <h4 className="font-black text-slate-800 text-xs">{ann.title}</h4>
                      {ann.content && (
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-3">{ann.content}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-semibold">
                  Chưa có thông báo phong trào mới.
                </div>
              )}
            </div>

            {/* Right: Weekly Direction & Collective Objectives */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Award size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Định hướng tuần & Phong trào rèn luyện
                </h3>
              </div>

              {plans.length > 0 ? (
                <div className="space-y-3">
                  {plans.slice(0, 3).map(p => (
                    <div key={p.id} className="p-4 bg-blue-50/40 border border-blue-100 rounded-2xl space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-blue-900 text-xs">Tuần {p.weekNumber}: {p.title}</span>
                        <span className="text-[10px] text-blue-600 font-bold">{p.dateRange}</span>
                      </div>
                      {p.objectives && (
                        <div className="bg-white/80 p-2.5 rounded-xl border border-blue-200/50 text-[11px] text-slate-700">
                          <strong>Mục tiêu tuần:</strong> {p.objectives}
                        </div>
                      )}
                      {p.teacherNotes && (
                        <p className="text-[11px] text-slate-500">
                          <strong>Lời nhắn GV:</strong> {p.teacherNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-50 rounded-2xl text-slate-400 text-xs font-semibold">
                  Chưa có kế hoạch tuần được phân công.
                </div>
              )}
            </div>

          </div>

          {/* Photo Gallery & Class Moments */}
          {albums.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Camera size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Hình ảnh kỷ niệm & Hoạt động tập thể của lớp
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{albums.length} album hoạt động</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {albums.slice(0, 3).map(album => (
                  <div key={album.id} className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition">
                    <div className="aspect-video w-full bg-slate-200 relative overflow-hidden">
                      {album.coverUrl ? (
                        <img 
                          src={normalizeImageUrl(album.coverUrl)} 
                          alt={album.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <Camera size={24} />
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded-lg backdrop-blur-xs">
                        {album.photos?.length || 0} ảnh
                      </span>
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-xs font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition">
                        {album.title}
                      </h4>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{album.description || 'Hoạt động trải nghiệm tập thể'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: KÊNH LIÊN HỆ GVCN & THÔNG TIN HỖ TRỢ */}
      {/* ========================================================================= */}
      {activePortalTab === 'communication' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* Left 2 Cols: GVCN Support Overview & Teacher Guidance */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Direct Contact & Support Notice */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                    Thông tin liên hệ trực tiếp Giáo viên chủ nhiệm
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Kênh trao đổi chính thức giữa Quý Phụ huynh và Thầy/Cô chủ nhiệm lớp {currentClass?.name}.
                  </p>
                </div>
              </div>

              {/* Direct Hotline Banner */}
              <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Số điện thoại liên hệ trực tiếp (GVCN)</span>
                  <div className="text-2xl font-black text-emerald-950 flex items-center gap-2">
                    <span>0909091634</span>
                    <span className="text-xs px-2 py-0.5 bg-emerald-200/80 text-emerald-900 font-bold rounded-lg">Có hỗ trợ Zalo</span>
                  </div>
                  <p className="text-xs text-emerald-800 font-medium">Giáo viên: {teacher?.name || 'Cô Nguyễn Tuyết Mai'}</p>
                </div>

                <a
                  href="tel:0909091634"
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                >
                  <Phone size={15} className="stroke-[2.5]" /> Gọi điện ngay
                </a>
              </div>

              {/* Notice regarding messaging feature */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 font-bold">
                  <Clock size={15} className="text-blue-600" />
                  <span>Kênh nhắn tin trực tuyến qua ứng dụng</span>
                </div>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Tính năng gửi tin nhắn trực tuyến từ sổ liên lạc đang được tối ưu và kiểm thử độ ổn định trước khi đưa vào vận hành rộng rãi. Hiện tại, Quý Phụ huynh vui lòng gọi điện thoại trực tiếp hoặc trao đổi qua Zalo theo số điện thoại trên để nhận phản hồi nhanh nhất từ GVCN.
                </p>
              </div>

              {/* Consultation Working Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Giờ tư vấn học tập</span>
                  <p className="text-xs font-black text-slate-800">16:30 - 18:30 (Thứ 2 đến Thứ 6)</p>
                  <p className="text-[10px] text-slate-500">Sau giờ học chính khóa của các em</p>
                </div>

                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Trường hợp khẩn cấp</span>
                  <p className="text-xs font-black text-slate-800">Liên hệ trực tiếp bất kỳ lúc nào</p>
                  <p className="text-[10px] text-slate-500">Xin phép nghỉ ốm đột xuất, việc gia đình</p>
                </div>
              </div>
            </div>

            {/* Daily teacher guidance / reminders */}
            {reminderText && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle size={18} className="text-amber-600" />
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                    Lời dặn dò hàng ngày từ Giáo Viên Chủ Nhiệm
                  </h4>
                </div>
                <p className="text-xs text-amber-950/80 leading-relaxed whitespace-pre-line bg-white/70 p-4 rounded-2xl border border-amber-200/60">
                  {reminderText}
                </p>
              </div>
            )}

          </div>

          {/* Right Column: Teacher Profile Card */}
          <div className="space-y-6">
            
            {/* Teacher Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-black text-xl mx-auto flex items-center justify-center border-2 border-blue-200">
                {teacher?.name?.split(' ').pop()?.slice(0, 2).toUpperCase() || 'GV'}
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Giáo viên chủ nhiệm lớp</span>
                <h4 className="text-base font-black text-slate-800 mt-0.5">{teacher?.name || 'Cô Nguyễn Tuyết Mai'}</h4>
                <p className="text-xs text-blue-600 font-bold">{currentClass?.name || 'Lớp 11A1'}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100 text-xs text-left font-semibold">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-extrabold text-blue-700">0909091634</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Bộ môn giảng dạy:</span>
                  <span className="text-slate-700">{teacher?.subject || 'Toán học'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-400">Thời gian hỗ trợ:</span>
                  <span className="text-slate-700">07:00 - 18:00 (Thứ 2 - Thứ 7)</span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="tel:0909091634"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <Phone size={14} /> Gọi điện cho GVCN
                </a>
              </div>
            </div>

            {/* Quick Security & Access Info */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-800 font-black uppercase text-[11px]">
                <ShieldCheck size={16} className="text-blue-600" />
                <span>Bảo mật Sổ Liên Lạc</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Mỗi học sinh có mã tra cứu và mật khẩu riêng. Quý phụ huynh và các em có thể đổi mật khẩu bất kỳ lúc nào để bảo mật thông tin học tập và hạnh kiểm cá nhân.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsPasswordModalOpen(true);
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Key size={13} /> Đổi mật khẩu ngay
              </button>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MỞ RỘNG KHÁC (EXTENSIBLE ARCHITECTURE) */}
      {/* ========================================================================= */}
      {activePortalTab === 'custom' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 animate-fadeIn">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <Layers size={22} className="text-indigo-600" />
            <div>
              <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">
                Khung mở rộng thông tin bổ trợ
              </h3>
              <p className="text-xs text-slate-400">
                Sẵn sàng kết nối và hiển thị thêm các phân hệ dữ liệu mở rộng theo yêu cầu của nhà trường và phụ huynh.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[9px] font-black rounded-full uppercase">Sẵn sàng mở rộng</span>
              <h4 className="font-black text-slate-800 text-xs">Sổ theo dõi Bán trú & Dinh dưỡng</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Theo dõi thực đơn hàng ngày, tình trạng ăn uống và nghỉ trưa tại trường của học sinh.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-full uppercase">Sẵn sàng mở rộng</span>
              <h4 className="font-black text-slate-800 text-xs">Nhật ký Đọc sách & Kỹ năng sống</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Ghi nhận các đầu sách đã đọc, hoạt động phát triển kỹ năng mềm và huy hiệu tích lũy.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-black rounded-full uppercase">Sẵn sàng mở rộng</span>
              <h4 className="font-black text-slate-800 text-xs">Câu lạc bộ & Hoạt động Ngoại khóa</h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Đăng ký tham gia CLB STEM, Nghệ thuật, Thể thao và theo dõi lịch sinh hoạt ngoại khóa.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

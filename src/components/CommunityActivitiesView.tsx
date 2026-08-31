/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Student, 
  CommunityActivityEntry, 
  SportArtActivityItem, 
  StudentCommunityRecord 
} from '../types';
import { 
  defaultCommunityEntries, 
  defaultSportArtList, 
  createInitialStudentRecord 
} from '../data/communityActivityDefaults';
import { db, doc, onSnapshot, setDoc } from '../lib/firebase';
import { saveCommunityRecord } from '../lib/dbService';
import CommunityActivitiesPdfModal from './CommunityActivitiesPdfModal';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  CheckSquare, 
  Square, 
  Printer, 
  Layers, 
  Info, 
  Sparkles, 
  AlertCircle, 
  UserCheck, 
  Search, 
  ChevronRight, 
  RefreshCw, 
  Flame,
  HelpCircle,
  Lock,
  X
} from 'lucide-react';

interface CommunityActivitiesViewProps {
  student: Student;
  allStudents?: Student[];
  mode: 'student' | 'admin';
  isReadOnly?: boolean;
  onStudentChange?: (student: Student) => void;
  initialRecord?: StudentCommunityRecord;
}

export default function CommunityActivitiesView({
  student,
  allStudents = [],
  mode,
  isReadOnly = false,
  onStudentChange,
  initialRecord
}: CommunityActivitiesViewProps) {
  const [activeTab, setActiveTab] = useState<'combined' | 'community' | 'sports'>('combined');
  const [record, setRecord] = useState<StudentCommunityRecord>(() => {
    if (initialRecord && initialRecord.studentId === student.id) {
      return initialRecord;
    }
    const local = localStorage.getItem(`app_community_record_${student.id}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && Array.isArray(parsed.entries) && Array.isArray(parsed.sportArtItems)) {
          return parsed;
        }
      } catch (e) {}
    }
    return createInitialStudentRecord(student.id, student.name, student.classId);
  });

  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // New sport activity addition modal state
  const [isAddSportModalOpen, setIsAddSportModalOpen] = useState<boolean>(false);
  const [newSportName, setNewSportName] = useState<string>('');
  const [newSportRole, setNewSportRole] = useState<'Tham gia' | 'Cổ vũ'>('Tham gia');
  const [newSportAchievement, setNewSportAchievement] = useState<string>('');
  const [newSportHours, setNewSportHours] = useState<number>(10);

  // Real-time synchronization from Firestore
  useEffect(() => {
    // Reset to current student
    const localKey = `app_community_record_${student.id}`;
    const savedLocal = localStorage.getItem(localKey);
    if (savedLocal) {
      try {
        setRecord(JSON.parse(savedLocal));
      } catch (e) {}
    } else {
      setRecord(createInitialStudentRecord(student.id, student.name, student.classId));
    }

    const unsub = onSnapshot(doc(db, 'communityActivities', student.id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as StudentCommunityRecord;
        if (data && Array.isArray(data.entries) && Array.isArray(data.sportArtItems)) {
          setRecord(data);
          localStorage.setItem(localKey, JSON.stringify(data));
        }
      }
    });

    return () => unsub();
  }, [student.id]);

  // Sync sport hours to item 7 in community activities if student or admin desires
  const totalSportHours = useMemo(() => {
    return (record.sportArtItems || []).reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [record.sportArtItems]);

  const totalSportConfirmedHours = useMemo(() => {
    return (record.sportArtItems || [])
      .filter(item => item.isConfirmed)
      .reduce((sum, item) => sum + (Number(item.hours) || 0), 0);
  }, [record.sportArtItems]);

  // Calculations for Table 1 (Community)
  const totalCommunityHours = useMemo(() => {
    return (record.entries || []).reduce((sum, entry) => {
      if (entry.stt === 7) {
        // Entry 7 is linked or direct
        return sum + (Number(entry.hours) || 0);
      }
      return sum + (Number(entry.hours) || 0);
    }, 0);
  }, [record.entries]);

  const totalCommunityConfirmedHours = useMemo(() => {
    return (record.entries || [])
      .filter(entry => entry.isConfirmed)
      .reduce((sum, entry) => sum + (Number(entry.hours) || 0), 0);
  }, [record.entries]);

  // Total overall declared hours and confirmed hours
  const totalAllHours = useMemo(() => {
    // Exclude item 7 if sport table is computed separately or keep item 7 as the aggregate
    return totalCommunityHours;
  }, [totalCommunityHours]);

  const totalAllConfirmedHours = useMemo(() => {
    return totalCommunityConfirmedHours;
  }, [totalCommunityConfirmedHours]);

  const isStudentMode = mode === 'student';

  // Handlers for Table 1 (Community activities)
  const handleUpdateCommunityEntry = (stt: number, field: keyof CommunityActivityEntry, value: any) => {
    if (isReadOnly) return;
    setRecord(prev => {
      // Freeze protection: If student mode and row is approved/confirmed, do not allow changes
      const existing = (prev.entries || []).find(e => e.stt === stt);
      if (isStudentMode && existing?.isConfirmed) {
        return prev;
      }

      const updatedEntries = (prev.entries || []).map(entry => {
        if (entry.stt === stt) {
          return { ...entry, [field]: value };
        }
        return entry;
      });
      return { ...prev, entries: updatedEntries };
    });
  };

  // Sync Bảng 2 total hours into Mục 7 of Bảng 1
  const handleSyncSportsToItem7 = () => {
    if (isReadOnly) return;
    setRecord(prev => {
      const existingItem7 = (prev.entries || []).find(e => e.stt === 7);
      if (isStudentMode && existingItem7?.isConfirmed) {
        return prev; // Item 7 is confirmed and frozen for student
      }

      const updatedEntries = (prev.entries || []).map(entry => {
        if (entry.stt === 7) {
          const hasConfirmed = totalSportConfirmedHours > 0;
          return {
            ...entry,
            hours: totalSportHours,
            studentNote: entry.studentNote || `Tổng hợp từ ${record.sportArtItems.filter(s => s.hours > 0).length} hoạt động thể thao, ngoại khóa tại Bảng 2.`,
            isConfirmed: prev.entries.find(e => e.stt === 7)?.isConfirmed || (mode === 'admin' && hasConfirmed)
          };
        }
        return entry;
      });
      return { ...prev, entries: updatedEntries };
    });
  };

  // Handlers for Table 2 (Sport & Art activities)
  const handleUpdateSportItem = (id: string, field: keyof SportArtActivityItem, value: any) => {
    if (isReadOnly) return;
    setRecord(prev => {
      // Freeze protection: If student mode and sport item is approved, block changes
      const existing = (prev.sportArtItems || []).find(s => s.id === id);
      if (isStudentMode && existing?.isConfirmed) {
        return prev;
      }

      const updatedSports = (prev.sportArtItems || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      return { ...prev, sportArtItems: updatedSports };
    });
  };

  const handleAddCustomSport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSportName.trim()) return;
    const newItem: SportArtActivityItem = {
      id: `sport_custom_${Date.now()}`,
      name: newSportName.trim(),
      role: newSportRole,
      achievement: newSportAchievement.trim() || 'Tham gia tích cực',
      hours: Math.max(0, Number(newSportHours) || 0),
      isConfirmed: false,
      signedBy: 'Ký tên'
    };

    setRecord(prev => ({
      ...prev,
      sportArtItems: [...(prev.sportArtItems || []), newItem]
    }));

    setNewSportName('');
    setNewSportAchievement('');
    setNewSportHours(10);
    setIsAddSportModalOpen(false);
  };

  const handleDeleteSportItem = (id: string) => {
    if (isReadOnly) return;
    setRecord(prev => {
      // Freeze protection for student mode
      const existing = (prev.sportArtItems || []).find(s => s.id === id);
      if (isStudentMode && existing?.isConfirmed) {
        return prev;
      }
      return {
        ...prev,
        sportArtItems: (prev.sportArtItems || []).filter(item => item.id !== id)
      };
    });
  };

  // Batch confirmation for Admin
  const handleToggleConfirmAllCommunity = (shouldConfirm: boolean) => {
    if (isReadOnly || mode !== 'admin') return;
    setRecord(prev => ({
      ...prev,
      entries: (prev.entries || []).map(e => ({
        ...e,
        isConfirmed: e.hours > 0 ? shouldConfirm : false,
        signedBy: shouldConfirm ? 'GVCN' : 'Ký tên'
      }))
    }));
  };

  const handleToggleConfirmAllSports = (shouldConfirm: boolean) => {
    if (isReadOnly || mode !== 'admin') return;
    setRecord(prev => ({
      ...prev,
      sportArtItems: (prev.sportArtItems || []).map(s => ({
        ...s,
        isConfirmed: s.hours > 0 ? shouldConfirm : false,
        signedBy: shouldConfirm ? 'GVCN' : 'Ký tên'
      }))
    }));
  };

  // Save all changes to Firestore
  const handleSaveAll = async () => {
    if (isReadOnly) return;
    setIsSaving(true);
    try {
      const sanitizedRecord: StudentCommunityRecord = {
        ...record,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        updatedAt: new Date().toISOString()
      };

      await saveCommunityRecord(sanitizedRecord);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Lỗi khi lưu bảng hoạt động cộng đồng:', error);
      alert('Đã xảy ra lỗi khi lưu. Vui lòng kiểm tra lại kết nối mạng!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800">
      
      {/* 1. TOP HEADER & SUMMARY CARD */}
      <div className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${
        isStudentMode 
          ? 'bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/60 border-blue-200/80' 
          : 'bg-[#111] border-white/5 text-white'
      }`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider ${
                isStudentMode ? 'bg-blue-600 text-white' : 'bg-amber-500 text-black'
              }`}>
                {isStudentMode ? 'HỌC SINH TỰ KHAI BÁO' : 'GIÁO VIÊN / CÁN SỰ XÁC NHẬN'}
              </span>
              <span className={`text-xs font-bold ${isStudentMode ? 'text-slate-500' : 'text-white/60'}`}>
                Học sinh: <strong className={isStudentMode ? 'text-slate-900' : 'text-white'}>{student.name} ({student.id})</strong>
              </span>
              <span className={`text-xs font-bold ${isStudentMode ? 'text-slate-500' : 'text-white/60'}`}>
                • Lớp: <strong className={isStudentMode ? 'text-blue-700' : 'text-amber-400'}>{student.className || 'Lớp học'}</strong>
              </span>
            </div>

            <h2 className={`text-lg sm:text-xl font-black uppercase tracking-tight ${
              isStudentMode ? 'text-slate-900' : 'text-white'
            }`}>
              Bảng tính giờ tham gia hoạt động vì cộng đồng & Ngoại khóa (Cả năm)
            </h2>
            <p className={`text-xs leading-relaxed max-w-2xl ${isStudentMode ? 'text-slate-500' : 'text-white/50'}`}>
              {isStudentMode 
                ? 'Học sinh tự diễn giải nội dung những hoạt động mình đã tham gia, tự cho số giờ tương ứng. Cột "Xác nhận" và "Ký tên" được khóa để Giáo viên chủ nhiệm và Ban cán sự kiểm tra, phê duyệt.'
                : 'Giáo viên chủ nhiệm và Cán sự phụ trách kiểm tra nội dung học sinh đã khai, tích chọn ô "Xác nhận" (checkbox) và ký tên phê duyệt để ghi nhận kết quả rèn luyện cuối năm.'}
            </p>
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-start lg:justify-end">
            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
              isStudentMode ? 'bg-white border-blue-100 shadow-2xs' : 'bg-white/5 border-white/10'
            }`}>
              <Clock size={22} className={isStudentMode ? 'text-blue-600' : 'text-amber-400'} />
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isStudentMode ? 'text-slate-400' : 'text-white/40'
                }`}>
                  Tổng giờ tự khai
                </span>
                <span className={`text-lg font-black ${isStudentMode ? 'text-slate-900' : 'text-white'}`}>
                  {totalAllHours}h
                </span>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
              isStudentMode ? 'bg-emerald-50/70 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
            }`}>
              <CheckCircle2 size={22} className="text-emerald-600" />
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  isStudentMode ? 'text-emerald-700' : 'text-emerald-400'
                }`}>
                  Đã được xác nhận
                </span>
                <span className="text-lg font-black text-emerald-600">
                  {totalAllConfirmedHours}h
                </span>
              </div>
            </div>

            {/* Nút Xuất PDF Trình BGH */}
            <button
              type="button"
              onClick={() => setIsPdfModalOpen(true)}
              className="px-4 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-slate-200/50 active:scale-95"
              title="Xuất mẫu văn bản bảng hoạt động kẻ bảng trình BGH có để trống chữ ký"
            >
              <Printer size={16} className="text-blue-600" />
              <span>Xuất PDF (Trình BGH)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isReadOnly || isSaving}
              className={`px-5 py-3 rounded-2xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-md active:scale-95 ${
                isStudentMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20' 
                  : 'bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20'
              } disabled:opacity-50`}
            >
              <Save size={15} />
              {isSaving ? 'Đang lưu...' : isStudentMode ? 'Lưu bản tự khai' : 'Lưu phê duyệt'}
            </button>
          </div>
        </div>

        {/* Save Success Alert Banner */}
        {saveSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={16} className="text-emerald-600" />
            Đã lưu thành công dữ liệu hoạt động của học sinh {student.name}!
          </div>
        )}
      </div>

      {/* 2. SUB-TAB SELECTOR (Bảng 1, Bảng 2, hoặc Xem trọn bộ) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`p-1 rounded-2xl border inline-flex gap-1 ${
          isStudentMode ? 'bg-slate-100 border-slate-200' : 'bg-white/[0.03] border-white/5'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('combined')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'combined'
                ? isStudentMode 
                  ? 'bg-white text-blue-700 shadow-sm font-black' 
                  : 'bg-amber-500 text-black font-black'
                : isStudentMode ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'
            }`}
          >
            <Layers size={14} /> Xem trọn bộ 2 bảng
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'community'
                ? isStudentMode 
                  ? 'bg-white text-blue-700 shadow-sm font-black' 
                  : 'bg-amber-500 text-black font-black'
                : isStudentMode ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'
            }`}
          >
            <Award size={14} /> Bảng 1: Hoạt động vì cộng đồng ({record.entries?.length || 7} mục)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sports'
                ? isStudentMode 
                  ? 'bg-white text-blue-700 shadow-sm font-black' 
                  : 'bg-amber-500 text-black font-black'
                : isStudentMode ? 'text-slate-600 hover:text-slate-900' : 'text-white/60 hover:text-white'
            }`}
          >
            <Flame size={14} /> Bảng 2: Văn nghệ & Thể thao ({record.sportArtItems?.length || 0} hoạt động)
          </button>
        </div>

        {/* Quick Batch Controls for Admin / Teacher */}
        {!isStudentMode && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleConfirmAllCommunity(true)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              title="Duyệt tất cả các mục có khai giờ"
            >
              <CheckSquare size={13} /> Duyệt tất cả Bảng 1
            </button>
            <button
              type="button"
              onClick={() => handleToggleConfirmAllSports(true)}
              className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold flex items-center gap-1 transition"
              title="Duyệt tất cả thể thao có khai giờ"
            >
              <CheckSquare size={13} /> Duyệt tất cả Bảng 2
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. BẢNG 1: BẢNG TÍNH GIỜ THAM GIA CÁC HOẠT ĐỘNG VÌ CỘNG ĐỒNG - CẢ NĂM */}
      {/* ========================================================================= */}
      {(activeTab === 'combined' || activeTab === 'community') && (
        <div className={`rounded-3xl border shadow-sm overflow-hidden ${
          isStudentMode ? 'bg-white border-slate-200' : 'bg-[#111] border-white/5'
        }`}>
          <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isStudentMode ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.02] border-white/5'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                isStudentMode ? 'bg-blue-100 text-blue-700' : 'bg-amber-500/10 text-amber-400'
              }`}>
                <Award size={18} />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wide ${
                  isStudentMode ? 'text-slate-900' : 'text-white'
                }`}>
                  Bảng 1: Hoạt động vì cộng đồng (Cả năm)
                </h3>
                <p className={`text-[11px] ${isStudentMode ? 'text-slate-400' : 'text-white/40'}`}>
                  Gồm 7 hạng mục hoạt động tiêu chuẩn theo mẫu quy định
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncSportsToItem7}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                  isStudentMode 
                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200' 
                    : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                }`}
                title="Lấy tổng số giờ từ Bảng 2 điền vào mục 7"
              >
                <RefreshCw size={12} /> Cập nhật tổng giờ thể thao vào Mục 7 ({totalSportHours}h)
              </button>
            </div>
          </div>

          {/* TABLE 1 GRID VIEW */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isStudentMode 
                    ? 'bg-slate-100/70 text-slate-600 border-slate-200' 
                    : 'bg-white/5 text-white/60 border-white/5'
                }`}>
                  <th className="py-3.5 px-3 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 w-1/3">Nội dung công việc</th>
                  <th className="py-3.5 px-4">Diễn giải nội dung và số giờ tham gia</th>
                  <th className="py-3.5 px-3 text-center w-24">Tổng giờ</th>
                  <th className="py-3.5 px-3 text-center w-24">
                    <div className="flex items-center justify-center gap-1">
                      <span>Xác nhận</span>
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center w-36">Người đánh giá (Ký tên)</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isStudentMode ? 'divide-slate-100 text-slate-700' : 'divide-white/5 text-white/80'
              }`}>
                {(record.entries || []).map((entry) => {
                  const isChecked = entry.isConfirmed;
                  const isItem7 = entry.stt === 7;
                  const isRowFrozen = isStudentMode && isChecked;

                  return (
                    <tr 
                      key={entry.stt}
                      className={`transition ${
                        isStudentMode 
                          ? isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50/80' 
                          : isChecked ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-4 px-3 text-center font-black">
                        <span className={`inline-block w-6 h-6 rounded-full text-center leading-6 text-xs ${
                          isStudentMode 
                            ? isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-800' 
                            : 'bg-white/10 text-white'
                        }`}>
                          {entry.stt}
                        </span>
                      </td>

                      {/* NỘI DUNG CÔNG VIỆC */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <p className={`font-black text-xs sm:text-sm ${
                              isStudentMode ? 'text-slate-900' : 'text-white'
                            }`}>
                              {entry.title}
                            </p>
                            {isRowFrozen && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🔒 Đã duyệt - Đóng băng
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] whitespace-pre-line leading-relaxed ${
                            isStudentMode ? 'text-slate-500' : 'text-white/50'
                          }`}>
                            {entry.guide}
                          </p>
                          {isItem7 && (
                            <div className={`p-2 rounded-xl text-[10px] font-semibold flex items-center justify-between ${
                              isStudentMode ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}>
                              <span>👉 Lấy chi tiết từ Bảng 2 bên dưới:</span>
                              <strong className="font-black">{totalSportHours} giờ ({record.sportArtItems.filter(s => s.hours > 0).length} hoạt động)</strong>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* DIỄN GIẢI NỘI DUNG VÀ SỐ GIỜ THAM GIA MỖI NỘI DUNG */}
                      <td className="py-4 px-4 align-top">
                        <textarea
                          rows={3}
                          value={entry.studentNote || ''}
                          disabled={isReadOnly || isRowFrozen}
                          onChange={(e) => handleUpdateCommunityEntry(entry.stt, 'studentNote', e.target.value)}
                          placeholder={isItem7 
                            ? "Diễn giải các hoạt động văn nghệ, thể thao đã tham gia (hoặc nhập tự động từ Bảng 2)..." 
                            : "Học sinh tự diễn giải nội dung chi tiết và số giờ tham gia..."}
                          className={`w-full text-xs rounded-xl p-3 focus:outline-none transition resize-y ${
                            isStudentMode 
                              ? isRowFrozen
                                ? 'bg-slate-100/90 border border-slate-200 text-slate-700 cursor-not-allowed font-medium'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 placeholder-slate-400' 
                              : 'bg-[#0a0a0a] border border-white/10 text-white focus:border-amber-500 placeholder-white/20'
                          } disabled:opacity-80`}
                        />
                        {isRowFrozen && (
                          <span className="text-[10px] text-emerald-700 italic block mt-1">
                            * Mục này đã được giáo viên duyệt. Học sinh không thể chỉnh sửa điểm và nội dung.
                          </span>
                        )}
                      </td>

                      {/* TỔNG GIỜ */}
                      <td className="py-4 px-3 align-top text-center">
                        <div className="flex flex-col items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            max="500"
                            step="0.5"
                            value={entry.hours === 0 ? '' : entry.hours}
                            disabled={isReadOnly || isRowFrozen}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                              handleUpdateCommunityEntry(entry.stt, 'hours', Math.max(0, val));
                            }}
                            placeholder="0"
                            className={`w-20 text-center font-black font-mono py-2 rounded-xl text-sm focus:outline-none transition ${
                              isStudentMode 
                                ? isRowFrozen
                                  ? 'bg-slate-100 border border-slate-300 text-emerald-800 cursor-not-allowed'
                                  : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white' 
                                : 'bg-[#0a0a0a] border border-white/10 text-amber-400 focus:border-amber-500'
                            } disabled:opacity-90`}
                          />
                          <span className="text-[10px] text-slate-400">giờ</span>
                        </div>
                      </td>

                      {/* XÁC NHẬN (CHECKBOX) */}
                      <td className="py-4 px-3 align-top text-center">
                        <div className="flex flex-col items-center justify-center pt-2">
                          {isStudentMode ? (
                            // Locked for student
                            <div className={`p-2 rounded-xl border flex items-center justify-center transition ${
                              isChecked 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800 shadow-2xs' 
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`} title={isChecked ? "Đã được Giáo viên / Cán sự xác nhận" : "Chờ xác nhận"}>
                              {isChecked ? (
                                <CheckSquare size={20} className="text-emerald-600 stroke-[2.5]" />
                              ) : (
                                <Square size={20} className="text-slate-300 stroke-[2]" />
                              )}
                            </div>
                          ) : (
                            // Clickable for Teacher / Admin
                            <button
                              type="button"
                              onClick={() => {
                                const nextState = !isChecked;
                                handleUpdateCommunityEntry(entry.stt, 'isConfirmed', nextState);
                                if (nextState && (!entry.signedBy || entry.signedBy === 'Ký tên')) {
                                  handleUpdateCommunityEntry(entry.stt, 'signedBy', 'GVCN');
                                }
                              }}
                              className={`p-2 rounded-xl border cursor-pointer transition hover:scale-105 active:scale-95 ${
                                isChecked 
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm' 
                                  : 'bg-white/5 border-white/10 text-white/30 hover:border-amber-500/50 hover:text-white'
                              }`}
                              title={isChecked ? "Bấm để bỏ xác nhận" : "Bấm để xác nhận giờ cho học sinh"}
                            >
                              {isChecked ? (
                                <CheckSquare size={20} className="text-emerald-400 stroke-[2.5]" />
                              ) : (
                                <Square size={20} className="text-white/40" />
                              )}
                            </button>
                          )}
                          <span className={`text-[10px] font-bold mt-1 ${
                            isChecked ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            {isChecked ? 'Đã duyệt' : 'Chưa duyệt'}
                          </span>
                        </div>
                      </td>

                      {/* NGƯỜI ĐÁNH GIÁ (KÝ TÊN) */}
                      <td className="py-4 px-4 align-top text-center">
                        <div className="space-y-1.5">
                          {isStudentMode ? (
                            <div className={`p-2 rounded-xl text-center border font-serif text-xs font-bold italic ${
                              isChecked 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}>
                              {isChecked ? (entry.signedBy || 'Đã ký xác nhận') : 'Ký tên'}
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={entry.signedBy || ''}
                                onChange={(e) => handleUpdateCommunityEntry(entry.stt, 'signedBy', e.target.value)}
                                placeholder="Ký tên (VD: GVCN, TLTN...)"
                                className="w-full text-center text-xs bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-2 py-1.5 focus:outline-none focus:border-amber-500 font-serif italic"
                              />
                              <div className="flex justify-center gap-1">
                                {['GVCN', 'Ban cán sự', 'TLTN'].map(role => (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleUpdateCommunityEntry(entry.stt, 'signedBy', role)}
                                    className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 hover:text-amber-300 text-white/50 transition cursor-pointer"
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`border-t font-black text-xs ${
                  isStudentMode ? 'bg-slate-100/90 text-slate-900 border-slate-200' : 'bg-white/10 text-white border-white/10'
                }`}>
                  <td colSpan={3} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    Tổng số giờ tham gia hoạt động vì cộng đồng (Bảng 1):
                  </td>
                  <td className="py-3.5 px-3 text-center text-sm font-black font-mono">
                    {totalCommunityHours}h
                  </td>
                  <td className="py-3.5 px-3 text-center text-sm font-black font-mono text-emerald-600">
                    {totalCommunityConfirmedHours}h
                  </td>
                  <td className="py-3.5 px-4 text-center text-[10px] text-slate-500">
                    {totalCommunityConfirmedHours === totalCommunityHours && totalCommunityHours > 0
                      ? '✅ Đã duyệt đủ 100%' 
                      : `Duyệt ${totalCommunityConfirmedHours}/${totalCommunityHours}h`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BẢNG 2: BẢNG CHI TIẾT CÁC HOẠT ĐỘNG VĂN NGHỆ, THỂ THAO, NGOẠI KHÓA */}
      {/* ========================================================================= */}
      {(activeTab === 'combined' || activeTab === 'sports') && (
        <div className={`rounded-3xl border shadow-sm overflow-hidden ${
          isStudentMode ? 'bg-white border-slate-200' : 'bg-[#111] border-white/5'
        }`}>
          <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isStudentMode ? 'bg-slate-50/80 border-slate-200' : 'bg-white/[0.02] border-white/5'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-xl ${
                isStudentMode ? 'bg-indigo-100 text-indigo-700' : 'bg-indigo-500/10 text-indigo-400'
              }`}>
                <Flame size={18} />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-wide ${
                  isStudentMode ? 'text-slate-900' : 'text-white'
                }`}>
                  Bảng 2: Chi tiết các hoạt động văn nghệ, thể thao, ngoại khoá
                </h3>
                <p className={`text-[11px] ${isStudentMode ? 'text-slate-400' : 'text-white/40'}`}>
                  Quy định: Tham gia 10h, vòng trong 12h, tứ kết 15h, bán kết 18h, chung kết 20h. Cổ vũ tối đa 50% số giờ.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddSportModalOpen(true)}
                disabled={isReadOnly}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  isStudentMode 
                    ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                }`}
              >
                <Plus size={14} /> Thêm môn/hoạt động khác
              </button>
            </div>
          </div>

          {/* TABLE 2 GRID VIEW */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-black uppercase tracking-wider ${
                  isStudentMode 
                    ? 'bg-slate-100/70 text-slate-600 border-slate-200' 
                    : 'bg-white/5 text-white/60 border-white/5'
                }`}>
                  <th className="py-3.5 px-3 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 w-1/4">Các hoạt động văn nghệ, thể thao, ngoại khoá</th>
                  <th className="py-3.5 px-3 text-center w-36">Ghi "Cổ vũ", "Tham gia"</th>
                  <th className="py-3.5 px-4">Thành tích (Giải)</th>
                  <th className="py-3.5 px-3 text-center w-28">Số giờ mỗi HĐ</th>
                  <th className="py-3.5 px-3 text-center w-24">Xác nhận</th>
                  <th className="py-3.5 px-3 text-center w-32">Ký tên</th>
                  <th className="py-3.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                isStudentMode ? 'divide-slate-100 text-slate-700' : 'divide-white/5 text-white/80'
              }`}>
                {(record.sportArtItems || []).map((item, index) => {
                  const isChecked = item.isConfirmed;
                  const hasHours = (Number(item.hours) || 0) > 0;
                  const isSportFrozen = isStudentMode && isChecked;

                  return (
                    <tr 
                      key={item.id}
                      className={`transition ${
                        isStudentMode 
                          ? isChecked ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : hasHours ? 'bg-blue-50/20 hover:bg-blue-50/40' : 'hover:bg-slate-50/60' 
                          : isChecked ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : hasHours ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* TÊN HOẠT ĐỘNG */}
                      <td className="py-3 px-4 font-bold">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item.name}
                            disabled={isReadOnly || isSportFrozen}
                            onChange={(e) => handleUpdateSportItem(item.id, 'name', e.target.value)}
                            className={`w-full bg-transparent font-bold focus:outline-none ${
                              isStudentMode ? 'text-slate-800' : 'text-white'
                            } disabled:opacity-80`}
                          />
                          {isSportFrozen && (
                            <span className="shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded">
                              🔒 Đã duyệt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* HÌNH THỨC: THAM GIA / CỔ VŨ */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={item.role || 'Tham gia'}
                          disabled={isReadOnly || isSportFrozen}
                          onChange={(e) => handleUpdateSportItem(item.id, 'role', e.target.value)}
                          className={`text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none transition cursor-pointer ${
                            isStudentMode 
                              ? isSportFrozen
                                ? 'bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:border-blue-600' 
                              : 'bg-[#0a0a0a] border border-white/10 text-white focus:border-amber-500'
                          } disabled:opacity-80`}
                        >
                          <option value="Tham gia">🏃 Tham gia</option>
                          <option value="Cổ vũ">📣 Cổ vũ</option>
                          <option value="Ban tổ chức">⭐ Ban tổ chức</option>
                          <option value="Không tham gia">➖ Không tham gia</option>
                        </select>
                      </td>

                      {/* THÀNH TÍCH (GIẢI) */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={item.achievement || ''}
                          disabled={isReadOnly || isSportFrozen}
                          onChange={(e) => handleUpdateSportItem(item.id, 'achievement', e.target.value)}
                          placeholder="VD: Tham gia, Vòng bảng, Giải Ba, Khuyến khích..."
                          className={`w-full text-xs rounded-xl px-3 py-1.5 focus:outline-none transition ${
                            isStudentMode 
                              ? isSportFrozen
                                ? 'bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-blue-600' 
                              : 'bg-[#0a0a0a] border border-white/10 text-white focus:border-amber-500'
                          } disabled:opacity-80`}
                        />
                      </td>

                      {/* SỐ GIỜ */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={item.hours === 0 ? '' : item.hours}
                          disabled={isReadOnly || isSportFrozen}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                            handleUpdateSportItem(item.id, 'hours', Math.max(0, val));
                          }}
                          placeholder="0"
                          className={`w-16 text-center font-bold font-mono py-1.5 rounded-xl text-xs focus:outline-none transition ${
                            isStudentMode 
                              ? isSportFrozen
                                ? 'bg-slate-100 border border-slate-300 text-emerald-800 cursor-not-allowed'
                                : 'bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white' 
                              : 'bg-[#0a0a0a] border border-white/10 text-amber-400 focus:border-amber-500'
                          } disabled:opacity-90`}
                        />
                      </td>

                      {/* XÁC NHẬN (CHECKBOX) */}
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center">
                          {isStudentMode ? (
                            <div className={`p-1.5 rounded-lg border flex items-center justify-center ${
                              isChecked 
                                ? 'bg-emerald-100 border-emerald-300 text-emerald-800' 
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`} title={isChecked ? "Đã được xác nhận" : "Chờ xác nhận"}>
                              {isChecked ? (
                                <CheckSquare size={16} className="text-emerald-600 stroke-[2.5]" />
                              ) : (
                                <Square size={16} className="text-slate-300" />
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const nextState = !isChecked;
                                handleUpdateSportItem(item.id, 'isConfirmed', nextState);
                                if (nextState && (!item.signedBy || item.signedBy === 'Ký tên')) {
                                  handleUpdateSportItem(item.id, 'signedBy', 'GVCN');
                                }
                              }}
                              className={`p-1.5 rounded-lg border cursor-pointer transition ${
                                isChecked 
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                                  : 'bg-white/5 border-white/10 text-white/30 hover:border-amber-500/50'
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare size={16} className="text-emerald-400 stroke-[2.5]" />
                              ) : (
                                <Square size={16} className="text-white/40" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* KÝ TÊN */}
                      <td className="py-3 px-3 text-center">
                        {isStudentMode ? (
                          <span className={`text-[11px] font-serif italic ${
                            isChecked ? 'text-emerald-700 font-bold' : 'text-slate-400'
                          }`}>
                            {isChecked ? (item.signedBy || 'Đã ký') : 'Ký tên'}
                          </span>
                        ) : (
                          <input
                            type="text"
                            value={item.signedBy || ''}
                            onChange={(e) => handleUpdateSportItem(item.id, 'signedBy', e.target.value)}
                            placeholder="Ký tên"
                            className="w-24 text-center text-xs bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-2 py-1 focus:outline-none focus:border-amber-500 font-serif italic"
                          />
                        )}
                      </td>

                      {/* XÓA HOẠT ĐỘNG */}
                      <td className="py-3 px-2 text-center">
                        {!isReadOnly && !isSportFrozen && (
                          <button
                            type="button"
                            onClick={() => handleDeleteSportItem(item.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 transition cursor-pointer"
                            title="Xóa dòng này"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={`border-t font-black text-xs ${
                  isStudentMode ? 'bg-slate-100/90 text-slate-900 border-slate-200' : 'bg-white/10 text-white border-white/10'
                }`}>
                  <td colSpan={4} className="py-3.5 px-4 text-right uppercase tracking-wider">
                    Tổng số giờ tất cả các nội dung văn nghệ & thể thao (Bảng 2):
                  </td>
                  <td className="py-3.5 px-3 text-center text-sm font-black font-mono">
                    {totalSportHours}h
                  </td>
                  <td className="py-3.5 px-3 text-center text-sm font-black font-mono text-emerald-600">
                    {totalSportConfirmedHours}h
                  </td>
                  <td colSpan={2} className="py-3.5 px-3 text-center text-[10px] text-slate-500">
                    {totalSportConfirmedHours === totalSportHours && totalSportHours > 0
                      ? '✅ Đã duyệt đủ' 
                      : `Duyệt ${totalSportConfirmedHours}/${totalSportHours}h`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PHẦN ĐÁNH GIÁ & NHẬN XÉT CUỐI NĂM CỦA GIÁO VIÊN CHỦ NHIỆM */}
      {/* ========================================================================= */}
      <div className={`p-6 rounded-3xl border shadow-sm space-y-4 ${
        isStudentMode ? 'bg-white border-slate-200' : 'bg-[#111] border-white/5'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <UserCheck size={18} className={isStudentMode ? 'text-blue-600' : 'text-amber-500'} />
            <h3 className={`text-sm font-black uppercase tracking-wider ${
              isStudentMode ? 'text-slate-900' : 'text-white'
            }`}>
              Đánh giá & Nhận xét cuối năm của Giáo viên chủ nhiệm
            </h3>
          </div>
          <span className={`px-3 py-1 text-xs font-black rounded-full uppercase ${
            record.evaluationRating === 'Xuất sắc' 
              ? 'bg-amber-100 text-amber-900 border border-amber-300' 
              : record.evaluationRating === 'Tốt'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-blue-100 text-blue-900 border border-blue-300'
          }`}>
            Xếp loại: {record.evaluationRating || 'Đạt'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className={`text-xs font-bold block ${isStudentMode ? 'text-slate-500' : 'text-white/50'}`}>
              Mức độ hoàn thành phong trào & công tác xã hội:
            </label>
            {isStudentMode ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 text-xs">
                {record.evaluationRating || 'Đạt tiêu chuẩn rèn luyện'}
              </div>
            ) : (
              <select
                value={record.evaluationRating || 'Đạt'}
                disabled={isReadOnly}
                onChange={(e) => setRecord(prev => ({ ...prev, evaluationRating: e.target.value }))}
                className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-xl p-3 text-xs font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="Xuất sắc">🌟 Xuất sắc (Hoàn thành vượt bậc)</option>
                <option value="Tốt">👍 Tốt (Tích cực tham gia)</option>
                <option value="Đạt">👌 Đạt (Đạt chỉ tiêu giờ quy định)</option>
                <option value="Cần cố gắng">⚠️ Cần cố gắng (Chưa đủ số giờ)</option>
              </select>
            )}
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label className={`text-xs font-bold block ${isStudentMode ? 'text-slate-500' : 'text-white/50'}`}>
              Nhận xét đánh giá của GVCN:
            </label>
            <textarea
              rows={2}
              value={record.teacherComment || ''}
              disabled={isStudentMode || isReadOnly}
              onChange={(e) => setRecord(prev => ({ ...prev, teacherComment: e.target.value }))}
              placeholder={isStudentMode 
                ? "Chưa có nhận xét từ Giáo viên chủ nhiệm" 
                : "Nhập nhận xét về tinh thần tham gia công tác xã hội và hoạt động phong trào của học sinh trong năm học..."}
              className={`w-full text-xs rounded-xl p-3 focus:outline-none transition resize-none ${
                isStudentMode 
                  ? 'bg-slate-50 border border-slate-200 text-slate-800' 
                  : 'bg-[#0a0a0a] border border-white/10 text-white focus:border-amber-500'
              } disabled:opacity-75`}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: THÊM MÔN / HOẠT ĐỘNG THỂ THAO NGOẠI KHÓA MỚI */}
      {/* ========================================================================= */}
      {isAddSportModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 animate-scaleUp text-slate-800 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <Plus size={18} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Thêm hoạt động thể thao & ngoại khóa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddSportModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddCustomSport} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Tên hoạt động / Môn thi đấu <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={newSportName}
                  onChange={(e) => setNewSportName(e.target.value)}
                  placeholder="VD: Hội khỏe Phù Đổng, Rung chuông vàng, Bơi ếch..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Hình thức</label>
                  <select
                    value={newSportRole}
                    onChange={(e) => setNewSportRole(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer"
                  >
                    <option value="Tham gia">🏃 Tham gia</option>
                    <option value="Cổ vũ">📣 Cổ vũ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Số giờ (tự cho)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newSportHours}
                    onChange={(e) => setNewSportHours(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">Thành tích / Kết quả</label>
                <input
                  type="text"
                  value={newSportAchievement}
                  onChange={(e) => setNewSportAchievement(e.target.value)}
                  placeholder="VD: Tham gia vòng loại, Giải Nhất, Khuyến khích..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Thêm vào danh sách
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PDF Export & Print Document Modal */}
      <CommunityActivitiesPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        student={student}
        record={record}
      />

    </div>
  );
}

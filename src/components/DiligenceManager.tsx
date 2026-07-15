/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, ViolationRecord, ViolationType } from '../types';
import { Plus, Trash2, Calendar, ShieldAlert, TrendingDown, Users, AlertTriangle, Search, Settings, Edit3, X, Save, FileText } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell, PieChart, Pie } from 'recharts';
import { CustomConfirmModal } from './CustomConfirmModal';

interface DiligenceManagerProps {
  students: Student[];
  violations: ViolationRecord[];
  onAddViolation: (violation: ViolationRecord) => void;
  onDeleteViolation: (id: string) => void;
  violationTypes: ViolationType[];
  onUpdateViolationTypes: (types: ViolationType[]) => void;
  onUpdateViolation?: (violation: ViolationRecord) => void;
  isReadOnly?: boolean;
}

const getResolution = (type: string): string => {
  switch (type) {
    case 'Nghỉ học không phép':
      return 'Phê bình trước lớp, GVCN liên hệ gia đình làm rõ lý do, yêu cầu viết bản tường trình và có chữ ký xác nhận của phụ huynh.';
    case 'Nghỉ học có phép':
      return 'Nhắc nhở học sinh chủ động chép bài đầy đủ và nhờ bạn bè hoặc giáo viên hướng dẫn các nội dung kiến thức bị khuyết.';
    case 'Đi muộn':
      return 'Trừ điểm rèn luyện cá nhân, nhắc nhở nghiêm khắc. Nếu tái phạm quá 3 lần sẽ yêu cầu phụ huynh phối hợp đưa đón học sinh đúng giờ.';
    case 'Không đồng phục':
      return 'Yêu cầu mặc trang phục đúng tác phong trước khi vào lớp. Đăng ký nhắc nhở nề nếp và trừ điểm rèn luyện.';
    case 'Không làm bài tập':
      return 'Yêu cầu hoàn thành bù bài tập đầy đủ trong giờ ra chơi hoặc nộp lại trước buổi học kế tiếp dưới sự kiểm tra của lớp trưởng.';
    case 'Làm việc riêng':
      return 'Tịch thu vật dụng gây xao nhãng (trả lại sau buổi học), nhắc nhở trực tiếp và yêu cầu tập trung hoàn thành nội dung bài giảng.';
    default:
      return 'Gặp riêng học sinh để phân tích sai phạm, khuyên răn và giao Ban cán sự lớp theo dõi sát sao, giúp đỡ cải thiện.';
  }
};

export default function DiligenceManager({
  students,
  violations,
  onAddViolation,
  onDeleteViolation,
  violationTypes,
  onUpdateViolationTypes,
  onUpdateViolation,
  isReadOnly = false
}: DiligenceManagerProps) {
  const [activeColumnTab, setActiveColumnTab] = useState<'log-journal' | 'charts-overview'>('log-journal');
  
  // Date & month filters
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');
  const [filterFromMonth, setFilterFromMonth] = useState('');
  const [filterToMonth, setFilterToMonth] = useState('');
  
  // Tab 1: Ghi nhận vi phạm
  const [studentId, setStudentId] = useState('');
  const [type, setType] = useState('');
  const [points, setPoints] = useState(-1);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingViolationId, setEditingViolationId] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Initialize selected type
  useEffect(() => {
    if (violationTypes && violationTypes.length > 0) {
      const firstType = violationTypes[0];
      setType(firstType.label);
      setPoints(firstType.defaultPoints);
      setResolution(getResolution(firstType.label));
    }
  }, [violationTypes]);

  // Auto-adjust points and resolution when type changes
  const handleTypeChange = (newType: string) => {
    setType(newType);
    const selected = violationTypes.find(vt => vt.label === newType);
    if (selected) {
      setPoints(selected.defaultPoints);
    }
    setResolution(getResolution(newType));
  };

  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('Không thể thực hiện ở chế độ Chỉ xem!');
      return;
    }
    if (!studentId) {
      alert('Vui lòng chọn học sinh');
      return;
    }

    const matchedStudent = students.find(s => s.id === studentId);
    if (!matchedStudent) return;

    if (editingViolationId) {
      const record: ViolationRecord = {
        id: editingViolationId,
        studentId: matchedStudent.id,
        studentName: matchedStudent.name,
        date,
        type: type as any,
        points,
        note: note.trim(),
        resolution: resolution.trim()
      };
      if (onUpdateViolation) {
        onUpdateViolation(record);
      }
      setEditingViolationId(null);
    } else {
      // Auto-generate record ID
      const nextNum = violations.length > 0 
        ? Math.max(...violations.map(v => {
            const num = parseInt(v.id.replace('VP', ''), 10);
            return isNaN(num) ? 0 : num;
          })) + 1 
        : 1;
      const nextId = `VP${nextNum.toString().padStart(3, '0')}`;

      const record: ViolationRecord = {
        id: nextId,
        studentId: matchedStudent.id,
        studentName: matchedStudent.name,
        date,
        type: type as any,
        points,
        note: note.trim(),
        resolution: resolution.trim()
      };

      onAddViolation(record);
    }
    
    // Reset fields
    setStudentId('');
    if (violationTypes.length > 0) {
      setType(violationTypes[0].label);
      setPoints(violationTypes[0].defaultPoints);
      setResolution(getResolution(violationTypes[0].label));
    }
    setNote('');
  };

  const handleCancelEdit = () => {
    setEditingViolationId(null);
    setStudentId('');
    if (violationTypes.length > 0) {
      setType(violationTypes[0].label);
      setPoints(violationTypes[0].defaultPoints);
      setResolution(getResolution(violationTypes[0].label));
    }
    setNote('');
  };

  const handleStartEdit = (v: ViolationRecord) => {
    setEditingViolationId(v.id);
    setStudentId(v.studentId);
    setType(v.type);
    setPoints(v.points);
    setDate(v.date);
    setNote(v.note);
    setResolution(v.resolution);
  };

  const handleDeleteRecord = (id: string, name: string, type: string) => {
    setConfirmModal({
      title: 'Xác nhận xóa nề nếp',
      message: `Bạn có chắc muốn xóa bản ghi nề nếp của học sinh "${name}" (${type}) không?`,
      onConfirm: () => {
        onDeleteViolation(id);
        setConfirmModal(null);
      }
    });
  };

  // Filter student list to only active students (show all if read-only for old classes)
  const activeStudents = isReadOnly ? students : students.filter(s => s.status === 'Đang học');

  // Filtered log records with search query and date range (x to y)
  const filteredViolations = violations.filter(v => {
    const matchesSearch = searchQuery === '' || 
      v.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.note.toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!matchesSearch) return false;

    // Date range check
    if (filterFromDate && v.date < filterFromDate) return false;
    if (filterToDate && v.date > filterToDate) return false;

    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // --- STATS & CHARTS (Filtered by Month range x to y) ---
  const filteredViolationsForCharts = violations.filter(v => {
    const month = v.date.substring(0, 7); // "YYYY-MM"
    if (filterFromMonth && month < filterFromMonth) return false;
    if (filterToMonth && month > filterToMonth) return false;
    return true;
  });

  const typeCounts = violationTypes.map(vt => {
    const count = filteredViolationsForCharts.filter(v => v.type === vt.label).length;
    return { name: vt.label, value: count };
  }).filter(item => item.value > 0);

  const COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#64748b', '#22c55e', '#a855f7'];

  const studentTotals = students.map(s => {
    const studentViolations = filteredViolationsForCharts.filter(v => v.studentId === s.id);
    const totalDeduction = studentViolations.reduce((sum, v) => sum + v.points, 0);
    return {
      name: s.name,
      'Điểm trừ': Math.abs(totalDeduction)
    };
  })
  .filter(s => s['Điểm trừ'] > 0)
  .sort((a, b) => b['Điểm trừ'] - a['Điểm trừ'])
  .slice(0, 5);

  return (
    <div className="space-y-6" id="diligence-manager-section">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left panel: Log infraction Form */}
          <div className="xl:col-span-4 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 h-fit">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={16} className="text-amber-500 animate-pulse" /> {editingViolationId ? 'Chỉnh sửa nề nếp' : 'Ghi nhận nề nếp'}
            </h3>

            {isReadOnly && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs leading-relaxed space-y-1 mb-4">
                <div className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                  <AlertTriangle size={14} /> Chế độ chỉ xem
                </div>
                <p className="text-white/70 text-[11px]">Lớp học này thuộc niên khóa cũ. Tất cả các tính năng Thêm, Sửa, Xóa kỷ luật/vi phạm đã bị khóa để bảo toàn dữ liệu lịch sử.</p>
              </div>
            )}

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Chọn học sinh <span className="text-rose-500">*</span></label>
                <select
                  id="violation-student-select"
                  required
                  value={studentId}
                  disabled={isReadOnly || !!editingViolationId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full text-xs bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 disabled:opacity-55"
                >
                  <option value="" className="bg-[#111]">-- Chọn học sinh ghi nhận --</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#111]">{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Loại ghi nhận</label>
                  <select
                    id="violation-type-select"
                    value={type}
                    disabled={isReadOnly}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full text-xs bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  >
                    {violationTypes.map(vt => (
                      <option key={vt.id} value={vt.label} className="bg-[#111]">{vt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Điểm trừ</label>
                  <input
                    id="violation-points-input"
                    type="number"
                    max={0}
                    required
                    value={points}
                    disabled={isReadOnly}
                    onChange={(e) => setPoints(parseInt(e.target.value, 10))}
                    className="w-full text-xs bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Ngày ghi nhận</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3.5 top-3 text-white/30" />
                  <input
                    id="violation-date-input"
                    type="date"
                    required
                    value={date}
                    disabled={isReadOnly}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 text-white rounded-xl text-xs focus:outline-none focus:border-amber-500 font-mono disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Chi tiết vi phạm / Lý do nghỉ</label>
                <textarea
                  id="violation-note-textarea"
                  placeholder="VD: Đến muộn 15 phút, không làm bài tập toán..."
                  rows={2}
                  value={note}
                  disabled={isReadOnly}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none placeholder-white/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Hướng giải quyết / Biện pháp giáo dục</label>
                <textarea
                  id="violation-resolution-textarea"
                  placeholder="Nhập biện pháp giải quyết hoặc giáo dục học sinh..."
                  rows={2}
                  value={resolution}
                  disabled={isReadOnly}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none placeholder-white/20 disabled:opacity-50"
                />
              </div>

              <div className="flex gap-2.5">
                {editingViolationId && (
                  <button
                    id="violation-cancel-btn"
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition text-xs"
                  >
                    <X size={14} /> Hủy
                  </button>
                )}
                <button
                  id="violation-submit-btn"
                  type="submit"
                  disabled={isReadOnly}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl transition text-xs shadow-md font-bold ${
                    isReadOnly
                      ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-700 text-black'
                  }`}
                >
                  {isReadOnly ? (
                    'Đã khóa (Chỉ xem)'
                  ) : editingViolationId ? (
                    <>
                      <Save size={14} /> Cập nhật
                    </>
                  ) : (
                    <>
                      <Plus size={14} /> Ghi nhận vào sổ
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Center & Right panels: Logs and Charts */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            
            {/* Column 2 Tabs Navigation */}
            <div className="flex gap-2 bg-white/[0.02] p-1 rounded-2xl border border-white/5 w-fit">
              <button
                type="button"
                onClick={() => setActiveColumnTab('log-journal')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeColumnTab === 'log-journal'
                    ? 'bg-amber-600 text-black shadow-lg shadow-amber-900/10 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <FileText size={14} /> Sổ nhật ký nề nếp lớp học
              </button>
              <button
                type="button"
                onClick={() => setActiveColumnTab('charts-overview')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  activeColumnTab === 'charts-overview'
                    ? 'bg-amber-600 text-black shadow-lg shadow-amber-900/10 font-bold'
                    : 'text-white/60 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <TrendingDown size={14} /> Biểu đồ tổng quan nề nếp lớp học
              </button>
            </div>

            {activeColumnTab === 'log-journal' ? (
              /* Logs Log/Records List Card */
              <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 flex flex-col flex-1 min-h-[450px]">
                <div className="flex flex-col gap-4 mb-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                      <FileText size={15} className="text-amber-500" /> Sổ nhật ký nề nếp lớp học
                    </h3>
                    <div className="relative w-full sm:w-64">
                      <Search size={14} className="absolute left-3 top-2.5 text-white/30" />
                      <input
                        id="violation-search-input"
                        type="text"
                        placeholder="Tìm học sinh, lỗi vi phạm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-white placeholder-white/20"
                      />
                    </div>
                  </div>

                  {/* Date range filters */}
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-white/[0.01] rounded-2xl border border-white/5">
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Thời gian:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Từ ngày</span>
                      <input
                        type="date"
                        value={filterFromDate}
                        onChange={(e) => setFilterFromDate(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Đến ngày</span>
                      <input
                        type="date"
                        value={filterToDate}
                        onChange={(e) => setFilterToDate(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    {(filterFromDate || filterToDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterFromDate('');
                          setFilterToDate('');
                        }}
                        className="ml-auto text-[10px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[420px]">
                  {filteredViolations.length === 0 ? (
                    <div className="text-center py-12 text-white/30 text-xs italic">
                      Không có bản ghi nề nếp nào phù hợp với tìm kiếm hoặc bộ lọc thời gian
                    </div>
                  ) : (
                    filteredViolations.map((v) => {
                      const isNghỉPhep = v.type === 'Nghỉ học có phép';
                      return (
                        <div
                          id={`violation-record-${v.id}`}
                          key={v.id}
                          className="p-3 bg-[#0d0d0d] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between transition gap-4 text-xs sm:text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg border ${
                              isNghỉPhep 
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                : v.points <= -3 
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              <AlertTriangle size={14} />
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2 text-xs sm:text-sm">
                                {v.studentName}
                                <span className="text-[9px] bg-white/10 text-white/60 font-mono px-1 rounded border border-white/5">
                                  {v.studentId}
                                </span>
                              </div>
                              <div className="text-[10px] text-white/40 font-medium mt-0.5">
                                {v.type} <span className="mx-1.5 text-white/10">•</span> {v.note || 'Không ghi chú thêm'}
                              </div>
                              {v.resolution && (
                                <div className="text-[10px] text-amber-300 bg-amber-500/10 border border-amber-500/10 px-2 py-0.5 rounded-lg mt-1 inline-block">
                                  <span className="font-semibold text-amber-400">Hướng giải quyết:</span> {v.resolution}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className={`text-xs sm:text-sm font-bold ${
                                isNghỉPhep ? 'text-blue-400' : 'text-rose-400'
                              }`}>
                                {v.points === 0 ? '0' : `${v.points}`}đ
                              </div>
                              <div className="text-[9px] text-white/30 mt-0.5 font-mono">
                                {v.date.split('-').reverse().join('/')}
                              </div>
                            </div>
                            {!isReadOnly && (
                              <>
                                <button
                                  id={`btn-edit-violation-${v.id}`}
                                  onClick={() => handleStartEdit(v)}
                                  className="p-1.5 hover:bg-amber-500/15 hover:text-amber-500 rounded-lg text-white/30 transition"
                                  title="Chỉnh sửa vi phạm"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  id={`btn-delete-violation-${v.id}`}
                                  onClick={() => handleDeleteRecord(v.id, v.studentName, v.type)}
                                  className="p-1.5 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg text-white/30 transition"
                                  title="Xóa dòng"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Statistics & Charts Block Card */
              <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5">
                <div className="flex flex-col gap-4 mb-4">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <TrendingDown size={15} className="text-amber-500" /> Biểu đồ tổng quan nề nếp lớp học
                  </h3>
                  
                  {/* Month range filters */}
                  <div className="flex flex-wrap items-center gap-3 p-3 bg-white/[0.01] rounded-2xl border border-white/5">
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Thời gian:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Từ tháng</span>
                      <input
                        type="month"
                        value={filterFromMonth}
                        onChange={(e) => setFilterFromMonth(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">Đến tháng</span>
                      <input
                        type="month"
                        value={filterToMonth}
                        onChange={(e) => setFilterToMonth(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/10 text-white rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    {(filterFromMonth || filterToMonth) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterFromMonth('');
                          setFilterToMonth('');
                        }}
                        className="ml-auto text-[10px] text-rose-400 hover:text-rose-300 font-semibold"
                      >
                        Xóa lọc
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Pie Chart: Violation Distribution */}
                  <div className="border border-white/5 p-4 bg-white/[0.01] rounded-2xl flex flex-col justify-between">
                    <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 text-center font-sans">Tỷ lệ các loại vi phạm</h4>
                    {typeCounts.length === 0 ? (
                      <div className="h-[180px] flex items-center justify-center text-xs text-white/30 italic text-center">
                        Không có dữ liệu vi phạm trong thời gian này
                      </div>
                    ) : (
                      <div className="h-[180px] flex items-center">
                        <div className="w-1/2 h-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={typeCounts}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {typeCounts.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-1/2 space-y-1.5 text-[10px] overflow-y-auto max-h-[160px] custom-scrollbar">
                          {typeCounts.map((item, idx) => (
                            <div key={item.name} className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                              <span className="text-white/60 font-medium truncate" title={item.name}>{item.name}:</span>
                              <span className="text-white font-bold ml-auto">{item.value} lần</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bar Chart: Most Penalised Students */}
                  <div className="border border-white/5 p-4 bg-white/[0.01] rounded-2xl">
                    <h4 className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-2 text-center font-sans">Top 5 học sinh bị trừ điểm nhiều nhất</h4>
                    {studentTotals.length === 0 ? (
                      <div className="h-[180px] flex items-center justify-center text-xs text-emerald-400 italic text-center">
                        Tất cả học sinh đều giữ nguyên điểm nề nếp hoàn hảo! 🌟
                      </div>
                    ) : (
                      <div className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={studentTotals} margin={{ top: 10, right: 10, left: -30, bottom: 5 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'rgba(255, 255, 255, 0.4)' }} stroke="rgba(255,255,255,0.1)" />
                            <YAxis tick={{ fontSize: 9, fill: 'rgba(255, 255, 255, 0.4)' }} stroke="rgba(255,255,255,0.1)" allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                            <Bar dataKey="Điểm trừ" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      <CustomConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        type="danger"
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}

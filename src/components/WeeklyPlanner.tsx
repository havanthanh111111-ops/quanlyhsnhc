/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { WeeklyPlan } from '../types';
import { Plus, Calendar, FileText, Sparkles, BookOpen, Edit2, CheckCircle2, Printer, Trash2, AlertTriangle, X } from 'lucide-react';
import { getWeekConfig, generateWeeks } from '../utils/weekUtils';

interface WeeklyPlannerProps {
  plans: WeeklyPlan[];
  onAddPlan: (plan: WeeklyPlan) => void;
  onUpdatePlan: (plan: WeeklyPlan) => void;
  onDeletePlan?: (id: string) => void;
  activeClassName?: string;
  teacherName?: string;
  isReadOnly?: boolean;
}

export default function WeeklyPlanner({
  plans,
  onAddPlan,
  onUpdatePlan,
  onDeletePlan,
  activeClassName,
  teacherName,
  isReadOnly = false
}: WeeklyPlannerProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(plans[0]?.id || null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Form states
  const [weekNumber, setWeekNumber] = useState(37);
  const [dateRange, setDateRange] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [objectives, setObjectives] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [createdAt, setCreatedAt] = useState('');

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleWeekNumberChange = (num: number) => {
    setWeekNumber(num);
    const { startDate, totalWeeks } = getWeekConfig();
    const weeksList = generateWeeks(startDate, totalWeeks);
    const matchedWeek = weeksList.find(w => w.weekNumber === num);
    if (matchedWeek) {
      const startParts = matchedWeek.startDate.split('-');
      const endParts = matchedWeek.endDate.split('-');
      setDateRange(`${startParts[2]}/${startParts[1]}/${startParts[0]} - ${endParts[2]}/${endParts[1]}/${endParts[0]}`);
    }
  };

  const handleOpenAdd = () => {
    const nextWeek = plans.length > 0 ? Math.max(...plans.map(p => p.weekNumber)) + 1 : 1;
    setWeekNumber(nextWeek);
    
    const { startDate, totalWeeks } = getWeekConfig();
    const weeksList = generateWeeks(startDate, totalWeeks);
    const matchedWeek = weeksList.find(w => w.weekNumber === nextWeek);
    let autoRange = '';
    if (matchedWeek) {
      const startParts = matchedWeek.startDate.split('-');
      const endParts = matchedWeek.endDate.split('-');
      autoRange = `${startParts[2]}/${startParts[1]}/${startParts[0]} - ${endParts[2]}/${endParts[1]}/${endParts[0]}`;
    }
    setDateRange(autoRange);

    setTitle(`Kế hoạch tuần ${nextWeek} - Học kỳ II`);
    setContent(`### KẾ HOẠCH CHI TIẾT TUẦN ${nextWeek}\n\n1. CHUYÊN MÔN:\n- \n- \n\n2. NỀ NẾP & CHUYÊN CẦN:\n- \n\n3. HOẠT ĐỘNG KHÁC:\n- `);
    setObjectives('- ');
    setTeacherNotes('');
    setCreatedAt(new Date().toISOString().split('T')[0]);
    setIsEditing(false);
    setIsAdding(true);
  };

  const handleOpenEdit = (p: WeeklyPlan) => {
    setWeekNumber(p.weekNumber);
    setDateRange(p.dateRange);
    setTitle(p.title);
    setContent(p.content);
    setObjectives(p.objectives);
    setTeacherNotes(p.teacherNotes);
    setCreatedAt(p.createdAt || new Date().toISOString().split('T')[0]);
    setIsAdding(false);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dateRange.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và khoảng thời gian');
      return;
    }

    const planData: WeeklyPlan = {
      id: isAdding ? `KH${Date.now().toString().slice(-4)}` : (selectedPlanId || ''),
      weekNumber,
      dateRange,
      title,
      content,
      objectives,
      teacherNotes,
      createdAt: createdAt || new Date().toISOString().split('T')[0],
      classId: isAdding ? '' : (plans.find(p => p.id === selectedPlanId)?.classId || '')
    };

    if (isAdding) {
      onAddPlan(planData);
      setSelectedPlanId(planData.id);
      setIsAdding(false);
    } else {
      onUpdatePlan(planData);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (selectedPlanId && onDeletePlan) {
      onDeletePlan(selectedPlanId);
      const remaining = plans.filter(p => p.id !== selectedPlanId);
      setSelectedPlanId(remaining[0]?.id || null);
      setConfirmDeleteOpen(false);
    }
  };

  // Helper date formatters
  const formatPlanDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatFooterDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `TP. Hồ Chí Minh, ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return `TP. Hồ Chí Minh, ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
      }
    } catch (e) {}
    return `TP. Hồ Chí Minh, ngày ... tháng ... năm ...`;
  };

    const formatPlanText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h4 key={idx} className="text-sm font-bold text-slate-800 mt-4 mb-2 border-l-4 border-amber-500 pl-2">{trimmed.replace('###', '').trim()}</h4>;
      }
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        return <p key={idx} className="font-semibold text-slate-800 mt-2 text-xs sm:text-sm">{trimmed.replace(/\*\*/g, '')}</p>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        return <li key={idx} className="ml-4 list-disc text-slate-600 py-0.5 text-xs sm:text-sm">{trimmed.substring(1).trim()}</li>;
      }
      if (/^\d+\./.test(trimmed)) {
        return <p key={idx} className="font-semibold text-slate-800 mt-3 mb-1 text-xs sm:text-sm">{trimmed}</p>;
      }
      return <p key={idx} className="text-slate-600 text-xs sm:text-sm leading-relaxed min-h-[1rem]">{line}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="weekly-planner-section">
      {/* Left panel: Plan Timeline & Add button */}
      <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-5 h-[700px] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 uppercase tracking-wider">
            <BookOpen size={16} className="text-blue-600" /> Kế hoạch tuần
          </h2>
          {!isReadOnly && (
            <button
              id="btn-add-plan"
              onClick={handleOpenAdd}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={14} /> Tạo mới
            </button>
          )}
        </div>

        {/* Plan List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
          {plans.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs italic">
              Chưa có kế hoạch tuần nào được lập
            </div>
          ) : (
            plans.map((p) => {
              const isSelected = selectedPlanId === p.id;
              return (
                <div
                  id={`plan-item-${p.id}`}
                  key={p.id}
                  onClick={() => {
                    setSelectedPlanId(p.id);
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer text-xs ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                      : 'border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      Tuần {p.weekNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar size={10} /> {formatPlanDate(p.createdAt)}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{p.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{p.objectives}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel: Form or Detail View */}
      <div className="lg:col-span-8 h-[700px]">
        {isAdding || isEditing ? (
          /* Create or Edit Plan Form */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            <h3 className="text-base font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3 uppercase tracking-wider">
              {isAdding ? 'Soạn thảo kế hoạch tuần mới' : `Chỉnh sửa: Kế hoạch tuần ${weekNumber}`}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Số tuần</label>
                  <input
                    id="form-plan-week"
                    type="number"
                    required
                    value={weekNumber}
                    onChange={(e) => handleWeekNumberChange(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block font-sans">Ngày lập kế hoạch (Ngày ký giấy)</label>
                  <input
                    id="form-plan-createdat"
                    type="date"
                    required
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Khoảng thời gian áp dụng <span className="text-rose-500">*</span></label>
                  <input
                    id="form-plan-range"
                    type="text"
                    required
                    placeholder="VD: 22/06/2026 - 28/06/2026"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Tiêu đề kế hoạch <span className="text-rose-500">*</span></label>
                <input
                  id="form-plan-title"
                  type="text"
                  required
                  placeholder="Nhập tiêu đề khái quát..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Mục tiêu cốt lõi tuần này</label>
                  <textarea
                    id="form-plan-objectives"
                    placeholder="Nhập các mục tiêu trọng điểm (Mỗi dòng một mục tiêu)..."
                    rows={4}
                    value={objectives}
                    onChange={(e) => setObjectives(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Ghi chú riêng của Giáo viên</label>
                  <textarea
                    id="form-plan-notes"
                    placeholder="Những học sinh cần chú ý, tài liệu bổ sung..."
                    rows={4}
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    className="w-full bg-amber-50/20 border border-amber-200/40 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Nội dung kế hoạch chi tiết</label>
                <textarea
                  id="form-plan-content"
                  placeholder="Nhập lịch trình giảng dạy, các mốc thời gian quan trọng..."
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 focus:bg-white transition resize-none font-mono"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 mt-auto">
                <button
                  id="form-plan-cancel"
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  Hủy bỏ
                </button>
                <button
                  id="form-plan-submit"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition shadow-sm"
                >
                  Lưu kế hoạch
                </button>
              </div>
            </form>
          </div>
        ) : selectedPlan ? (
          /* Plan View & PDF Exporter */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b border-slate-100 gap-3">
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Xem kế hoạch</span>
              <div className="flex flex-wrap gap-2">
                {!isReadOnly && (
                  <button
                    id="plan-delete-btn"
                    onClick={() => setConfirmDeleteOpen(true)}
                    className="flex items-center gap-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition animate-fadeIn"
                  >
                    <Trash2 size={12} /> Xóa kế hoạch
                  </button>
                )}
                {!isReadOnly && (
                  <button
                    id="plan-edit-btn"
                    onClick={() => handleOpenEdit(selectedPlan)}
                    className="flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white px-3 py-1.5 rounded-xl text-xs font-semibold transition"
                  >
                    <Edit2 size={12} /> Chỉnh sửa
                  </button>
                )}
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  <Printer size={12} /> In kế hoạch / Lưu PDF
                </button>
              </div>
            </div>

            {/* A4 Printed Area */}
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60">
              <div
                ref={printRef}
                id="weekly-plan-print-preview"
                className="bg-white p-8 border border-slate-200 rounded-xl shadow-md max-w-[800px] mx-auto text-slate-800"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {/* Header */}
                <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
                  <h1 className="text-xs uppercase tracking-widest font-bold text-slate-500">Trường THPT Nguyễn Hữu Cầu</h1>
                  <h2 className="text-xl font-black text-slate-900 mt-1 uppercase">Kế hoạch tuần giáo viên chủ nhiệm</h2>
                  <div className="flex justify-center gap-4 text-xs mt-2 text-slate-500 font-medium">
                    <span>Lớp: {activeClassName || '11A1'}</span>
                    <span>•</span>
                    <span>Tuần học: {selectedPlan.weekNumber}</span>
                    <span>•</span>
                    <span>Từ: {selectedPlan.dateRange}</span>
                  </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6">
                  {/* Title */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-950 mb-2">{selectedPlan.title}</h3>
                    <p className="text-[11px] text-slate-400 italic">Lập ngày: {formatPlanDate(selectedPlan.createdAt)} - GVCN: {teacherName || localStorage.getItem('teacherName') || 'Nguyễn Tuyết Mai'}</p>
                  </div>

                  {/* Two columns: Objectives and Notes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-amber-50/20 border border-amber-100 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Sparkles size={14} className="text-amber-600" /> Mục tiêu trọng điểm
                      </h4>
                      <ul className="space-y-1.5 text-xs sm:text-sm text-slate-800">
                        {selectedPlan.objectives.split('\n').map((line, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-amber-500">•</span>
                            <span>{line.replace(/^[-*]\s*/, '')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-amber-50/10 border border-amber-100/50 p-4 rounded-xl">
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText size={14} className="text-amber-600" /> Lưu ý chủ nhiệm
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                        {selectedPlan.teacherNotes || 'Không có ghi chú thêm cho tuần này.'}
                      </p>
                    </div>
                  </div>

                  {/* Detailed Agenda */}
                  <div className="border-t border-slate-100 pt-5">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Lịch trình & phân công nhiệm vụ</h4>
                    <div className="prose prose-slate max-w-none text-xs sm:text-sm">
                      {formatPlanText(selectedPlan.content)}
                    </div>
                  </div>

                  {/* Footer signature */}
                  <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-xs text-slate-400 mt-12">
                    <div>
                      <p>Hệ thống Quản lý Học sinh Tự động</p>
                    </div>
                    <div className="text-right text-slate-700">
                      <p className="italic">{formatFooterDate(selectedPlan.createdAt)}</p>
                      <p className="font-bold text-slate-700 mt-1 uppercase">Giáo viên chủ nhiệm</p>
                      <div className="h-12"></div>
                      <p className="font-semibold text-slate-850">{teacherName || localStorage.getItem('teacherName') || 'Nguyễn Tuyết Mai'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 h-full flex flex-col justify-center items-center">
            <FileText size={48} className="text-slate-300 mb-2" />
            <p className="text-xs font-medium">Vui lòng chọn một kế hoạch hoặc tạo mới để hiển thị</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteOpen && selectedPlan && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-500 rounded-xl animate-pulse">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Xác nhận xóa</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Hành động này không thể hoàn tác.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Bạn có chắc chắn muốn xóa kế hoạch <span className="font-extrabold text-rose-600">"{selectedPlan.title}"</span> hay không?
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition border border-red-500/20 shadow-md"
              >
                Đồng ý xóa
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

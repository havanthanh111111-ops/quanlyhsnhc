/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AcademicUpdate, GPAEntry } from '../types';
import { CustomConfirmModal } from './CustomConfirmModal';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  BookOpen, 
  Trash2, 
  Edit2, 
  PlusCircle, 
  Check, 
  X, 
  Award, 
  Calendar, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

interface StudentAcademicTrackerProps {
  studentId: string;
  studentName: string;
  academicUpdates: AcademicUpdate[];
  onAddAcademicUpdate: (update: AcademicUpdate) => void;
  onUpdateAcademicUpdate: (update: AcademicUpdate) => void;
  onDeleteAcademicUpdate: (id: string) => void;
  isReadOnly?: boolean;
}

const DEFAULT_SUBJECTS = [
  'Toán',
  'Ngữ văn',
  'Tiếng Anh',
  'Vật lý',
  'Hóa học',
  'Sinh học',
  'Lịch sử',
  'Địa lý',
  'Tin học',
  'GDKT&PL'
];

export default function StudentAcademicTracker({
  studentId,
  studentName,
  academicUpdates,
  onAddAcademicUpdate,
  onUpdateAcademicUpdate,
  onDeleteAcademicUpdate,
  isReadOnly = false
}: StudentAcademicTrackerProps) {
  // Filter updates for current student
  const studentUpdates = academicUpdates
    .filter(u => u.studentId === studentId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort ascending by date for timeline/progress

  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(() => {
    return studentUpdates[studentUpdates.length - 1]?.id || null;
  });

  // Active selected update
  const activeUpdate = studentUpdates.find(u => u.id === selectedUpdateId) || studentUpdates[studentUpdates.length - 1];

  // If the activeUpdate isn't the selected one (e.g. student switched), sync it
  React.useEffect(() => {
    if (studentUpdates.length > 0 && (!selectedUpdateId || !studentUpdates.some(u => u.id === selectedUpdateId))) {
      setSelectedUpdateId(studentUpdates[studentUpdates.length - 1].id);
    }
  }, [studentId, studentUpdates, selectedUpdateId]);

  // Form Modal state
  const [isOpenForm, setIsOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Form values
  const [semester, setSemester] = useState<'Học kỳ I' | 'Học kỳ II' | 'Học kỳ III'>('Học kỳ I');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    DEFAULT_SUBJECTS.forEach(sub => { s[sub] = ''; });
    return s;
  });
  const [teacherRemarks, setTeacherRemarks] = useState('');

  // Handle open Add Modal
  const handleOpenAdd = () => {
    setFormMode('add');
    setEditId('');
    setSemester('Học kỳ I');
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    const freshScores: Record<string, string> = {};
    DEFAULT_SUBJECTS.forEach(sub => { freshScores[sub] = ''; });
    setScores(freshScores);
    setTeacherRemarks('');
    setIsOpenForm(true);
  };

  // Handle open Edit Modal
  const handleOpenEdit = (update: AcademicUpdate) => {
    setFormMode('edit');
    setEditId(update.id);
    setSemester(update.semester);
    setTitle(update.title);
    setDate(update.date);
    const savedScores: Record<string, string> = {};
    DEFAULT_SUBJECTS.forEach(sub => {
      const match = update.gpaList.find(g => g.subject === sub);
      savedScores[sub] = match ? match.score.toString() : '';
    });
    setScores(savedScores);
    setTeacherRemarks(update.teacherRemarks || '');
    setIsOpenForm(true);
  };

  const handleScoreChange = (subject: string, val: string) => {
    // Basic validation for numbers/decimal
    if (val === '' || /^[0-9]?\.?[0-9]?$/.test(val)) {
      setScores(prev => ({ ...prev, [subject]: val }));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create list of GPAEntry
    const gpaList: GPAEntry[] = [];
    let totalScore = 0;
    let validCount = 0;

    DEFAULT_SUBJECTS.forEach(sub => {
      const parsed = parseFloat(scores[sub] || '0');
      const clampScore = isNaN(parsed) ? 0 : Math.max(0, Math.min(10, parsed));
      gpaList.push({ subject: sub, score: clampScore });
      if (scores[sub] !== '') {
        totalScore += clampScore;
        validCount++;
      }
    });

    const avgGpa = validCount > 0 ? Math.round((totalScore / validCount) * 100) / 100 : 0;

    if (formMode === 'add') {
      const newUpdate: AcademicUpdate = {
        id: `AC_${Date.now()}`,
        studentId,
        semester,
        title: title.trim() || 'Cập nhật định kỳ',
        date,
        gpaList,
        averageGpa: avgGpa,
        teacherRemarks: teacherRemarks.trim() || undefined
      };
      onAddAcademicUpdate(newUpdate);
      setSelectedUpdateId(newUpdate.id);
    } else {
      const updatedUpdate: AcademicUpdate = {
        id: editId,
        studentId,
        semester,
        title: title.trim() || 'Cập nhật định kỳ',
        date,
        gpaList,
        averageGpa: avgGpa,
        teacherRemarks: teacherRemarks.trim() || undefined
      };
      onUpdateAcademicUpdate(updatedUpdate);
    }

    setIsOpenForm(false);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (!deleteId) return;
    onDeleteAcademicUpdate(deleteId);
    
    // Select another update
    const remaining = studentUpdates.filter(u => u.id !== deleteId);
    if (remaining.length > 0) {
      setSelectedUpdateId(remaining[remaining.length - 1].id);
    } else {
      setSelectedUpdateId(null);
    }
    setDeleteId(null);
  };

  // Helper to color GPA scores
  const getGpaColor = (score: number) => {
    if (score >= 8.0) return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
    if (score >= 6.5) return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
    if (score >= 5.0) return 'text-amber-400 border-amber-500/20 bg-amber-500/5';
    return 'text-rose-400 border-rose-500/20 bg-rose-500/5';
  };

  // Helper to color overall GPA badge
  const getOverallBadgeClass = (score: number) => {
    if (score >= 8.0) return 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30';
    if (score >= 6.5) return 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30';
    if (score >= 5.0) return 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30';
    return 'from-rose-500/20 to-red-500/20 text-rose-300 border-rose-500/30';
  };

  // Get GPA classification name
  const getGpaClassification = (score: number) => {
    if (score >= 8.0) return 'Giỏi';
    if (score >= 6.5) return 'Khá';
    if (score >= 5.0) return 'Trung bình';
    return 'Yếu';
  };

  return (
    <div className="border border-white/5 rounded-2xl p-5 bg-white/[0.01] mt-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-white/5 mb-4">
        <div>
          <h4 className="text-xs uppercase tracking-widest text-white/40 font-semibold flex items-center gap-2">
            <BookOpen size={14} className="text-amber-500" /> Bảng điểm & Tiến trình học tập
          </h4>
          <p className="text-[10px] text-white/30 mt-0.5">Quản lý các lần cập nhật điểm trung bình các môn để đo lường mức độ tiến bộ</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition"
          >
            <Plus size={14} />
            <span>Cập nhật điểm mới</span>
          </button>
        )}
      </div>

      {studentUpdates.length === 0 ? (
        <div className="text-center py-10 bg-[#0d0d0d] rounded-2xl border border-white/5">
          <Award size={36} className="text-white/10 mx-auto mb-2" />
          <p className="text-xs text-white/40">Chưa có dữ liệu cập nhật điểm nào cho học sinh {studentName}</p>
          {!isReadOnly && (
            <button
              onClick={handleOpenAdd}
              className="mt-3 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition"
            >
              Nhập điểm lần đầu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Progress Timeline and Update Switcher */}
          <div className="lg:col-span-5 space-y-3 flex flex-col justify-start">
            <h5 className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1">
              Lịch sử cập nhật & Độ tiến bộ
            </h5>
            
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {studentUpdates.map((u, index) => {
                const isActive = activeUpdate?.id === u.id;
                
                // Calculate progress delta compared to previous update
                let progressDelta = 0;
                let isFirst = index === 0;
                if (!isFirst) {
                  progressDelta = Math.round((u.averageGpa - studentUpdates[index - 1].averageGpa) * 100) / 100;
                }

                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUpdateId(u.id)}
                    className={`w-full p-3.5 rounded-2xl border transition text-left flex items-center justify-between ${
                      isActive 
                        ? 'bg-amber-500/10 border-amber-500/40' 
                        : 'bg-[#0d0d0d] border-white/5 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.semester === 'Học kỳ I' ? 'bg-sky-500/10 text-sky-400' :
                          u.semester === 'Học kỳ II' ? 'bg-emerald-500/10 text-emerald-400' :
                          'bg-pink-500/10 text-pink-400'
                        }`}>
                          {u.semester}
                        </span>
                        <span className="text-white/30 text-[10px] font-mono">
                          {u.date.split('-').reverse().join('/')}
                        </span>
                      </div>
                      <div className="font-semibold text-xs text-white truncate">{u.title}</div>
                      
                      {/* Progress statement */}
                      <div className="flex items-center gap-1.5 text-[10px] mt-1.5">
                        {isFirst ? (
                          <span className="text-white/40 italic">Điểm khởi điểm</span>
                        ) : progressDelta > 0 ? (
                          <span className="text-emerald-400 font-medium flex items-center gap-0.5">
                            <TrendingUp size={11} />
                            Tiến bộ +{progressDelta}đ
                          </span>
                        ) : progressDelta < 0 ? (
                          <span className="text-rose-400 font-medium flex items-center gap-0.5">
                            <TrendingDown size={11} />
                            Giảm {progressDelta}đ
                          </span>
                        ) : (
                          <span className="text-white/40">Giữ nguyên ổn định</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-lg font-black text-white">{u.averageGpa.toFixed(2)}</div>
                      <div className="text-[9px] text-white/30 tracking-wider uppercase font-medium">Trung bình</div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Short Analysis Note */}
            {studentUpdates.length >= 2 && (
              <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-[11px] leading-relaxed text-white/60">
                <span className="text-amber-400 font-bold flex items-center gap-1 mb-1">
                  <Sparkles size={12} /> Đánh giá tiến trình học tập:
                </span>
                {(() => {
                  const first = studentUpdates[0].averageGpa;
                  const last = studentUpdates[studentUpdates.length - 1].averageGpa;
                  const diff = Math.round((last - first) * 100) / 100;
                  
                  if (diff > 0.4) {
                    return `Học sinh ${studentName} thể hiện sự tiến bộ rõ rệt và xuất sắc (+${diff}đ) qua các lần cập nhật. Ý thức phấn đấu đi lên rất đáng biểu dương.`;
                  } else if (diff > 0) {
                    return `Học sinh ${studentName} có sự tiến bộ nhẹ (+${diff}đ) và duy trì được đà đi lên đều đặn. Hãy tiếp tục động viên học sinh phát huy.`;
                  } else if (diff < -0.4) {
                    return `Điểm số của học sinh có xu hướng suy giảm đáng kể (${diff}đ) qua các đợt. Cần dành thời gian trao đổi, tìm hiểu nguyên nhân để chấn chỉnh học sinh kịp thời.`;
                  } else {
                    return `Học sinh duy trì học lực khá ổn định (chênh lệch chỉ ${diff}đ). Tiếp tục theo dõi để giúp học sinh bứt phá hơn trong thời gian tới.`;
                  }
                })()}
              </div>
            )}
          </div>

          {/* RIGHT: Detailed Grades View */}
          <div className="lg:col-span-7 bg-[#0d0d0d] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
            {activeUpdate ? (
              <div className="space-y-4">
                {/* Header of Detailed View */}
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <div>
                    <h5 className="text-xs font-bold text-white leading-tight">
                      Bảng điểm chi tiết: {activeUpdate.title}
                    </h5>
                    <p className="text-[10px] text-white/40 flex items-center gap-1.5 mt-0.5">
                      <Calendar size={11} /> Cập nhật ngày {activeUpdate.date.split('-').reverse().join('/')}
                    </p>
                  </div>

                  {!isReadOnly && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleOpenEdit(activeUpdate)}
                        className="p-1.5 hover:bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-amber-500 transition"
                        title="Sửa điểm này"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(activeUpdate.id)}
                        className="p-1.5 hover:bg-rose-500/10 border border-white/10 rounded-lg text-white/60 hover:text-rose-500 transition"
                        title="Xóa đợt điểm này"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {DEFAULT_SUBJECTS.map(subject => {
                    const scoreObj = activeUpdate.gpaList.find(g => g.subject === subject);
                    const score = scoreObj ? scoreObj.score : 0;
                    
                    return (
                      <div 
                        key={subject}
                        className={`p-2.5 rounded-xl border text-center flex flex-col justify-between h-[65px] ${getGpaColor(score)}`}
                      >
                        <div className="text-[10px] font-medium text-white/40 truncate uppercase tracking-wider">{subject}</div>
                        <div className="text-lg font-black tracking-tight">{scoreObj ? score.toFixed(1) : '-'}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Summarized GPA & Classification */}
                <div className={`p-4 bg-gradient-to-r rounded-2xl border flex items-center justify-between gap-4 ${getOverallBadgeClass(activeUpdate.averageGpa)}`}>
                  <div className="space-y-0.5">
                    <div className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Xếp loại học tập đợt này</div>
                    <div className="text-lg font-black tracking-tight flex items-center gap-1.5">
                      {getGpaClassification(activeUpdate.averageGpa)}
                      <span className="text-xs font-normal opacity-60">
                        (Khung điểm: {activeUpdate.averageGpa.toFixed(2)})
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5 font-mono text-center shrink-0">
                    <div className="text-2xl font-black">{activeUpdate.averageGpa.toFixed(2)}</div>
                    <div className="text-[8px] uppercase tracking-wider opacity-50">Trung bình</div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5 flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-amber-500" /> Nhận xét chi tiết của giáo viên
                  </div>
                  <p className="text-xs text-white/75 font-serif italic leading-relaxed">
                    "{activeUpdate.teacherRemarks || 'Chưa nhập nhận xét cho đợt điểm này. Vui lòng bấm Sửa để bổ sung nhận xét giúp đưa ra đánh giá chính xác hơn.'}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-white/20 text-xs italic">
                Chọn một lần cập nhật điểm ở danh sách bên trái để xem chi tiết
              </div>
            )}
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD / EDIT) */}
      {isOpenForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#141414] shrink-0">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <BookOpen size={16} className="text-amber-500" />
                  {formMode === 'add' ? `Thêm mới cập nhật điểm cho ${studentName}` : `Chỉnh sửa đợt điểm học sinh ${studentName}`}
                </h3>
                <p className="text-[10px] text-white/30 mt-0.5">Nhập điểm trung bình môn từ 0 đến 10 để hệ thống tự động tính điểm tổng kết</p>
              </div>
              <button
                onClick={() => setIsOpenForm(false)}
                className="p-1.5 hover:bg-white/5 border border-white/5 rounded-xl text-white/50 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Scrollable Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
              {/* Semester & Title & Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                    Học kỳ
                  </label>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value as any)}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  >
                    <option value="Học kỳ I">Học kỳ I</option>
                    <option value="Học kỳ II">Học kỳ II</option>
                    <option value="Học kỳ III">Học kỳ III (Hè/Phụ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                    Tên lần cập nhật / Đợt kiểm tra
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ví dụ: Giữa học kỳ I, Cuối học kỳ I, Tổng kết"
                    className="w-full bg-[#161616] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
                    Ngày cập nhật
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#161616] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              {/* Subjects Grade Input Grid */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2.5">
                  Điểm trung bình các môn học (Thang điểm 10)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {DEFAULT_SUBJECTS.map(subject => (
                    <div key={subject} className="bg-[#141414] border border-white/5 rounded-xl p-2.5 flex flex-col justify-between">
                      <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1 truncate text-center">
                        {subject}
                      </label>
                      <input
                        type="text"
                        placeholder="0.0"
                        value={scores[subject]}
                        onChange={(e) => handleScoreChange(subject, e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-white/5 rounded-lg px-2 py-1 text-center font-bold text-sm text-white focus:outline-none focus:border-amber-500/50 focus:bg-[#222]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher Remarks */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    Nhận xét của giáo viên
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      // Generate quick automated remark based on grades
                      let total = 0;
                      let count = 0;
                      DEFAULT_SUBJECTS.forEach(sub => {
                        const parsed = parseFloat(scores[sub]);
                        if (!isNaN(parsed)) {
                          total += parsed;
                          count++;
                        }
                      });
                      const avg = count > 0 ? total / count : 0;
                      if (avg >= 8.0) {
                        setTeacherRemarks(`Học sinh ${studentName} có kết quả học tập xuất sắc (TB môn ${avg.toFixed(1)}đ). Tiếp thu bài nhanh, làm bài tập đầy đủ, tự giác rèn luyện rất tốt.`);
                      } else if (avg >= 6.5) {
                        setTeacherRemarks(`Học sinh ${studentName} học tập tiến bộ khá (TB môn ${avg.toFixed(1)}đ). Đã có nhiều cố gắng vượt bậc, nên củng cố thêm các môn tự nhiên.`);
                      } else if (avg >= 5.0) {
                        setTeacherRemarks(`Kết quả học tập trung bình (TB môn ${avg.toFixed(1)}đ). Học sinh có ý thức hoàn thành bài nhưng tư duy còn chậm, cần rèn luyện thêm phương pháp học.`);
                      } else {
                        setTeacherRemarks(`Kết quả học tập yếu (TB môn ${avg.toFixed(1)}đ). Học sinh còn xao nhãng trong lớp, chưa chăm chỉ. Gia đình cần phối hợp kèm cặp sát sao.`);
                      }
                    }}
                    className="text-[9px] font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1 transition"
                  >
                    <Sparkles size={11} /> Gợi ý nhận xét tự động
                  </button>
                </div>
                <textarea
                  value={teacherRemarks}
                  onChange={(e) => setTeacherRemarks(e.target.value)}
                  placeholder="Nhập nhận xét chi tiết về tình hình học tập, sự tiến bộ hay các điểm cần khắc phục của học sinh đợt này..."
                  rows={3}
                  className="w-full bg-[#161616] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 leading-relaxed"
                />
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpenForm(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold rounded-xl transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl transition shadow-lg shadow-amber-500/10"
                >
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <CustomConfirmModal
        isOpen={deleteId !== null}
        title="Xóa cập nhật điểm"
        message="Bạn có chắc chắn muốn xóa lần cập nhật điểm này không? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa ngay"
        cancelLabel="Hủy bỏ"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

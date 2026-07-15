/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Student, AcademicUpdate, GPAEntry } from '../types';
import { 
  Plus, 
  Save, 
  Award, 
  PieChart as PieIcon, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  X,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface AcademicManagerProps {
  students: Student[];
  academicUpdates: AcademicUpdate[];
  onAddAcademicUpdate: (update: AcademicUpdate) => void;
  onUpdateAcademicUpdate: (update: AcademicUpdate) => void;
  onDeleteAcademicUpdate: (id: string) => void;
  isReadOnly?: boolean;
}

const DEFAULT_SUBJECTS = [
  'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Tin học', 'GDKT&PL'
];

const SUBJECT_CLEAN_MAP: Record<string, string> = {
  toan: 'Toán',
  nguvan: 'Ngữ văn',
  van: 'Ngữ văn',
  tienganh: 'Tiếng Anh',
  anh: 'Tiếng Anh',
  english: 'Tiếng Anh',
  vatly: 'Vật lý',
  ly: 'Vật lý',
  hoahoc: 'Hóa học',
  hoa: 'Hóa học',
  sinhhoc: 'Sinh học',
  sinh: 'Sinh học',
  lichsu: 'Lịch sử',
  su: 'Lịch sử',
  dialy: 'Địa lý',
  dia: 'Địa lý',
  tinhoc: 'Tin học',
  tin: 'Tin học',
  gdktpl: 'GDKT&PL',
  giaoduckinhtephapluat: 'GDKT&PL',
};

const cleanKey = (str: string) => {
  return str.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]/g, "");
};

const splitCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  // Auto-detect separator: default to comma, fallback to semicolon if more semicolons than commas
  const separator = line.includes(';') && (line.split(';').length > line.split(',').length) ? ';' : ',';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current.trim().replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^"|"$/g, ''));
  return result;
};

export default function AcademicManager({
  students,
  academicUpdates,
  onAddAcademicUpdate,
  onUpdateAcademicUpdate,
  onDeleteAcademicUpdate,
  isReadOnly = false,
}: AcademicManagerProps) {
  const [selectedSubject, setSelectedSubject] = useState('Toán');
  const [selectedRound, setSelectedRound] = useState('Giữa Học kỳ I');
  
  // Custom round management
  const [roundsList, setRoundsList] = useState<string[]>([]);
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [addRoundError, setAddRoundError] = useState('');

  // Draft scores for inputs
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const [savedFeedback, setSavedFeedback] = useState('');

  // Quick single add state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddStudentId, setQuickAddStudentId] = useState('');
  const [quickAddScore, setQuickAddScore] = useState('');
  const [quickAddError, setQuickAddError] = useState('');

  // CSV Import States
  const [showImportTriggerModal, setShowImportTriggerModal] = useState(false);
  const [showImportPreviewModal, setShowImportPreviewModal] = useState(false);
  const [importPreviewRows, setImportPreviewRows] = useState<Array<{
    studentId: string;
    studentName: string;
    matched: boolean;
    scores: Record<string, number | null>;
    round: string;
  }>>([]);
  const [importSubjects, setImportSubjects] = useState<string[]>([]);
  const [importError, setImportError] = useState('');
  const [importRound, setImportRound] = useState('');
  const [importRoundMode, setImportRoundMode] = useState<'single' | 'file'>('single');
  const [importRoundNewName, setImportRoundNewName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate round list from unique titles of academic updates of these students, or fallbacks
  useEffect(() => {
    const studentIds = new Set(students.map(s => s.id));
    const classUpdates = academicUpdates.filter(u => studentIds.has(u.studentId));
    const uniqueTitles = Array.from(new Set(classUpdates.map(u => u.title)));

    const defaultRounds = ['Giữa Học kỳ I', 'Cuối Học kỳ I', 'Giữa Học kỳ II', 'Cuối Học kỳ II'];
    const merged = Array.from(new Set([...uniqueTitles, ...defaultRounds]));
    setRoundsList(merged);

    if (merged.length > 0 && !merged.includes(selectedRound)) {
      setSelectedRound(merged[0]);
    }
  }, [students, academicUpdates]);

  // Sync draft scores whenever student, subject, or round changes
  useEffect(() => {
    const initialDrafts: Record<string, string> = {};
    students.forEach(s => {
      const update = academicUpdates.find(u => u.studentId === s.id && u.title === selectedRound);
      let subjectScore: number | undefined;
      if (selectedSubject === 'Điểm trung bình') {
        subjectScore = update && update.gpaList.length > 0 ? update.averageGpa : undefined;
      } else {
        subjectScore = update?.gpaList.find(g => g.subject === selectedSubject)?.score;
      }
      initialDrafts[s.id] = subjectScore !== undefined ? subjectScore.toString() : '';
    });
    setDraftScores(initialDrafts);
    setInputErrors({});
    setSavedFeedback('');
  }, [selectedSubject, selectedRound, students, academicUpdates]);

  const handleScoreChange = (studentId: string, value: string) => {
    const normalizedValue = value.replace(',', '.');
    setDraftScores(prev => ({ ...prev, [studentId]: normalizedValue }));

    if (normalizedValue.trim() === '') {
      setInputErrors(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
      return;
    }

    const num = parseFloat(normalizedValue);
    if (isNaN(num) || num < 0 || num > 10) {
      setInputErrors(prev => ({ ...prev, [studentId]: 'Từ 0 - 10' }));
    } else {
      setInputErrors(prev => {
        const copy = { ...prev };
        delete copy[studentId];
        return copy;
      });
    }
  };

  const handleAddNewRound = (e: React.FormEvent) => {
    e.preventDefault();
    const titleTrimmed = newRoundTitle.trim();
    if (!titleTrimmed) {
      setAddRoundError('Vui lòng nhập tên đợt cập nhật.');
      return;
    }
    if (roundsList.includes(titleTrimmed)) {
      setAddRoundError('Đợt cập nhật này đã tồn tại.');
      return;
    }

    setRoundsList(prev => [...prev, titleTrimmed]);
    setSelectedRound(titleTrimmed);
    setNewRoundTitle('');
    setShowAddRoundModal(false);
    setAddRoundError('');
  };

  const handleSaveAllScores = () => {
    const newErrors: Record<string, string> = {};
    students.forEach(s => {
      const val = draftScores[s.id] || '';
      if (val.trim() !== '') {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > 10) {
          newErrors[s.id] = 'Điểm từ 0 đến 10';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setInputErrors(newErrors);
      setSavedFeedback('Vui lòng sửa các điểm số chưa hợp lệ.');
      return;
    }

    students.forEach(s => {
      const val = draftScores[s.id] || '';
      const update = academicUpdates.find(u => u.studentId === s.id && u.title === selectedRound);

      if (val.trim() === '') {
        if (update) {
          const filteredGpaList = update.gpaList.filter(g => g.subject !== selectedSubject);
          if (filteredGpaList.length === 0) {
            onDeleteAcademicUpdate(update.id);
          } else {
            const total = filteredGpaList.reduce((sum, item) => sum + item.score, 0);
            const avg = Number((total / filteredGpaList.length).toFixed(2));
            onUpdateAcademicUpdate({
              ...update,
              gpaList: filteredGpaList,
              averageGpa: avg
            });
          }
        }
      } else {
        const scoreNum = Number(parseFloat(val).toFixed(2));
        if (update) {
          const existingGpaIndex = update.gpaList.findIndex(g => g.subject === selectedSubject);
          let newGpaList = [...update.gpaList];
          if (existingGpaIndex >= 0) {
            newGpaList[existingGpaIndex] = { ...newGpaList[existingGpaIndex], score: scoreNum };
          } else {
            newGpaList.push({ subject: selectedSubject, score: scoreNum });
          }

          const total = newGpaList.reduce((sum, item) => sum + item.score, 0);
          const avg = Number((total / newGpaList.length).toFixed(2));

          onUpdateAcademicUpdate({
            ...update,
            gpaList: newGpaList,
            averageGpa: avg
          });
        } else {
          const newUpdate: AcademicUpdate = {
            id: `AC_${s.id}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            studentId: s.id,
            semester: selectedRound.includes('HKII') || selectedRound.includes('Học kỳ II') || selectedRound.includes('HK2') ? 'Học kỳ II' : 'Học kỳ I',
            title: selectedRound,
            date: new Date().toISOString().split('T')[0],
            gpaList: [{ subject: selectedSubject, score: scoreNum }],
            averageGpa: scoreNum,
            teacherRemarks: ''
          };
          onAddAcademicUpdate(newUpdate);
        }
      }
    });

    setSavedFeedback('Đã lưu thành công điểm số cả lớp!');
    setTimeout(() => {
      setSavedFeedback('');
    }, 4000);
  };

  // --- QUICK ADD HANDLER ---
  const handleConfirmQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickAddError('');

    if (!quickAddStudentId) {
      setQuickAddError('Vui lòng chọn học sinh.');
      return;
    }

    const normalizedVal = quickAddScore.replace(',', '.');
    if (normalizedVal.trim() === '') {
      setQuickAddError('Vui lòng nhập điểm số.');
      return;
    }

    const num = parseFloat(normalizedVal);
    if (isNaN(num) || num < 0 || num > 10) {
      setQuickAddError('Điểm số phải hợp lệ từ 0 đến 10.');
      return;
    }

    // Update state
    setDraftScores(prev => ({ ...prev, [quickAddStudentId]: Number(num.toFixed(2)).toString() }));
    
    // Smooth scroll and focus on row if possible
    setTimeout(() => {
      const element = document.getElementById(`row-student-${quickAddStudentId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-amber-50');
        setTimeout(() => {
          element.classList.remove('bg-amber-50');
        }, 2000);
      }
    }, 100);

    setSavedFeedback(`Đã cập nhật điểm nháp cho học sinh ${quickAddStudentId}. Hãy nhấn "Lưu bảng điểm" để lưu chính thức!`);
    setShowQuickAddModal(false);
    setQuickAddScore('');
    setQuickAddStudentId('');
    
    setTimeout(() => {
      setSavedFeedback('');
    }, 5000);
  };

  // --- CSV TEMPLATES AND DOWNLOADS ---
  const downloadSingleSubjectTemplate = () => {
    const headers = ['Mã HS', 'Họ và Tên', `Điểm môn ${selectedSubject}`, 'Đợt vào điểm'];
    const rows = students.map(s => {
      const update = academicUpdates.find(u => u.studentId === s.id && u.title === selectedRound);
      const score = update?.gpaList.find(g => g.subject === selectedSubject)?.score;
      return [s.id, s.name, score !== undefined ? score.toString() : '', selectedRound];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    downloadCSV(csvContent, `Mau_diem_mon_${selectedSubject.replace(/\s+/g, '_')}_${selectedRound.replace(/\s+/g, '_')}.csv`);
  };

  const downloadMultiSubjectTemplate = () => {
    const headers = ['Mã HS', 'Họ và Tên', ...DEFAULT_SUBJECTS, 'Đợt vào điểm'];
    const rows = students.map(s => {
      const update = academicUpdates.find(u => u.studentId === s.id && u.title === selectedRound);
      const rowData: string[] = [s.id, s.name];
      DEFAULT_SUBJECTS.forEach(subj => {
        const score = update?.gpaList.find(g => g.subject === subj)?.score;
        rowData.push(score !== undefined ? score.toString() : '');
      });
      rowData.push(selectedRound);
      return rowData;
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${val}"`).join(','))
    ].join('\n');

    downloadCSV(csvContent, `Mau_diem_tong_hop_${selectedRound.replace(/\s+/g, '_')}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CSV UPLOAD & PARSER ---
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      parseAndPreviewCSV(text);
    };
    reader.readAsText(file, 'UTF-8');
    
    // Clear value to allow re-upload
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const parseAndPreviewCSV = (text: string) => {
    setImportError('');
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      setImportError('File CSV rỗng hoặc thiếu dữ liệu.');
      setShowImportTriggerModal(true);
      return;
    }

    const headerLine = lines[0];
    const headers = splitCSVLine(headerLine);
    const cleanHeaders = headers.map(h => cleanKey(h));

    // Find Student ID column
    const studentIdIdx = cleanHeaders.findIndex(h => h === 'mahs' || h === 'mahocsinh' || h === 'id' || h === 'masohocsinh');
    if (studentIdIdx === -1) {
      setImportError('Không tìm thấy cột "Mã HS" hoặc "Mã học sinh" trong file CSV.');
      setShowImportTriggerModal(true);
      return;
    }

    const nameIdx = cleanHeaders.findIndex(h => h === 'hoten' || h === 'hovaten' || h === 'name' || h === 'ten');

    const parsedSubjects: string[] = [];
    const colIndexToSubject: Record<number, string> = {};

    // Check if there is a general "diem" or "score" column
    const scoreIdx = cleanHeaders.findIndex(h => h === 'diem' || h === 'score' || h.startsWith('diemmon'));
    
    if (scoreIdx !== -1) {
      const headerName = headers[scoreIdx];
      const match = DEFAULT_SUBJECTS.find(subj => headerName.toLowerCase().includes(subj.toLowerCase()));
      const singleSubjectName = match || selectedSubject;
      parsedSubjects.push(singleSubjectName);
      colIndexToSubject[scoreIdx] = singleSubjectName;
    } else {
      // Find multiple subject columns
      cleanHeaders.forEach((h, idx) => {
        if (idx === studentIdIdx || idx === nameIdx) return;
        
        if (SUBJECT_CLEAN_MAP[h]) {
          const standardName = SUBJECT_CLEAN_MAP[h];
          if (!parsedSubjects.includes(standardName)) {
            parsedSubjects.push(standardName);
          }
          colIndexToSubject[idx] = standardName;
        } else {
          const directMatch = DEFAULT_SUBJECTS.find(subj => cleanKey(subj) === h || h.includes(cleanKey(subj)));
          if (directMatch) {
            if (!parsedSubjects.includes(directMatch)) {
              parsedSubjects.push(directMatch);
            }
            colIndexToSubject[idx] = directMatch;
          }
        }
      });
    }

    if (parsedSubjects.length === 0) {
      setImportError('Không xác định được cột điểm nào hợp lệ (Ví dụ: Toán, Ngữ văn, Tiếng Anh, hoặc Điểm).');
      setShowImportTriggerModal(true);
      return;
    }

    // Identify round column
    const roundIdx = cleanHeaders.findIndex(h => 
      h === 'dot' || 
      h === 'dotvaodiem' || 
      h === 'round' || 
      h === 'dotkiemtra' || 
      h === 'hocky' || 
      h === 'semester' ||
      h === 'lancapnhat' ||
      h === 'lankiemtra'
    );

    const previewRows: typeof importPreviewRows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const row = splitCSVLine(lines[i]);
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const rawId = row[studentIdIdx] || '';
      if (!rawId) continue;

      let studentId = rawId.toUpperCase().trim();
      if (/^\d+$/.test(studentId)) {
        studentId = `HS${studentId.padStart(3, '0')}`;
      }

      const matchedStudent = students.find(s => s.id === studentId);
      const studentName = matchedStudent ? matchedStudent.name : (nameIdx !== -1 ? row[nameIdx] : 'Học sinh ngoài lớp');

      const scores: Record<string, number | null> = {};
      parsedSubjects.forEach(subj => {
        scores[subj] = null;
      });

      Object.entries(colIndexToSubject).forEach(([colIdxStr, subj]) => {
        const colIdx = parseInt(colIdxStr, 10);
        const val = row[colIdx];
        if (val !== undefined && val.trim() !== '') {
          const num = parseFloat(val.replace(',', '.'));
          if (!isNaN(num) && num >= 0 && num <= 10) {
            scores[subj] = Number(num.toFixed(2));
          }
        }
      });

      // Determine target round for this student row
      let rowRound = '';
      if (importRoundMode === 'file' && roundIdx !== -1) {
        rowRound = (row[roundIdx] || '').trim();
      }

      if (!rowRound) {
        rowRound = importRound === '_new_round_' ? importRoundNewName.trim() : importRound;
      }

      if (!rowRound) {
        rowRound = selectedRound;
      }

      previewRows.push({
        studentId,
        studentName,
        matched: !!matchedStudent,
        scores,
        round: rowRound
      });
    }

    if (previewRows.length === 0) {
      setImportError('Không tìm thấy dữ liệu học sinh hợp lệ để nạp.');
      setShowImportTriggerModal(true);
      return;
    }

    setImportSubjects(parsedSubjects);
    setImportPreviewRows(previewRows);
    setShowImportTriggerModal(false);
    setShowImportPreviewModal(true);
  };

  const handleConfirmImport = () => {
    let countSuccess = 0;
    const finalNewRounds = new Set<string>();

    importPreviewRows.forEach(row => {
      if (!row.matched) return;

      const targetRound = row.round || selectedRound;
      if (targetRound && !roundsList.includes(targetRound)) {
        finalNewRounds.add(targetRound);
      }

      const existingUpdate = academicUpdates.find(u => u.studentId === row.studentId && u.title === targetRound);
      const newGpaList: GPAEntry[] = existingUpdate ? [...existingUpdate.gpaList] : [];

      Object.entries(row.scores).forEach(([subj, scoreVal]) => {
        if (scoreVal === null) return;
        const score = scoreVal as number;

        const idx = newGpaList.findIndex(g => g.subject === subj);
        if (idx >= 0) {
          newGpaList[idx] = { subject: subj, score };
        } else {
          newGpaList.push({ subject: subj, score });
        }
      });

      if (newGpaList.length === 0) return;

      const total = newGpaList.reduce((sum, item) => sum + item.score, 0);
      const avg = Number((total / newGpaList.length).toFixed(2));

      if (existingUpdate) {
        onUpdateAcademicUpdate({
          ...existingUpdate,
          gpaList: newGpaList,
          averageGpa: avg
        });
      } else {
        const newUpdate: AcademicUpdate = {
          id: `AC_${row.studentId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          studentId: row.studentId,
          semester: targetRound.includes('HKII') || targetRound.includes('Học kỳ II') || targetRound.includes('HK2') ? 'Học kỳ II' : 'Học kỳ I',
          title: targetRound,
          date: new Date().toISOString().split('T')[0],
          gpaList: newGpaList,
          averageGpa: avg,
          teacherRemarks: ''
        };
        onAddAcademicUpdate(newUpdate);
      }
      countSuccess++;
    });

    if (finalNewRounds.size > 0) {
      setRoundsList(prev => Array.from(new Set([...prev, ...finalNewRounds])));
    }

    const uniqueRoundsUsed = Array.from(new Set(importPreviewRows.map(r => r.round)));
    const roundSummaryMsg = uniqueRoundsUsed.length === 1 
      ? `đợt "${uniqueRoundsUsed[0]}"` 
      : `${uniqueRoundsUsed.length} đợt khác nhau`;

    setSavedFeedback(`Nhập đồng loạt thành công điểm cho ${countSuccess} học sinh vào ${roundSummaryMsg}!`);
    setShowImportPreviewModal(false);
    setImportPreviewRows([]);
    setImportSubjects([]);

    setTimeout(() => {
      setSavedFeedback('');
    }, 4000);
  };

  // --- STATS CALCULATIONS ---
  const studentScoresList = students.map(s => {
    const update = academicUpdates.find(u => u.studentId === s.id && u.title === selectedRound);
    let score: number | undefined;
    if (selectedSubject === 'Điểm trung bình') {
      score = update && update.gpaList.length > 0 ? update.averageGpa : undefined;
    } else {
      score = update?.gpaList.find(g => g.subject === selectedSubject)?.score;
    }
    return {
      student: s,
      score: score
    };
  }).filter(item => item.score !== undefined) as Array<{ student: Student, score: number }>;

  let countGioi = 0;
  let countKha = 0;
  let countDat = 0;
  let countChuaDat = 0;

  studentScoresList.forEach(item => {
    if (item.score >= 8.0) countGioi++;
    else if (item.score >= 6.5) countKha++;
    else if (item.score >= 5.0) countDat++;
    else countChuaDat++;
  });

  const totalGraded = studentScoresList.length;

  const chartData = [
    { name: 'Giỏi (>=8.0)', value: countGioi, color: '#10b981' },
    { name: 'Khá (6.5-7.9)', value: countKha, color: '#f59e0b' },
    { name: 'Đạt (5.0-6.4)', value: countDat, color: '#3b82f6' },
    { name: 'Chưa đạt (<5.0)', value: countChuaDat, color: '#ef4444' }
  ].filter(item => item.value > 0);

  const topStudents = [...studentScoresList]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Controls Bar - Light and Modern */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Choose Subject */}
          <div className="flex flex-col gap-1 w-full sm:w-48">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chọn môn học</span>
            <select
              id="subject-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white transition shadow-sm font-semibold"
            >
              {DEFAULT_SUBJECTS.map(subj => (
                <option key={subj} value={subj} className="bg-white text-slate-800">{subj}</option>
              ))}
              <option value="Điểm trung bình" className="bg-white text-amber-700 font-bold">⭐ Điểm trung bình (GPA)</option>
            </select>
          </div>

          {/* Exam Round Update Selection */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đợt vào điểm</span>
            <div className="flex gap-2">
              <select
                id="round-select"
                value={selectedRound}
                onChange={(e) => setSelectedRound(e.target.value)}
                className="flex-1 text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white transition shadow-sm font-semibold"
              >
                {roundsList.map(round => (
                  <option key={round} value={round} className="bg-white text-slate-800">{round}</option>
                ))}
              </select>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowAddRoundModal(true)}
                  className="px-3 bg-white hover:bg-slate-50 border border-slate-200 text-amber-600 rounded-xl transition flex items-center justify-center shrink-0 shadow-sm"
                  title="Thêm đợt mới"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center text-slate-500 text-xs font-semibold">
          <span>Sĩ số lớp: <b className="text-slate-800 font-bold">{students.length}</b></span>
          <span>•</span>
          <span>Đã nhập: <b className="text-amber-600 font-bold">{totalGraded}</b></span>
        </div>
      </div>

      {/* Main Double Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Input Grades Form */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col">
          
          {/* Header Action Menu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                <GraduationCap size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  {selectedSubject === 'Điểm trung bình' ? 'Xem Điểm trung bình (GPA)' : `Nhập điểm môn ${selectedSubject}`}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Đợt: {selectedRound}</p>
              </div>
            </div>

            {selectedSubject === 'Điểm trung bình' ? (
              <div className="text-[11px] text-amber-800 bg-amber-50/70 px-3.5 py-2 rounded-xl border border-amber-100/60 font-semibold flex items-center gap-1.5 shadow-sm">
                <AlertCircle size={13} className="text-amber-600" />
                <span>Điểm trung bình được tự động tính từ điểm các môn học.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {!isReadOnly && (
                  <>
                    <button
                      id="btn-quick-add-score"
                      onClick={() => setShowQuickAddModal(true)}
                      className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition text-xs border border-slate-200 shadow-sm"
                    >
                      <UserPlus size={13} className="text-amber-600" />
                      <span>Thêm nhanh</span>
                    </button>
                    
                    <button
                      id="btn-import-csv"
                      onClick={() => setShowImportTriggerModal(true)}
                      className="flex items-center gap-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-xl transition text-xs border border-slate-200 shadow-sm"
                    >
                      <Upload size={13} className="text-amber-600" />
                      <span>Nhập CSV</span>
                    </button>

                    <button
                      id="btn-save-academic-scores"
                      onClick={handleSaveAllScores}
                      className="flex items-center gap-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition text-xs shadow-md shadow-amber-950/10"
                    >
                      <Save size={13} />
                      <span>Lưu điểm</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Feedback banner */}
          {savedFeedback && (
            <div className={`p-3.5 mb-4 rounded-xl border text-xs flex items-center gap-2 animate-fadeIn ${
              savedFeedback.includes('thành công')
                ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                : 'bg-rose-50 border-rose-100 text-rose-800'
            }`}>
              {savedFeedback.includes('thành công') ? <CheckCircle2 size={14} className="text-emerald-600" /> : <AlertCircle size={14} className="text-rose-600" />}
              <span className="font-semibold">{savedFeedback}</span>
            </div>
          )}

          {/* Student Grades Table - Light style */}
          <div className="overflow-hidden rounded-2xl border border-slate-100 shadow-sm">
            <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100 sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="py-3 px-4 font-semibold w-16">Mã HS</th>
                    <th className="py-3 px-4 font-semibold">Họ và Tên</th>
                    <th className="py-3 px-4 font-semibold w-20">Giới tính</th>
                    <th className="py-3 px-4 font-semibold w-32 text-right">
                      {selectedSubject === 'Điểm trung bình' ? 'Điểm TB (GPA)' : 'Điểm số (0-10)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Không có học sinh nào trong lớp hiện tại.
                      </td>
                    </tr>
                  ) : (
                    students.map(s => {
                      const hasError = !!inputErrors[s.id];
                      return (
                        <tr 
                          key={s.id} 
                          id={`row-student-${s.id}`}
                          className="hover:bg-slate-50/50 transition"
                        >
                          <td className="py-3 px-4 font-mono text-slate-400">{s.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{s.name}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              s.gender === 'Nữ' 
                                ? 'bg-pink-50 text-pink-600 border border-pink-100' 
                                : 'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {s.gender}
                            </span>
                          </td>
                          <td className="py-2 px-4 text-right">
                            {selectedSubject === 'Điểm trung bình' ? (
                              <span className={`inline-block w-24 text-right font-mono font-bold px-3 py-1.5 text-xs rounded-xl ${
                                draftScores[s.id] 
                                  ? parseFloat(draftScores[s.id]) >= 8.0 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : parseFloat(draftScores[s.id]) >= 6.5
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100 font-bold'
                                      : parseFloat(draftScores[s.id]) >= 5.0
                                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                                  : 'text-slate-300 italic'
                              }`}>
                                {draftScores[s.id] ? Number(parseFloat(draftScores[s.id])).toFixed(2) : '--'}
                              </span>
                            ) : (
                              <div className="inline-block relative">
                                <input
                                  disabled={isReadOnly}
                                  type="text"
                                  value={draftScores[s.id] || ''}
                                  onChange={(e) => handleScoreChange(s.id, e.target.value)}
                                  placeholder="--"
                                  className={`w-24 text-right bg-white border rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 disabled:opacity-50 disabled:bg-slate-50 disabled:cursor-not-allowed ${
                                    hasError 
                                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30' 
                                      : 'border-slate-200 focus:border-amber-500 focus:ring-amber-500/30'
                                  }`}
                                />
                                {hasError && (
                                  <span className="absolute right-0 top-full mt-0.5 text-[8px] text-rose-500 whitespace-nowrap block font-medium">
                                    {inputErrors[s.id]}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-400 gap-1.5">
            <span>• Điểm dùng dấu chấm (.) hoặc phẩy (,) ngăn cách thập phân.</span>
            <span>• Để trống ô điểm và nhấn Lưu điểm để xóa điểm của học sinh.</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Stats & Top list */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Sub-section 1: Stats & PieChart (Phần trái) */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-3">
              <PieIcon size={14} className="text-emerald-500" />
              <span>{selectedSubject === 'Điểm trung bình' ? 'Phân phối kết quả Điểm trung bình (GPA)' : `Phân phối kết quả môn ${selectedSubject}`}</span>
            </h4>

            {totalGraded === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 italic text-xs space-y-2">
                <AlertCircle size={32} className="text-slate-200" />
                <span>Chưa có dữ liệu điểm môn học này cho đợt đã chọn.</span>
                <span>Vui lòng nhập điểm bên trái hoặc tải file nhập điểm!</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* Pie Chart */}
                <div className="h-44 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderColor: '#e2e8f0', borderRadius: '8px' }} 
                        itemStyle={{ color: '#1e293b', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-lg font-bold text-slate-800">{totalGraded}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold">Học sinh</span>
                  </div>
                </div>

                {/* Count Display Rows - Beautiful Pastel Bright Style */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs text-emerald-800 font-bold">Giỏi (≥8.0)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-900">{countGioi} ({totalGraded > 0 ? Math.round(countGioi / totalGraded * 100) : 0}%)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-100 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                      <span className="text-xs text-amber-800 font-bold">Khá (6.5-7.9)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-900">{countKha} ({totalGraded > 0 ? Math.round(countKha / totalGraded * 100) : 0}%)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs text-blue-800 font-bold">Đạt (5.0-6.4)</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-900">{countDat} ({totalGraded > 0 ? Math.round(countDat / totalGraded * 100) : 0}%)</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                      <span className="text-xs text-rose-800 font-bold">Chưa đạt ({"<5.0"})</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-900">{countChuaDat} ({totalGraded > 0 ? Math.round(countChuaDat / totalGraded * 100) : 0}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sub-section 2: Top 5 Highest Scores (Phần phải) */}
          <div className="bg-white rounded-3xl border border-slate-200/60 p-6 shadow-sm flex flex-col">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5 mb-4 border-b border-slate-100 pb-3">
              <Award size={14} className="text-amber-500 animate-pulse" />
              <span>{selectedSubject === 'Điểm trung bình' ? 'Top 5 học sinh GPA cao nhất' : 'Top 5 học sinh điểm cao nhất'}</span>
            </h4>

            {topStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 italic text-xs">
                Chưa có dữ liệu xếp hạng điểm số.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topStudents.map((item, idx) => {
                  const medalStyles = [
                    'bg-amber-50 text-amber-600 border-amber-200/50',
                    'bg-slate-100 text-slate-600 border-slate-200',
                    'bg-amber-100/40 text-amber-800 border-amber-200/20',
                    'bg-slate-50 text-slate-400 border-slate-100',
                    'bg-slate-50 text-slate-400 border-slate-100'
                  ];

                  return (
                    <div 
                      key={item.student.id} 
                      className="p-3 bg-slate-50/50 hover:bg-slate-100/50 transition rounded-2xl border border-slate-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-lg text-[11px] font-mono font-bold flex items-center justify-center border ${medalStyles[idx]}`}>
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-800 text-xs">{item.student.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono mt-0.5">{item.student.id}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono font-bold text-amber-600">{item.score}</span>
                        <span className="text-[10px] text-slate-400 font-medium">điểm</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL 1: ADD NEW EXAM ROUND */}
      {showAddRoundModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => {
                setShowAddRoundModal(false);
                setAddRoundError('');
                setNewRoundTitle('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Plus size={16} className="text-amber-600" />
              <span>Thêm đợt vào điểm mới</span>
            </h3>

            <form onSubmit={handleAddNewRound} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Tên đợt vào điểm mới</label>
                <input
                  type="text"
                  value={newRoundTitle}
                  onChange={(e) => {
                    setNewRoundTitle(e.target.value);
                    setAddRoundError('');
                  }}
                  placeholder="Ví dụ: Giữa HK1, Lần KT số 1..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                  autoFocus
                />
                {addRoundError && (
                  <p className="text-[10px] text-rose-500 mt-1 font-semibold">{addRoundError}</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddRoundModal(false);
                    setAddRoundError('');
                    setNewRoundTitle('');
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition text-xs border border-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition text-xs"
                >
                  Thêm mới
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK SINGLE ADD */}
      {showQuickAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-scaleIn">
            <button 
              onClick={() => {
                setShowQuickAddModal(false);
                setQuickAddError('');
                setQuickAddScore('');
                setQuickAddStudentId('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserPlus size={16} className="text-amber-600" />
              <span>Thêm nhanh điểm môn {selectedSubject}</span>
            </h3>

            <form onSubmit={handleConfirmQuickAdd} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Chọn học sinh</label>
                <select
                  value={quickAddStudentId}
                  onChange={(e) => {
                    setQuickAddStudentId(e.target.value);
                    setQuickAddError('');
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">Điểm số (0 - 10)</label>
                <input
                  type="text"
                  value={quickAddScore}
                  onChange={(e) => {
                    setQuickAddScore(e.target.value);
                    setQuickAddError('');
                  }}
                  placeholder="Ví dụ: 8.5 hoặc 9"
                  className="w-full text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500 focus:bg-white transition"
                />
              </div>

              {quickAddError && (
                <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-1.5 text-[10px] text-rose-700 font-semibold">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>{quickAddError}</span>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddModal(false);
                    setQuickAddError('');
                    setQuickAddScore('');
                    setQuickAddStudentId('');
                  }}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition text-xs border border-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition text-xs"
                >
                  Ghi nháp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CSV IMPORT INSTRUCTIONS & UPLOAD TRIGGER */}
      {showImportTriggerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => {
                setShowImportTriggerModal(false);
                setImportError('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Upload size={16} className="text-amber-600" />
              <span>Nhập điểm đồng loạt bằng CSV</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-600">
              <p>Bạn có thể nhập điểm nhanh chóng cho <b>một môn</b> hoặc <b>nhiều môn học cùng lúc</b> bằng tệp tin bảng tính CSV.</p>
              
              {/* Template Download Section */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Download size={13} className="text-amber-600" />
                  <span>Tải file mẫu định dạng chuẩn (UTF-8)</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={downloadSingleSubjectTemplate}
                    className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-700 font-semibold transition shadow-sm"
                  >
                    <FileSpreadsheet size={13} className="text-emerald-500" />
                    <span>Bảng mẫu môn {selectedSubject}</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadMultiSubjectTemplate}
                    className="flex items-center justify-center gap-1.5 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-[10px] text-slate-700 font-semibold transition shadow-sm"
                  >
                    <FileSpreadsheet size={13} className="text-indigo-500" />
                    <span>Bảng mẫu tổng hợp nhiều môn</span>
                  </button>
                </div>
              </div>

              {/* Target Round Settings Selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3 text-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                  Cấu hình đợt vào điểm:
                </h4>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportRoundMode('single')}
                    className={`p-2 rounded-xl text-[10px] font-bold border transition ${
                      importRoundMode === 'single'
                        ? 'bg-amber-500/10 text-amber-700 border-amber-500/40 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Áp dụng chung 1 đợt
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportRoundMode('file')}
                    className={`p-2 rounded-xl text-[10px] font-bold border transition ${
                      importRoundMode === 'file'
                        ? 'bg-amber-500/10 text-amber-700 border-amber-500/40 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Lấy tự động từ file
                  </button>
                </div>

                {importRoundMode === 'single' ? (
                  <div className="space-y-2 pt-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Chọn đợt áp dụng</label>
                    <select
                      value={importRound}
                      onChange={(e) => setImportRound(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 transition font-semibold"
                    >
                      <option value="">-- Chọn đợt --</option>
                      {roundsList.map(round => (
                        <option key={round} value={round}>{round}</option>
                      ))}
                      <option value="_new_round_">+ Thêm đợt mới...</option>
                    </select>

                    {importRound === '_new_round_' && (
                      <div className="pt-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">Tên đợt mới</label>
                        <input
                          type="text"
                          value={importRoundNewName}
                          onChange={(e) => setImportRoundNewName(e.target.value)}
                          placeholder="Ví dụ: Kiểm tra 15p lần 2..."
                          className="w-full text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 transition"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50/50 border border-amber-100/50 rounded-xl text-[10px] text-amber-800 space-y-1">
                    <div>• Hệ thống sẽ tự động tìm cột có tiêu đề: <code className="font-mono bg-amber-100 px-1 rounded font-bold">Đợt</code>, <code className="font-mono bg-amber-100 px-1 rounded font-bold">Đợt vào điểm</code>, <code className="font-mono bg-amber-100 px-1 rounded font-bold">Round</code>... để lấy đợt riêng cho từng dòng.</div>
                    <div>• Bạn có thể tải bảng mẫu tổng hợp bên trên để có sẵn định dạng cột này.</div>
                  </div>
                )}
              </div>

              {/* Instructions list */}
              <div className="space-y-1 text-[11px] list-disc list-inside bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 text-amber-800">
                <div className="font-bold mb-1 uppercase tracking-wider text-[9px] text-amber-900">Lưu ý quan trọng:</div>
                <div>• Cột mã học sinh <code className="font-mono bg-amber-100 px-1 rounded text-red-600">Mã HS</code> hoặc <code className="font-mono bg-amber-100 px-1 rounded text-red-600">Ma HS</code> là bắt buộc để khớp đúng học sinh.</div>
                <div>• Điểm số hợp lệ nằm trong khoảng từ <code className="font-mono bg-amber-100 px-1 rounded font-bold">0</code> đến <code className="font-mono bg-amber-100 px-1 rounded font-bold">10</code>.</div>
                <div>• Lưu file dưới dạng định dạng <code className="font-mono bg-amber-100 px-1 rounded font-bold">.csv</code>.</div>
              </div>

              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl flex items-start gap-2">
                  <AlertTriangle size={15} className="shrink-0 text-rose-500 mt-0.5" />
                  <div className="font-semibold text-[10px]">{importError}</div>
                </div>
              )}

              {/* File Input upload zone */}
              <div className="pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleCSVUpload}
                  accept=".csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="w-full py-4 px-6 border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/30 hover:bg-amber-50/10 text-slate-500 hover:text-amber-600"
                >
                  <FileSpreadsheet size={32} className="text-slate-400 hover:text-amber-600 animate-pulse" />
                  <span className="text-xs font-bold">Nhấn để chọn file CSV của bạn</span>
                  <span className="text-[10px] text-slate-400">Hỗ trợ file mã hóa UTF-8 hoặc ANSI</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CSV PREVIEW AND SELECTION */}
      {showImportPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative flex flex-col max-h-[85vh]">
            <button 
              onClick={() => {
                setShowImportPreviewModal(false);
                setImportPreviewRows([]);
                setImportSubjects([]);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2 border-b border-slate-100 pb-2 shrink-0">
              <Check size={16} className="text-emerald-500" />
              <span>Xem trước dữ liệu nhập điểm đồng loạt</span>
            </h3>

            {/* Selection of exam round to apply imported grades */}
            <div className="mb-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
                  {importRoundMode === 'file' ? 'Đợt điểm phát hiện từ File CSV' : 'Đợt áp dụng điểm nhập khẩu'}
                </label>
                {importRoundMode === 'file' ? (
                  <span className="inline-block px-3 py-1.5 bg-amber-500/10 text-amber-800 border border-amber-500/20 text-xs font-bold rounded-xl animate-pulse">
                    ✓ Lấy tự động theo từng dòng trong file CSV
                  </span>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={importRound}
                      onChange={(e) => setImportRound(e.target.value)}
                      className="text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 transition shadow-sm font-semibold"
                    >
                      {roundsList.map(round => (
                        <option key={round} value={round}>{round}</option>
                      ))}
                      <option value="_new_round_">+ Thêm đợt mới...</option>
                    </select>

                    {importRound === '_new_round_' && (
                      <input
                        type="text"
                        value={importRoundNewName}
                        onChange={(e) => setImportRoundNewName(e.target.value)}
                        placeholder="Ví dụ: Đợt kiểm tra mới..."
                        className="text-xs bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500 transition shadow-sm w-44"
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="text-right text-[10px] text-slate-500">
                <div>Tổng số học sinh nạp: <b className="text-slate-800">{importPreviewRows.length}</b></div>
                <div>Hợp lệ lớp học: <b className="text-emerald-600">{importPreviewRows.filter(r => r.matched).length}</b></div>
                <div>Bỏ qua (ngoài lớp): <b className="text-rose-600">{importPreviewRows.filter(r => !r.matched).length}</b></div>
              </div>
            </div>

            {/* Found Subjects Badges */}
            <div className="mb-3 flex flex-wrap items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Môn học nhận diện:</span>
              {importSubjects.map(subj => (
                <span key={subj} className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-lg text-[10px] font-semibold">
                  {subj}
                </span>
              ))}
            </div>

            {/* Scrollable Preview Table */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-100 shadow-sm mb-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] tracking-wider border-b border-slate-100 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-16">Trạng thái</th>
                    <th className="py-2.5 px-3 font-semibold w-24">Mã học sinh</th>
                    <th className="py-2.5 px-3 font-semibold">Tên học sinh</th>
                    <th className="py-2.5 px-3 font-semibold">Đợt điểm áp dụng</th>
                    {importSubjects.map(subj => (
                      <th key={subj} className="py-2.5 px-3 font-semibold text-right">{subj}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreviewRows.map((row, idx) => (
                    <tr key={idx} className={`hover:bg-slate-50/50 ${!row.matched ? 'bg-rose-50/30' : ''}`}>
                      <td className="py-2 px-3">
                        {row.matched ? (
                          <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 w-fit">
                            <Check size={9} />
                            <span>Khớp</span>
                          </span>
                        ) : (
                          <span className="text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 w-fit" title="Không tìm thấy HS này trong danh sách sĩ số lớp hiện tại">
                            <X size={9} />
                            <span>Bỏ qua</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-500">{row.studentId}</td>
                      <td className="py-2 px-3 font-semibold text-slate-700">{row.studentName}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100/60 shadow-sm">
                          {row.round}
                        </span>
                      </td>
                      {importSubjects.map(subj => (
                        <td key={subj} className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                          {row.scores[subj] !== null ? row.scores[subj] : <span className="text-slate-300 font-normal">--</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowImportPreviewModal(false);
                  setImportPreviewRows([]);
                  setImportSubjects([]);
                }}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition text-xs border border-slate-200"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded-xl transition text-xs flex items-center gap-1 shadow-md shadow-amber-950/10"
              >
                <Check size={14} />
                <span>Xác nhận nhập điểm</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

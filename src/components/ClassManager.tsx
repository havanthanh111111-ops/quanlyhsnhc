/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Student, StudentTask } from '../types';
import { db, onSnapshot, doc, setDoc, deleteDoc } from '../lib/firebase';
import { saveTimetable, saveReminder, deleteReminder, saveParticipation, saveDuty } from '../lib/dbService';
import { getWeekConfig, generateWeeks, isDateInWeek } from '../utils/weekUtils';
import { 
  Users, 
  Grid, 
  Calendar, 
  Shuffle, 
  Trash2, 
  Save, 
  Plus, 
  User, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  Sparkles, 
  Lock,
  Download,
  AlertCircle,
  FileText,
  TrendingUp,
  MessageSquare,
  Minus,
  Info,
  Clock,
  ClipboardList,
  ChevronDown
} from 'lucide-react';

const getStudentAvatarUrl = (avatarUrl: string | undefined): string => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('data:image/') || avatarUrl.startsWith('blob:') || (avatarUrl.startsWith('http') && !avatarUrl.includes('drive.google.com'))) {
    return avatarUrl;
  }
  return avatarUrl.replace('/view?usp=drivesdk', '').replace('file/d/', 'uc?export=view&id=');
};

interface ClassManagerProps {
  students: Student[];
  activeClassId: string;
  className: string;
  onUpdateStudent: (updated: Student) => void;
  isReadOnly?: boolean;
  tasks?: StudentTask[];
  onAddTask?: (task: StudentTask) => void;
  onUpdateTask?: (task: StudentTask) => void;
  onDeleteTask?: (id: string) => void;
}

interface SeatingCell {
  row: number;
  col: number;
  studentId?: string;
}

interface TimetableCell {
  day: string; // "Thứ 2", "Thứ 3", etc.
  period: number; // 1 to 5
  session: 'Sáng' | 'Chiều';
  subject: string;
}

export default function ClassManager({ 
  students, 
  activeClassId, 
  className,
  onUpdateStudent,
  isReadOnly = false,
  tasks = [],
  onAddTask,
  onUpdateTask,
  onDeleteTask
}: ClassManagerProps) {
  const [subTab, setSubTab] = useState<'groups' | 'seating' | 'timetable' | 'reminders' | 'duty' | 'officers'>('groups');
  const [remindersSubTab, setRemindersSubTab] = useState<'reminders' | 'participation'>('reminders');

  // Selected date for "Dặn dò hàng ngày" and "Bảng theo dõi học tập"
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [reminderText, setReminderText] = useState<string>('');
  const [participationData, setParticipationData] = useState<Record<string, number>>({});
  
  // Duty Schedule state for class duty manager
  const [dutySchedule, setDutySchedule] = useState<Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }>>({});
  
  // States for enhanced week-based duty scheduling
  const [weekConfig, setWeekConfig] = useState(() => getWeekConfig());

  // Subscribe to real-time week configuration in Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'weeks'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startDate && data.totalWeeks) {
          localStorage.setItem('schoolYearStartDate', data.startDate);
          localStorage.setItem('totalSchoolWeeks', data.totalWeeks.toString());
          setWeekConfig({ startDate: data.startDate, totalWeeks: data.totalWeeks });
        }
      }
    });
    return () => unsub();
  }, []);

  const [selectedDutyWeek, setSelectedDutyWeek] = useState<number>(() => {
    const { startDate, totalWeeks } = getWeekConfig();
    const list = generateWeeks(startDate, totalWeeks);
    const found = list.find(w => isDateInWeek(new Date().toISOString().split('T')[0], w));
    if (found) return found.weekNumber;
    return list.find(w => w.weekNumber === 35) ? 35 : (list[0]?.weekNumber || 1);
  });

  useEffect(() => {
    const list = generateWeeks(weekConfig.startDate, weekConfig.totalWeeks);
    const found = list.find(w => isDateInWeek(new Date().toISOString().split('T')[0], w));
    if (found) {
      setSelectedDutyWeek(found.weekNumber);
    } else {
      setSelectedDutyWeek(list.find(w => w.weekNumber === 35) ? 35 : (list[0]?.weekNumber || 1));
    }
  }, [weekConfig]);

  const [selectedDutyGroup, setSelectedDutyGroup] = useState<string>('Tổ 1');
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState<boolean>(false);
  const [activeDayGroupDropdown, setActiveDayGroupDropdown] = useState<string | null>(null);
  const [activeDutyInput, setActiveDutyInput] = useState<{ day: string; field: 'sweeping' | 'cleaningBoard' | 'trash' } | null>(null);

  // Filter students belonging to this class (include active, promoted, or transferred for history)
  const classStudents = students.filter(
    s => s.classId === activeClassId && 
    (s.status === 'Đang học' || s.status === 'Lên lớp' || s.status === 'Chuyển lớp' || !s.status || s.status.trim() === '')
  );

  // --- BAN CÁN SỰ LỚP STATE & HANDLERS ---
  const [officerSearchQuery, setOfficerSearchQuery] = useState('');
  const [customRoles, setCustomRoles] = useState<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    classStudents.forEach(s => {
      initial[s.id] = s.role || '';
    });
    setCustomRoles(initial);
  }, [students, activeClassId]);

  const handleAssignRole = (roleName: string, studentId: string) => {
    if (isReadOnly) return;
    
    // Find previous officer of this role and clear it
    const previousOfficer = classStudents.find(s => s.role === roleName);
    if (previousOfficer) {
      onUpdateStudent({ ...previousOfficer, role: undefined });
    }

    // If a student is selected (not empty), assign the role to them
    if (studentId) {
      const student = classStudents.find(s => s.id === studentId);
      if (student) {
        onUpdateStudent({ ...student, role: roleName });
      }
    }
  };

  // --- SEATING CHART STATE ---
  const [rows, setRows] = useState<number>(4);
  const [cols, setCols] = useState<number>(6);
  const [selectedSeat, setSelectedSeat] = useState<{ row: number; col: number } | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // --- TIMETABLE STATE ---
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [editingCell, setEditingCell] = useState<{ day: string; period: number; session: 'Sáng' | 'Chiều' } | null>(null);
  const [tempSubject, setTempSubject] = useState('');

  // --- CONFIRM MODAL STATE ---
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'warning' | 'danger' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const triggerConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: { confirmText?: string; cancelText?: string; type?: 'warning' | 'danger' | 'info' }
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText: options?.confirmText || 'Xác nhận',
      cancelText: options?.cancelText || 'Hủy bỏ',
      type: options?.type || 'warning',
    });
  };

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const commonSubjects = [
    'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 
    'Lịch sử', 'Địa lý', 'Tin học', 'Công nghệ', 'GDQP-AN', 'GDCD',
    'Thể dục', 'Sinh hoạt lớp', 'Chào cờ', 'Trải nghiệm HN', 'Tự học'
  ];

  // Load Timetable for this class (with real-time Firestore sync)
  useEffect(() => {
    if (!activeClassId) return;
    const key = `app_timetable_${activeClassId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setTimetable(JSON.parse(saved));
      } catch (e) {
        generateEmptyTimetable();
      }
    } else {
      generateEmptyTimetable();
    }

    // Subscribe to Firestore timetables
    const unsub = onSnapshot(doc(db, 'timetables', activeClassId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.cells) {
          setTimetable(data.cells);
          localStorage.setItem(`app_timetable_${activeClassId}`, JSON.stringify(data.cells));
        }
      }
    });

    return () => unsub();
  }, [activeClassId]);

  const generateEmptyTimetable = () => {
    const initial: TimetableCell[] = [];
    daysOfWeek.forEach(day => {
      // 5 morning periods
      for (let p = 1; p <= 5; p++) {
        // Set up default standard slots
        let defaultSub = '';
        if (day === 'Thứ 2' && p === 1) defaultSub = 'Chào cờ';
        if (day === 'Thứ 7' && p === 5) defaultSub = 'Sinh hoạt lớp';
        
        initial.push({ day, period: p, session: 'Sáng', subject: defaultSub });
      }
      // 5 afternoon periods
      for (let p = 1; p <= 5; p++) {
        initial.push({ day, period: p, session: 'Chiều', subject: '' });
      }
    });
    setTimetable(initial);
  };

  const saveTimetable = (updated: TimetableCell[]) => {
    setTimetable(updated);
    localStorage.setItem(`app_timetable_${activeClassId}`, JSON.stringify(updated));
    // Also save to Firestore!
    setDoc(doc(db, 'timetables', activeClassId), {
      classId: activeClassId,
      cells: updated
    }).catch(e => console.error('Lỗi khi lưu thời khóa biểu lên Firestore:', e));
  };

  const handleCellClick = (day: string, period: number, session: 'Sáng' | 'Chiều') => {
    const cell = timetable.find(c => c.day === day && c.period === period && c.session === session);
    setTempSubject(cell?.subject || '');
    setEditingCell({ day, period, session });
  };

  const saveCellSubject = (subj: string) => {
    if (!editingCell) return;
    const updated = timetable.map(c => {
      if (c.day === editingCell.day && c.period === editingCell.period && c.session === editingCell.session) {
        return { ...c, subject: subj };
      }
      return c;
    });
    saveTimetable(updated);
    setEditingCell(null);
  };

  // Load reminders and participation data (with real-time Firestore sync)
  useEffect(() => {
    if (!activeClassId || !selectedDate) return;

    // 1. Reminders
    const reminderKey = `app_reminders_${activeClassId}_${selectedDate}`;
    const savedReminder = localStorage.getItem(reminderKey);
    if (savedReminder) {
      setReminderText(savedReminder);
    } else {
      // Pre-populate some reminders based on selected class and day of week
      const dateObj = new Date(selectedDate);
      const dayIndex = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
      const VietnameseDays = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const dayStr = VietnameseDays[dayIndex];

      let defaultReminder = '';
      if (dayStr === 'Chủ Nhật') {
        defaultReminder = 'Chủ nhật được nghỉ. Hãy chuẩn bị bài vở đầy đủ cho tuần mới!';
      } else {
        // Find what subjects are in the timetable for this day
        const daySubjects = Array.from(new Set(
          timetable
            .filter(c => c.day === dayStr && c.subject)
            .map(c => c.subject)
        ));
        if (daySubjects.length > 0) {
          defaultReminder = `${dayStr} ngày ${selectedDate.split('-').reverse().join('/')}:\n` +
            daySubjects.map(sub => `• Môn ${sub}: Đọc trước bài mới, làm bài tập về nhà đầy đủ.`).join('\n');
        } else {
          defaultReminder = `• Chuẩn bị sách vở và đồ dùng học tập đầy đủ cho ngày học.\n• Xem trước các bài học tiếp theo trong sách giáo khoa.`;
        }
      }
      setReminderText(defaultReminder);
    }

    // 2. Participation
    const participationKey = `app_participation_${activeClassId}_${selectedDate}`;
    const savedParticipation = localStorage.getItem(participationKey);
    if (savedParticipation) {
      try {
        setParticipationData(JSON.parse(savedParticipation));
      } catch (e) {
        setParticipationData({});
      }
    } else {
      // Seed realistic data for the class students
      const seeded: Record<string, number> = {};
      const subjectsList = ['Toán', 'Lý', 'Hóa', 'Văn', 'Anh', 'Sử', 'Địa', 'Tin'];
      
      classStudents.forEach(s => {
        // deterministic but random-looking seed based on student ID string hash
        let hash = 0;
        for (let i = 0; i < s.id.length; i++) {
          hash = s.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        subjectsList.forEach((sub, subIdx) => {
          const valHash = Math.abs((hash + subIdx) % 7);
          seeded[`${s.id}_${sub}`] = valHash === 0 ? 0 : valHash > 4 ? Math.abs(hash % 3) : Math.abs(hash % 5);
        });
      });
      setParticipationData(seeded);
      localStorage.setItem(participationKey, JSON.stringify(seeded));
    }

    // Subscribe to Firestore Reminders
    const unsubReminder = onSnapshot(doc(db, 'reminders', `${activeClassId}_${selectedDate}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.text !== undefined) {
          setReminderText(data.text);
          localStorage.setItem(`app_reminders_${activeClassId}_${selectedDate}`, data.text);
        }
      }
    });

    // Subscribe to Firestore Participations
    const unsubParticipation = onSnapshot(doc(db, 'participations', `${activeClassId}_${selectedDate}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.data) {
          setParticipationData(data.data);
          localStorage.setItem(`app_participation_${activeClassId}_${selectedDate}`, JSON.stringify(data.data));
        }
      }
    });

    return () => {
      unsubReminder();
      unsubParticipation();
    };
  }, [activeClassId, selectedDate, timetable, students]);

  // Load Duty Schedule for this class and selected week (with real-time Firestore sync)
  useEffect(() => {
    if (!activeClassId) return;
    const key = `app_duty_${activeClassId}_week_${selectedDutyWeek}`;
    const fallbackKey = `app_duty_${activeClassId}`;
    const saved = localStorage.getItem(key);
    
    if (saved) {
      try {
        setDutySchedule(JSON.parse(saved));
      } catch (e) {
        setDutySchedule({});
      }
    } else {
      // Check if general/legacy schedule exists, migrate it as default
      const fallbackSaved = localStorage.getItem(fallbackKey);
      if (fallbackSaved) {
        try {
          const parsed = JSON.parse(fallbackSaved);
          setDutySchedule(parsed);
          localStorage.setItem(key, fallbackSaved);
        } catch (e) {
          // ignore and seed new
        }
      } else {
        // Seed default duty schedule based on groups rotation
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const seeded: Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }> = {};

        days.forEach((day, idx) => {
          // rotation offset based on week number so different groups get default assigned each week!
          const groupNum = ((idx + selectedDutyWeek) % 4) + 1;
          const groupName = `Tổ ${groupNum}`;
          const groupStudents = classStudents.filter(s => s.groupName === groupName);
          
          let sweeping = 'Chưa phân công';
          let cleaningBoard = 'Chưa phân công';
          let trash = 'Chưa phân công';

          if (groupStudents.length > 0) {
            sweeping = groupStudents[0]?.name;
            if (groupStudents.length > 1) {
              sweeping += `, ${groupStudents[1]?.name}`;
            }
            cleaningBoard = groupStudents[2]?.name || groupStudents[0]?.name || 'Học sinh tổ';
            trash = groupStudents[3]?.name || groupStudents[1]?.name || 'Học sinh tổ';
          }

          seeded[day] = {
            group: groupName,
            sweeping,
            cleaningBoard,
            trash
          };
        });

        setDutySchedule(seeded);
        localStorage.setItem(key, JSON.stringify(seeded));
      }
    }

    // Subscribe to Firestore duties
    const unsub = onSnapshot(doc(db, 'duties', `${activeClassId}_week_${selectedDutyWeek}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.schedule) {
          setDutySchedule(data.schedule);
          localStorage.setItem(`app_duty_${activeClassId}_week_${selectedDutyWeek}`, JSON.stringify(data.schedule));
        }
      }
    });

    return () => unsub();
  }, [activeClassId, selectedDutyWeek, students]);

  // --- SEATING CHART LOGIC ---
  const handleAssignStudent = (studentId: string | undefined) => {
    if (!selectedSeat) return;
    
    // If studentId is provided, first unassign that student from any existing seats
    if (studentId) {
      const currentStudent = classStudents.find(s => s.id === studentId);
      if (currentStudent) {
        // Find if someone else is in selected seat and clear them
        const occupant = classStudents.find(s => s.seatRow === selectedSeat.row && s.seatCol === selectedSeat.col);
        if (occupant) {
          onUpdateStudent({ ...occupant, seatRow: undefined, seatCol: undefined });
        }
        
        onUpdateStudent({
          ...currentStudent,
          seatRow: selectedSeat.row,
          seatCol: selectedSeat.col
        });
      }
    } else {
      // Clear seat
      const occupant = classStudents.find(s => s.seatRow === selectedSeat.row && s.seatCol === selectedSeat.col);
      if (occupant) {
        onUpdateStudent({ ...occupant, seatRow: undefined, seatCol: undefined });
      }
    }
    
    setShowAssignModal(false);
    setSelectedSeat(null);
  };

  const autoArrangeSeats = () => {
    if (classStudents.length === 0) return;
    
    triggerConfirm(
      'Sắp xếp tự động sơ đồ',
      'Bạn có chắc chắn muốn sắp xếp tự động toàn bộ sơ đồ ghế ngồi? Sơ đồ cũ sẽ bị thay thế.',
      () => {
        // Unassign everyone in this class first
        classStudents.forEach(s => {
          onUpdateStudent({ ...s, seatRow: undefined, seatCol: undefined });
        });

        // Shuffle active students
        const shuffled = [...classStudents].sort(() => Math.random() - 0.5);
        
        // Fill row by row, col by col
        let studentIdx = 0;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (studentIdx < shuffled.length) {
              onUpdateStudent({
                ...shuffled[studentIdx],
                seatRow: r,
                seatCol: c
              });
              studentIdx++;
            }
          }
        }
      },
      { type: 'warning', confirmText: 'Sắp xếp ngay' }
    );
  };

  const clearAllSeats = () => {
    triggerConfirm(
      'Xóa sạch sơ đồ',
      'Bạn có chắc chắn muốn xóa sạch sơ đồ ghế ngồi hiện tại của lớp?',
      () => {
        classStudents.forEach(s => {
          if (s.seatRow !== undefined || s.seatCol !== undefined) {
            onUpdateStudent({ ...s, seatRow: undefined, seatCol: undefined });
          }
        });
      },
      { type: 'danger', confirmText: 'Xóa ngay' }
    );
  };

  // --- GROUPING LOGIC ---
  const handleAssignGroup = (studentId: string, groupName: string) => {
    const student = classStudents.find(s => s.id === studentId);
    if (student) {
      onUpdateStudent({ ...student, groupName });
    }
  };

  const autoGroupSequentially = (byGender: boolean = false) => {
    if (classStudents.length === 0) return;
    
    const title = byGender ? 'Chia tổ cân bằng Nam/Nữ' : 'Chia đều Tổ ngẫu nhiên';
    const message = byGender 
      ? 'Bạn có chắc chắn muốn chia cân bằng Nam/Nữ vào 4 Tổ (Tổ 1 đến Tổ 4)? Cấu hình Tổ cũ sẽ bị ghi đè.'
      : 'Bạn có chắc chắn muốn chia ngẫu nhiên học sinh đều vào 4 Tổ (Tổ 1 đến Tổ 4)? Cấu hình Tổ cũ sẽ bị ghi đè.';

    triggerConfirm(
      title,
      message,
      () => {
        let studentsToProcess = [...classStudents];
        
        if (byGender) {
          // Group by gender, then distribute evenly to maintain gender balance
          const males = studentsToProcess.filter(s => s.gender === 'Nam').sort(() => Math.random() - 0.5);
          const females = studentsToProcess.filter(s => s.gender === 'Nữ').sort(() => Math.random() - 0.5);
          
          let maleIdx = 0;
          let femaleIdx = 0;
          let counter = 0;
          
          while (maleIdx < males.length || femaleIdx < females.length) {
            const groupNum = (counter % 4) + 1;
            const targetGroup = `Tổ ${groupNum}`;
            
            if (counter % 2 === 0 && maleIdx < males.length) {
              onUpdateStudent({ ...males[maleIdx], groupName: targetGroup });
              maleIdx++;
            } else if (femaleIdx < females.length) {
              onUpdateStudent({ ...females[femaleIdx], groupName: targetGroup });
              femaleIdx++;
            } else if (maleIdx < males.length) {
              onUpdateStudent({ ...males[maleIdx], groupName: targetGroup });
              maleIdx++;
            }
            counter++;
          }
        } else {
          // Fully random/sequential shuffle
          const shuffled = [...studentsToProcess].sort(() => Math.random() - 0.5);
          shuffled.forEach((student, index) => {
            const groupNum = (index % 4) + 1;
            onUpdateStudent({ ...student, groupName: `Tổ ${groupNum}` });
          });
        }
      },
      { type: 'warning', confirmText: 'Chia tổ ngay' }
    );
  };

  const resetGroups = () => {
    triggerConfirm(
      'Đặt lại Tổ',
      'Bạn có chắc chắn muốn đặt lại tất cả học sinh về trạng thái "Chưa phân tổ"?',
      () => {
        classStudents.forEach(student => {
          if (student.groupName) {
            onUpdateStudent({ ...student, groupName: undefined });
          }
        });
      },
      { type: 'danger', confirmText: 'Đặt lại ngay' }
    );
  };

  // Organize groups
  const groups = {
    'Tổ 1': classStudents.filter(s => s.groupName === 'Tổ 1'),
    'Tổ 2': classStudents.filter(s => s.groupName === 'Tổ 2'),
    'Tổ 3': classStudents.filter(s => s.groupName === 'Tổ 3'),
    'Tổ 4': classStudents.filter(s => s.groupName === 'Tổ 4'),
    'Chưa phân tổ': classStudents.filter(s => !s.groupName || !['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].includes(s.groupName))
  };

  // Get student at row & col
  const getStudentAtSeat = (r: number, c: number) => {
    return classStudents.find(s => s.seatRow === r && s.seatCol === c);
  };

  // Unassigned student list for seating chart
  const unseatedStudents = classStudents.filter(s => s.seatRow === undefined || s.seatCol === undefined);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Sub menu controls */}
      <div className="flex border-b border-white/5 pb-px mb-2 overflow-x-auto gap-4 md:gap-8 scrollbar-none select-none">
        {[
          { id: 'groups', label: 'Phân Tổ Lớp Học', icon: Users },
          { id: 'officers', label: 'Ban Cán Sự Lớp', icon: User },
          { id: 'seating', label: 'Sơ đồ Ghế ngồi', icon: Grid },
          { id: 'timetable', label: 'Thời khóa biểu Tuần', icon: Calendar },
          { id: 'reminders', label: 'Dặn dò & Học tập', icon: FileText },
          { id: 'duty', label: 'Phân công Trực nhật', icon: ClipboardList }
        ].map(item => {
          const Icon = item.icon;
          const isSelected = subTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSubTab(item.id as any)}
              className={`flex items-center gap-2 py-3 px-1 text-xs md:text-sm font-semibold border-b-2 transition outline-none whitespace-nowrap ${
                isSelected 
                  ? 'border-amber-500 text-white font-extrabold' 
                  : 'border-transparent text-white/50 hover:text-white/80'
              }`}
            >
              <Icon size={14} className={isSelected ? 'text-amber-500' : 'text-white/40'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {classStudents.length === 0 ? (
        <div className="p-8 bg-amber-950/10 rounded-2xl border border-amber-500/10 text-center space-y-3">
          <AlertCircle className="mx-auto text-amber-500" size={32} />
          <h4 className="text-sm font-bold text-white">Chưa có học sinh cho lớp này</h4>
          <p className="text-xs text-white/40 max-w-md mx-auto">
            Vui lòng chuyển sang tab <span className="text-amber-500 font-semibold cursor-pointer" onClick={() => {
              const tabBtn = document.getElementById('nav-tab-students');
              if (tabBtn) tabBtn.click();
            }}>Thông tin Học sinh</span> để thêm danh sách học sinh cho <strong>{className}</strong> trước.
          </p>
        </div>
      ) : (
        <>
          {/* ======================= PHÂN TỔ VIEW ======================= */}
          {subTab === 'groups' && (
            <div className="space-y-6">
              {/* Toolbar/Actions */}
              <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Tính năng chia tổ tự động</h3>
                  <p className="text-[11px] text-white/40">Hệ thống hỗ trợ xếp tổ tuần tự ngẫu nhiên hoặc cân bằng giới tính nam/nữ.</p>
                </div>
                {!isReadOnly && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => autoGroupSequentially(false)}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Shuffle size={13} />
                      <span>Chia đều Tổ (Ngẫu nhiên)</span>
                    </button>
                    <button
                      onClick={() => autoGroupSequentially(true)}
                      className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>Chia cân bằng Nam/Nữ</span>
                    </button>
                    <button
                      onClick={resetGroups}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>Đặt lại Tổ</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Group columns grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {(['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4', 'Chưa phân tổ'] as const).map(gName => {
                  const list = groups[gName];
                  const isUnassigned = gName === 'Chưa phân tổ';
                  
                  return (
                    <div 
                      key={gName} 
                      className={`flex flex-col rounded-3xl border p-4 shadow-sm h-[500px] ${
                        isUnassigned 
                          ? 'bg-white/[0.01] border-white/5' 
                          : 'bg-[#111] border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            gName === 'Tổ 1' ? 'bg-blue-400' :
                            gName === 'Tổ 2' ? 'bg-emerald-400' :
                            gName === 'Tổ 3' ? 'bg-purple-400' :
                            gName === 'Tổ 4' ? 'bg-amber-400' : 'bg-white/20'
                          }`} />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">{gName}</h4>
                        </div>
                        <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded-full text-white/60 font-semibold">
                          Sĩ số: {list.length}
                        </span>
                      </div>

                      {/* Dropdown list for changing groups easily on mobile/desktop */}
                      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                        {list.length === 0 ? (
                          <div className="text-center py-20 text-white/20 text-xs italic">
                            Trống
                          </div>
                        ) : (
                          list.map(student => (
                            <div 
                              key={student.id} 
                              className="p-2.5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-1.5 hover:bg-white/[0.04] transition"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-white text-[10px] tracking-tight leading-snug break-words">{student.name}</div>
                                  <div className="text-[9px] text-white/40 font-mono mt-0.5">{student.id} • {student.gender}</div>
                                </div>
                                
                                {student.avatarUrl ? (
                                  <img 
                                    src={getStudentAvatarUrl(student.avatarUrl)}
                                    alt={student.name} 
                                    className="w-7 h-7 rounded-full object-cover border border-white/10"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-white/30 shrink-0 font-bold uppercase">
                                    {student.name.split(' ').pop()?.slice(0, 2)}
                                  </div>
                                )}
                              </div>

                              {/* Transfer Group options */}
                              <div className="flex items-center gap-1 mt-1 pt-1.5 border-t border-white/5">
                                <span className="text-[9px] text-white/30 mr-1">Chuyển Tổ:</span>
                                <select
                                  disabled={isReadOnly}
                                  value={student.groupName || 'Chưa phân tổ'}
                                  onChange={(e) => handleAssignGroup(student.id, e.target.value === 'Chưa phân tổ' ? '' : e.target.value)}
                                  className="bg-[#181818] text-white text-[10px] border border-white/10 rounded-lg px-2 py-0.5 w-full focus:outline-none focus:border-amber-500 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="Chưa phân tổ">---</option>
                                  <option value="Tổ 1">Tổ 1</option>
                                  <option value="Tổ 2">Tổ 2</option>
                                  <option value="Tổ 3">Tổ 3</option>
                                  <option value="Tổ 4">Tổ 4</option>
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================= BAN CÁN SỰ LỚP VIEW ======================= */}
          {subTab === 'officers' && (
            <div className="space-y-6 animate-fadeIn">
              {/* Header/Title */}
              <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Ban Cán Sự Lớp & Chức Danh</h3>
                  <p className="text-[11px] text-white/40">Phân công Lớp trưởng, Lớp phó, Tổ trưởng và các chức danh tùy chọn cho học sinh.</p>
                </div>
              </div>

              {/* Grid of Key Officer Assignments */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Ban cán sự chủ chốt */}
                <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md space-y-4">
                  <div className="border-b border-white/5 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
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
                          <label className="text-[10px] font-semibold text-white/50 block">{role.label}</label>
                          <select
                            disabled={isReadOnly}
                            value={currentOfficer?.id || ''}
                            onChange={(e) => handleAssignRole(role.roleName, e.target.value)}
                            className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="" className="bg-[#111]">-- Chưa phân công --</option>
                            {classStudents.map(s => (
                              <option key={s.id} value={s.id} className="bg-[#111]">{s.name} ({s.id})</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ban cán sự Tổ */}
                <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md space-y-4">
                  <div className="border-b border-white/5 pb-2 mb-3">
                    <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
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
                          <label className="text-[10px] font-semibold text-white/50 block">
                            {role.label} <span className="text-white/30">({role.group})</span>
                          </label>
                          <select
                            disabled={isReadOnly}
                            value={currentOfficer?.id || ''}
                            onChange={(e) => handleAssignRole(role.roleName, e.target.value)}
                            className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 cursor-pointer"
                          >
                            <option value="" className="bg-[#111]">-- Chưa phân công --</option>
                            {groupStudents.map(s => (
                              <option key={s.id} value={s.id} className="bg-[#111]">{s.name} ({s.id})</option>
                            ))}
                          </select>
                          {groupStudents.length === 0 && (
                            <span className="text-[9px] text-rose-400 block">Chưa có học sinh trong {role.group}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom Title Assign List */}
              <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Danh sách chức danh chi tiết học sinh
                    </h4>
                    <p className="text-[10px] text-white/40">Gõ trực tiếp để thay đổi hoặc đặt chức danh tùy chỉnh cho từng học sinh.</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Tìm kiếm học sinh..."
                      value={officerSearchQuery}
                      onChange={(e) => setOfficerSearchQuery(e.target.value)}
                      className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Mã HS</th>
                        <th className="py-2.5 px-3">Họ và Tên</th>
                        <th className="py-2.5 px-3">Tổ</th>
                        <th className="py-2.5 px-3">Chức danh / Chức vụ hiện tại</th>
                        <th className="py-2.5 px-3 w-1/3">Cập nhật chức danh tùy chỉnh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.02]">
                      {classStudents
                        .filter(s => {
                          if (!officerSearchQuery.trim()) return true;
                          const q = officerSearchQuery.toLowerCase();
                          return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
                        })
                        .map(s => {
                          return (
                            <tr key={s.id} className="text-xs hover:bg-white/[0.01]">
                              <td className="py-3 px-3 font-mono text-white/40">{s.id}</td>
                              <td className="py-3 px-3 font-semibold text-white/80">{s.name}</td>
                              <td className="py-3 px-3">
                                {s.groupName ? (
                                  <span className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/60">
                                    {s.groupName}
                                  </span>
                                ) : (
                                  <span className="text-white/20 text-[10px]">Chưa phân tổ</span>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {s.role ? (
                                  <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[10px] font-bold">
                                    {s.role}
                                  </span>
                                ) : (
                                  <span className="text-white/20 text-[10px]">Học sinh</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  disabled={isReadOnly}
                                  placeholder="Nhập chức vụ khác..."
                                  value={customRoles[s.id] ?? ''}
                                  onChange={(e) => {
                                    setCustomRoles(prev => ({ ...prev, [s.id]: e.target.value }));
                                  }}
                                  onBlur={() => {
                                    const newRole = customRoles[s.id]?.trim();
                                    if ((newRole || undefined) !== s.role) {
                                      onUpdateStudent({ ...s, role: newRole || undefined });
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-1 text-xs focus:outline-none focus:border-amber-500"
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

          {/* ======================= SƠ ĐỒ LỚP VIEW ======================= */}
          {subTab === 'seating' && (
            <div className="space-y-6">
              {/* Top seating action controls */}
              <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Quản lý Sơ đồ lớp học (Bàn ghế)</h3>
                  <p className="text-[11px] text-white/40">Bấm vào từng ô ghế để chọn xếp học sinh hoặc đổi vị trí.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="text-xs text-white/40">Số hàng:</span>
                    <select
                      disabled={isReadOnly}
                      value={rows}
                      onChange={(e) => setRows(parseInt(e.target.value))}
                      className="bg-transparent text-white font-semibold text-xs border-none focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
                    >
                      {[3, 4, 5, 6, 7, 8].map(r => <option key={r} value={r} className="bg-[#111]">{r}</option>)}
                    </select>
                    <span className="text-white/10">|</span>
                    <span className="text-xs text-white/40">Số cột:</span>
                    <select
                      disabled={isReadOnly}
                      value={cols}
                      onChange={(e) => setCols(parseInt(e.target.value))}
                      className="bg-transparent text-white font-semibold text-xs border-none focus:outline-none focus:ring-0 cursor-pointer disabled:opacity-50"
                    >
                      {[4, 5, 6, 7, 8, 9, 10].map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                    </select>
                  </div>
                  
                  {!isReadOnly && (
                    <>
                      <button
                        onClick={autoArrangeSeats}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Shuffle size={13} />
                        <span>Sắp xếp Tự động</span>
                      </button>
                      <button
                        onClick={clearAllSeats}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Trash2 size={13} />
                        <span>Xóa Sơ đồ</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Seating Layout Map */}
              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
                
                {/* Visual Seat Map */}
                <div className="xl:col-span-3 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
                  
                  {/* BẢNG ĐEN (Blackboard header) */}
                  <div className="w-2/3 max-w-sm bg-slate-700 text-white-pure border-t-4 border-amber-500 py-3 rounded-b-xl text-center shadow-md mb-12 select-none">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">BẢNG ĐEN / BÀN GIÁO VIÊN</span>
                  </div>

                  {/* Seat grid */}
                  <div className="w-full overflow-auto custom-scrollbar flex justify-start lg:justify-center pb-2">
                    <div 
                      className="grid gap-3.5 p-1"
                      style={{
                        gridTemplateColumns: `repeat(${cols}, minmax(110px, 1fr))`
                      }}
                    >
                      {Array.from({ length: rows }).map((_, rIndex) => (
                        Array.from({ length: cols }).map((_, cIndex) => {
                          const student = getStudentAtSeat(rIndex, cIndex);
                          const isSelected = selectedSeat?.row === rIndex && selectedSeat?.col === cIndex;

                          return (
                            <div
                              key={`${rIndex}-${cIndex}`}
                              onClick={() => {
                                if (isReadOnly) return;
                                setSelectedSeat({ row: rIndex, col: cIndex });
                                setShowAssignModal(true);
                              }}
                              className={`aspect-square rounded-2xl p-2.5 border transition flex flex-col justify-between select-none relative group ${
                                isReadOnly ? 'cursor-default' : 'cursor-pointer'
                              } ${
                                isSelected
                                  ? 'bg-amber-100 border-amber-500 shadow-sm ring-2 ring-amber-400/20 text-amber-900'
                                  : student
                                    ? student.gender === 'Nữ'
                                      ? 'bg-rose-50 hover:bg-rose-100 border-rose-200 hover:border-rose-300 text-rose-900'
                                      : 'bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-900'
                                    : 'bg-slate-50/50 hover:bg-slate-100 border-slate-200 border-dashed hover:border-slate-300 text-slate-400'
                              }`}
                            >
                              {/* Row/Col coordinate badge */}
                              <div className="flex justify-between items-center">
                                <span className="text-[8px] font-mono text-slate-400">H{rIndex + 1}-C{cIndex + 1}</span>
                                {student?.groupName && (
                                  <span className={`text-[8px] px-1 py-0.5 rounded font-black uppercase ${
                                    student.groupName === 'Tổ 1' ? 'bg-blue-100 text-blue-700 border border-blue-200/40' :
                                    student.groupName === 'Tổ 2' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/40' :
                                    student.groupName === 'Tổ 3' ? 'bg-purple-100 text-purple-700 border border-purple-200/40' :
                                    'bg-amber-100 text-amber-700 border border-amber-200/40'
                                  }`}>
                                    {student.groupName.replace('Tổ ', 'T')}
                                  </span>
                                )}
                              </div>

                              {student ? (
                                <div className="flex flex-col items-center justify-center flex-1 text-center py-1 overflow-hidden">
                                  {student.avatarUrl ? (
                                    <img 
                                      src={getStudentAvatarUrl(student.avatarUrl)}
                                      alt={student.name} 
                                      className="w-8 h-8 rounded-full object-cover border border-slate-200 mb-1 shrink-0"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] mb-1 font-black shrink-0 uppercase ${
                                      student.gender === 'Nữ' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {student.name.split(' ').pop()?.slice(0, 2)}
                                    </div>
                                  )}
                                  <div className="text-[10px] font-black text-slate-800 truncate w-full" title={student.name}>
                                    {student.name.split(' ').pop()}
                                  </div>
                                  <div className="text-[8px] text-slate-400 font-bold font-mono mt-0.5 truncate w-full">
                                    {student.id}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 group-hover:text-slate-600 transition">
                                  <Plus size={14} className="mb-0.5" />
                                  <span className="text-[9px] font-black uppercase tracking-wider">Trống</span>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  </div>

                  {/* Color note explanation */}
                  <div className="flex flex-wrap gap-5 mt-6 border-t border-slate-100 pt-5 w-full justify-center text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-blue-50 border border-blue-200 rounded-md" />
                      <span className="text-slate-600">Học sinh Nam</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-rose-50 border border-rose-200 rounded-md" />
                      <span className="text-slate-600">Học sinh Nữ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 bg-slate-50 border border-slate-200 border-dashed rounded-md" />
                      <span className="text-slate-400">Ghế trống</span>
                    </div>
                  </div>
                </div>

                {/* Right Panel: Unseated Students List */}
                <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col h-[520px]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-1">Chưa xếp chỗ ngồi</h4>
                  <p className="text-[10px] text-white/40 mb-4">Danh sách ({unseatedStudents.length} học sinh)</p>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {unseatedStudents.length === 0 ? (
                      <div className="text-center py-24 text-white/20 text-xs italic">
                        Tất cả học sinh đã được xếp vị trí ghế ngồi!
                      </div>
                    ) : (
                      unseatedStudents.map(student => (
                        <div 
                          key={student.id}
                          className="p-2.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between hover:bg-white/[0.04] transition group"
                        >
                          <div className="truncate pr-2">
                            <div className="font-semibold text-white text-xs truncate">{student.name}</div>
                            <div className="text-[9px] text-white/40 font-mono mt-0.5">{student.id} • {student.gender}</div>
                          </div>
                          {!isReadOnly && (
                            <button
                              onClick={() => {
                                // Find first empty seat
                                let placed = false;
                                for (let r = 0; r < rows; r++) {
                                  for (let c = 0; c < cols; c++) {
                                    if (!getStudentAtSeat(r, c)) {
                                      onUpdateStudent({ ...student, seatRow: r, seatCol: c });
                                      placed = true;
                                      break;
                                    }
                                  }
                                  if (placed) break;
                                }
                                if (!placed) {
                                  alert('Không còn ghế trống trên sơ đồ! Bạn có thể tăng số hàng/cột.');
                                }
                              }}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/20 rounded-lg text-[9px] font-bold transition whitespace-nowrap"
                            >
                              Xếp ghế trống
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Dialog Modal popup */}
              {showAssignModal && selectedSeat && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-[#111] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <h4 className="text-sm font-bold text-white">Xếp chỗ ngồi cho vị trí Hàng {selectedSeat.row + 1}, Cột {selectedSeat.col + 1}</h4>
                      <button 
                        onClick={() => {
                          setShowAssignModal(false);
                          setSelectedSeat(null);
                        }}
                        className="text-white/40 hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                      {/* Option to clear current occupancy */}
                      {getStudentAtSeat(selectedSeat.row, selectedSeat.col) && (
                        <button
                          onClick={() => handleAssignStudent(undefined)}
                          className="w-full text-left p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <Trash2 size={13} />
                          <span>Mời học sinh rời khỏi ghế này (Trống)</span>
                        </button>
                      )}

                      <div className="text-[10px] uppercase font-bold tracking-wider text-white/30 pt-1">Học sinh chưa xếp ghế:</div>
                      {unseatedStudents.length === 0 ? (
                        <p className="text-xs text-white/30 italic py-2">Mọi học sinh trong lớp đều đã có ghế ngồi.</p>
                      ) : (
                        unseatedStudents.map(s => (
                          <button
                            key={s.id}
                            onClick={() => handleAssignStudent(s.id)}
                            className="w-full text-left p-3 bg-white/5 hover:bg-amber-600/10 border border-white/5 hover:border-amber-500/20 rounded-xl text-xs text-white transition flex items-center justify-between"
                          >
                            <span>{s.name} ({s.id})</span>
                            <span className="text-[10px] text-white/40 font-mono">{s.gender}</span>
                          </button>
                        ))
                      )}

                      {classStudents.filter(s => s.seatRow !== undefined).length > 0 && (
                        <>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-white/30 pt-3">Học sinh đã xếp ghế khác (Chuyển chỗ):</div>
                          {classStudents.filter(s => s.seatRow !== undefined && !(s.seatRow === selectedSeat.row && s.seatCol === selectedSeat.col)).map(s => (
                            <button
                              key={s.id}
                              onClick={() => handleAssignStudent(s.id)}
                              className="w-full text-left p-3 bg-white/[0.02] hover:bg-amber-600/10 border border-white/5 hover:border-amber-500/20 rounded-xl text-xs text-white/70 hover:text-white transition flex items-center justify-between"
                            >
                              <span>{s.name} ({s.id})</span>
                              <span className="text-[9px] text-white/40 font-mono">Đang ghế H{s.seatRow! + 1}-C{s.seatCol! + 1}</span>
                            </button>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="pt-2 text-right">
                      <button
                        onClick={() => {
                          setShowAssignModal(false);
                          setSelectedSeat(null);
                        }}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition border border-white/5"
                      >
                        Hủy bỏ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= THỜI KHÓA BIỂU VIEW ======================= */}
          {subTab === 'timetable' && (
            <div className="space-y-6">
              <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Thời khóa biểu chính thức của lớp</h3>
                  <p className="text-[11px] text-white/40">Bấm trực tiếp vào từng ô tiết học để cập nhật hoặc sửa môn học.</p>
                </div>
                {!isReadOnly && (
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => {
                        triggerConfirm(
                          'Tạo lại Thời khóa biểu',
                          'Bạn có chắc chắn muốn khôi phục thời khóa biểu về trạng thái ban đầu? Toàn bộ các môn tự nhập sẽ bị mất.',
                          () => {
                            generateEmptyTimetable();
                            saveTimetable([]);
                          },
                          { type: 'danger', confirmText: 'Thiết lập lại' }
                        );
                      }}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      <span>Xóa trắng & Tạo lại</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Timetable Grids for Morning & Afternoon */}
              <div className="space-y-6">
                
                {/* BUỔI SÁNG TABLE */}
                <div className="bg-[#0d0d0d] p-5 rounded-3xl border border-white/5 shadow-md overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Buổi Sáng (Từ Tiết 1 đến Tiết 5)</h4>
                  </div>

                  <table className="w-full text-xs text-left text-white/70 border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                        <th className="py-3 px-4 font-semibold w-16">Tiết</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="py-3 px-4 font-semibold text-center">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, pIndex) => {
                        const period = pIndex + 1;
                        return (
                          <tr key={`morning-p-${period}`} className="border-b border-white/5 hover:bg-white/[0.01] transition">
                            <td className="py-3.5 px-4 font-semibold text-amber-500 font-mono">Tiết {period}</td>
                            {daysOfWeek.map(day => {
                              const cell = timetable.find(c => c.day === day && c.period === period && c.session === 'Sáng');
                              const sub = cell?.subject || '';
                              return (
                                <td 
                                  key={day} 
                                  onClick={() => {
                                    if (isReadOnly) return;
                                    handleCellClick(day, period, 'Sáng');
                                  }}
                                  className={`py-3.5 px-2 text-center transition relative group ${
                                    isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                  }`}
                                >
                                  <div className={`mx-auto max-w-[120px] px-2 py-1.5 rounded-lg border ${
                                    sub
                                      ? sub === 'Chào cờ' || sub === 'Sinh hoạt lớp'
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-bold'
                                        : 'bg-white/5 border-white/10 text-white font-medium hover:border-amber-500/40'
                                      : 'bg-transparent border-dashed border-white/5 text-white/20 hover:border-white/20'
                                  }`}>
                                    {sub || <span className="text-[10px] opacity-20 group-hover:opacity-100 transition">Trống</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* BUỔI CHIỀU TABLE */}
                <div className="bg-[#0d0d0d] p-5 rounded-3xl border border-white/5 shadow-md overflow-x-auto custom-scrollbar">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-white">Buổi Chiều (Từ Tiết 1 đến Tiết 5)</h4>
                  </div>

                  <table className="w-full text-xs text-left text-white/70 border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                        <th className="py-3 px-4 font-semibold w-16">Tiết</th>
                        {daysOfWeek.map(day => (
                          <th key={day} className="py-3 px-4 font-semibold text-center">{day}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 5 }).map((_, pIndex) => {
                        const period = pIndex + 1;
                        return (
                          <tr key={`afternoon-p-${period}`} className="border-b border-white/5 hover:bg-white/[0.01] transition">
                            <td className="py-3.5 px-4 font-semibold text-blue-400 font-mono">Tiết {period}</td>
                            {daysOfWeek.map(day => {
                              const cell = timetable.find(c => c.day === day && c.period === period && c.session === 'Chiều');
                              const sub = cell?.subject || '';
                              return (
                                <td 
                                  key={day} 
                                  onClick={() => {
                                    if (isReadOnly) return;
                                    handleCellClick(day, period, 'Chiều');
                                  }}
                                  className={`py-3.5 px-2 text-center transition relative group ${
                                    isReadOnly ? 'cursor-default' : 'cursor-pointer'
                                  }`}
                                >
                                  <div className={`mx-auto max-w-[120px] px-2 py-1.5 rounded-lg border ${
                                    sub
                                      ? 'bg-blue-950/20 border-blue-500/20 text-blue-300 font-medium hover:border-amber-500/40'
                                      : 'bg-transparent border-dashed border-white/5 text-white/20 hover:border-white/20'
                                  }`}>
                                    {sub || <span className="text-[10px] opacity-20 group-hover:opacity-100 transition">Trống</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Cell Editing Popup Dialog */}
              {editingCell && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                  <div className="bg-[#111] border border-white/10 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <div>
                        <h4 className="text-sm font-bold text-white">Sửa tiết học ({editingCell.session})</h4>
                        <p className="text-[10px] text-white/40 mt-0.5">{editingCell.day} • Tiết {editingCell.period}</p>
                      </div>
                      <button 
                        onClick={() => setEditingCell(null)}
                        className="text-white/40 hover:text-white"
                      >
                        ×
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Direct input */}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Tên môn học</label>
                        <input
                          type="text"
                          value={tempSubject}
                          onChange={(e) => setTempSubject(e.target.value)}
                          placeholder="Ví dụ: Toán, Ngữ văn, Vật lý..."
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveCellSubject(tempSubject);
                          }}
                        />
                      </div>

                      {/* Common subjects suggestions */}
                      <div>
                        <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-2 block">Môn học gợi ý</label>
                        <div className="grid grid-cols-3 gap-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                          {commonSubjects.map(subj => (
                            <button
                              key={subj}
                              onClick={() => {
                                setTempSubject(subj);
                                saveCellSubject(subj);
                              }}
                              className="px-2 py-1.5 bg-white/5 hover:bg-amber-600/10 hover:text-amber-400 border border-transparent hover:border-amber-500/20 rounded-lg text-[10px] text-white/70 transition truncate text-left"
                            >
                              {subj}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              setTempSubject('');
                              saveCellSubject('');
                            }}
                            className="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-transparent rounded-lg text-[10px] transition text-center col-span-3 font-semibold mt-1"
                          >
                            Xóa môn học này
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        onClick={() => setEditingCell(null)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition border border-white/5"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        onClick={() => saveCellSubject(tempSubject)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold transition shadow-md"
                      >
                        Lưu lại
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================= DẶN DÒ & HỌC TẬP VIEW ======================= */}
          {subTab === 'reminders' && (() => {
            const subjectsList = ['Toán', 'Lý', 'Hóa', 'Văn', 'Anh', 'Sử', 'Địa', 'Tin'];
            const formatDateLabel = (dateStr: string) => {
              if (!dateStr) return '';
              const parts = dateStr.split('-');
              if (parts.length !== 3) return dateStr;
              const y = parts[0];
              const m = parseInt(parts[1], 10);
              const d = parseInt(parts[2], 10);
              
              // Get day name
              const dateObj = new Date(dateStr);
              const dayIndex = dateObj.getDay();
              const VietnameseDays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
              const dayName = VietnameseDays[dayIndex];
              return `${dayName}, ngày ${d}/${m}/${y}`;
            };

            const handleIncrement = (studentId: string, subject: string) => {
              if (isReadOnly) return;
              const key = `${studentId}_${subject}`;
              const currentVal = participationData[key] || 0;
              const updated = {
                ...participationData,
                [key]: currentVal + 1
              };
              setParticipationData(updated);
              const storageKey = `app_participation_${activeClassId}_${selectedDate}`;
              localStorage.setItem(storageKey, JSON.stringify(updated));

              // Also save to Firestore!
              setDoc(doc(db, 'participations', `${activeClassId}_${selectedDate}`), {
                classId: activeClassId,
                date: selectedDate,
                data: updated
              }).catch(e => console.error('Lỗi khi lưu phát biểu lên Firestore:', e));
            };

            const handleDecrement = (studentId: string, subject: string) => {
              if (isReadOnly) return;
              const key = `${studentId}_${subject}`;
              const currentVal = participationData[key] || 0;
              if (currentVal === 0) return;
              const updated = {
                ...participationData,
                [key]: currentVal - 1
              };
              setParticipationData(updated);
              const storageKey = `app_participation_${activeClassId}_${selectedDate}`;
              localStorage.setItem(storageKey, JSON.stringify(updated));

              // Also save to Firestore!
              setDoc(doc(db, 'participations', `${activeClassId}_${selectedDate}`), {
                classId: activeClassId,
                date: selectedDate,
                data: updated
              }).catch(e => console.error('Lỗi khi lưu phát biểu lên Firestore:', e));
            };

            const handleSaveReminder = () => {
              if (isReadOnly) return;
              const reminderKey = `app_reminders_${activeClassId}_${selectedDate}`;
              localStorage.setItem(reminderKey, reminderText);

              // Also save to Firestore!
              setDoc(doc(db, 'reminders', `${activeClassId}_${selectedDate}`), {
                classId: activeClassId,
                date: selectedDate,
                text: reminderText
              }).then(() => {
                triggerConfirm(
                  'Thành công',
                  'Đã lưu thành công nội dung dặn dò học tập cho ngày được chọn!',
                  () => {},
                  { confirmText: 'Đóng', type: 'info' }
                );
              }).catch(e => console.error('Lỗi khi lưu dặn dò lên Firestore:', e));
            };

            const handleDeleteReminder = () => {
              if (isReadOnly) return;
              triggerConfirm(
                'Xác nhận xóa dặn dò',
                'Bạn có chắc chắn muốn xóa toàn bộ nội dung dặn dò của ngày này?',
                () => {
                  const reminderKey = `app_reminders_${activeClassId}_${selectedDate}`;
                  localStorage.removeItem(reminderKey);
                  setReminderText('');

                  // Also delete from Firestore!
                  deleteDoc(doc(db, 'reminders', `${activeClassId}_${selectedDate}`)).catch(e => console.error('Lỗi khi xóa dặn dò trên Firestore:', e));
                },
                { confirmText: 'Xóa ngay', type: 'danger' }
              );
            };

            return (
              <div className="space-y-6 animate-fadeIn text-white">
                {/* Header Selector card */}
                <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <Clock size={16} className="text-amber-500" />
                      <span>Quản lý Dặn dò & Số lần Phát biểu</span>
                    </h3>
                    <p className="text-[11px] text-white/40">Cập nhật dặn dò hàng ngày và số lần học sinh xây dựng bài để hiển thị trên cổng công khai.</p>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-[#181818] px-4 py-2 rounded-2xl border border-white/10 shadow-inner">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">Chọn ngày:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      disabled={isReadOnly}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-white outline-none border-none cursor-pointer focus:ring-0"
                    />
                  </div>
                </div>

                <div className="flex border-b border-white/5 gap-1 select-none">
                  <button
                    onClick={() => setRemindersSubTab('reminders')}
                    className={`px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition relative cursor-pointer ${
                      remindersSubTab === 'reminders'
                        ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                        : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.01]'
                    }`}
                  >
                    <MessageSquare size={14} />
                    <span>1. Nhập dặn dò học tập</span>
                  </button>
                  <button
                    onClick={() => setRemindersSubTab('participation')}
                    className={`px-5 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition relative cursor-pointer ${
                      remindersSubTab === 'participation'
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-50/5'
                        : 'border-transparent text-white/40 hover:text-white/60 hover:bg-white/[0.01]'
                    }`}
                  >
                    <TrendingUp size={14} />
                    <span>2. Số lần phát biểu</span>
                  </button>
                </div>

                {/* Sub-tab 1: Edit Reminders */}
                {remindersSubTab === 'reminders' && (
                  <div className="bg-[#111] p-6 rounded-3xl border border-white/5 shadow-md flex flex-col gap-4 max-w-4xl mx-auto w-full">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-amber-500" />
                        <span>Dặn dò hàng ngày</span>
                      </h4>
                      <span className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full uppercase tracking-wider">
                        {formatDateLabel(selectedDate)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      <textarea
                        value={reminderText}
                        disabled={isReadOnly}
                        onChange={(e) => setReminderText(e.target.value)}
                        placeholder="Nhập dặn dò học tập, ví dụ: Thứ 2 học Toán: làm bài tập 1, 2 trang 15 SGK..."
                        rows={12}
                        className="w-full text-sm font-semibold text-white/80 bg-[#151515] border border-white/10 rounded-2xl p-5 focus:outline-none focus:border-amber-500 custom-scrollbar leading-relaxed resize-none min-h-[300px]"
                      />
                      
                      {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-2">
                          <button
                            onClick={handleDeleteReminder}
                            className="px-5 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={14} />
                            <span>Xóa dặn dò</span>
                          </button>
                          <button
                            onClick={handleSaveReminder}
                            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Save size={14} />
                            <span>Lưu dặn dò</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Edit Participation */}
                {remindersSubTab === 'participation' && (
                  <div className="bg-[#111] p-6 rounded-3xl border border-white/5 shadow-md flex flex-col gap-4 w-full">
                    <div className="pb-3 border-b border-white/5 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                          <TrendingUp size={14} className="text-emerald-400" />
                          <span>Số lần phát biểu xây dựng bài</span>
                        </h4>
                        <p className="text-[10px] text-white/40 mt-1">Cột "STT" và "Họ và Tên" được cố định. Trượt ngang để nhập liệu cho các môn học.</p>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full font-bold">
                        {classStudents.length} Học sinh • {formatDateLabel(selectedDate)}
                      </span>
                    </div>

                    {/* Horizontal scrollable wrapper with sticky columns support */}
                    <div className="overflow-x-auto rounded-2xl border border-white/10 shadow-inner custom-scrollbar relative">
                      <table className="w-full text-xs text-left text-white/80 border-collapse min-w-[950px]">
                        <thead>
                          <tr className="border-b border-white/10 text-[9px] uppercase tracking-wider text-white/40 bg-[#161616] select-none">
                            <th className="py-4 px-4 font-black w-12 text-center sticky left-0 bg-[#161616] z-30 border-r border-white/10">STT</th>
                            <th className="py-4 px-4 font-black w-48 sticky left-12 bg-[#161616] z-30 border-r border-white/10 shadow-[2px_0_4px_rgba(0,0,0,0.5)]">Họ và Tên</th>
                            {subjectsList.map(sub => (
                              <th key={sub} className="py-4 px-2 font-black text-center w-24">{sub}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {classStudents.map((student, sIdx) => (
                            <tr key={student.id} className="group hover:bg-white/[0.02] transition">
                              <td className="py-3.5 px-4 text-white/30 text-center font-mono sticky left-0 bg-[#111] group-hover:bg-[#1a1a1a] z-20 border-r border-white/10 transition-colors">
                                {sIdx + 1}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-white sticky left-12 bg-[#111] group-hover:bg-[#1a1a1a] z-20 border-r border-white/10 shadow-[2px_0_4px_rgba(0,0,0,0.5)] transition-colors truncate max-w-[192px] w-48">
                                {student.name}
                              </td>
                              {subjectsList.map(sub => {
                                const key = `${student.id}_${sub}`;
                                const count = participationData[key] || 0;
                                return (
                                  <td key={sub} className="py-2 px-1 text-center">
                                    <div className="flex items-center justify-center gap-1.5 mx-auto">
                                      <button
                                        disabled={isReadOnly}
                                        onClick={() => handleDecrement(student.id, sub)}
                                        className="w-5 h-5 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs font-black transition disabled:opacity-50 select-none cursor-pointer border border-white/5"
                                      >
                                        -
                                      </button>
                                      <span className={`w-6 font-mono text-center text-[11px] font-bold ${
                                        count > 0 
                                          ? count >= 3 
                                            ? 'text-emerald-400 font-extrabold' 
                                            : 'text-amber-400' 
                                          : 'text-white/20'
                                      }`}>
                                        {count}
                                      </span>
                                      <button
                                        disabled={isReadOnly}
                                        onClick={() => handleIncrement(student.id, sub)}
                                        className="w-5 h-5 flex items-center justify-center rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-black transition disabled:opacity-50 select-none cursor-pointer border border-amber-500/10"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                      <Info size={13} className="text-amber-500 shrink-0" />
                      <p className="text-[10px] text-white/40 leading-normal font-medium">
                        Sử dụng các nút <span className="font-bold text-amber-400 bg-white/5 px-1 py-0.5 rounded">-</span> và <span className="font-bold text-amber-400 bg-white/5 px-1 py-0.5 rounded">+</span> để thay đổi điểm số phát biểu cho từng học sinh theo ngày học đã chọn.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======================= PHÂN CÔNG TRỰC NHẬT VIEW ======================= */}
          {subTab === 'duty' && (() => {
            const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const weeksList = generateWeeks(weekConfig.startDate, weekConfig.totalWeeks);

            const handleUpdateDutyField = (day: string, field: 'sweeping' | 'cleaningBoard' | 'trash', value: string) => {
              if (isReadOnly) return;
              const currentDayData = dutySchedule[day] || { group: 'Tổ 1', sweeping: '', cleaningBoard: '', trash: '' };
              const updated = {
                ...dutySchedule,
                [day]: {
                  ...currentDayData,
                  [field]: value
                }
              };
              setDutySchedule(updated);
            };

            const handleUpdateDutyGroup = (day: string, groupName: string) => {
              if (isReadOnly) return;
              const currentDayData = dutySchedule[day] || { group: 'Tổ 1', sweeping: '', cleaningBoard: '', trash: '' };
              const updated = {
                ...dutySchedule,
                [day]: {
                  ...currentDayData,
                  group: groupName
                }
              };
              setDutySchedule(updated);
            };

            const handleAutoAssignDay = (day: string, groupName: string) => {
              if (isReadOnly) return;
              const groupStudents = classStudents.filter(s => s.groupName === groupName);
              
              let sweeping = 'Chưa phân công';
              let cleaningBoard = 'Chưa phân công';
              let trash = 'Chưa phân công';

              if (groupStudents.length > 0) {
                const len = groupStudents.length;
                sweeping = groupStudents[0]?.name;
                if (len > 1) {
                  sweeping += `, ${groupStudents[1]?.name}`;
                }
                cleaningBoard = groupStudents[2 % len]?.name || groupStudents[0]?.name || 'Học sinh tổ';
                trash = groupStudents[3 % len]?.name || groupStudents[1 % len]?.name || 'Học sinh tổ';
              }

              const updated = {
                ...dutySchedule,
                [day]: {
                  group: groupName,
                  sweeping,
                  cleaningBoard,
                  trash
                }
              };
              setDutySchedule(updated);
            };

            const handleAutoAssignAll = () => {
              if (isReadOnly) return;
              triggerConfirm(
                'Tự động phân công tất cả các thứ',
                `Hệ thống sẽ tự động luân phiên các tổ từ Thứ 2 đến Thứ 7 và phân bổ ngẫu nhiên học sinh trong tổ làm nhiệm vụ trực nhật cho Tuần ${selectedDutyWeek}. Bạn có chắc chắn muốn thực hiện?`,
                () => {
                  const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
                  const updated: Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }> = {};

                  days.forEach((day, idx) => {
                    // rotation offset based on week number
                    const groupNum = ((idx + selectedDutyWeek) % 4) + 1;
                    const groupName = `Tổ ${groupNum}`;
                    const groupStudents = classStudents.filter(s => s.groupName === groupName);
                    
                    let sweeping = 'Chưa phân công';
                    let cleaningBoard = 'Chưa phân công';
                    let trash = 'Chưa phân công';

                    if (groupStudents.length > 0) {
                      const len = groupStudents.length;
                      sweeping = groupStudents[0]?.name;
                      if (len > 1) {
                        sweeping += `, ${groupStudents[1]?.name}`;
                      }
                      cleaningBoard = groupStudents[2 % len]?.name || groupStudents[0]?.name || 'Học sinh tổ';
                      trash = groupStudents[3 % len]?.name || groupStudents[1 % len]?.name || 'Học sinh tổ';
                    }

                    updated[day] = {
                      group: groupName,
                      sweeping,
                      cleaningBoard,
                      trash
                    };
                  });

                  setDutySchedule(updated);
                  const key = `app_duty_${activeClassId}_week_${selectedDutyWeek}`;
                  localStorage.setItem(key, JSON.stringify(updated));

                  // Also save to Firestore!
                  setDoc(doc(db, 'duties', `${activeClassId}_week_${selectedDutyWeek}`), {
                    classId: activeClassId,
                    weekNumber: selectedDutyWeek,
                    schedule: updated
                  }).catch(e => console.error('Lỗi khi lưu trực nhật lên Firestore:', e));
                },
                { confirmText: 'Áp dụng', type: 'info' }
              );
            };

            const handleSaveAll = () => {
              if (isReadOnly) return;
              const key = `app_duty_${activeClassId}_week_${selectedDutyWeek}`;
              localStorage.setItem(key, JSON.stringify(dutySchedule));

              // Also save to Firestore!
              setDoc(doc(db, 'duties', `${activeClassId}_week_${selectedDutyWeek}`), {
                classId: activeClassId,
                weekNumber: selectedDutyWeek,
                schedule: dutySchedule
              }).then(() => {
                triggerConfirm(
                  'Thành công',
                  `Đã lưu bảng phân công trực nhật Tuần ${selectedDutyWeek} lớp học thành công!`,
                  () => {},
                  { confirmText: 'Đóng', type: 'info' }
                );
              }).catch(e => console.error('Lỗi khi lưu trực nhật lên Firestore:', e));
            };

            const appendStudentToField = (day: string, field: 'sweeping' | 'cleaningBoard' | 'trash', studentName: string) => {
              if (isReadOnly) return;
              const currentDayData = dutySchedule[day] || { group: 'Tổ 1', sweeping: '', cleaningBoard: '', trash: '' };
              const currentVal = currentDayData[field] || '';
              
              let newVal = '';
              if (!currentVal || currentVal === 'Chưa phân công') {
                newVal = studentName;
              } else {
                const arr = currentVal.split(',').map(s => s.trim()).filter(Boolean);
                if (arr.includes(studentName)) {
                  // toggle off
                  const filtered = arr.filter(s => s !== studentName);
                  newVal = filtered.join(', ');
                  if (!newVal) newVal = 'Chưa phân công';
                } else {
                  // add
                  const filtered = arr.filter(s => s !== 'Chưa phân công');
                  filtered.push(studentName);
                  newVal = filtered.join(', ');
                }
              }

              const updated = {
                ...dutySchedule,
                [day]: {
                  ...currentDayData,
                  [field]: newVal
                }
              };
              setDutySchedule(updated);
            };

            // Write duties as official StudentTasks
            const syncDutyToTasks = () => {
              if (isReadOnly) return;
              if (!onAddTask || !onDeleteTask) return;

              triggerConfirm(
                'Đồng bộ sang bảng phân nhiệm vụ',
                `Hệ thống sẽ chuyển đổi toàn bộ lịch trực nhật Tuần ${selectedDutyWeek} thành các nhiệm vụ cá nhân chi tiết trong bảng nhiệm vụ học sinh. Lịch cũ (nếu có) của tuần này sẽ được ghi đè. Bạn có chắc chắn muốn thực hiện?`,
                () => {
                  const weekObj = weeksList.find(w => w.weekNumber === selectedDutyWeek);
                  if (!weekObj) return;

                  // Identify and delete existing tasks for this week and class that are duty-related
                  const dutyTasksToDelete = tasks.filter(t => 
                    t.classId === activeClassId && 
                    t.deadline >= weekObj.startDate && 
                    t.deadline <= weekObj.endDate && 
                    (t.taskTitle.startsWith('[Trực nhật]') || t.taskTitle.includes('Trực nhật Tuần'))
                  );

                  dutyTasksToDelete.forEach(t => {
                    onDeleteTask(t.id);
                  });

                  const getDayDate = (dayName: string, weekStartDateStr: string) => {
                    const date = new Date(weekStartDateStr);
                    const daysMap: Record<string, number> = {
                      'Thứ 2': 0,
                      'Thứ 3': 1,
                      'Thứ 4': 2,
                      'Thứ 5': 3,
                      'Thứ 6': 4,
                      'Thứ 7': 5,
                    };
                    const offset = daysMap[dayName] || 0;
                    const targetDate = new Date(date.getTime() + offset * 24 * 60 * 60 * 1000);
                    return targetDate.toISOString().split('T')[0]; // YYYY-MM-DD
                  };

                  const fieldsConfig = [
                    { key: 'sweeping' as const, label: 'Quét lớp & Lau sàn' },
                    { key: 'cleaningBoard' as const, label: 'Lau bảng & Bàn giáo viên' },
                    { key: 'trash' as const, label: 'Đổ rác & Vệ sinh' }
                  ];

                  let createdCount = 0;

                  daysOfWeek.forEach(dayName => {
                    const dayData = dutySchedule[dayName];
                    if (!dayData) return;

                    const deadlineDate = getDayDate(dayName, weekObj.startDate);

                    // Group daily duties by student to avoid creating duplicate task cards for a student on the same day
                    const studentDutiesMap: Record<string, { student: typeof classStudents[0], labels: string[], descriptions: string[] }> = {};

                    fieldsConfig.forEach(cfg => {
                      const assignedText = dayData[cfg.key] || '';
                      if (!assignedText || assignedText === 'Chưa phân công') return;

                      const names = assignedText.split(',').map(n => n.trim()).filter(Boolean);

                      names.forEach(name => {
                        const matchedStudent = classStudents.find(s => s.name.toLowerCase() === name.toLowerCase());
                        if (!matchedStudent) return;

                        if (!studentDutiesMap[matchedStudent.id]) {
                          studentDutiesMap[matchedStudent.id] = {
                            student: matchedStudent,
                            labels: [],
                            descriptions: []
                          };
                        }
                        studentDutiesMap[matchedStudent.id].labels.push(cfg.label);
                        studentDutiesMap[matchedStudent.id].descriptions.push(cfg.label);
                      });
                    });

                    // Create exactly ONE unified duty task card per student for this day
                    Object.values(studentDutiesMap).forEach(({ student, labels, descriptions }) => {
                      const taskTitle = `[Trực nhật] ${labels.join(', ')} - ${dayName}`;
                      const description = `Nhiệm vụ trực nhật Tuần ${selectedDutyWeek} (${weekObj.formattedStartDate} - ${weekObj.formattedEndDate}): ${descriptions.join(', ')} - ngày ${dayName}.`;

                      const newTask: StudentTask = {
                        id: `TSK-DUTY-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                        studentId: student.id,
                        studentName: student.name,
                        classId: activeClassId,
                        className: className,
                        schoolYear: localStorage.getItem('activeSchoolYear') || '2025-2026',
                        taskTitle: taskTitle,
                        description: description,
                        deadline: deadlineDate,
                        status: 'Chưa bắt đầu',
                        feedback: ''
                      };

                      onAddTask(newTask);
                      createdCount++;
                    });
                  });

                  // Also save the duty schedule locally
                  const key = `app_duty_${activeClassId}_week_${selectedDutyWeek}`;
                  localStorage.setItem(key, JSON.stringify(dutySchedule));

                  // Also save to Firestore!
                  setDoc(doc(db, 'duties', `${activeClassId}_week_${selectedDutyWeek}`), {
                    classId: activeClassId,
                    weekNumber: selectedDutyWeek,
                    schedule: dutySchedule
                  }).catch(e => console.error('Lỗi khi lưu trực nhật lên Firestore:', e));

                  triggerConfirm(
                    'Đồng bộ hoàn tất',
                    `Đã lưu bảng trực nhật và tự động tạo thành công ${createdCount} nhiệm vụ trực nhật cá nhân tương ứng trong bảng phân nhiệm vụ học sinh!`,
                    () => {},
                    { confirmText: 'Tuyệt vời', type: 'info' }
                  );
                },
                { confirmText: 'Đồng bộ ngay', type: 'info' }
              );
            };

            const handleSelectStudentFromList = (studentName: string) => {
              if (isReadOnly || !activeDutyInput) return;
              const { day, field } = activeDutyInput;
              appendStudentToField(day, field, studentName);
            };

            const isAssignedInActiveField = (studentName: string) => {
              if (!activeDutyInput) return false;
              const { day, field } = activeDutyInput;
              const dayData = dutySchedule[day];
              if (!dayData) return false;
              const currentVal = dayData[field] || '';
              return currentVal.split(',').map(s => s.trim()).includes(studentName);
            };

            const getFieldNameLabel = (field: 'sweeping' | 'cleaningBoard' | 'trash') => {
              if (field === 'sweeping') return 'Quét lớp & Lau sàn';
              if (field === 'cleaningBoard') return 'Lau bảng & Bàn GV';
              return 'Đổ rác & Vệ sinh';
            };

            const currentGroupStudents = classStudents.filter(s => s.groupName === selectedDutyGroup);

            return (
              <div className="space-y-6 animate-fadeIn text-white">
                {/* Header Action Toolbar */}
                <div className="bg-[#111] p-5 rounded-3xl border border-white/5 shadow-md flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ClipboardList size={16} className="text-amber-500" />
                      <span>Quản lý Phân công Trực nhật Học đường</span>
                    </h3>
                    <p className="text-[11px] text-white/40">
                      Chọn tuần học để bắt đầu phân công. Nhấp trực tiếp vào ô nhập nhiệm vụ của ngày bất kỳ và chọn nhanh học sinh trong tổ được hiển thị phía dưới mỗi ngày.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 self-start xl:self-auto">
                    {/* Selector 1: Tuần */}
                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-2xl border border-white/5">
                      <Calendar size={13} className="text-amber-500" />
                      <select
                        value={selectedDutyWeek}
                        onChange={(e) => {
                          setSelectedDutyWeek(parseInt(e.target.value, 10));
                          setActiveDutyInput(null);
                        }}
                        className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer outline-none min-w-[140px]"
                      >
                        {weeksList.map((w) => (
                          <option key={w.weekNumber} value={w.weekNumber} className="bg-[#111] text-white">
                            Tuần {w.weekNumber} ({w.formattedStartDate} - {w.formattedEndDate})
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isReadOnly && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleAutoAssignAll}
                          title="Tự động chia đều việc cho tổ trực xoay vòng"
                          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white border border-violet-500/30 rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles size={13} className="text-white" />
                          <span>Tự động phân</span>
                        </button>
                        <button
                          onClick={handleSaveAll}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/30 rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Save size={13} className="text-white" />
                          <span>Lưu bảng trực</span>
                        </button>
                        <button
                          onClick={syncDutyToTasks}
                          title="Ghi lịch trực nhật tuần này trực tiếp vào bảng nhiệm vụ học sinh để chấm điểm và theo dõi tiến độ"
                          className="px-4.5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 border border-amber-400/30 rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check size={13} className="text-slate-950" />
                          <span>Ghi vào bảng phân nhiệm vụ</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Main Interaction Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {daysOfWeek.map((day) => {
                        const data = dutySchedule[day] || { group: 'Tổ 1', sweeping: 'Chưa phân công', cleaningBoard: 'Chưa phân công', trash: 'Chưa phân công' };
                        const dayGroupStudents = classStudents.filter(s => s.groupName === data.group);

                        return (
                          <div 
                            key={day} 
                            className={`bg-[#111] border rounded-3xl p-5 hover:border-white/10 transition-all space-y-4 flex flex-col justify-between ${
                              activeDutyInput?.day === day 
                                ? 'border-amber-500/30 bg-amber-500/[0.01]' 
                                : 'border-white/5'
                            }`}
                          >
                            <div className="space-y-4">
                              {/* Day Card Header */}
                              <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
                                <span className={`text-xs font-black uppercase tracking-wider ${activeDutyInput?.day === day ? 'text-amber-400' : 'text-white'}`}>
                                  {day}
                                </span>
                                <div className="flex items-center gap-2 relative">
                                  <span className="text-[9px] font-bold text-white/40 uppercase">Tổ trực nhật chính:</span>
                                  <div className="relative">
                                    <button
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() => setActiveDayGroupDropdown(activeDayGroupDropdown === day ? null : day)}
                                      className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 hover:border-amber-500 rounded-lg text-xs font-bold text-white transition duration-200 cursor-pointer select-none"
                                    >
                                      <span>{data.group}</span>
                                      <ChevronDown size={11} className={`text-white/60 transition-transform duration-200 ${activeDayGroupDropdown === day ? 'rotate-180' : ''}`} />
                                    </button>

                                    {activeDayGroupDropdown === day && (
                                      <>
                                        {/* Backdrop */}
                                        <div 
                                          className="fixed inset-0 z-40" 
                                          onClick={() => setActiveDayGroupDropdown(null)}
                                        />
                                        <div className="absolute right-0 mt-1 bg-[#161616] border border-white/10 rounded-lg shadow-2xl z-50 py-1 min-w-[95px] overflow-hidden animate-fadeIn">
                                          {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((g) => (
                                            <button
                                              key={g}
                                              type="button"
                                              onClick={() => {
                                                handleUpdateDutyGroup(day, g);
                                                setActiveDayGroupDropdown(null);
                                              }}
                                              className={`w-full text-left px-3 py-1.5 text-[11px] font-bold transition flex items-center justify-between cursor-pointer ${
                                                data.group === g
                                                  ? 'bg-amber-500/10 text-amber-400 font-extrabold'
                                                  : 'text-white/80 hover:bg-white/5 hover:text-white'
                                              }`}
                                            >
                                              <span>{g}</span>
                                              {data.group === g && <Check size={10} className="text-amber-400" />}
                                            </button>
                                          ))}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Task fields with editable text boxes that support quick assignment on click */}
                              <div className="space-y-3">
                                {/* Field 1: Sweeping */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] text-white/40 font-extrabold uppercase tracking-wide">
                                    <span>Quét lớp & Lau sàn</span>
                                    {activeDutyInput?.day === day && activeDutyInput?.field === 'sweeping' && (
                                      <span className="text-amber-400 animate-pulse text-[8px]">● Đang soạn thảo</span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={data.sweeping}
                                    disabled={isReadOnly}
                                    onFocus={() => setActiveDutyInput({ day, field: 'sweeping' })}
                                    onChange={(e) => handleUpdateDutyField(day, 'sweeping', e.target.value)}
                                    className={`w-full bg-[#151515] border rounded-xl px-3 py-2 font-bold text-white text-xs focus:outline-none transition ${
                                      activeDutyInput?.day === day && activeDutyInput?.field === 'sweeping'
                                        ? 'border-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                        : 'border-white/10 hover:border-white/15'
                                    }`}
                                    placeholder="Nhấp vào đây và chọn học sinh..."
                                  />
                                </div>

                                {/* Field 2: Cleaning Board */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] text-white/40 font-extrabold uppercase tracking-wide">
                                    <span>Lau bảng & Bàn giáo viên</span>
                                    {activeDutyInput?.day === day && activeDutyInput?.field === 'cleaningBoard' && (
                                      <span className="text-amber-400 animate-pulse text-[8px]">● Đang soạn thảo</span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={data.cleaningBoard}
                                    disabled={isReadOnly}
                                    onFocus={() => setActiveDutyInput({ day, field: 'cleaningBoard' })}
                                    onChange={(e) => handleUpdateDutyField(day, 'cleaningBoard', e.target.value)}
                                    className={`w-full bg-[#151515] border rounded-xl px-3 py-2 font-bold text-white text-xs focus:outline-none transition ${
                                      activeDutyInput?.day === day && activeDutyInput?.field === 'cleaningBoard'
                                        ? 'border-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                        : 'border-white/10 hover:border-white/15'
                                    }`}
                                    placeholder="Nhấp vào đây và chọn học sinh..."
                                  />
                                </div>

                                {/* Field 3: Trash */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center text-[9px] text-white/40 font-extrabold uppercase tracking-wide">
                                    <span>Đổ rác & Vệ sinh</span>
                                    {activeDutyInput?.day === day && activeDutyInput?.field === 'trash' && (
                                      <span className="text-amber-400 animate-pulse text-[8px]">● Đang soạn thảo</span>
                                    )}
                                  </div>
                                  <input
                                    type="text"
                                    value={data.trash}
                                    disabled={isReadOnly}
                                    onFocus={() => setActiveDutyInput({ day, field: 'trash' })}
                                    onChange={(e) => handleUpdateDutyField(day, 'trash', e.target.value)}
                                    className={`w-full bg-[#151515] border rounded-xl px-3 py-2 font-bold text-white text-xs focus:outline-none transition ${
                                      activeDutyInput?.day === day && activeDutyInput?.field === 'trash'
                                        ? 'border-amber-500 ring-1 ring-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                                        : 'border-white/10 hover:border-white/15'
                                    }`}
                                    placeholder="Nhấp vào đây và chọn học sinh..."
                                  />
                                </div>
                              </div>

                              {/* Quick click pills for current day's assigned group */}
                              {!isReadOnly && dayGroupStudents.length > 0 && (
                                <div className="pt-2.5 border-t border-white/5 space-y-1.5">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] text-white/40 font-bold uppercase">Phân nhanh học sinh {data.group}:</span>
                                    <button
                                      onClick={() => handleAutoAssignDay(day, data.group)}
                                      className="text-[9px] text-amber-500 hover:text-amber-400 font-bold flex items-center gap-0.5 cursor-pointer"
                                    >
                                      <Sparkles size={10} />
                                      <span>Tự động phân</span>
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {dayGroupStudents.map(student => {
                                      const isAssigned = 
                                        data.sweeping.includes(student.name) || 
                                        data.cleaningBoard.includes(student.name) || 
                                        data.trash.includes(student.name);

                                      return (
                                        <div key={student.id} className="relative group/pill">
                                          <button
                                            onClick={() => {
                                              if (activeDutyInput && activeDutyInput.day === day) {
                                                appendStudentToField(day, activeDutyInput.field, student.name);
                                              } else {
                                                // Fallback toggle
                                                if (data.sweeping.includes(student.name)) {
                                                  appendStudentToField(day, 'sweeping', student.name);
                                                } else if (data.cleaningBoard.includes(student.name)) {
                                                  appendStudentToField(day, 'cleaningBoard', student.name);
                                                } else if (data.trash.includes(student.name)) {
                                                  appendStudentToField(day, 'trash', student.name);
                                                } else {
                                                  appendStudentToField(day, 'sweeping', student.name);
                                                }
                                              }
                                            }}
                                            className={`px-1.5 py-0.5 rounded text-[9px] transition font-bold cursor-pointer ${
                                              isAssigned 
                                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 font-black' 
                                                : 'bg-white/5 hover:bg-white/10 text-white/60 border border-transparent'
                                            }`}
                                          >
                                            {student.name.split(' ').pop()}
                                          </button>
                                          
                                          {/* Dropdown helper on hover */}
                                          <div className="hidden group-hover/pill:flex absolute left-0 bottom-full mb-1 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-20 flex-col py-1 text-[8px] min-w-[110px] p-1">
                                            <button 
                                              onClick={() => appendStudentToField(day, 'sweeping', student.name)}
                                              className={`px-2 py-1 text-left rounded-md hover:bg-white/5 text-slate-300 font-bold ${data.sweeping.includes(student.name) ? 'text-amber-400' : ''}`}
                                            >
                                              {data.sweeping.includes(student.name) ? '✓' : '+'} Quét lớp
                                            </button>
                                            <button 
                                              onClick={() => appendStudentToField(day, 'cleaningBoard', student.name)}
                                              className={`px-2 py-1 text-left rounded-md hover:bg-white/5 text-slate-300 font-bold ${data.cleaningBoard.includes(student.name) ? 'text-amber-400' : ''}`}
                                            >
                                              {data.cleaningBoard.includes(student.name) ? '✓' : '+'} Lau bảng
                                            </button>
                                            <button 
                                              onClick={() => appendStudentToField(day, 'trash', student.name)}
                                              className={`px-2 py-1 text-left rounded-md hover:bg-white/5 text-slate-300 font-bold ${data.trash.includes(student.name) ? 'text-amber-400' : ''}`}
                                            >
                                              {data.trash.includes(student.name) ? '✓' : '+'} Đổ rác
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ======================= CUSTOM CONFIRMATION MODAL ======================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-[#111] border border-white/10 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl relative overflow-hidden">
            {/* Top color indicator accent line */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
              confirmModal.type === 'danger' ? 'bg-rose-500' :
              confirmModal.type === 'info' ? 'bg-blue-500' : 'bg-amber-500'
            }`} />

            <div className="flex gap-4 items-start pt-2">
              <div className={`p-3 rounded-2xl shrink-0 ${
                confirmModal.type === 'danger' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                confirmModal.type === 'info' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
              }`}>
                <AlertCircle size={22} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-white tracking-tight">{confirmModal.title}</h4>
                <p className="text-xs text-white/60 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2.5 border-t border-white/5">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 hover:text-white rounded-xl text-xs font-semibold transition"
              >
                {confirmModal.cancelText || 'Hủy bỏ'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-md ${
                  confirmModal.type === 'danger' 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-amber-600 hover:bg-amber-500 text-black'
                }`}
              >
                {confirmModal.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

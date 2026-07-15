/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, onSnapshot, collection, doc } from '../lib/firebase';
import { 
  GraduationCap, 
  Phone, 
  MapPin, 
  Search, 
  Calendar, 
  Clock, 
  ChevronRight, 
  ChevronDown,
  User, 
  CheckCircle, 
  Info, 
  TrendingUp, 
  BarChart2, 
  Award, 
  BookOpen, 
  Mail, 
  Send, 
  ShieldAlert, 
  Users, 
  Grid,
  FileText,
  AlertCircle,
  X,
  Maximize2
} from 'lucide-react';
import { 
  Student, 
  ClassItem, 
  ViolationRecord, 
  WeeklyPlan, 
  StudentTask, 
  AcademicUpdate,
  Teacher,
  SchoolYear
} from '../types';
import { getWeekConfig, generateWeeks, isDateInWeek } from '../utils/weekUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  Legend 
} from 'recharts';

interface PublicPortalProps {
  schoolYears: SchoolYear[];
  students: Student[];
  classes: ClassItem[];
  violations: ViolationRecord[];
  plans: WeeklyPlan[];
  tasks: StudentTask[];
  teachers: Teacher[];
  academicUpdates: AcademicUpdate[];
  onOpenAdmin: () => void;
  initialSchoolYearId?: string;
}

export default function PublicPortal({
  schoolYears = [],
  students: allStudents,
  classes: allClasses,
  violations: allViolations,
  plans: allPlans,
  tasks: allTasks,
  teachers,
  academicUpdates: allAcademicUpdates,
  onOpenAdmin,
  initialSchoolYearId
}: PublicPortalProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'lookup' | 'stats' | 'timetable' | 'contact' | 'news'>('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<string>('Tất cả');
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null);

  // School Year filter state
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>(
    initialSchoolYearId || schoolYears[0]?.id || ''
  );

  // Filter models based on chosen School Year
  const classes = useMemo(() => allClasses.filter(c => c.schoolYearId === selectedSchoolYearId), [allClasses, selectedSchoolYearId]);
  const classIds = useMemo(() => classes.map(c => c.id), [classes]);

  const students = useMemo(() => allStudents.filter(s => s.classId && classIds.includes(s.classId)), [allStudents, classIds]);
  const violations = useMemo(() => allViolations.filter(v => v.classId && classIds.includes(v.classId)), [allViolations, classIds]);
  const plans = useMemo(() => allPlans.filter(p => p.classId && classIds.includes(p.classId)), [allPlans, classIds]);
  const tasks = useMemo(() => allTasks.filter(t => t.classId && classIds.includes(t.classId)), [allTasks, classIds]);
  
  const academicUpdates = useMemo(() => allAcademicUpdates.filter(a => {
    const student = allStudents.find(s => s.id === a.studentId);
    return student && student.classId && classIds.includes(student.classId);
  }), [allAcademicUpdates, allStudents, classIds]);

  // Search states for lookup tab
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedAnn, setSelectedAnn] = useState<any | null>(null);

  // Timetable class select
  const [timetableClassId, setTimetableClassId] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Contact form state
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);

  // Sub-tabs state for statistics and charts
  const [statsSubTab, setStatsSubTab] = useState<'academic' | 'violations'>('academic');

  // Academic stats states
  const [academicStatsClassId, setAcademicStatsClassId] = useState<string>('');
  const [academicStatsSubject, setAcademicStatsSubject] = useState<string>('Toán');
  const [academicStatsRound, setAcademicStatsRound] = useState<string>('');

  // Synchronizer for selected class across the public portal
  const updateSelectedClass = (classId: string) => {
    setSelectedClassId(classId);
    setTimetableClassId(classId);
    setAcademicStatsClassId(classId);
  };

  const currentClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  const className = currentClass ? currentClass.name : '';

  // Timetable state synced with active class
  const [timetable, setTimetable] = useState<Array<{ day: string; period: number; session: 'Sáng' | 'Chiều'; subject: string }>>([]);

  // Sub-tabs state for Timetable & Activities
  const [timetableSubTab, setTimetableSubTab] = useState<'groups' | 'seating' | 'timetable' | 'reminders' | 'duty'>('groups');

  // Selected date for "Dặn dò hàng ngày" and "Bảng theo dõi học tập"
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  // Daily Reminders (Dặn dò) state
  const [reminders, setReminders] = useState<Record<string, string>>({});
  // Editing state for reminders
  const [isEditingReminders, setIsEditingReminders] = useState<boolean>(false);
  const [reminderText, setReminderText] = useState<string>('');

  // Participation tracker (Bảng theo dõi học tập) state
  // Key format: studentId_subject -> count
  const [participationData, setParticipationData] = useState<Record<string, number>>({});

  // Enhanced week-based duty scheduling states for public portal
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

  const weeksList = useMemo(() => {
    return generateWeeks(weekConfig.startDate, weekConfig.totalWeeks);
  }, [weekConfig]);

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

  // Duty Schedule loading and seeding
  const [dutySchedule, setDutySchedule] = useState<Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }>>({});

  // Format date helper
  const formatVietnameseDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const y = parts[0];
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    return `ngày ${d} tháng ${m} năm ${y}`;
  };

  // Load reminders and participation data (with real-time Firestore sync)
  useEffect(() => {
    if (!timetableClassId || !selectedDate) return;

    // 1. Reminders
    const reminderKey = `app_reminders_${timetableClassId}_${selectedDate}`;
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
    const participationKey = `app_participation_${timetableClassId}_${selectedDate}`;
    const savedParticipation = localStorage.getItem(participationKey);
    if (savedParticipation) {
      try {
        setParticipationData(JSON.parse(savedParticipation));
      } catch (e) {
        setParticipationData({});
      }
    } else {
      // Seed realistic data for the class students
      const classStudents = students.filter(s => s.classId === timetableClassId);
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

    // 3. Real-time Firestore sync
    const unsubReminder = onSnapshot(doc(db, 'reminders', `${timetableClassId}_${selectedDate}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.text !== undefined) {
          setReminderText(data.text);
          localStorage.setItem(`app_reminders_${timetableClassId}_${selectedDate}`, data.text);
        }
      }
    });

    const unsubParticipation = onSnapshot(doc(db, 'participations', `${timetableClassId}_${selectedDate}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.data) {
          setParticipationData(data.data);
          localStorage.setItem(`app_participation_${timetableClassId}_${selectedDate}`, JSON.stringify(data.data));
        }
      }
    });

    return () => {
      unsubReminder();
      unsubParticipation();
    };
  }, [timetableClassId, selectedDate, timetable, students]);

  // Duty Schedule loading and seeding (with real-time Firestore sync)
  useEffect(() => {
    if (!timetableClassId) return;
    const key = `app_duty_${timetableClassId}_week_${selectedDutyWeek}`;
    const fallbackKey = `app_duty_${timetableClassId}`;
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
        const classStudents = students.filter(s => s.classId === timetableClassId);
        const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        const seeded: Record<string, { group: string; sweeping: string; cleaningBoard: string; trash: string }> = {};

        days.forEach((day, idx) => {
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
    const unsub = onSnapshot(doc(db, 'duties', `${timetableClassId}_week_${selectedDutyWeek}`), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.schedule) {
          setDutySchedule(data.schedule);
          localStorage.setItem(`app_duty_${timetableClassId}_week_${selectedDutyWeek}`, JSON.stringify(data.schedule));
        }
      }
    });

    return () => unsub();
  }, [timetableClassId, selectedDutyWeek, students]);

  // Load Timetable whenever selected timetableClassId changes (with real-time Firestore sync)
  useEffect(() => {
    if (!timetableClassId) {
      setTimetable([]);
      return;
    }
    const key = `app_timetable_${timetableClassId}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setTimetable(JSON.parse(saved));
      } catch (e) {
        setTimetable([]);
      }
    } else {
      // Fallback empty standard slots
      const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const initial: Array<{ day: string; period: number; session: 'Sáng' | 'Chiều'; subject: string }> = [];
      daysOfWeek.forEach(day => {
        for (let p = 1; p <= 5; p++) {
          let defaultSub = '';
          if (day === 'Thứ 2' && p === 1) defaultSub = 'Chào cờ';
          if (day === 'Thứ 7' && p === 5) defaultSub = 'Sinh hoạt lớp';
          initial.push({ day, period: p, session: 'Sáng', subject: defaultSub });
        }
        for (let p = 1; p <= 5; p++) {
          initial.push({ day, period: p, session: 'Chiều', subject: '' });
        }
      });
      setTimetable(initial);
    }

    // Subscribe to Firestore timetables
    const unsub = onSnapshot(doc(db, 'timetables', timetableClassId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.cells) {
          setTimetable(data.cells);
          localStorage.setItem(`app_timetable_${timetableClassId}`, JSON.stringify(data.cells));
        }
      }
    });

    return () => unsub();
  }, [timetableClassId]);

  // Violation stats states
  const [violationStatsClassId, setViolationStatsClassId] = useState<string>('all');
  const [violationStatsMonth, setViolationStatsMonth] = useState<string>('all');

  // Keep search and stats inputs updated when classes load or year changes
  useEffect(() => {
    if (classes.length > 0) {
      setSelectedClassId(classes[0].id);
      setTimetableClassId(classes[0].id);
      setAcademicStatsClassId(classes[0].id);
    } else {
      setSelectedClassId('');
      setTimetableClassId('');
      setAcademicStatsClassId('');
    }
  }, [selectedSchoolYearId, allClasses]);

  // Reset selected weekly plan when class changes
  useEffect(() => {
    setSelectedPlanId(null);
  }, [timetableClassId]);

  // Keep academic round initialized based on active class, academicUpdates, & school year
  useEffect(() => {
    const statsStudents = students.filter(s => s.classId === academicStatsClassId);
    const classUniqueRounds = Array.from(
      new Set(
        academicUpdates
          .filter(u => statsStudents.some(s => s.id === u.studentId))
          .map(u => u.title)
      )
    );
    const defaultRounds = ['Giữa Học kỳ I', 'Cuối Học kỳ I', 'Giữa Học kỳ II', 'Cuối Học kỳ II'];
    const availableRounds = Array.from(new Set([...classUniqueRounds, ...defaultRounds]));

    if (availableRounds.length > 0) {
      if (!academicStatsRound || !availableRounds.includes(academicStatsRound)) {
        setAcademicStatsRound(availableRounds[0]);
      }
    }
  }, [academicStatsClassId, academicUpdates, selectedSchoolYearId]);

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time
  const formatTimeStr = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const formatDateStr = (date: Date) => {
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayName = dayNames[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${dayName}, ${day}/${month}/${year}`;
  };

  // Announcements List (Loaded from localStorage or fallback to default)
  const [announcements, setAnnouncements] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_announcements');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    const defaultAnn = [
      {
        id: 'ann-1',
        date: '14/07/2026',
        title: 'Lịch thi tập trung và kiểm tra định kỳ Học kỳ II năm học 2025-2026',
        content: `### 📅 LỊCH THI VÀ ÔN TẬP CHI TIẾT Học kỳ II\n\nKính gửi Quý phụ huynh và các em học sinh,\n\nĐể chuẩn bị tốt nhất cho kỳ thi kết thúc học kỳ II, Ban Giám Hiệu nhà trường xin thông báo lịch ôn tập và kiểm tra định kỳ chi tiết như sau:\n\n* **Thời gian ôn tập tập trung:** Từ ngày 15/05/2026 đến hết ngày 22/05/2026.\n* **Thời gian thi chính thức:** Từ 25/05/2026 đến 29/05/2026.\n\n| Ngày thi | Sáng (7h30) | Chiều (13h30) |\n|---|---|---|\n| **Thứ Hai (25/05)** | Toán (90 phút) | Ngữ Văn (120 phút) |\n| **Thứ Ba (26/05)** | Tiếng Anh (60 phút) | Vật lý (45 phút) |\n\n#### ⚠️ Một số lưu ý quan trọng:\n* Học sinh phải có mặt tại phòng thi trước giờ làm bài **20 phút**.\n* Mặc đồng phục đúng quy định, đeo thẻ học sinh đầy đủ.`,
        isNew: true,
        category: 'Học vụ'
      },
      {
        id: 'ann-2',
        date: '08/07/2026',
        title: 'Thông báo về việc tổ chức tập huấn Sử dụng Sách giáo khoa mới cho Giáo viên',
        content: `### 📘 TẬP HUẤN SÁCH GIÁO KHOA MỚI\n\nKính gửi toàn thể cán bộ, giáo viên trong tổ bộ môn,\n\nNhà trường tổ chức tập huấn Sử dụng Sách giáo khoa mới hỗ trợ giảng dạy trực quan:\n\n* **Thời gian tập huấn:** 08h00 ngày 20/07/2026.\n* **Địa điểm:** Hội trường Lớn tầng 2.\n* **Báo cáo viên:** Chuyên gia Nhà xuất bản Giáo dục Việt Nam.\n\nĐề nghị tất cả Giáo viên tham dự đông đủ, đúng giờ để buổi tập huấn diễn ra tốt đẹp!`,
        isNew: true,
        category: 'Đào tạo'
      },
      {
        id: 'ann-3',
        date: '02/07/2026',
        title: 'Kế hoạch triển khai Chiến dịch Tình nguyện Hoa Phượng Đỏ năm 2026',
        content: `### 🌸 CHIẾN DỊCH TÌNH NGUYỆN HÈ HOA PHƯỢNG ĐỎ 2026\n\nBan chấp hành Đoàn trường phát động chiến dịch tình nguyện hè sôi nổi:\n\n* **Nội dung hoạt động:**\n  1. Dọn dẹp vệ sinh khu vực đài tưởng niệm địa phương.\n  2. Tổ chức ôn tập văn hóa hè cho thiếu nhi vùng khó khăn.\n  3. Quyên góp sách giáo khoa cũ, quần áo ấm.\n\n* **Đăng ký tham gia:** Học sinh đăng ký trực tiếp với Bí thư Chi đoàn lớp trước ngày 20/06/2026.`,
        isNew: false,
        category: 'Phong trào'
      },
      {
        id: 'ann-4',
        date: '25/06/2026',
        title: 'Danh sách tuyên dương các tập thể lớp xuất sắc đạt chuẩn nề nếp Tháng 6',
        content: `### 🏆 TUYÊN DƯƠNG THI ĐUA THÁNG 6\n\nBan thi đua nhà trường xin công bố danh sách các tập thể lớp đạt chuẩn xuất sắc về nề nếp và phong trào tháng 6:\n\n1. **Lớp 11A1** - Đạt 99.5 điểm (Dẫn đầu khối)\n2. **Lớp 10C2** - Đạt 98.2 điểm\n3. **Lớp 12B5** - Đạt 97.8 điểm\n\nKhen thưởng 100.000 VNĐ cho mỗi chi đoàn đạt danh hiệu này. Chúc mừng các tập thể xuất sắc!`,
        isNew: false,
        category: 'Nề nếp'
      }
    ];
    localStorage.setItem('app_announcements', JSON.stringify(defaultAnn));
    return defaultAnn;
  });

  // Re-sync announcements when active or visible (with real-time Firestore sync)
  useEffect(() => {
    const syncAnnouncements = () => {
      const saved = localStorage.getItem('app_announcements');
      if (saved) {
        try {
          setAnnouncements(JSON.parse(saved));
        } catch (e) {}
      }
    };
    
    syncAnnouncements();
    
    // Subscribe to Firestore announcements
    const unsub = onSnapshot(collection(db, 'announcements'), (snap) => {
      const list: any[] = [];
      snap.forEach(docDoc => {
        list.push(docDoc.data());
      });
      if (list.length > 0) {
        list.sort((a, b) => b.id.localeCompare(a.id));
        setAnnouncements(list);
        localStorage.setItem('app_announcements', JSON.stringify(list));
      }
    });

    window.addEventListener('storage', syncAnnouncements);
    return () => {
      unsub();
      window.removeEventListener('storage', syncAnnouncements);
    };
  }, []);

  // Quick statistics calculation
  const totalClassesCount = classes.length;
  const totalStudentsCount = students.length;
  const totalTeachersCount = teachers.length;
  const activeTasksCount = tasks.filter(t => t.status !== 'Đã hoàn thành').length;

  // Search filter for students
  const filteredStudents = students.filter(s => {
    const matchesClass = s.classId === selectedClassId;
    const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesQuery;
  });

  // Handle contact form submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.message) return;
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactForm({ name: '', phone: '', email: '', message: '' });
    }, 4000);
  };

  // Timetable and objective rendering for selected class, sorted by weekNumber ascending
  const classPlansSorted = useMemo(() => {
    return plans
      .filter(p => p.classId === timetableClassId)
      .sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
  }, [plans, timetableClassId]);

  const activePlan = useMemo(() => {
    if (classPlansSorted.length === 0) return null;
    if (selectedPlanId) {
      const plan = classPlansSorted.find(p => p.id === selectedPlanId);
      if (plan) return plan;
    }
    // Default to the last plan in the sorted list (which has the largest weekNumber)
    return classPlansSorted[classPlansSorted.length - 1];
  }, [classPlansSorted, selectedPlanId]);

  // Statistics calculation for Recharts
  // 1. Diligence summary by Class
  const classDiligenceData = classes.map(cls => {
    const classSts = students.filter(s => s.classId === cls.id);
    const classViolations = violations.filter(v => v.classId === cls.id);
    
    // Average points: base is 100, then substract violation points
    const totalDeducted = classViolations.reduce((sum, v) => sum + Math.abs(v.points), 0);
    const averageScore = classSts.length > 0 ? Math.max(0, 100 - (totalDeducted / classSts.length)) : 100;

    return {
      name: cls.name,
      'Điểm Nề Nếp TB': parseFloat(averageScore.toFixed(1)),
      'Số Vi Phạm': classViolations.length,
      'Học Sinh': classSts.length
    };
  });

  // 2. Task completion distribution
  const taskCompletionData = [
    { name: 'Chưa bắt đầu', value: tasks.filter(t => t.status === 'Chưa bắt đầu').length },
    { name: 'Đang thực hiện', value: tasks.filter(t => t.status === 'Đang thực hiện').length },
    { name: 'Đã hoàn thành', value: tasks.filter(t => t.status === 'Đã hoàn thành').length },
  ].filter(item => item.value > 0);

  const COLORS = ['#ef4444', '#f59e0b', '#10b981'];

  // 3. Seating Chart Grid representation
  const renderSeatingChart = (student: Student) => {
    const rows = 5;
    const cols = 4;
    
    const seatRow = student.seatRow !== undefined ? student.seatRow : -1;
    const seatCol = student.seatCol !== undefined ? student.seatCol : -1;

    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
        <h4 className="text-xs font-bold text-slate-700 mb-3 uppercase tracking-wider">SƠ ĐỒ BÀN HỌC TRONG LỚP</h4>
        <div className="bg-slate-300 h-2 w-2/3 mx-auto mb-6 rounded-md text-[9px] text-slate-600 font-bold flex items-center justify-center uppercase">BẢNG GIẢNG ĐƯỜNG</div>
        
        <div className="grid grid-cols-4 gap-2.5 max-w-[280px] mx-auto">
          {Array.from({ length: rows }).map((_, rIndex) => (
            Array.from({ length: cols }).map((_, cIndex) => {
              const isHisSeat = (seatRow === rIndex && seatCol === cIndex);
              return (
                <div 
                  key={`${rIndex}-${cIndex}`}
                  className={`p-2 rounded-lg text-[9px] font-bold text-center border transition flex flex-col items-center justify-center h-12 ${
                    isHisSeat 
                      ? 'bg-blue-600 border-blue-700 text-white shadow-md animate-pulse ring-2 ring-blue-300' 
                      : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <Grid size={10} className={isHisSeat ? 'text-white' : 'text-slate-300'} />
                  <span className="mt-1">
                    {isHisSeat ? 'BẠN' : `H-${rIndex+1}, C-${cIndex+1}`}
                  </span>
                </div>
              );
            })
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-3 font-semibold">
          {seatRow !== -1 ? `Vị trí: Hàng dọc ${seatRow + 1}, Cột dọc ${seatCol + 1}` : 'Chưa xếp chỗ ngồi cố định'}
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans flex flex-col select-none">
      
      {/* 1. TOPMOST BAR - NAVY BLUE */}
      <div className="bg-[#1e3a8a] text-white py-2 px-6 text-xs flex flex-wrap justify-between items-center border-b border-blue-900/40 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-blue-100 font-medium">
            <Phone size={13} className="text-amber-400" />
            <span>Hotline: 0909091634</span>
          </div>
          <div className="flex items-center gap-1.5 text-blue-100 font-medium max-md:hidden">
            <MapPin size={13} className="text-amber-400" />
            <span>Địa chỉ: 123 Trung Mỹ Tây, Bà Điểm, Hóc Môn, TPHCM</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              setActiveTab('lookup');
            }}
            className="px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded-full text-[11px] font-bold tracking-wide transition flex items-center gap-1 cursor-pointer border border-blue-700"
          >
            <Search size={11} /> Tra cứu học sinh
          </button>
          <button 
            onClick={onOpenAdmin}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-full text-[11px] font-extrabold tracking-wide transition flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/20"
          >
            <GraduationCap size={12} /> Quản trị hệ thống
          </button>
        </div>
      </div>

      {/* 2. BRAND HEADER */}
      <header className="bg-white py-5 px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white border-2 border-amber-400 shadow-md flex-shrink-0 mx-auto">
            <GraduationCap size={30} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-blue-900 tracking-tight uppercase">
              {className ? `LỚP ${className} ` : ''}TRƯỜNG THPT NGUYỄN HỮU CẦU
            </h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              "ĐẠO ĐỨC - TRÍ TUỆ - SÁNG TẠO"
            </p>
          </div>
        </div>
        
        {/* Real-time Clock */}
        <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-inner">
          <Calendar size={16} className="text-blue-700" />
          <div className="text-right">
            <p className="text-[11px] font-extrabold text-blue-950 uppercase">{formatDateStr(currentTime)}</p>
            <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-slate-700">
              <Clock size={12} className="text-slate-400" />
              <span>{formatTimeStr(currentTime)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 3. SITE NAVIGATION BAR */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs px-6 md:px-12 py-1 flex flex-wrap items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-1.5 md:gap-3 py-1">
          {[
            { id: 'home', label: 'TRANG CHỦ' },
            { id: 'about', label: 'GIỚI THIỆU' },
            { id: 'lookup', label: 'TRA CỨU' },
            { id: 'stats', label: 'THỐNG KÊ & BIỂU ĐỒ' },
            { id: 'timetable', label: 'HOẠT ĐỘNG' },
            { id: 'news', label: 'TIN TỨC' },
            { id: 'contact', label: 'LIÊN HỆ PHẢN HỒI' }
          ].map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSelectedStudent(null);
                }}
                className={`px-3 md:px-4 py-2 rounded-lg text-xs font-extrabold tracking-wide border transition cursor-pointer ${
                  isActive 
                    ? 'bg-blue-50 text-blue-700 border-blue-250 shadow-3xs font-black' 
                    : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-blue-900'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic School Year Filter */}
        {schoolYears.length > 0 && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider select-none">NĂM HỌC:</span>
            <select
              value={selectedSchoolYearId}
              onChange={(e) => {
                setSelectedSchoolYearId(e.target.value);
                setSelectedStudent(null);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-extrabold text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 cursor-pointer shadow-inner"
            >
              {schoolYears.map(yr => (
                <option key={yr.id} value={yr.id}>{yr.name}</option>
              ))}
            </select>
          </div>
        )}
      </nav>

      {/* 4. MAIN CONTAINER (2 COLUMNS: SIDEBAR LEFT + MAIN RIGHT) */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* LEFT COLUMN: announcements and Quick Links */}
        <aside className="space-y-6 lg:col-span-1">
          
          {/* Section: Bulletin Board */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></div>
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                  THÔNG BÁO MỚI
                  <span className="bg-rose-100 text-rose-700 text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">NEW</span>
                </h3>
              </div>
              <button 
                onClick={() => {
                  setActiveTab('news');
                  setNewsCategoryFilter('Tất cả');
                }}
                className="text-[10px] font-black text-blue-600 hover:underline cursor-pointer"
              >
                Tất cả
              </button>
            </div>

            {/* Vertical scrolling news ticker */}
            <div className="h-[250px] overflow-hidden relative group rounded-2xl bg-slate-50/50 border border-slate-100/80 p-2">
              {announcements.filter(ann => ann.isNew).length === 0 ? (
                <div className="h-full flex items-center justify-center text-center text-[10px] text-slate-400 font-bold italic p-4">
                  Không có thông báo mới nào có nhãn NEW hôm nay.
                </div>
              ) : (
                <div className="absolute left-2 right-2 flex flex-col gap-2.5 animate-marquee-vertical">
                  {/* Repeat the list twice to create endless loop */}
                  {[...announcements.filter(ann => ann.isNew), ...announcements.filter(ann => ann.isNew)].map((ann, idx) => (
                    <div 
                      key={`${ann.id}-${idx}`} 
                      onClick={() => setSelectedAnn(ann)}
                      className="p-3 bg-white hover:bg-blue-50/10 border border-slate-200/60 hover:border-blue-200 rounded-xl space-y-1 shadow-2xs transition duration-150 cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-1.5 text-[9px] font-bold text-slate-400">
                        <span className="font-mono">{ann.date}</span>
                        <span className="text-blue-600 uppercase tracking-wider">{ann.category}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-700 leading-snug hover:text-blue-600 line-clamp-2">
                        {ann.title}
                      </h4>
                    </div>
                  ))}
                </div>
              )}
              {/* Top and Bottom Fades to conceal entry/exit */}
              <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-b from-slate-50/80 via-slate-50/20 to-transparent pointer-events-none z-10"></div>
              <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-t from-slate-50/80 via-slate-50/20 to-transparent pointer-events-none z-10"></div>
            </div>
          </div>

          {/* Section: Useful links */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="pb-2.5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">LIÊN KẾT NHANH</h3>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Sổ liên lạc điện tử học sinh', url: 'https://truonghocviet.vn/', icon: BookOpen },
                { label: 'Hệ thống học tập', url: 'https://hethonghoctap-nhc.vercel.app/', icon: FileText },
                { label: 'Hoạt động phong trào Đoàn trường', url: 'https://www.facebook.com/profile.php?id=100066861697326&ref=embed_page#', icon: Award },
                { label: 'Website Sở Giáo Dục & Đào Tạo', url: 'https://hcm.edu.vn', icon: Info }
              ].map((link, idx) => {
                const Icon = link.icon;
                return (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-slate-100 text-slate-600 text-xs font-bold group"
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-blue-600 flex-shrink-0" />
                      <span className="truncate group-hover:text-blue-900">{link.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:translate-x-0.5 transition" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Slogan Banner Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-[0.04] text-slate-950">
              <GraduationCap size={150} />
            </div>
            <div className="pb-2.5 border-b border-slate-100 flex items-center gap-2 relative z-10">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">SỨ MỆNH NHÀ TRƯỜNG</h3>
            </div>
            <div className="space-y-3 relative z-10">
              <h4 className="text-xs font-black tracking-tight leading-relaxed text-slate-800">Đồng hành cùng học sinh THPT Nguyễn Hữu Cầu, kiến tạo môi trường học tập nề nếp, văn minh, sáng tạo.</h4>
              <p className="text-[10px] font-bold text-slate-500 leading-relaxed">Đào tạo thế hệ trẻ có đạo đức vững vàng, trí tuệ sâu rộng và tư duy sáng tạo bứt phá.</p>
            </div>
          </div>

        </aside>

        {/* RIGHT COLUMN: MAIN CONTENT (TABS) */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* PATH BREADCRUMB */}
          <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-extrabold tracking-wide text-slate-500 uppercase">
              <span>CỔNG THÔNG TIN</span>
              <ChevronRight size={12} className="text-slate-300" />
              <span className="text-blue-600 font-black">
                {activeTab === 'home' && 'TRANG CHỦ'}
                {activeTab === 'about' && 'GIỚI THIỆU NHÀ TRƯỜNG'}
                {activeTab === 'lookup' && 'TRA CỨU HỌC SINH'}
                {activeTab === 'stats' && 'THỐNG KÊ & BIỂU ĐỒ'}
                {activeTab === 'timetable' && 'THỜI KHÓA BIỂU & KẾ HOẠCH'}
                {activeTab === 'news' && 'TIN TỨC & CHUYÊN MỤC'}
                {activeTab === 'contact' && 'LIÊN HỆ PHẢN HỒI'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-bold max-md:hidden">Cập nhật: Mới nhất hôm nay</span>
          </div>

          {/* TAB CONTENT: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Hero Banner illustration / container */}
              <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden shadow-md min-h-[220px] flex items-center">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-15 mix-blend-overlay"></div>
                <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
                
                <div className="space-y-4 max-w-xl relative z-10">
                  <h2 className="text-xl md:text-3xl font-black uppercase tracking-tight text-white-pure leading-tight">Chào mừng đến với Cổng thông tin Nề nếp & Học vụ trực tuyến</h2>
                  <p className="text-xs md:text-sm text-slate-100 leading-relaxed font-medium">
                    Hệ thống cung cấp thông tin tra cứu tình hình học tập, chuyên cần, sơ đồ chỗ ngồi lớp học, lịch học tập và kế hoạch hoạt động tuần dành cho Học sinh và Phụ huynh trường THPT Nguyễn Hữu Cầu.
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setActiveTab('lookup')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white-pure text-xs font-black rounded-xl transition shadow-md cursor-pointer"
                    >
                      Tra cứu thông tin học sinh
                    </button>
                    <button 
                      onClick={() => setActiveTab('timetable')}
                      className="px-4 py-2 bg-white/10 hover:bg-white/25 text-white-pure text-xs font-bold rounded-xl transition cursor-pointer border border-white/20"
                    >
                      Xem lịch hoạt động tuần
                    </button>
                  </div>
                </div>
              </div>

              {/* STATS GRID - BENTO BOX DESIGN */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Học sinh</p>
                    <p className="text-lg font-black text-slate-800">{totalStudentsCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Lớp Học</p>
                    <p className="text-lg font-black text-slate-800">{totalClassesCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Giáo Viên</p>
                    <p className="text-lg font-black text-slate-800">{totalTeachersCount}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Nhiệm vụ active</p>
                    <p className="text-lg font-black text-slate-800">{activeTasksCount}</p>
                  </div>
                </div>

              </div>

              {/* Two Column Section underneath */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* School Highlights & Value Section */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest pb-2 border-b border-slate-100">Giá trị Cốt Lõi THPT Nguyễn Hữu Cầu</h3>
                  
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-bold text-xs text-blue-700 flex-shrink-0">Đ</div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">ĐẠO ĐỨC (Ethics)</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Tôn trọng nề nếp kỷ cương, sống chính trực, nhân ái, có tinh thần trách nhiệm với bản thân và cộng đồng xã hội.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center font-bold text-xs text-amber-700 flex-shrink-0">T</div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">TRÍ TUỆ (Intellect)</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Học tập chủ động, rèn luyện tư duy phân tích, tích lũy kiến thức sâu rộng vững vàng để phục vụ tương lai nước nhà.</p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 flex-shrink-0">S</div>
                      <div>
                        <h4 className="text-xs font-black text-slate-800">SÁNG TẠO (Creativity)</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Tự do khám phá, không ngừng đổi mới phương pháp tư duy học thuật, phát triển các giải pháp sáng tạo cho thực tiễn cuộc sống.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Educational Standard Info */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">Kỷ cương & nề nếp tự quản</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Nhà trường áp dụng hệ thống nề nếp tự quản tiên tiến giúp học sinh rèn luyện tinh thần tự giác cao độ. Mỗi lớp học đều có sơ đồ chỗ ngồi linh hoạt, nhiệm vụ tuần rõ ràng và danh sách vi phạm/khen thưởng cập nhật công khai giúp phụ huynh và giáo viên có cái nhìn sát sao nhất về quá trình trưởng thành của các em học sinh.
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase">THPT NGUYỄN HỮU CẦU</p>
                    <p className="text-xs font-black text-blue-900 mt-0.5">Tiêu chuẩn quốc gia - Nền tảng học thuật vững bền</p>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB CONTENT: ABOUT */}
          {activeTab === 'about' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6 animate-fadeIn">
              <div className="space-y-3">
                <h2 className="text-lg font-black text-blue-900 uppercase tracking-wide">GIỚI THIỆU</h2>
                <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
              </div>

              <div className="text-xs text-slate-600 leading-relaxed space-y-4 font-medium">
                <p>
                  Trường Trung học Phổ thông Nguyễn Hữu Cầu, tọa lạc tại xã Bà Điểm, Thành phố Hồ Chí Minh, là một trong những cơ sở giáo dục trung học lâu đời và có uy tín cao bậc nhất của khu vực cửa ngõ Tây Bắc thành phố. Với truyền thống nhiều thập kỷ dạy tốt và học tốt, trường tự hào là cái nôi nuôi dưỡng hàng vạn thế hệ học sinh ưu tú cống hiến cho công cuộc phát triển đất nước.
                </p>
                <p>
                  Đội ngũ sư phạm nhà trường quy tụ những nhà giáo mẫu mực, tâm huyết với nghề nghiệp, giàu kinh nghiệm và không ngừng đổi mới tư duy, ứng dụng mạnh mẽ khoa học công nghệ vào giảng dạy và quản lý nề nếp.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                  <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <h4 className="font-extrabold text-blue-900 text-xs uppercase mb-2">Thành Tích Đào Tạo Nổi Bật</h4>
                    <ul className="list-disc pl-4 space-y-1 text-[11px]">
                      <li>100% học sinh tốt nghiệp THPT qua các năm học gần nhất.</li>
                      <li>Tỉ lệ đỗ vào các trường Đại học công lập tốp đầu đạt trên 95%.</li>
                      <li>Nhiều giải thưởng Học sinh Giỏi cấp Thành phố và Quốc gia.</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <h4 className="font-extrabold text-amber-900 text-xs uppercase mb-2">Phương Châm Giáo Dục</h4>
                    <p className="text-[11px] leading-relaxed">
                      "Giáo dục không phải là việc đổ đầy một chiếc bình, mà là nhóm lên một ngọn lửa." THPT Nguyễn Hữu Cầu kiên định giáo dục phát triển năng lực toàn diện cho học sinh cả về đạo đức nề nếp lẫn năng lực thực tế.
                    </p>
                  </div>
                </div>

                <p>
                  Để hỗ trợ tốt nhất cho công tác kết nối gia đình và Lớp, GVCN xây dựng và vận hành Cổng thông tin trực tuyến này. Kính mong nhận được sự đồng hành sát sao từ quý vị Phụ huynh cùng sự tích cực hưởng ứng từ các em Học sinh thân yêu.
                </p>
              </div>
            </div>
          )}

          {/* TAB CONTENT: LOOKUP (STUDENT LOOKUP ENGINE) */}
          {activeTab === 'lookup' && (
            <div className="space-y-6 animate-fadeIn">
              
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                    <Search size={16} className="text-blue-600" /> BỘ LỌC TRA CỨU HỌC SINH
                  </h3>
                  <p className="text-[11px] text-slate-400">Chọn lớp và nhập họ tên hoặc mã học sinh để tìm kiếm nhanh sơ đồ bàn học, nhiệm vụ và nề nếp.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Chọn lớp học <span className="text-rose-500">*</span></label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        updateSelectedClass(e.target.value);
                        setSelectedStudent(null);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                    >
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">Tên hoặc mã số học sinh</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setSelectedStudent(null);
                        }}
                        placeholder="Ví dụ: Nguyễn Văn A, HS01..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                      />
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEARCH RESULTS LIST */}
              {!selectedStudent && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
                    KẾT QUẢ TÌM KIẾM ({filteredStudents.length} học sinh)
                  </h4>
                  
                  {filteredStudents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={() => setSelectedStudent(student)}
                          className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-2xl text-left transition flex items-center justify-between group cursor-pointer"
                        >
                          <div className="space-y-1 min-w-0">
                            <h5 className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition truncate">{student.name}</h5>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">{student.id} | {student.groupName || 'Tổ 1'}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-600 transition" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold">
                      <AlertCircle size={30} className="text-slate-300 mx-auto mb-2" />
                      Không tìm thấy học sinh nào thỏa mãn bộ lọc hiện tại.
                    </div>
                  )}
                </div>
              )}

              {/* SINGLE STUDENT DETAILED DASHBOARD CARD */}
              {selectedStudent && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Back button */}
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-700 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    ← Quay lại danh sách tìm kiếm
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* Column 1: Basic Profile */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                      <div className="text-center space-y-3 pb-4 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-black text-lg mx-auto flex items-center justify-center border-2 border-blue-200 shadow-sm">
                          {selectedStudent.name.split(' ').pop()?.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">{selectedStudent.name}</h4>
                          <p className="text-[10px] text-blue-600 font-extrabold uppercase mt-0.5">{selectedStudent.id}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-medium text-slate-600">
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Giới tính:</span>
                          <span className="font-bold text-slate-700">{selectedStudent.gender}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Ngày sinh:</span>
                          <span className="font-bold text-slate-700">{selectedStudent.dob}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Phân tổ:</span>
                          <span className="font-bold text-slate-700">{selectedStudent.groupName || 'Tổ 1'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-50">
                          <span className="text-slate-400">Trạng thái:</span>
                          <span className="font-bold text-emerald-600">{selectedStudent.status}</span>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Seating grid location */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                      {renderSeatingChart(selectedStudent)}
                    </div>

                    {/* Column 3: Tasks and general status */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                        Nhiệm vụ được giao & Chuyên cần
                      </h4>

                      {/* Diligence score summary without private comments */}
                      {(() => {
                        const stdViolations = violations.filter(v => v.studentId === selectedStudent.id);
                        const totalDeducted = stdViolations.reduce((sum, v) => sum + Math.abs(v.points), 0);
                        const rating = totalDeducted === 0 ? 'Tốt/Xuất sắc' : totalDeducted < 5 ? 'Khá' : 'Cần rèn luyện';
                        return (
                          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center space-y-1">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đánh giá chuyên cần nề nếp</p>
                            <p className={`text-sm font-black uppercase ${totalDeducted === 0 ? 'text-emerald-600' : totalDeducted < 5 ? 'text-amber-500' : 'text-rose-500'}`}>
                              {rating} ({100 - totalDeducted} điểm)
                            </p>
                          </div>
                        );
                      })()}

                      {/* Student Tasks list */}
                      <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-2">Công việc / Nhiệm vụ tuần</p>
                        {(() => {
                          const stdTasks = tasks.filter(t => t.studentId === selectedStudent.id || t.studentId === 'Tất cả');
                          return stdTasks.length > 0 ? (
                            <div className="space-y-1.5 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                              {stdTasks.map(t => (
                                <div key={t.id} className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-extrabold text-slate-700 truncate max-w-[120px]">{t.taskTitle}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                                      t.status === 'Đã hoàn thành' ? 'bg-emerald-100 text-emerald-700' : t.status === 'Đang thực hiện' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                                    }`}>{t.status}</span>
                                  </div>
                                  <p className="text-slate-400 leading-normal line-clamp-1">{t.description}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Hiện tại không có nhiệm vụ cụ thể được giao.</p>
                          );
                        })()}
                      </div>
                    </div>

                  </div>

                  {/* Academic chart panel if student academic updates are found */}
                  {(() => {
                    const stdAcademic = academicUpdates.filter(a => a.studentId === selectedStudent.id);
                    if (stdAcademic.length > 0) {
                      const sortedAcademic = [...stdAcademic].sort((a, b) => a.date.localeCompare(b.date));
                      const chartData = sortedAcademic.map(item => ({
                        name: item.semester,
                        'ĐTB': parseFloat(item.averageGpa.toFixed(2))
                      }));

                      return (
                        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                            <TrendingUp size={14} className="text-blue-600" /> Biểu Đồ Tiến Trình Học Tập (Điểm TB)
                          </h4>
                          
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -25 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                                <YAxis domain={[0, 10]} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="ĐTB" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 6 }} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                </div>
              )}

            </div>
          )}

          {/* TAB CONTENT: STATS */}
          {activeTab === 'stats' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Segment control for statistics sub-tabs */}
              <div className="flex bg-slate-100 p-1 rounded-2xl max-w-md mx-auto border border-slate-200/60">
                <button
                  onClick={() => setStatsSubTab('academic')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer text-center ${
                    statsSubTab === 'academic'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/40 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⭐ KẾT QUẢ HỌC TẬP
                </button>
                <button
                  onClick={() => setStatsSubTab('violations')}
                  className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer text-center ${
                    statsSubTab === 'violations'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/40 font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚠️ VI PHẠM NỀ NẾP
                </button>
              </div>

              {/* STATS SUBTAB 1: ACADEMIC PROGRESS */}
              {statsSubTab === 'academic' && (() => {
                const statsStudents = students.filter(s => s.classId === academicStatsClassId);
                const classUniqueRounds = Array.from(
                  new Set(
                    academicUpdates
                      .filter(u => statsStudents.some(s => s.id === u.studentId))
                      .map(u => u.title)
                  )
                );
                const defaultRounds = ['Giữa Học kỳ I', 'Cuối Học kỳ I', 'Giữa Học kỳ II', 'Cuối Học kỳ II'];
                const availableRounds = Array.from(new Set([...classUniqueRounds, ...defaultRounds]));

                const studentScores = statsStudents.map(s => {
                  const update = academicUpdates.find(u => u.studentId === s.id && u.title === academicStatsRound);
                  let score: number | undefined;
                  if (academicStatsSubject === 'Điểm trung bình') {
                    score = update && update.gpaList && Array.isArray(update.gpaList) && update.gpaList.length > 0 
                      ? Number(update.averageGpa) 
                      : undefined;
                  } else {
                    const rawScore = update?.gpaList && Array.isArray(update.gpaList)
                      ? update.gpaList.find(g => g.subject === academicStatsSubject)?.score
                      : undefined;
                    score = rawScore !== undefined && rawScore !== null ? Number(rawScore) : undefined;
                  }
                  return { student: s, score };
                }).filter(item => item.score !== undefined && !isNaN(item.score)) as Array<{ student: Student, score: number }>;

                let countGioi = 0;
                let countKha = 0;
                let countDat = 0;
                let countChuaDat = 0;

                studentScores.forEach(item => {
                  if (item.score >= 8.0) countGioi++;
                  else if (item.score >= 6.5) countKha++;
                  else if (item.score >= 5.0) countDat++;
                  else countChuaDat++;
                });

                const totalGraded = studentScores.length;

                const pieChartData = [
                  { name: 'Giỏi (≥8.0)', value: countGioi, color: '#10b981' },
                  { name: 'Khá (6.5-7.9)', value: countKha, color: '#f59e0b' },
                  { name: 'Đạt (5.0-6.4)', value: countDat, color: '#3b82f6' },
                  { name: 'Chưa đạt (<5.0)', value: countChuaDat, color: '#ef4444' }
                ].filter(item => item.value > 0);

                const allLegendsData = [
                  { name: 'Giỏi (≥8.0)', value: countGioi, color: '#10b981' },
                  { name: 'Khá (6.5-7.9)', value: countKha, color: '#f59e0b' },
                  { name: 'Đạt (5.0-6.4)', value: countDat, color: '#3b82f6' },
                  { name: 'Chưa đạt (<5.0)', value: countChuaDat, color: '#ef4444' }
                ];

                const topStudents = [...studentScores]
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 5);

                const selectedClassName = classes.find(c => c.id === academicStatsClassId)?.name || 'Lớp';

                return (
                  <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                        {/* Selector Năm học */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Năm học</span>
                          <div className="bg-slate-100 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 truncate select-none">
                            {schoolYears.find(y => y.id === selectedSchoolYearId)?.name || 'Chưa chọn'}
                          </div>
                        </div>

                        {/* Selector Lớp */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Lớp học</span>
                          <select
                            value={academicStatsClassId}
                            onChange={(e) => updateSelectedClass(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600 transition shadow-sm cursor-pointer"
                          >
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Môn */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Môn học</span>
                          <select
                            value={academicStatsSubject}
                            onChange={(e) => setAcademicStatsSubject(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600 transition shadow-sm cursor-pointer"
                          >
                            {['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'Tin học', 'GDKT&PL'].map(subj => (
                              <option key={subj} value={subj}>{subj}</option>
                            ))}
                            <option value="Điểm trung bình">⭐ Điểm trung bình (GPA)</option>
                          </select>
                        </div>

                        {/* Selector Đợt / Kỳ */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Kỳ học / Đợt</span>
                          <select
                            value={academicStatsRound}
                            onChange={(e) => setAcademicStatsRound(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600 transition shadow-sm cursor-pointer"
                          >
                            {availableRounds.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {totalGraded > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Stats Summary Bento & Pie Chart */}
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                              <BarChart2 size={15} className="text-blue-600" /> THỐNG KÊ KẾT QUẢ HỌC TẬP - {selectedClassName}
                            </h3>
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase">
                              Tổng số: {totalGraded} Học sinh
                            </span>
                          </div>

                          {/* Stat Grid Boxes */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 text-center">
                              <p className="text-[9px] text-emerald-600 font-extrabold uppercase tracking-wider">Giỏi (≥8.0)</p>
                              <p className="text-2xl font-black text-emerald-800 mt-1">{countGioi}</p>
                              <p className="text-[10px] text-emerald-500 font-bold mt-0.5">({totalGraded > 0 ? Math.round(countGioi / totalGraded * 100) : 0}%)</p>
                            </div>
                            <div className="bg-amber-50/60 border border-amber-100 rounded-2xl p-4 text-center">
                              <p className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">Khá (6.5-7.9)</p>
                              <p className="text-2xl font-black text-amber-800 mt-1">{countKha}</p>
                              <p className="text-[10px] text-amber-500 font-bold mt-0.5">({totalGraded > 0 ? Math.round(countKha / totalGraded * 100) : 0}%)</p>
                            </div>
                            <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 text-center">
                              <p className="text-[9px] text-blue-600 font-extrabold uppercase tracking-wider">Đạt (5.0-6.4)</p>
                              <p className="text-2xl font-black text-blue-800 mt-1">{countDat}</p>
                              <p className="text-[10px] text-blue-500 font-bold mt-0.5">({totalGraded > 0 ? Math.round(countDat / totalGraded * 100) : 0}%)</p>
                            </div>
                            <div className="bg-red-50/60 border border-red-100 rounded-2xl p-4 text-center">
                              <p className="text-[9px] text-red-600 font-extrabold uppercase tracking-wider">Chưa đạt (&lt;5.0)</p>
                              <p className="text-2xl font-black text-red-800 mt-1">{countChuaDat}</p>
                              <p className="text-[10px] text-red-500 font-bold mt-0.5">({totalGraded > 0 ? Math.round(countChuaDat / totalGraded * 100) : 0}%)</p>
                            </div>
                          </div>

                          {/* Recharts Pie Chart */}
                          <div className="h-56 w-full flex flex-col sm:flex-row justify-around items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <div className="h-44 w-1/2 min-w-[160px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={45}
                                    outerRadius={65}
                                    paddingAngle={4}
                                    dataKey="value"
                                  >
                                    {pieChartData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip formatter={(value) => [`${value} HS`, 'Số lượng']} />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>

                            {/* Custom Legends */}
                            <div className="flex flex-col gap-2 text-xs font-bold text-slate-600 w-full sm:w-1/3">
                              {allLegendsData.map((entry, index) => {
                                const percentage = totalGraded > 0 ? Math.round(entry.value / totalGraded * 100) : 0;
                                return (
                                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/50 shadow-xs">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                      <span>{entry.name}</span>
                                    </div>
                                    <span className="font-extrabold text-slate-800">{entry.value} HS ({percentage}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Top Students Card */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center gap-1.5">
                            <Award size={16} className="text-amber-500" /> TOP 5 ĐIỂM CAO NHẤT
                          </h3>

                          <div className="divide-y divide-slate-100">
                            {topStudents.map((item, index) => (
                              <div key={item.student.id} className="flex items-center justify-between py-3">
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                                    index === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' : index === 1 ? 'bg-slate-200 text-slate-700' : index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <div>
                                    <p className="text-xs font-extrabold text-slate-800">{item.student.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400">Mã HS: {item.student.id}</p>
                                  </div>
                                </div>
                                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${
                                  item.score >= 8.0 ? 'bg-emerald-50 text-emerald-700' : item.score >= 6.5 ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                                }`}>
                                  {item.score.toFixed(1)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                        <Award size={40} className="text-slate-300 mx-auto mb-3" />
                        <h3 className="text-sm font-extrabold text-slate-700">Chưa có bảng điểm được công bố</h3>
                        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">Giáo viên chủ nhiệm hoặc ban học vụ hiện chưa nhập hoặc công bố điểm cho môn {academicStatsSubject} tại lớp {selectedClassName} thuộc kỳ/đợt này.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* STATS SUBTAB 2: VIOLATION STATS */}
              {statsSubTab === 'violations' && (() => {
                // Determine monthly violation statistics
                const months = [
                  { value: 'all', label: 'Tất cả các tháng (Cả năm)' },
                  { value: '1', label: 'Tháng 1' },
                  { value: '2', label: 'Tháng 2' },
                  { value: '3', label: 'Tháng 3' },
                  { value: '4', label: 'Tháng 4' },
                  { value: '5', label: 'Tháng 5' },
                  { value: '6', label: 'Tháng 6' },
                  { value: '7', label: 'Tháng 7' },
                  { value: '8', label: 'Tháng 8' },
                  { value: '9', label: 'Tháng 9' },
                  { value: '10', label: 'Tháng 10' },
                  { value: '11', label: 'Tháng 11' },
                  { value: '12', label: 'Tháng 12' },
                ];

                const filteredStatsViolations = violations.filter(v => {
                  // Filter by class (allowing 'all' for toàn trường)
                  const matchesClass = violationStatsClassId === 'all' || v.classId === violationStatsClassId;
                  
                  // Filter by month
                  let matchesMonth = true;
                  if (violationStatsMonth !== 'all') {
                    const vMonth = new Date(v.date).getMonth() + 1;
                    matchesMonth = vMonth === parseInt(violationStatsMonth);
                  }
                  
                  return matchesClass && matchesMonth;
                });

                const totalViolations = filteredStatsViolations.length;
                const totalPointsDeducted = filteredStatsViolations.reduce((sum, v) => sum + Math.abs(v.points), 0);

                // Group by type for graph distribution
                const violationTypeCounts: Record<string, number> = {};
                filteredStatsViolations.forEach(v => {
                  violationTypeCounts[v.type] = (violationTypeCounts[v.type] || 0) + 1;
                });

                const groupedViolationData = Object.entries(violationTypeCounts)
                  .map(([name, value]) => ({ name, value }))
                  .sort((a, b) => b.value - a.value);

                // Group by groupName (Tổ)
                const violationsByGroup: Record<string, number> = {
                  'Tổ 1': 0,
                  'Tổ 2': 0,
                  'Tổ 3': 0,
                  'Tổ 4': 0,
                  'Chưa phân tổ': 0
                };
                const pointsByGroup: Record<string, number> = {
                  'Tổ 1': 0,
                  'Tổ 2': 0,
                  'Tổ 3': 0,
                  'Tổ 4': 0,
                  'Chưa phân tổ': 0
                };

                filteredStatsViolations.forEach(v => {
                  const std = students.find(s => s.id === v.studentId) || allStudents.find(s => s.id === v.studentId);
                  const gName = std?.groupName || 'Chưa phân tổ';
                  if (violationsByGroup[gName] !== undefined) {
                    violationsByGroup[gName]++;
                    pointsByGroup[gName] += Math.abs(v.points);
                  } else {
                    violationsByGroup[gName] = (violationsByGroup[gName] || 0) + 1;
                    pointsByGroup[gName] = (pointsByGroup[gName] || 0) + Math.abs(v.points);
                  }
                });

                const activeClassName = violationStatsClassId === 'all' 
                  ? 'Toàn trường' 
                  : classes.find(c => c.id === violationStatsClassId)?.name || 'Lớp';

                const selectedMonthLabel = months.find(m => m.value === violationStatsMonth)?.label || '';

                return (
                  <div className="space-y-6">
                    {/* Controls Bar */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-200/60 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 w-full">
                        {/* Selector Năm học */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Năm học</span>
                          <div className="bg-slate-100 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200 truncate select-none">
                            {schoolYears.find(y => y.id === selectedSchoolYearId)?.name || 'Chưa chọn'}
                          </div>
                        </div>

                        {/* Selector Lớp (Toàn trường + các lớp) */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Tập thể lớp</span>
                          <select
                            value={violationStatsClassId}
                            onChange={(e) => setViolationStatsClassId(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600 transition shadow-sm cursor-pointer"
                          >
                            <option value="all">⭐ (Toàn trường)</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Selector Tháng */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-bold">Tháng kiểm tra</span>
                          <select
                            value={violationStatsMonth}
                            onChange={(e) => setViolationStatsMonth(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-600 transition shadow-sm cursor-pointer"
                          >
                            {months.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {totalViolations > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Bento Overview and Graph */}
                        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                              <ShieldAlert size={15} className="text-red-500" /> THỐNG KÊ BIỂU ĐỒ VI PHẠM - {activeClassName}
                            </h3>
                            <span className="text-[10px] font-black text-slate-400 uppercase">
                              {selectedMonthLabel}
                            </span>
                          </div>

                          {/* Quick numbers */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-red-50/50 border border-red-100/80 rounded-2xl p-5 text-center shadow-xs flex flex-col justify-between">
                              <div>
                                <p className="text-[10px] font-extrabold text-red-600 uppercase tracking-wider">Tổng số vụ vi phạm</p>
                                <p className="text-3xl font-black text-red-700 mt-1">{totalViolations}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">Lượt biên bản xử lý</p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-red-100/80 grid grid-cols-2 gap-2 text-[10px]">
                                {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map(group => (
                                  <div key={group} className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-red-100/40 shadow-2xs">
                                    <span className="font-bold text-slate-500">{group}:</span>
                                    <span className="font-black text-red-600">{violationsByGroup[group] || 0}</span>
                                  </div>
                                ))}
                                {violationsByGroup['Chưa phân tổ'] > 0 && (
                                  <div className="col-span-2 flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-red-100/40 shadow-2xs">
                                    <span className="font-bold text-slate-500">Chưa phân tổ:</span>
                                    <span className="font-black text-red-600">{violationsByGroup['Chưa phân tổ']}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-amber-50/50 border border-amber-100/80 rounded-2xl p-5 text-center shadow-xs flex flex-col justify-between">
                              <div>
                                <p className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider">Tổng số điểm thi đua bị trừ</p>
                                <p className="text-3xl font-black text-amber-700 mt-1">-{totalPointsDeducted}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-1">Điểm đánh giá nề nếp</p>
                              </div>
                              <div className="mt-4 pt-3 border-t border-amber-100/80 grid grid-cols-2 gap-2 text-[10px]">
                                {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map(group => (
                                  <div key={group} className="flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-amber-100/40 shadow-2xs">
                                    <span className="font-bold text-slate-500">{group}:</span>
                                    <span className="font-black text-amber-700">
                                      {pointsByGroup[group] > 0 ? `-${pointsByGroup[group]}` : '0'}
                                    </span>
                                  </div>
                                ))}
                                {pointsByGroup['Chưa phân tổ'] > 0 && (
                                  <div className="col-span-2 flex items-center justify-between px-2 py-1 bg-white rounded-lg border border-amber-100/40 shadow-2xs">
                                    <span className="font-bold text-slate-500">Chưa phân tổ:</span>
                                    <span className="font-black text-amber-700">-{pointsByGroup['Chưa phân tổ']}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Bảng thống kê thi đua từng tổ */}
                          {(() => {
                            const groupsList = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'];
                            const detailedGroupsStats = groupsList.map(gName => {
                              const groupViolations = filteredStatsViolations.filter(v => {
                                const std = students.find(s => s.id === v.studentId) || allStudents.find(s => s.id === v.studentId);
                                return (std?.groupName || 'Chưa phân tổ') === gName;
                              });
                              
                              const typesMap: Record<string, number> = {};
                              groupViolations.forEach(v => {
                                typesMap[v.type] = (typesMap[v.type] || 0) + 1;
                              });
                              const primaryType = Object.entries(typesMap).sort((a,b) => b[1] - a[1])[0]?.[0] || 'Không có vi phạm';
                              
                              return {
                                name: gName,
                                violationsCount: groupViolations.length,
                                pointsDeducted: groupViolations.reduce((sum, v) => sum + Math.abs(v.points), 0),
                                primaryType
                              };
                            });

                            const sortedGroupsForRanking = [...detailedGroupsStats].sort((a, b) => a.pointsDeducted - b.pointsDeducted);

                            return (
                              <div className="space-y-4 pt-5 border-t border-slate-100 animate-fadeIn">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <BarChart2 size={13} className="text-blue-500" /> BẢNG THỐNG KÊ THI ĐUA VÀ VI PHẠM THEO TỔ
                                  </h4>
                                  <span className="text-[10px] text-slate-400 font-bold italic max-sm:hidden">(Hạng càng cao khi điểm trừ càng ít)</span>
                                </div>
                                
                                <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                                  <table className="w-full text-xs text-left text-slate-600">
                                    <thead className="bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                      <tr>
                                        <th className="px-4 py-3 text-center w-16">Hạng</th>
                                        <th className="px-4 py-3 w-24">Tổ</th>
                                        <th className="px-4 py-3 text-center">Số lần vi phạm</th>
                                        <th className="px-4 py-3 text-center">Tổng điểm bị trừ</th>
                                        <th className="px-4 py-3">Hành vi chủ yếu</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {sortedGroupsForRanking.map((g, idx) => {
                                        const rank = idx + 1;
                                        let badgeColor = 'bg-slate-100 text-slate-600 border border-slate-200/40';
                                        if (rank === 1 && g.pointsDeducted === 0) badgeColor = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
                                        else if (rank === 1) badgeColor = 'bg-amber-100 text-amber-800 border border-amber-200';
                                        else if (rank === 2) badgeColor = 'bg-slate-200 text-slate-800 border border-slate-300';
                                        else if (rank === 3) badgeColor = 'bg-orange-50 text-orange-700 border border-orange-100';
                                        else if (rank === 4) badgeColor = 'bg-red-50 text-red-700 border border-red-100';

                                        return (
                                          <tr key={g.name} className="hover:bg-slate-50/50 transition">
                                            <td className="px-4 py-3.5 text-center font-black">
                                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${badgeColor}`}>
                                                {rank}
                                              </span>
                                            </td>
                                            <td className="px-4 py-3.5 font-extrabold text-slate-800">{g.name}</td>
                                            <td className="px-4 py-3.5 text-center">
                                              <div className="flex items-center justify-center gap-2">
                                                <span className="font-extrabold text-slate-700">{g.violationsCount} lần</span>
                                                <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden max-md:hidden">
                                                  <div 
                                                    className="bg-red-500 h-full rounded-full" 
                                                    style={{ width: `${Math.min(100, (g.violationsCount / Math.max(1, totalViolations)) * 100)}%` }}
                                                  ></div>
                                                </div>
                                              </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center font-black text-rose-600">
                                              {g.pointsDeducted > 0 ? `-${g.pointsDeducted}đ` : '0đ'}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-500 font-semibold max-w-[150px] truncate" title={g.primaryType}>
                                              {g.primaryType}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Graph list */}
                          <div className="space-y-4">
                            <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Phân bổ theo hành vi vi phạm</h4>
                            {groupedViolationData.length > 0 ? (
                              <div className="h-56 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={groupedViolationData} margin={{ top: 10, right: 10, bottom: 5, left: -25 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} />
                                    <YAxis tick={{ fontSize: 9, fontWeight: 'bold', fill: '#64748b' }} allowDecimals={false} />
                                    <Tooltip formatter={(value) => [`${value} vụ`, 'Tần suất']} />
                                    <Bar dataKey="value" fill="#ef4444" radius={[6, 6, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            ) : (
                              <p className="text-slate-400 text-xs italic text-center py-10">Chưa có thông tin phân bổ hành vi.</p>
                            )}
                          </div>
                        </div>

                        {/* Chronological logs list */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col h-[480px]">
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-3 border-b border-slate-100 flex items-center gap-1.5 flex-shrink-0">
                            <Clock size={16} className="text-blue-500" /> SỔ GHI CHÉP CHI TIẾT
                          </h3>

                          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2.5">
                            {filteredStatsViolations.map((v) => {
                              const std = students.find(s => s.id === v.studentId) || allStudents.find(s => s.id === v.studentId);
                              const classItem = classes.find(c => c.id === v.classId) || allClasses.find(c => c.id === v.classId);

                              return (
                                <div key={v.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1.5 hover:border-slate-200 transition">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-xs font-black text-slate-800">{v.studentName || std?.name || 'Học sinh'}</p>
                                      <p className="text-[9px] font-extrabold text-slate-400 uppercase mt-0.5">
                                        Lớp {classItem?.name || v.className} • Ngày {(v.date || '').split('-').reverse().join('/')}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-black bg-red-50 text-red-600 px-2 py-0.5 rounded-lg border border-red-100">
                                      -{Math.abs(v.points)}đ
                                    </span>
                                  </div>
                                  <p className="text-[11px] font-bold text-slate-700 bg-white px-2 py-1.5 rounded-lg border border-slate-200/40">
                                    {v.type}
                                  </p>
                                  {v.note && (
                                    <p className="text-[10px] text-slate-500 italic leading-relaxed">
                                      Ghi chú: {v.note}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                        <CheckCircle size={40} className="text-emerald-400 mx-auto mb-3" />
                        <h3 className="text-sm font-extrabold text-slate-700">Không phát hiện vi phạm nề nếp</h3>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">Chúc mừng tập thể {activeClassName}! Hệ thống không ghi nhận bất kỳ biên bản vi phạm nề nếp hay chuyên cần nào trong {selectedMonthLabel.toLowerCase()}.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB CONTENT: TIMETABLE & PLAN */}
          {activeTab === 'timetable' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Class selector and overall header */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-blue-900 uppercase tracking-widest">
                      THỜI KHÓA BIỂU & HOẠT ĐỘNG LỚP HỌC
                    </h3>
                    <p className="text-[11px] text-slate-400">Chọn lớp và sử dụng menu bên dưới để tra cứu các hoạt động, sơ đồ lớp, dặn dò và trực nhật.</p>
                  </div>

                  <select
                    value={timetableClassId}
                    onChange={(e) => updateSelectedClass(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-600"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Horizontal Sub-menu exact replica of image */}
                <div className="bg-slate-100/60 border border-slate-200/60 rounded-2xl p-1.5 flex flex-wrap items-center gap-1 select-none">
                  <button
                    onClick={() => setTimetableSubTab('groups')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      timetableSubTab === 'groups'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200/50 font-black'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <Users size={14} className="text-blue-600" />
                    <span>Danh sách tổ</span>
                  </button>

                  <button
                    onClick={() => setTimetableSubTab('seating')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      timetableSubTab === 'seating'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200/50 font-black'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <Grid size={14} className="text-slate-600" />
                    <span>Sơ đồ Ghế ngồi</span>
                  </button>

                  <button
                    onClick={() => setTimetableSubTab('timetable')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      timetableSubTab === 'timetable'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200/50 font-black'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <Calendar size={14} className="text-slate-600" />
                    <span>Thời khóa biểu Tuần</span>
                  </button>

                  <button
                    onClick={() => setTimetableSubTab('reminders')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      timetableSubTab === 'reminders'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200/50 font-black'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <span>Dặn dò hàng ngày</span>
                  </button>

                  <button
                    onClick={() => setTimetableSubTab('duty')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                      timetableSubTab === 'duty'
                        ? 'bg-white text-blue-900 shadow-sm border border-slate-200/50 font-black'
                        : 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900'
                    }`}
                  >
                    <span>Lịch trực nhật</span>
                  </button>
                </div>

                {/* SubTab contents */}
                <div className="pt-2">

                  {/* SUBTAB: DANH SÁCH TỔ */}
                  {timetableSubTab === 'groups' && (
                    <div className="space-y-6 animate-fadeIn">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].map((gName, idx) => {
                          const groupStudents = students.filter(s => s.classId === timetableClassId && s.groupName === gName);
                          const colors = [
                            { bg: 'bg-blue-50/50 border-blue-100', text: 'text-blue-800', badge: 'bg-blue-500/10 text-blue-600 border-blue-200' },
                            { bg: 'bg-emerald-50/50 border-emerald-100', text: 'text-emerald-800', badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
                            { bg: 'bg-purple-50/50 border-purple-100', text: 'text-purple-800', badge: 'bg-purple-500/10 text-purple-600 border-purple-200' },
                            { bg: 'bg-rose-50/50 border-rose-100', text: 'text-rose-800', badge: 'bg-rose-500/10 text-rose-600 border-rose-200' },
                          ];
                          const c = colors[idx];

                          return (
                            <div key={gName} className={`border rounded-2xl p-4 shadow-sm flex flex-col space-y-3 ${c.bg}`}>
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                <h4 className={`text-xs font-black uppercase tracking-wider ${c.text}`}>{gName}</h4>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${c.badge}`}>
                                  {groupStudents.length} HS
                                </span>
                              </div>
                              
                              <div className="flex-1 overflow-y-auto max-h-[350px] space-y-2 custom-scrollbar">
                                {groupStudents.length > 0 ? (
                                  groupStudents.map((s, sIdx) => (
                                    <div key={s.id} className="p-2.5 bg-white border border-slate-200/50 rounded-xl flex items-center justify-between shadow-2xs hover:shadow-xs transition">
                                      <div className="space-y-0.5">
                                        <p className="text-xs font-extrabold text-slate-800">{s.name}</p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase">{s.id}</p>
                                      </div>
                                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                        s.gender === 'Nữ' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                      }`}>
                                        {s.gender}
                                      </span>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[11px] text-slate-400 italic text-center py-6">Chưa phân học sinh vào tổ.</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SUBTAB: SƠ ĐỒ GHẾ NGỒI */}
                  {timetableSubTab === 'seating' && (() => {
                    const classStudents = students.filter(s => s.classId === timetableClassId);
                    
                    // Find largest seated layout coordinate, fallback to 4x6 standard
                    const activeRows = Math.max(4, ...classStudents.filter(s => s.seatRow !== undefined).map(s => s.seatRow! + 1));
                    const activeCols = Math.max(6, ...classStudents.filter(s => s.seatCol !== undefined).map(s => s.seatCol! + 1));

                    return (
                      <div className="space-y-6 animate-fadeIn">
                        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col items-center">
                          {/* Blackboard visual */}
                          <div className="w-2/3 max-w-sm bg-slate-700 text-white-pure border-t-4 border-amber-500 py-3 rounded-b-xl text-center shadow-md mb-10 select-none">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">BẢNG ĐEN / BÀN GIÁO VIÊN</span>
                          </div>

                          {/* Seating Grid Map */}
                          <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                            <div 
                              className="grid gap-3.5 mx-auto"
                              style={{
                                gridTemplateColumns: `repeat(${activeCols}, minmax(110px, 1fr))`,
                                width: 'max-content',
                                maxWidth: '100%'
                              }}
                            >
                              {Array.from({ length: activeRows }).map((_, rIndex) => (
                                Array.from({ length: activeCols }).map((_, cIndex) => {
                                  const student = classStudents.find(s => s.seatRow === rIndex && s.seatCol === cIndex);

                                  return (
                                    <div
                                      key={`${rIndex}-${cIndex}`}
                                      className={`aspect-square w-28 rounded-2xl p-2.5 border transition flex flex-col justify-between select-none relative ${
                                        student
                                          ? student.gender === 'Nữ'
                                            ? 'bg-rose-50 border-rose-200/80 text-rose-800 hover:bg-rose-100/50'
                                            : 'bg-blue-50 border-blue-200/80 text-blue-800 hover:bg-blue-100/50'
                                          : 'bg-slate-50/50 border-dashed border-slate-200 text-slate-400'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <span className="text-[8px] font-black font-mono tracking-wider text-slate-400">
                                          H{rIndex + 1}-C{cIndex + 1}
                                        </span>
                                        {student?.groupName && (
                                          <span className={`text-[8px] font-black px-1 py-0.5 rounded ${
                                            student.gender === 'Nữ' 
                                              ? 'bg-rose-200/40 text-rose-700 border border-rose-200' 
                                              : 'bg-blue-200/40 text-blue-700 border border-blue-200'
                                          }`}>
                                            {student.groupName.replace('Tổ ', 'T')}
                                          </span>
                                        )}
                                      </div>

                                      {student ? (
                                        <div className="text-center space-y-0.5">
                                          <p className="text-[10px] font-black tracking-tight leading-tight text-slate-800 line-clamp-2">
                                            {student.name}
                                          </p>
                                          <p className={`text-[8px] font-black tracking-wider ${
                                            student.gender === 'Nữ' ? 'text-rose-600/70' : 'text-blue-600/70'
                                          }`}>
                                            {student.id}
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="text-center py-3 opacity-60">
                                          <span className="text-[9px] font-bold italic text-slate-400">Trống</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ))}
                            </div>
                          </div>

                          {/* Legend explanatory notes */}
                          <div className="flex flex-wrap gap-5 mt-6 border-t border-slate-100 pt-5 w-full justify-center text-[10px] font-bold">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 bg-blue-50 border border-blue-200 rounded-md" />
                              <span className="text-slate-600">Học sinh Nam</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 bg-rose-50 border border-rose-200 rounded-md" />
                              <span className="text-slate-600">Học sinh Nữ</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUBTAB: THỜI KHÓA BIỂU TUẦN */}
                  {timetableSubTab === 'timetable' && (
                    <div className="space-y-6 animate-fadeIn">
                      {/* BUỔI SÁNG TABLE */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm overflow-x-auto custom-scrollbar">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Buổi Sáng (Từ Tiết 1 đến Tiết 5)</h4>
                        </div>

                        <table className="w-full text-xs text-left text-slate-600 border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                              <th className="py-3 px-4 font-extrabold w-16">Tiết</th>
                              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(day => (
                                <th key={day} className="py-3 px-4 font-extrabold text-center">{day}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Array.from({ length: 5 }).map((_, pIndex) => {
                              const period = pIndex + 1;
                              return (
                                <tr key={`morning-p-${period}`} className="hover:bg-slate-50/30 transition">
                                  <td className="py-3 px-4 font-extrabold text-amber-600 font-mono">Tiết {period}</td>
                                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(day => {
                                    const cell = timetable.find(c => c.day === day && c.period === period && c.session === 'Sáng');
                                    const sub = cell?.subject || '';
                                    return (
                                      <td key={day} className="py-3 px-2 text-center transition">
                                        <div className={`mx-auto max-w-[120px] px-2.5 py-2 rounded-xl border text-[11px] ${
                                          sub
                                            ? sub === 'Chào cờ' || sub === 'Sinh hoạt lớp'
                                              ? 'bg-amber-50 border-amber-200 text-amber-700 font-black'
                                              : 'bg-blue-50 border-blue-100 text-blue-700 font-bold'
                                            : 'bg-transparent border-dashed border-slate-200 text-slate-300'
                                        }`}>
                                          {sub || <span className="text-[10px] opacity-40 italic">Trống</span>}
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
                      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm overflow-x-auto custom-scrollbar">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Buổi Chiều (Từ Tiết 1 đến Tiết 5)</h4>
                        </div>

                        <table className="w-full text-xs text-left text-slate-600 border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50">
                              <th className="py-3 px-4 font-extrabold w-16">Tiết</th>
                              {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(day => (
                                <th key={day} className="py-3 px-4 font-extrabold text-center">{day}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {Array.from({ length: 5 }).map((_, pIndex) => {
                              const period = pIndex + 1;
                              return (
                                <tr key={`afternoon-p-${period}`} className="hover:bg-slate-50/30 transition">
                                  <td className="py-3 px-4 font-extrabold text-blue-600 font-mono">Tiết {period}</td>
                                  {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'].map(day => {
                                    const cell = timetable.find(c => c.day === day && c.period === period && c.session === 'Chiều');
                                    const sub = cell?.subject || '';
                                    return (
                                      <td key={day} className="py-3 px-2 text-center transition">
                                        <div className={`mx-auto max-w-[120px] px-2.5 py-2 rounded-xl border text-[11px] ${
                                          sub
                                            ? 'bg-blue-50 border-blue-100 text-blue-700 font-bold'
                                            : 'bg-transparent border-dashed border-slate-200 text-slate-300'
                                        }`}>
                                          {sub || <span className="text-[10px] opacity-40 italic">Trống</span>}
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
                  )}

                  {/* SUBTAB: DẶN DÒ HÀNG NGÀY & BẢNG THEO DÕI HỌC TẬP */}
                  {timetableSubTab === 'reminders' && (() => {
                    const classStudents = students.filter(s => s.classId === timetableClassId);
                    const vnDateLabel = formatVietnameseDate(selectedDate);
                    const subjectsList = ['Toán', 'Lý', 'Hóa', 'Văn', 'Anh', 'Sử', 'Địa', 'Tin'];

                    const handleIncrement = (studentId: string, subject: string) => {
                      const key = `${studentId}_${subject}`;
                      const currentVal = participationData[key] || 0;
                      const updated = {
                        ...participationData,
                        [key]: currentVal + 1
                      };
                      setParticipationData(updated);
                      const storageKey = `app_participation_${timetableClassId}_${selectedDate}`;
                      localStorage.setItem(storageKey, JSON.stringify(updated));
                    };

                    const handleDecrement = (studentId: string, subject: string) => {
                      const key = `${studentId}_${subject}`;
                      const currentVal = participationData[key] || 0;
                      if (currentVal === 0) return;
                      const updated = {
                        ...participationData,
                        [key]: currentVal - 1
                      };
                      setParticipationData(updated);
                      const storageKey = `app_participation_${timetableClassId}_${selectedDate}`;
                      localStorage.setItem(storageKey, JSON.stringify(updated));
                    };

                    const handleSaveReminder = () => {
                      const reminderKey = `app_reminders_${timetableClassId}_${selectedDate}`;
                      localStorage.setItem(reminderKey, reminderText);
                      setIsEditingReminders(false);
                    };

                    return (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Date Picker controls */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                              <Clock size={14} /> THEO DÕI HỌC TẬP & DẶN DÒ THEO NGÀY
                            </h4>
                            <p className="text-[11px] text-slate-500 font-bold uppercase">{vnDateLabel}</p>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-xs font-black text-slate-500">CHỌN NGÀY:</span>
                            <input
                              type="date"
                              value={selectedDate}
                              onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setIsEditingReminders(false);
                              }}
                              className="bg-transparent text-xs font-bold text-slate-700 outline-none border-none cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Reminders layout */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <FileText size={15} className="text-blue-500" /> BẢNG NỘI DUNG DẶN DÒ HÀNG NGÀY
                            </h3>
                          </div>

                          <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl space-y-2">
                            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Thông báo từ Giáo viên chủ nhiệm:</p>
                            <div className="text-xs font-bold text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {reminderText ? reminderText : 'Không có dặn dò đặc biệt cho ngày học này.'}
                            </div>
                          </div>
                        </div>

                        {/* Learning Participation Board exactly as requested */}
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                          <div className="pb-2 border-b border-slate-100">
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <TrendingUp size={15} className="text-emerald-500" /> BẢNG THEO DÕI HỌC TẬP (SỐ LẦN PHÁT BIỂU XÂY DỰNG BÀI)
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{vnDateLabel}.</p>
                          </div>

                          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-3xs custom-scrollbar">
                            <table className="w-full text-xs text-left text-slate-600 border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50/50 select-none">
                                  <th className="py-3.5 px-4 font-extrabold w-16 text-center">STT</th>
                                  <th className="py-3.5 px-4 font-extrabold">Họ và Tên</th>
                                  {subjectsList.map(sub => (
                                    <th key={sub} className="py-3.5 px-3 font-extrabold text-center w-24">{sub}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {classStudents.length > 0 ? (
                                  classStudents.map((student, sIdx) => (
                                    <tr key={student.id} className="hover:bg-slate-50/40 transition">
                                      <td className="py-3 px-4 font-black text-slate-400 text-center font-mono">{sIdx + 1}</td>
                                      <td className="py-3 px-4 font-extrabold text-slate-800">{student.name}</td>
                                      {subjectsList.map(sub => {
                                        const key = `${student.id}_${sub}`;
                                        const count = participationData[key] || 0;
                                        return (
                                          <td key={sub} className="py-2 px-1 text-center">
                                            <span className={`inline-flex items-center justify-center w-8 h-6 rounded-md font-mono text-xs font-black ${
                                              count > 0 
                                                ? count >= 3 
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                  : 'bg-blue-50 text-blue-700 border border-blue-200' 
                                                : 'text-slate-300 bg-slate-50 border border-slate-100'
                                            }`}>
                                              {count}
                                            </span>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={10} className="py-8 text-center text-slate-400 italic font-medium select-none">
                                      Chưa có danh sách học sinh cho lớp này.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          
                          <div className="flex items-center gap-1.5 p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                            <Info size={14} className="text-blue-500 shrink-0" />
                            <p className="text-[10px] text-slate-500 leading-normal font-semibold">
                              Bảng số liệu số lần phát biểu xây dựng bài của học sinh được cập nhật hàng ngày bởi Giáo viên chủ nhiệm lớp.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SUBTAB: LỊCH TRỰC NHẬT */}
                  {timetableSubTab === 'duty' && (() => {
                    const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

                    return (
                      <div className="space-y-6 animate-fadeIn">
                        {/* Week Selection controls */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                              <Calendar size={14} className="text-blue-600" /> BẢNG PHÂN CÔNG TRỰC NHẬT THEO TUẦN
                            </h4>
                            <p className="text-[11px] text-slate-500 font-bold uppercase">
                              Tuần {selectedDutyWeek} - {weeksList.find(w => w.weekNumber === selectedDutyWeek)?.label || ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-3xs">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">CHỌN TUẦN:</span>
                            <select
                              value={selectedDutyWeek}
                              onChange={(e) => setSelectedDutyWeek(Number(e.target.value))}
                              className="bg-transparent text-xs font-bold text-slate-700 outline-none border-none cursor-pointer"
                            >
                              {weeksList.map((w) => (
                                <option key={w.weekNumber} value={w.weekNumber}>
                                  {w.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {daysOfWeek.map((day) => {
                            const data = dutySchedule[day] || { group: 'Tổ 1', sweeping: 'Chưa phân công', cleaningBoard: 'Chưa phân công', trash: 'Chưa phân công' };

                            return (
                              <div key={day} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{day}</h4>
                                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 select-none">
                                    <span>{data.group} trực</span>
                                    <ChevronDown size={11} className="text-slate-400" />
                                  </div>
                                </div>

                                <div className="space-y-3.5 text-xs">
                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Quét lớp & Lau sàn</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 text-xs min-h-[32px] flex items-center">
                                      {data.sweeping || <span className="text-slate-400 font-normal italic">Chưa phân công</span>}
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Lau bảng & Bàn giáo viên</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 text-xs min-h-[32px] flex items-center">
                                      {data.cleaningBoard || <span className="text-slate-400 font-normal italic">Chưa phân công</span>}
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide">Đổ rác & Tắt điện nước</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 text-xs min-h-[32px] flex items-center">
                                      {data.trash || <span className="text-slate-400 font-normal italic">Chưa phân công</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

              {/* Class weekly objectives / highlights from Weekly Plan (always visible at the bottom) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100">
                  MỤC TIÊU & HOẠT ĐỘNG TRỌNG TÂM LỚP TRONG TUẦN
                </h3>

                {classPlansSorted.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left panel: Plan list (Weeks 1 to N) */}
                    <div className="lg:col-span-1 space-y-2 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {classPlansSorted.map((plan) => {
                        const isSelected = activePlan?.id === plan.id;
                        return (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedPlanId(plan.id)}
                            className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col space-y-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-300 text-blue-900'
                                : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <h4 className={`text-xs font-extrabold uppercase tracking-tight ${
                              isSelected ? 'text-blue-900 font-black' : 'text-slate-800'
                            }`}>
                              Tuần {plan.weekNumber}: {plan.title}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">
                              {plan.dateRange}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {/* Right panel: Selected plan details */}
                    <div className="lg:col-span-2 border-l border-slate-100 pl-0 lg:pl-6 space-y-4">
                      {activePlan ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Mục tiêu trọng tâm</p>
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                              {activePlan.objectives || 'Chưa thiết lập mục tiêu chi tiết.'}
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Nội dung chi tiết hoạt động</p>
                            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                              {activePlan.content || 'Chưa cập nhật nội dung hoạt động.'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-slate-400 italic text-xs h-full flex items-center justify-center">
                          Vui lòng chọn một kế hoạch tuần từ danh sách bên trái để xem chi tiết.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 italic text-xs">
                    Giáo viên chủ nhiệm lớp chưa đăng tải kế hoạch hoạt động cụ thể lên Cổng thông tin.
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: NEWS */}
          {activeTab === 'news' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Category Filter bar */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600"></div>
                    <h3 className="text-xs font-black text-blue-900 uppercase tracking-widest">BỘ LỌC CHUYÊN MỤC</h3>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Chọn một chuyên mục để xem tin tức</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Chuyên mục:</span>
                  <div className="flex flex-wrap gap-2">
                    {['Tất cả', 'Học vụ', 'Đào tạo', 'Phong trào', 'Nề nếp', 'Khác'].map(category => {
                      const isActive = newsCategoryFilter === category;
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setNewsCategoryFilter(category);
                            setActiveNewsId(null);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            isActive 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-black' 
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-blue-900'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* News Split Layout */}
              {(() => {
                const filteredAnnouncements = announcements.filter(ann => 
                  newsCategoryFilter === 'Tất cả' || ann.category === newsCategoryFilter
                );

                const currentActiveId = activeNewsId && filteredAnnouncements.some(ann => ann.id === activeNewsId)
                  ? activeNewsId
                  : filteredAnnouncements[0]?.id || null;

                const selectedNews = filteredAnnouncements.find(ann => ann.id === currentActiveId);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Left side: News Titles List */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="bg-slate-100/50 rounded-2xl p-3 text-slate-500 text-[10px] font-bold uppercase tracking-wider text-center border border-slate-200/40">
                        Danh sách bài viết ({filteredAnnouncements.length})
                      </div>

                      {filteredAnnouncements.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 italic text-xs">
                          Chưa có tin tức nào thuộc chuyên mục này.
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
                          {filteredAnnouncements.map(ann => {
                            const isSelected = ann.id === currentActiveId;
                            return (
                              <div
                                key={ann.id}
                                onClick={() => setActiveNewsId(ann.id)}
                                className={`p-4 rounded-2xl border transition duration-150 cursor-pointer space-y-2 text-left ${
                                  isSelected 
                                    ? 'bg-blue-50/60 border-blue-300 shadow-2xs' 
                                    : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-slate-50/30'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400">
                                  <span className="font-mono">{ann.date}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[8px] uppercase">
                                      {ann.category}
                                    </span>
                                    {ann.isNew && (
                                      <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase animate-pulse">
                                        NEW
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <h4 className={`text-xs font-bold leading-relaxed line-clamp-3 transition ${
                                  isSelected ? 'text-blue-900 font-black' : 'text-slate-800'
                                }`}>
                                  {ann.title}
                                </h4>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Right side: News Content Detailed View */}
                    <div className="lg:col-span-3">
                      {selectedNews ? (
                        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5 animate-fadeIn">
                          {/* Article Header */}
                          <div className="border-b border-slate-100 pb-4 space-y-2.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                {selectedNews.category}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono font-bold">
                                Đăng ngày {selectedNews.date}
                              </span>
                              {selectedNews.isNew && (
                                <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full uppercase">
                                  NEW
                                </span>
                              )}
                            </div>
                            <h2 className="text-sm md:text-base font-black text-slate-800 leading-relaxed">
                              {selectedNews.title}
                            </h2>
                          </div>

                          {/* Article Body */}
                          <div className="text-xs text-slate-600 leading-relaxed font-sans space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                            {parsePublicMarkdown(selectedNews.content || 'Nội dung bài viết đang được cập nhật...')}
                          </div>

                          {/* Article Footer action */}
                          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-semibold italic">THPT Nguyễn Hữu Cầu</span>
                            <button
                              onClick={() => {
                                setSelectedAnn(selectedNews);
                              }}
                              className="px-4 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/50 hover:border-blue-300 rounded-xl text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <Maximize2 size={12} /> Phóng to bài đọc
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 italic text-xs h-full flex flex-col items-center justify-center gap-2">
                          <BookOpen size={24} className="text-slate-300" />
                          <span>Chọn một bài viết ở danh mục bên trái để xem nội dung chi tiết.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          )}

          {/* TAB CONTENT: CONTACT */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
              
              {/* Left Column contact Info */}
              <div className="md:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">THÔNG TIN LIÊN HỆ</h3>
                </div>

                <div className="space-y-4 text-xs font-medium text-slate-600 leading-normal">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Địa chỉ chính thức</p>
                    <p className="text-slate-800 font-bold">123 Trung Mỹ Tây, Bà Điểm, Hóc Môn, TPHCM</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Số điện thoại văn phòng</p>
                    <p className="text-blue-700 font-extrabold">0909091634</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Hòm thư điện tử (Email)</p>
                    <p className="text-slate-800 font-bold">lienhe@thptnguyenhuucau.edu.vn</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Giờ làm việc hành chính</p>
                    <p className="text-slate-500">Thứ Hai - Thứ Bảy: 07:00 - 17:00</p>
                  </div>
                </div>
              </div>

              {/* Right Column Contact Form */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="pb-2 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">GỬI PHẢN HỒI Ý KIẾN PHỤ HUYNH</h3>
                  <span className="text-[9px] text-slate-400 font-bold">Phản hồi của bạn sẽ gửi trực tiếp đến GVCN & Ban giám hiệu</span>
                </div>

                {contactSuccess ? (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-5 rounded-2xl text-center space-y-2 animate-fadeIn">
                    <CheckCircle className="text-emerald-500 mx-auto" size={32} />
                    <h4 className="text-sm font-black uppercase">Gửi ý kiến phản hồi thành công!</h4>
                    <p className="text-xs text-emerald-600 font-medium">Xin chân thành cảm ơn quý Phụ huynh/Học sinh đã quan tâm đóng góp ý kiến xây dựng nề nếp nhà trường.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Họ và tên <span className="text-rose-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Ví dụ: Nguyễn Văn Hải"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Số điện thoại liên lạc</label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder="Ví dụ: 090xxxxxxx"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Địa chỉ Email</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        placeholder="Ví dụ: email@domain.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Nội dung phản hồi góp ý <span className="text-rose-500">*</span></label>
                      <textarea
                        required
                        rows={4}
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="Vui lòng mô tả chi tiết ý kiến phản hồi hoặc thắc mắc cần GVCN hỗ trợ..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-md cursor-pointer text-xs"
                    >
                      <Send size={14} /> Gửi ý kiến phản hồi
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}

        </section>

      </main>

      {/* 5. FOOTER OF WEBSITE */}
      <footer className="bg-[#111827] text-slate-400 py-8 px-6 md:px-12 border-t border-slate-800 text-xs">
        <div className="max-w-7xl w-full mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="text-blue-500" size={20} />
              <h4 className="font-extrabold text-white text-sm tracking-wide uppercase">THPT NGUYỄN HỮU CẦU</h4>
            </div>
            <p className="text-[11px] leading-relaxed">
              Cổng Thông Tin Nề Nếp & Chuyên Cần Giáo Dục. Hệ thống quản trị tiên tiến, đồng bộ và minh bạch thông tin học vụ.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Thông tin pháp lý</h4>
            <ul className="space-y-1 text-[11px]">
              <li>Trực thuộc: Sở Giáo dục và Đào tạo Thành phố Hồ Chí Minh</li>
              <li>Chịu trách nhiệm nội dung: GVCN - BCS LỚP</li>
              <li>Bản quyền © 2026 THPT Nguyễn Hữu Cầu. Bảo lưu mọi quyền.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">Kết nối & Hỗ trợ</h4>
            <p className="text-[11px]">Để được hỗ trợ kỹ thuật hoặc liên hệ trực tiếp Ban giám hiệu nhà trường, vui lòng quay số hotline hỗ trợ hoặc gửi email về hòm thư liên hệ.</p>
            <p className="text-amber-400 font-extrabold text-xs">Hotline 24/7: 0909091634</p>
          </div>
        </div>
      </footer>

      {/* 6. MODAL DETAILED ANNOUNCEMENT READ VIEW */}
      {selectedAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                    {selectedAnn.category}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono font-bold">
                    Đăng ngày {selectedAnn.date}
                  </span>
                </div>
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  CHI TIẾT TIN TỨC & THÔNG BÁO
                </h3>
              </div>
              <button
                onClick={() => setSelectedAnn(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <h2 className="text-sm font-black text-slate-800 leading-relaxed border-b border-slate-100 pb-3">
                {selectedAnn.title}
              </h2>
              
              <div className="text-xs text-slate-600 space-y-3 font-sans leading-relaxed">
                {parsePublicMarkdown(selectedAnn.content)}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedAnn(null)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide shadow-sm transition cursor-pointer"
              >
                Đóng bài đọc
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// Simple Markdown parser for the Public website (styled nicely for white/light background)
const parsePublicMarkdown = (text: string = ''): React.ReactNode => {
  if (!text) return <p className="text-slate-400 italic text-xs">Chưa có nội dung chi tiết cho thông báo này.</p>;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    let trimmed = line.trim();
    
    // Check for headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-sm font-extrabold text-blue-900 mt-4 mb-2 border-b border-slate-100 pb-1">
          {parsePublicInline(trimmed.substring(4))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-xs font-black text-slate-800 mt-3 mb-1.5">
          {parsePublicInline(trimmed.substring(5))}
        </h4>
      );
      return;
    }
    
    // Check for table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---')) return; // Ignore separator lines
      const cols = trimmed.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      elements.push(
        <div key={`tbl-${index}`} className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 border-b border-slate-100 font-mono text-[10px] text-slate-600 rounded">
          {cols.map((col, cIdx) => (
            <span key={cIdx} className="font-semibold">{parsePublicInline(col)}</span>
          ))}
        </div>
      );
      return;
    }
    
    // Check for bullet list
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <li key={`li-${index}`} className="text-xs text-slate-600 list-disc ml-4 mb-1.5 leading-relaxed">
          {parsePublicInline(trimmed.substring(2))}
        </li>
      );
      return;
    }
    
    // Check for numbered list
    const numMatch = trimmed.match(/^\d+\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <li key={`oli-${index}`} className="text-xs text-slate-600 list-decimal ml-4 mb-1.5 leading-relaxed">
          {parsePublicInline(numMatch[1])}
        </li>
      );
      return;
    }
    
    // Empty line
    if (trimmed === '') {
      elements.push(<div key={`space-${index}`} className="h-2"></div>);
      return;
    }
    
    // Normal paragraph
    elements.push(
      <p key={`p-${index}`} className="text-xs text-slate-600 leading-relaxed mb-2.5">
        {parsePublicInline(trimmed)}
      </p>
    );
  });
  
  return <div className="space-y-0.5">{elements}</div>;
};

const parsePublicInline = (text: string): React.ReactNode => {
  if (!text) return '';
  
  // Handle markdown image: ![desc](url)
  const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
  const hasImg = text.match(imgRegex);
  if (hasImg) {
    const match = imgRegex.exec(text);
    if (match) {
      const desc = match[1];
      const url = match[2];
      return (
        <div className="my-3 rounded-xl overflow-hidden border border-slate-150 shadow-sm max-h-[220px]">
          <img src={url} alt={desc} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <span className="block text-[10px] text-slate-400 text-center py-1.5 bg-slate-50">{desc}</span>
        </div>
      );
    }
  }
  
  // Parse bold (**text**)
  if (/\*\*.*?\*\*/.test(text)) {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-blue-900">{part.slice(2, -2)}</strong>;
      }
      return parsePublicInline(part);
    });
  }
  
  // Look for links [text](url)
  const linkRegex = /\[(.*?)\]\((.*?)\)/g;
  if (text.match(linkRegex)) {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = /\[(.*?)\]\((.*?)\)/.exec(part);
      if (match) {
        return <a key={i} href={match[2]} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">{match[1]}</a>;
      }
      return part;
    });
  }

  // Parse spans: <span style="color: #ff0000">[text]</span>
  if (text.includes('<span') && text.includes('</span>')) {
    const parts = text.split(/(<span style=".*?">.*?<\/span>)/g);
    return parts.map((part, i) => {
      const match = /<span style="(.*?)">(.*?)<\/span>/.exec(part);
      if (match) {
        const styleStr = match[1];
        const innerText = match[2];
        const styleObj: React.CSSProperties = {};
        
        if (styleStr.includes('color')) {
          const colorMatch = styleStr.match(/color:\s*(#[a-fA-F0-9]+|[a-zA-Z]+)/);
          if (colorMatch) styleObj.color = colorMatch[1];
        }
        if (styleStr.includes('font-size')) {
          const sizeMatch = styleStr.match(/font-size:\s*([0-9.a-zA-Z]+)/);
          if (sizeMatch) styleObj.fontSize = sizeMatch[1];
        }
        if (styleStr.includes('font-family')) {
          const fontMatch = styleStr.match(/font-family:\s*([a-zA-Z,\s]+)/);
          if (fontMatch) styleObj.fontFamily = fontMatch[1];
        }
        
        return <span key={i} style={styleObj}>{innerText}</span>;
      }
      return part;
    });
  }
  
  return text;
};

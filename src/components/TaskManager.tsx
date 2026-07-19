/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Student, ViolationRecord, StudentTask, WeeklyPlan } from '../types';
import { Plus, CheckCircle, Clock, Play, Trash2, FileText, Download, TrendingUp, Sparkles, AlertCircle, Award, Edit3, Search, Printer } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { CustomConfirmModal } from './CustomConfirmModal';
import { getWeekConfig, generateWeeks, isDateInWeek } from '../utils/weekUtils';
import { db, onSnapshot, doc } from '../lib/firebase';

interface TaskManagerProps {
  students: Student[];
  violations: ViolationRecord[];
  tasks: StudentTask[];
  plans: WeeklyPlan[];
  onAddTask: (task: StudentTask) => void;
  onUpdateTask: (task: StudentTask) => void;
  onDeleteTask: (id: string) => void;
  activeClassName?: string;
  teacherName?: string;
  isReadOnly?: boolean;
}

export default function TaskManager({
  students,
  violations,
  tasks,
  plans,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  activeClassName,
  teacherName,
  isReadOnly = false
}: TaskManagerProps) {
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

  const [activeTab, setActiveTab] = useState<'assign' | 'report'>('assign');
  const reportPrintRef = useRef<HTMLDivElement>(null);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Task Form States
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskStudentId, setTaskStudentId] = useState('Tất cả');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDeadline, setTaskDeadline] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [taskStatus, setTaskStatus] = useState<StudentTask['status']>('Chưa bắt đầu');
  const [taskFeedback, setTaskFeedback] = useState('');

  // Selected student IDs for multi-assignment checkboxes
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  // Active students (or all students if read-only for old classes)
  const activeStudents = useMemo(() => {
    return isReadOnly ? students : students.filter(s => s.status === 'Đang học');
  }, [isReadOnly, students]);

  // Synchronize dropdown selection with checkbox list
  useEffect(() => {
    if (editingTaskId) {
      setSelectedStudentIds(prev => {
        if (prev.length === 1 && prev[0] === taskStudentId) return prev;
        return [taskStudentId];
      });
    } else {
      if (taskStudentId === 'Tất cả') {
        const targetIds = activeStudents.map(s => s.id);
        setSelectedStudentIds(prev => {
          if (prev.length === targetIds.length && prev.every((id, idx) => id === targetIds[idx])) return prev;
          return targetIds;
        });
      } else if (taskStudentId.startsWith('Tổ ')) {
        const groupStudents = activeStudents.filter(s => s.groupName === taskStudentId).map(s => s.id);
        setSelectedStudentIds(prev => {
          if (prev.length === groupStudents.length && prev.every((id, idx) => id === groupStudents[idx])) return prev;
          return groupStudents;
        });
      } else if (taskStudentId === 'Tùy chọn') {
        // Do not reset in case user manually customized
      } else {
        setSelectedStudentIds(prev => {
          if (prev.length === 1 && prev[0] === taskStudentId) return prev;
          return [taskStudentId];
        });
      }
    }
  }, [editingTaskId, taskStudentId, activeStudents]);

  // Handler for custom checkbox toggle
  const handleToggleStudent = (studentId: string) => {
    if (isReadOnly) return;
    setSelectedStudentIds(prev => {
      const isChecked = prev.includes(studentId);
      let updated: string[];
      if (isChecked) {
        updated = prev.filter(id => id !== studentId);
      } else {
        updated = [...prev, studentId];
      }
      
      // Keep dropdown value in sync with the checked combination
      if (updated.length === activeStudents.length) {
        setTaskStudentId('Tất cả');
      } else {
        const matchedGroup = ['Tổ 1', 'Tổ 2', 'Tổ 3', 'Tổ 4'].find(g => {
          const groupStuds = activeStudents.filter(s => s.groupName === g).map(s => s.id);
          return groupStuds.length > 0 &&
                 groupStuds.length === updated.length &&
                 groupStuds.every(id => updated.includes(id));
        });
        if (matchedGroup) {
          setTaskStudentId(matchedGroup);
        } else if (updated.length === 1) {
          setTaskStudentId(updated[0]);
        } else {
          setTaskStudentId('Tùy chọn');
        }
      }
      return updated;
    });
  };

  // Filter student list in the checkbox section based on search query
  const filteredStudentsInList = useMemo(() => {
    return activeStudents.filter(s => {
      const q = studentSearchQuery.trim().toLowerCase();
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    });
  }, [activeStudents, studentSearchQuery]);

  // Report Form States
  const [reportRange, setReportRange] = useState<'week' | 'hk1' | 'hk2'>('week');
  const [reportWeek, setReportWeek] = useState(() => {
    return weeksList.find(w => w.weekNumber === 35) ? 35 : (weeksList[weeksList.length - 1]?.weekNumber || 1);
  });
  const [reportTitle, setReportTitle] = useState(() => {
    const defaultWeek = weeksList.find(w => w.weekNumber === 35) ? 35 : (weeksList[weeksList.length - 1]?.weekNumber || 1);
    return `Báo cáo nề nếp và học tập Tuần ${defaultWeek}`;
  });
  const [reportHtml, setReportHtml] = useState<string>('');
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  // Get weeks included in the current report scope
  const getIncludedWeeks = () => {
    if (reportRange === 'hk1') {
      return weeksList.filter(w => w.weekNumber >= 1 && w.weekNumber <= 18);
    } else if (reportRange === 'hk2') {
      return weeksList.filter(w => w.weekNumber >= 19 && w.weekNumber <= 36);
    } else {
      const wObj = weeksList.find(w => w.weekNumber === reportWeek);
      return wObj ? [wObj] : [];
    }
  };

  const includedWeeks = getIncludedWeeks();

  // Dynamically calculate violations belonging to the current selection range
  const rangeViolations = violations.filter(v => {
    if (!v.date) return false;
    return includedWeeks.some(w => isDateInWeek(v.date, w));
  });

  // Dynamically calculate tasks belonging to the current selection range (by deadline)
  const rangeTasks = tasks.filter(t => {
    if (!t.deadline) return false;
    return includedWeeks.some(w => isDateInWeek(t.deadline, w));
  });

  const updateReportTitle = (range: 'week' | 'hk1' | 'hk2', weekNum: number) => {
    if (range === 'hk1') {
      setReportTitle('BÁO CÁO TỔNG HỢP NỀ NẾP VÀ HỌC TẬP HỌC KỲ I');
    } else if (range === 'hk2') {
      setReportTitle('BÁO CÁO TỔNG HỢP NỀ NẾP VÀ HỌC TẬP HỌC KỲ II');
    } else {
      setReportTitle(`Báo cáo nề nếp và học tập Tuần ${weekNum}`);
    }
  };

  // Filter Task list
  const [filterStudent, setFilterStudent] = useState('Tất cả');
  const [filterStatus, setFilterStatus] = useState('Tất cả');

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      alert('Không thể thực hiện ở chế độ Chỉ xem!');
      return;
    }
    if (!taskTitle.trim()) {
      alert('Vui lòng điền tiêu đề nhiệm vụ');
      return;
    }

    if (editingTaskId) {
      const matchedStudent = students.find(s => s.id === taskStudentId);
      const studentName = taskStudentId === 'Tất cả' ? 'Tất cả học sinh' : (matchedStudent?.name || '');
      const updatedTask: StudentTask = {
        id: editingTaskId,
        studentId: taskStudentId,
        studentName,
        taskTitle: taskTitle.trim(),
        description: taskDesc.trim(),
        deadline: taskDeadline,
        status: taskStatus,
        feedback: taskFeedback.trim()
      };
      onUpdateTask(updatedTask);
      setEditingTaskId(null);
      alert('Cập nhật nhiệm vụ thành công!');
    } else {
      if (taskStudentId === 'Tất cả') {
        const nextNum = tasks.length > 0
          ? Math.max(...tasks.map(t => {
              const num = parseInt(t.id.replace('NV', ''), 10);
              return isNaN(num) ? 0 : num;
            })) + 1
          : 1;
        const nextId = `NV${nextNum.toString().padStart(3, '0')}`;

        const newTask: StudentTask = {
          id: nextId,
          studentId: 'Tất cả',
          studentName: 'Tất cả học sinh',
          taskTitle: taskTitle.trim(),
          description: taskDesc.trim(),
          deadline: taskDeadline,
          status: taskStatus,
          feedback: taskFeedback.trim()
        };
        onAddTask(newTask);
        alert('Đã giao nhiệm vụ thành công cho toàn bộ lớp!');
      } else {
        if (selectedStudentIds.length === 0) {
          alert('Vui lòng chọn ít nhất một học sinh để giao nhiệm vụ!');
          return;
        }

        let nextNum = tasks.length > 0
          ? Math.max(...tasks.map(t => {
              const num = parseInt(t.id.replace('NV', ''), 10);
              return isNaN(num) ? 0 : num;
            })) + 1
          : 1;

        selectedStudentIds.forEach(id => {
          const matchedStudent = students.find(s => s.id === id);
          if (matchedStudent) {
            const nextId = `NV${nextNum.toString().padStart(3, '0')}`;
            const newTask: StudentTask = {
              id: nextId,
              studentId: id,
              studentName: matchedStudent.name,
              taskTitle: taskTitle.trim(),
              description: taskDesc.trim(),
              deadline: taskDeadline,
              status: taskStatus,
              feedback: taskFeedback.trim()
            };
            onAddTask(newTask);
            nextNum++;
          }
        });

        alert(`Đã giao nhiệm vụ thành công cho ${selectedStudentIds.length} học sinh!`);
      }
    }

    // Reset task form
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus('Chưa bắt đầu');
    setTaskFeedback('');
    setTaskStudentId('Tất cả');
    setSelectedStudentIds([]);
    setStudentSearchQuery('');
  };

  const handleEditTaskClick = (task: StudentTask) => {
    setEditingTaskId(task.id);
    setTaskStudentId(task.studentId);
    setTaskTitle(task.taskTitle);
    setTaskDeadline(task.deadline);
    setTaskDesc(task.description || '');
    setTaskStatus(task.status);
    setTaskFeedback(task.feedback || '');
    // Scroll to the edit form
    const formElement = document.getElementById('task-and-report-section');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus('Chưa bắt đầu');
    setTaskFeedback('');
    setTaskStudentId('Tất cả');
    setSelectedStudentIds([]);
    setStudentSearchQuery('');
  };

  const handleUpdateStatus = (task: StudentTask, newStatus: StudentTask['status']) => {
    if (isReadOnly) return;
    onUpdateTask({ ...task, status: newStatus });
  };

  const handleSaveFeedback = (task: StudentTask, feedbackText: string) => {
    if (isReadOnly) return;
    onUpdateTask({ ...task, feedback: feedbackText });
  };

  const handleDeleteTask = (id: string, title: string) => {
    if (isReadOnly) {
      alert('Không thể thực hiện ở chế độ Chỉ xem!');
      return;
    }
    setConfirmModal({
      title: 'Xác nhận xóa nhiệm vụ',
      message: `Bạn có chắc muốn xoá nhiệm vụ: "${title}" không?`,
      onConfirm: () => {
        onDeleteTask(id);
        setConfirmModal(null);
      }
    });
  };

  const handleReportWeekChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedWeekNum = parseInt(e.target.value, 10);
    setReportWeek(selectedWeekNum);
    setReportTitle(`Báo cáo nề nếp và học tập Tuần ${selectedWeekNum}`);
  };

  // Automated Periodic Report Generator
  const handleGenerateReport = () => {
    const includedWeeks = getIncludedWeeks();
    
    // Filter violations that happen within the selected range's date range
    const currentWeekViolations = violations.filter(v => {
      if (!v.date) return false;
      return includedWeeks.some(w => isDateInWeek(v.date, w));
    });

    // Filter tasks whose deadlines are within the selected range
    const currentRangeTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      return includedWeeks.some(w => isDateInWeek(t.deadline, w));
    });

    const studentSummary = students.map(s => {
      const sViolations = currentWeekViolations.filter(v => v.studentId === s.id);
      const pointsDeducted = sViolations.reduce((sum, v) => sum + v.points, 0);
      const sTasks = currentRangeTasks.filter(t => t.studentId === s.id || t.studentId === 'Tất cả');
      const sTasksCompleted = sTasks.filter(t => t.status === 'Đã hoàn thành').length;
      return {
        id: s.id,
        name: s.name,
        points: pointsDeducted,
        violationsCount: sViolations.length,
        tasksCount: sTasks.length,
        tasksCompleted: sTasksCompleted
      };
    });

    // Sort outstanding & warning students
    const outstandingStudents = [...studentSummary]
      .filter(s => s.points === 0 && (currentRangeTasks.length === 0 || s.tasksCompleted >= 1))
      .slice(0, 3);

    const warningStudents = [...studentSummary]
      .filter(s => s.points <= -2)
      .sort((a, b) => a.points - b.points)
      .slice(0, 3);

    // Calculate overall class attendance stats
    const totalLate = currentWeekViolations.filter(v => v.type === 'Đi muộn').length;
    const totalAbsentNoPermission = currentWeekViolations.filter(v => v.type === 'Nghỉ học không phép').length;
    const totalAbsentPermission = currentWeekViolations.filter(v => v.type === 'Nghỉ học có phép').length;
    const totalNoHomework = currentWeekViolations.filter(v => v.type === 'Không làm bài tập').length;

    const totalAssignedTasks = currentRangeTasks.length;
    const totalCompletedTasks = currentRangeTasks.filter(t => t.status === 'Đã hoàn thành').length;
    const taskCompletionRate = totalAssignedTasks > 0 ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100) : 100;

    const planTitle = (() => {
      if (reportRange === 'hk1' || reportRange === 'hk2') {
        const semesterPlans = plans.filter(p => includedWeeks.some(w => w.weekNumber === p.weekNumber));
        return semesterPlans.length > 0
          ? semesterPlans.map(p => `• Tuần ${p.weekNumber}: ${p.title}`).join('<br />')
          : 'Đang ôn tập và giữ vững thi đua nề nếp lớp học trong suốt học kỳ.';
      }
      return plans.find(p => p.weekNumber === reportWeek)?.title || 'Đang ôn tập và giữ vững thi đua nề nếp lớp học.';
    })();

    const autoHtml = `
      <div style="background-color: rgba(217, 119, 6, 0.05); border: 1px solid rgba(217, 119, 6, 0.15); border-radius: 12px; padding: 14px; margin-bottom: 24px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #b45309; text-transform: uppercase; margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
          🚀 Kế hoạch ${reportRange === 'hk1' ? 'Học kỳ I' : reportRange === 'hk2' ? 'Học kỳ II' : `tuần ${reportWeek}`} đã triển khai
        </h4>
        <p style="font-size: 13px; color: #475569; margin: 0; font-style: italic; line-height: 1.5;">
          ${planTitle}
        </p>
      </div>

      <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase;">1. Đánh giá nề nếp & chuyên cần:</h4>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• Lớp học duy trì nề nếp tương đối ổn định.</p>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Tổng số lượt đi muộn:</strong> ${totalLate} lượt.</p>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Tổng số lượt nghỉ học:</strong> ${totalAbsentPermission} lượt có phép, <span style="color: #dc2626;"><strong>${totalAbsentNoPermission} lượt không phép</strong></span>.</p>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Tình hình bài tập về nhà:</strong> Ghi nhận ${totalNoHomework} trường hợp không làm bài tập hoặc thiếu đề cương ôn tập.</p>

      <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase;">2. Kết quả học tập & hoàn thành nhiệm vụ:</h4>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Tỷ lệ hoàn thành nhiệm vụ:</strong> <span style="color: #16a34a;"><strong>${taskCompletionRate}%</strong></span> (${totalCompletedTasks}/${totalAssignedTasks > 0 ? totalAssignedTasks : 0} nhiệm vụ được hoàn thành).</p>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• Các nhiệm vụ lớn như chuẩn bị đề cương và trực nhật lớp đã được ban cán sự theo dõi chặt chẽ.</p>

      <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase;">3. Tuyên dương & Nhắc nhở:</h4>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Tuyên dương (Gương mẫu, nề nếp tốt):</strong> <span style="color: #16a34a;"><strong>${outstandingStudents.map(s => `${s.name} (${s.id})`).join(', ') || 'Cả lớp ổn định'}</strong></span>.</p>
      <p style="font-size: 13px; margin: 6px 0; color: #334155; line-height: 1.6;">• <strong>Yêu cầu chấn chỉnh (Điểm trừ nhiều):</strong> <span style="color: #dc2626;"><strong>${warningStudents.map(s => `${s.name} (Bị trừ ${Math.abs(s.points)}đ)`).join(', ') || 'Không có học sinh cá biệt'}</strong></span>.</p>
    `;

    setReportHtml(autoHtml);
    setIsReportGenerated(true);
  };

  const filteredTasks = tasks.filter(t => {
    const matchesStudent = filterStudent === 'Tất cả' || t.studentId === filterStudent || t.studentId === 'Tất cả';
    const matchesStatus = filterStatus === 'Tất cả' || t.status === filterStatus;
    return matchesStudent && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6" id="task-and-report-section">
      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/5 pb-1">
        <button
          id="tab-btn-tasks"
          onClick={() => setActiveTab('assign')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition ${
            activeTab === 'assign'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Giao nhiệm vụ Học sinh
        </button>
        <button
          id="tab-btn-reports"
          onClick={() => setActiveTab('report')}
          className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition ${
            activeTab === 'report'
              ? 'border-b-2 border-amber-500 text-amber-500'
              : 'text-white/40 hover:text-white/60'
          }`}
        >
          Xuất Báo cáo Định kỳ Tự động
        </button>
      </div>

      {activeTab === 'assign' ? (
        /* TASK ASSIGNMENT INTERFACE */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-fadeIn">
          {/* Add Task Form */}
          <div className="xl:col-span-5 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 h-fit">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Sparkles size={16} className="text-amber-500" /> {editingTaskId ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ mới'}
            </h3>

            {isReadOnly && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs leading-relaxed space-y-1 mb-4">
                <div className="font-extrabold flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                  <AlertCircle size={14} /> Chế độ chỉ xem
                </div>
                <p className="text-white/70 text-[11px]">Lớp học này thuộc niên khóa cũ. Tất cả các tính năng Thêm, Sửa, Xóa nhiệm vụ đã bị khóa để bảo toàn dữ liệu lịch sử.</p>
              </div>
            )}

            <form onSubmit={handleAddTaskSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Left Column: Task Fields */}
                <div className="md:col-span-7 space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Tiêu đề nhiệm vụ <span className="text-rose-500">*</span></label>
                    <input
                      id="task-title-input"
                      type="text"
                      required
                      disabled={isReadOnly}
                      placeholder="VD: Làm đề cương Lý học kỳ II..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Hạn hoàn thành</label>
                    <input
                      id="task-deadline-input"
                      type="date"
                      required
                      disabled={isReadOnly}
                      value={taskDeadline}
                      onChange={(e) => setTaskDeadline(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 font-mono disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Mô tả chi tiết yêu cầu</label>
                    <textarea
                      id="task-desc-textarea"
                      placeholder="Nội dung cần chuẩn bị, tài liệu hướng dẫn..."
                      rows={5}
                      value={taskDesc}
                      disabled={isReadOnly}
                      onChange={(e) => setTaskDesc(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none placeholder-white/20 disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Right Column: Assignee Dropdown & Checklist */}
                <div className="md:col-span-5 space-y-3 flex flex-col">
                  <div>
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Chọn nhanh theo nhóm</label>
                    <select
                      id="task-student-select"
                      value={taskStudentId}
                      disabled={isReadOnly}
                      onChange={(e) => setTaskStudentId(e.target.value)}
                      className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    >
                      <option value="Tất cả" className="bg-[#111]">-- Giao cho Tất cả lớp học --</option>
                      <option value="Tổ 1" className="bg-[#111]">-- Tất cả thành viên Tổ 1 --</option>
                      <option value="Tổ 2" className="bg-[#111]">-- Tất cả thành viên Tổ 2 --</option>
                      <option value="Tổ 3" className="bg-[#111]">-- Tất cả thành viên Tổ 3 --</option>
                      <option value="Tổ 4" className="bg-[#111]">-- Tất cả thành viên Tổ 4 --</option>
                      <option value="Tùy chọn" className="bg-[#111]">-- Tùy chọn nhiều học sinh --</option>
                      {activeStudents.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#111]">{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>

                  {/* Checklist Section */}
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Danh sách học sinh</label>
                    </div>

                    <div className="relative mb-2">
                      <input
                        type="text"
                        placeholder="Tìm học sinh..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-8 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-amber-500"
                      />
                      <Search size={12} className="absolute left-2.5 top-2.5 text-white/40" />
                    </div>

                    <div className="border border-white/10 rounded-xl bg-white/[0.02] p-2 h-[155px] overflow-y-auto space-y-1">
                      {filteredStudentsInList.map(s => {
                        const isChecked = selectedStudentIds.includes(s.id);
                        return (
                          <label key={s.id} className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer transition text-[11px] text-white/80">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isReadOnly}
                              onChange={() => handleToggleStudent(s.id)}
                              className="rounded border-white/20 text-amber-500 focus:ring-amber-500 bg-white/5 w-3.5 h-3.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{s.name}</p>
                              <p className="text-[9px] text-white/40 font-mono flex items-center gap-2">
                                <span>{s.id}</span>
                                {s.groupName && <span className="px-1 py-0.2 bg-white/10 rounded text-[8px] text-white/50">{s.groupName}</span>}
                              </p>
                            </div>
                          </label>
                        );
                      })}
                      {filteredStudentsInList.length === 0 && (
                        <div className="text-center py-4 text-[10px] text-white/40">Không tìm thấy học sinh</div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-white/40 font-bold uppercase tracking-wider px-1 mt-1.5">
                      <span>Đã chọn: {selectedStudentIds.length}</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            setSelectedStudentIds(activeStudents.map(s => s.id));
                            setTaskStudentId('Tất cả');
                          }}
                          className="text-amber-500 hover:underline hover:text-amber-400 disabled:opacity-50"
                        >
                          Chọn tất cả
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          disabled={isReadOnly}
                          onClick={() => {
                            setSelectedStudentIds([]);
                            setTaskStudentId('Tùy chọn');
                          }}
                          className="text-rose-400 hover:underline hover:text-rose-300 disabled:opacity-50"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                {editingTaskId && (
                  <button
                    id="task-cancel-edit-btn"
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition text-xs border border-white/10"
                  >
                    Hủy sửa
                  </button>
                )}
                <button
                  id="task-submit-btn"
                  type="submit"
                  disabled={isReadOnly}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl transition text-xs shadow-md font-bold ${
                    isReadOnly
                      ? 'bg-white/5 border border-white/5 text-white/20 cursor-not-allowed'
                      : editingTaskId
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                        : 'bg-amber-600 hover:bg-amber-700 text-black'
                  }`}
                >
                  {isReadOnly ? (
                    'Đã khóa (Chỉ xem)'
                  ) : (
                    <>
                      {editingTaskId ? <Edit3 size={14} /> : <Plus size={14} />} {editingTaskId ? 'Cập nhật' : 'Giao nhiệm vụ'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Task Board / List */}
          <div className="xl:col-span-7 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 h-[620px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Bảng tiến độ nhiệm vụ</h3>
              
              {/* Quick Filters */}
              <div className="flex gap-2">
                <select
                  id="task-filter-student"
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="text-[10px] font-medium bg-white/5 border border-white/10 text-white rounded-xl p-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Tất cả" className="bg-[#111]">Tất cả học sinh</option>
                  {activeStudents.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#111]">{s.name}</option>
                  ))}
                </select>
                <select
                  id="task-filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-[10px] font-medium bg-white/5 border border-white/10 text-white rounded-xl p-2 focus:outline-none focus:border-amber-500"
                >
                  <option value="Tất cả" className="bg-[#111]">Mọi trạng thái</option>
                  <option value="Chưa bắt đầu" className="bg-[#111]">Chưa bắt đầu</option>
                  <option value="Đang thực hiện" className="bg-[#111]">Đang thực hiện</option>
                  <option value="Đã hoàn thành" className="bg-[#111]">Đã hoàn thành</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-white/30 text-xs italic">
                  Chưa có nhiệm vụ nào được giao hoặc khớp bộ lọc
                </div>
              ) : (
                filteredTasks.map(t => (
                  <div
                    id={`task-item-${t.id}`}
                    key={t.id}
                    className="p-4 bg-[#0d0d0d] border border-white/5 rounded-2xl hover:bg-white/[0.01] hover:border-white/10 transition"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            t.studentId === 'Tất cả' 
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                              : 'bg-white/10 text-white/60 border border-white/5'
                          }`}>
                            {t.studentName}
                          </span>
                          <span className="text-[10px] text-white/40 font-mono">Hạn chót: {t.deadline.split('-').reverse().join('/')}</span>
                        </div>
                        <h4 className="font-semibold text-white text-sm mt-1.5">{t.taskTitle}</h4>
                        <p className="text-xs text-white/60 mt-1">{t.description || 'Không có mô tả chi tiết.'}</p>

                        {/* Interactive Status pills */}
                        <div className="flex gap-1.5 mt-3">
                          <button
                            id={`btn-task-status-todo-${t.id}`}
                            onClick={() => !isReadOnly && handleUpdateStatus(t, 'Chưa bắt đầu')}
                            disabled={isReadOnly}
                            className={`flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-xl border font-bold transition ${
                              t.status === 'Chưa bắt đầu'
                                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold'
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <Clock size={10} /> Chưa làm
                          </button>
                          <button
                            id={`btn-task-status-doing-${t.id}`}
                            onClick={() => !isReadOnly && handleUpdateStatus(t, 'Đang thực hiện')}
                            disabled={isReadOnly}
                            className={`flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-xl border font-bold transition ${
                              t.status === 'Đang thực hiện'
                                ? 'bg-sky-500/10 border-sky-500/20 text-sky-400 font-bold'
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <Play size={10} /> Đang làm
                          </button>
                          <button
                            id={`btn-task-status-done-${t.id}`}
                            onClick={() => !isReadOnly && handleUpdateStatus(t, 'Đã hoàn thành')}
                            disabled={isReadOnly}
                            className={`flex items-center gap-1 text-[9px] px-2.5 py-1 rounded-xl border font-bold transition ${
                              t.status === 'Đã hoàn thành'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'
                            } ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                          >
                            <CheckCircle size={10} /> Đã xong
                          </button>
                        </div>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            id={`btn-edit-task-${t.id}`}
                            onClick={() => handleEditTaskClick(t)}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs text-white/50 hover:bg-amber-500/10 hover:text-amber-400 rounded-lg transition border border-white/5 hover:border-amber-500/20"
                          >
                            <Edit3 size={11} />
                            <span>Sửa</span>
                          </button>
                          <button
                            id={`btn-delete-task-${t.id}`}
                            onClick={() => handleDeleteTask(t.id, t.taskTitle)}
                            className="p-1.5 text-white/30 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Feedback inline inputs */}
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <input
                        id={`input-task-feedback-${t.id}`}
                        type="text"
                        placeholder={isReadOnly ? "Chưa có nhận xét" : "Nhập nhận xét của giáo viên..."}
                        defaultValue={t.feedback}
                        disabled={isReadOnly}
                        onBlur={(e) => !isReadOnly && handleSaveFeedback(t, e.target.value)}
                        className={`w-full bg-transparent border-none text-xs focus:outline-none italic ${
                          isReadOnly ? 'text-white/30 cursor-not-allowed' : 'text-white/40 placeholder-white/10'
                        }`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PERIODIC REPORT COMPILER */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          {/* Report parameter select panel */}
          <div className="lg:col-span-4 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 h-fit">
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Cấu hình Báo cáo Tuần</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Phạm vi báo cáo</label>
                <select
                  id="report-range-select"
                  value={reportRange}
                  onChange={(e) => {
                    const newRange = e.target.value as 'week' | 'hk1' | 'hk2';
                    setReportRange(newRange);
                    updateReportTitle(newRange, reportWeek);
                  }}
                  className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="week" className="bg-[#111]">Báo cáo theo Tuần học</option>
                  <option value="hk1" className="bg-[#111]">Tổng hợp Học kỳ I (Tuần 1 - 18)</option>
                  <option value="hk2" className="bg-[#111]">Tổng hợp Học kỳ II (Tuần 19 - 36)</option>
                </select>
              </div>

              {reportRange === 'week' && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Chọn tuần biên soạn số liệu</label>
                  <select
                    id="report-week-select"
                    value={reportWeek}
                    onChange={(e) => {
                      const selectedWeekNum = parseInt(e.target.value, 10);
                      setReportWeek(selectedWeekNum);
                      updateReportTitle('week', selectedWeekNum);
                    }}
                    className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-amber-500"
                  >
                    {weeksList.map((w) => (
                      <option key={w.weekNumber} value={w.weekNumber} className="bg-[#111]">
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Tiêu đề báo cáo chính thức</label>
                <input
                  id="report-title-input"
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                id="btn-trigger-generate-report"
                onClick={handleGenerateReport}
                className="w-full flex items-center justify-center gap-1.5 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-black font-bold rounded-xl transition text-xs shadow-md"
              >
                <Sparkles size={14} /> Tổng hợp số liệu Tự động
              </button>
            </div>
          </div>

          {/* Report printable view */}
          <div className="lg:col-span-8 flex flex-col h-[700px]">
            {isReportGenerated ? (
              <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/5 shrink-0">
                  <span className="text-xs text-white/30 font-mono uppercase tracking-wider">Bản xem trước báo cáo định kỳ</span>
                  <button
                    id="btn-report-print"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-black px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    <Printer size={14} /> In báo cáo / Lưu PDF
                  </button>
                </div>

                {/* Formatting Toolbar */}
                <div className="flex flex-wrap items-center gap-1.5 mb-4 bg-white/5 p-2 rounded-xl border border-white/10 text-xs text-white shrink-0">
                  <span className="text-[10px] font-semibold uppercase text-white/40 px-1">Định dạng:</span>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('bold', false);
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold rounded-lg transition"
                    title="Chữ đậm"
                  >
                    B
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('italic', false);
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white italic rounded-lg transition"
                    title="Chữ nghiêng"
                  >
                    I
                  </button>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('underline', false);
                    }}
                    className="w-7 h-7 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white underline rounded-lg transition"
                    title="Gạch chân"
                  >
                    U
                  </button>
                  <div className="w-[1px] h-5 bg-white/10 mx-1" />
                  
                  <span className="text-[10px] font-semibold uppercase text-white/40 px-1">Màu chữ:</span>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('foreColor', false, '#1e293b');
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 bg-slate-800"
                    title="Màu đen"
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('foreColor', false, '#dc2626');
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 bg-rose-600"
                    title="Màu đỏ"
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('foreColor', false, '#16a34a');
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 bg-emerald-600"
                    title="Màu xanh lá"
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('foreColor', false, '#2563eb');
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 bg-blue-600"
                    title="Màu xanh dương"
                  />
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      document.execCommand('foreColor', false, '#d97706');
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 bg-amber-600"
                    title="Màu cam"
                  />

                  <span className="ml-auto text-[10px] text-white/40 italic hidden sm:inline">
                    💡 Nhấp trực tiếp vào nội dung báo cáo để sửa
                  </span>
                </div>

                {/* Printable Frame */}
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar bg-black/40 p-4 rounded-2xl border border-white/5">
                  <div
                    ref={reportPrintRef}
                    id="report-print-preview"
                    className="bg-white p-8 border border-slate-200 rounded-xl shadow-md max-w-[800px] mx-auto text-slate-800"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {/* Official Banner */}
                    <div className="text-center mb-6 border-b-2 border-slate-800 pb-4">
                      <h1 className="text-xs uppercase tracking-widest font-bold text-slate-500">Sở GD & ĐT Thành Phố Hồ Chí Minh</h1>
                      <h2 className="text-xs uppercase font-bold text-slate-700 mt-0.5">Trường THPT Nguyễn Hữu Cầu</h2>
                      <h3 className="text-base sm:text-lg font-black text-slate-900 mt-2 uppercase">{reportTitle}</h3>
                      <p className="text-xs text-slate-500 mt-1 italic">
                        Lớp: {activeClassName || '11A1'} - GVCN: {teacherName || localStorage.getItem('teacherName') || 'Nguyễn Tuyết Mai'}
                      </p>
                    </div>
 
                    {/* Report body split from Compiled Markdown */}
                    <div className="space-y-6">
                      {/* Metric widgets inside PDF */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="border border-slate-200 p-3 rounded-xl text-center">
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            {rangeViolations.filter(v => v.type === 'Nghỉ học không phép').length}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Nghỉ không phép</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-xl text-center">
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            {rangeViolations.filter(v => v.type === 'Đi muộn').length}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Lượt đi muộn</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-xl text-center">
                          <div className="text-base sm:text-lg font-bold text-slate-900">
                            {rangeTasks.filter(t => t.status === 'Đã hoàn thành').length}/{rangeTasks.length > 0 ? rangeTasks.length : 0}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Nhiệm vụ đạt</div>
                        </div>
                        <div className="border border-slate-200 p-3 rounded-xl text-center">
                          <div className="text-base sm:text-lg font-bold text-emerald-600">
                            {(() => {
                              const weeksCount = includedWeeks.length || 1;
                              const totalStudentDays = (students.length || 40) * 5 * weeksCount;
                              const totalAbsences = rangeViolations.filter(v => v.type === 'Nghỉ học không phép' || v.type === 'Nghỉ học có phép').length;
                              const rate = Math.max(0, Math.min(100, Math.round(((totalStudentDays - totalAbsences) / totalStudentDays) * 1000) / 10));
                              return `${rate}%`;
                            })()}
                          </div>
                          <div className="text-[8px] sm:text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">Chuyên cần</div>
                        </div>
                      </div>

                      {/* ContentEditable Beautiful HTML Area */}
                      <div
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        dangerouslySetInnerHTML={{ __html: reportHtml }}
                        className="focus:outline-none min-h-[300px] text-xs sm:text-sm text-slate-700 leading-relaxed font-sans"
                        style={{ outline: 'none' }}
                      />

                      {/* Sign-off signatures */}
                      <div className="flex justify-between items-center pt-8 border-t border-slate-100 text-[10px] text-slate-400 mt-12">
                        <div>
                          <p>Báo cáo định kỳ tự động</p>
                          <p>Hệ thống Quản lý Học sinh</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="italic">TP. Hồ Chí Minh, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</p>
                          <p className="font-bold text-slate-700 mt-1">GIÁO VIÊN CHỦ NHIỆM</p>
                          <div className="h-10"></div>
                          <p className="font-bold text-slate-800">{teacherName || localStorage.getItem('teacherName') || 'Nguyễn Tuyết Mai'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-12 text-center text-white/30 h-full flex flex-col justify-center items-center">
                <FileText size={48} className="text-white/10 mb-2" />
                <h4 className="font-semibold text-white/80 text-xs sm:text-sm mb-1">Chưa tổng hợp dữ liệu</h4>
                <p className="text-[11px] text-white/40 max-w-sm">Nhấn nút "Tổng hợp số liệu Tự động" ở góc trái để tổng hợp chuyên cần, vi phạm, nhiệm vụ thành bản báo cáo PDF chính thức.</p>
              </div>
            )}
          </div>
        </div>
      )}

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

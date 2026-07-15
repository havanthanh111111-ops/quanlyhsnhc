/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string; // e.g. GV01
  name: string;
}

export interface SchoolYear {
  id: string; // e.g. NH01
  name: string; // e.g. 2025-2026
}

export interface ClassItem {
  id: string; // e.g. LH01
  name: string; // e.g. Lớp 11A1
  schoolYearId: string; // Foreign key to SchoolYear
  teacherId: string; // Foreign key to Teacher
}

export interface Student {
  id: string; // e.g. HS01, HS02
  name: string;
  gender: 'Nam' | 'Nữ';
  dob: string; // YYYY-MM-DD
  parentPhone: string;
  address: string;
  status: 'Đang học' | 'Nghỉ học' | 'Đình chỉ' | 'Lên lớp' | 'Chuyển lớp';
  fatherName?: string;
  fatherJob?: string;
  motherName?: string;
  motherJob?: string;
  classId?: string; // Relational link to ClassItem
  className?: string; // Legacy/Display fallback
  schoolYear?: string; // Legacy/Display fallback
  avatarUrl?: string; // Google Drive image link
  groupName?: string; // e.g. "Tổ 1"
  seatRow?: number; // Row index (1-based or 0-based, let's say 1-based or 0-based)
  seatCol?: number; // Col index
}

export interface ViolationType {
  id: string;
  label: string; // Tên vi phạm
  defaultPoints: number; // Điểm trừ
}

export interface ViolationRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  type: 'Nghỉ học không phép' | 'Nghỉ học có phép' | 'Đi muộn' | 'Không đồng phục' | 'Không làm bài tập' | 'Làm việc riêng' | 'Khác';
  points: number; // e.g. -2, -1
  note: string;
  resolution: string; // Hướng giải quyết
  classId?: string; // Relational link
  className?: string; // Fallback
  schoolYear?: string; // Fallback
}

export interface WeeklyPlan {
  id: string;
  classId?: string; // Relational link to ClassItem
  weekNumber: number; // e.g. 1, 2
  dateRange: string; // e.g. "22/06/2026 - 28/06/2026"
  title: string;
  content: string; // Markdown details
  objectives: string; // Bullet points or short text
  teacherNotes: string;
  createdAt: string;
  className?: string; // Fallback
  schoolYear?: string; // Fallback
}

export interface StudentTask {
  id: string;
  studentId: string; // "Tất cả" or Student ID
  studentName: string; // "Tất cả học sinh" or Student Name
  classId?: string; // Relational link to ClassItem
  taskTitle: string;
  description: string;
  deadline: string; // YYYY-MM-DD
  status: 'Chưa bắt đầu' | 'Đang thực hiện' | 'Đã hoàn thành';
  feedback: string;
  className?: string; // Fallback
  schoolYear?: string; // Fallback
}

export interface SheetSyncConfig {
  spreadsheetId: string;
  apiKey: string;
  accessToken: string;
  useLocalStorage: boolean;
  lastSync: string;
  customClientId?: string;
  imageFolderId?: string;
}

export interface GPAEntry {
  subject: string;
  score: number;
}

export interface AcademicUpdate {
  id: string;
  studentId: string;
  semester: 'Học kỳ I' | 'Học kỳ II' | 'Học kỳ III';
  title: string; // e.g., "Cập nhật ngày 01/10", "Điểm giữa kỳ", "Điểm cuối kỳ"
  date: string; // YYYY-MM-DD
  gpaList: GPAEntry[];
  averageGpa: number;
  teacherRemarks?: string;
}

export interface Announcement {
  id: string;
  date: string; // e.g., "12/07/2026" or "YYYY-MM-DD"
  title: string;
  content?: string;
  isNew: boolean;
  category: string; // e.g., "Học vụ", "Đào tạo", "Phong trào", "Nề nếp"
}

export interface SystemUser {
  id: string;
  stt: number;
  ten: string; // Tên đăng nhập (username)
  matkhau: string; // Mật khẩu (password)
  quyen: 'caocap' | 'hotro'; // Quyền hạn: caocap hoặc hotro
}



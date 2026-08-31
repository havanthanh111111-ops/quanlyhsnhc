/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Teacher {
  id: string; // e.g. GV01
  name: string;
  subject?: string;
  phone?: string;
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
  role?: string; // Class officers / roles, e.g. "Lớp trưởng", "Tổ trưởng Tổ 1"
  password?: string; // Access PIN/Password for student & parent (defaults to "123")
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

export interface ArchivedDocItem {
  id: string;
  title: string; // Tiêu đề con (vd: MỘT SỐ QUY ĐỊNH CHUNG_NH2026-2027, ĐIỂM THI ĐUA)
  url: string; // Link chia sẻ Google (Google Drive, Docs, Sheets, PDF, v.v.)
  visibility: 'public' | 'admin_only'; // 'public': Hiển thị web công khai, 'admin_only': Ẩn (chỉ admin xem được)
  description?: string; // Ghi chú hoặc mô tả ngắn
  createdAt?: string; // Ngày tạo (YYYY-MM-DD)
}

export interface DocumentCategory {
  id: string;
  schoolYearId: string; // Niên học (id năm học)
  title: string; // Tiêu đề cha (vd: QUY ĐỊNH NỀ NẾP, KẾ HOẠCH NĂM HỌC, VĂN BẢN CHUYÊN MÔN)
  order?: number; // Thứ tự hiển thị
  items: ArchivedDocItem[]; // Danh sách các tiêu đề con
  createdAt?: string;
  updatedAt?: string;
}

export interface AlbumPhoto {
  id: string;
  url: string; // Hyperlink ảnh (URL ảnh, Google Drive UC link, Imgur, Cloudinary, v.v.)
  caption: string; // Chú thích cho bức ảnh (câu chuyện, mô tả chi tiết)
  title?: string; // Tiêu đề ngắn của bức ảnh nếu có
  order?: number; // Thứ tự trong slide show
  link?: string; // Hyperlink liên kết ngoài mở rộng khi click
}

export interface PhotoAlbum {
  id: string;
  title: string; // Tên Album / Tiêu đề câu chuyện bằng hình
  description?: string; // Lời dẫn / Tóm tắt câu chuyện
  category: string; // Thể loại: Hoạt động trường, Phong trào Đoàn, Học tập & STEM, Tri ân & Kỷ niệm, Ngoại khóa, v.v.
  schoolYearId?: string; // Niên học (hoặc 'all')
  coverUrl?: string; // Ảnh bìa album
  photos: AlbumPhoto[]; // Danh sách các tấm hình trong album
  createdAt: string; // Ngày tạo (YYYY-MM-DD)
  updatedAt?: string;
  isPublished?: boolean; // Hiển thị trên Web công khai
  featured?: boolean; // Đặt làm nổi bật
}

export interface CommunityActivityEntry {
  stt: number;
  categoryKey: string; // 'mien_trung' | 'clb' | 'bch' | 'cap_cum' | 'giup_ban' | 'khac' | 'the_thao_tong'
  title: string; // NỘI DUNG CÔNG VIỆC
  guide: string; // Diễn giải quy định số giờ
  studentNote: string; // DIỄN GIẢI NỘI DUNG VÀ SỐ GIỜ THAM GIA MỖI NỘI DUNG (Học sinh tự diễn giải)
  hours: number; // TỔNG GIỜ (Học sinh tự cho)
  isConfirmed: boolean; // Cột XÁC NHẬN (Checkbox)
  signedBy: string; // Cột NGƯỜI ĐÁNH GIÁ (KÝ TÊN)
  signerNote?: string;
}

export interface SportArtActivityItem {
  id: string;
  name: string; // Các hoạt động văn nghệ, thể thao, ngoại khoá
  role: 'Tham gia' | 'Cổ vũ' | string; // Ghi "Cổ vũ", "Tham gia"
  achievement: string; // Thành tích (Giải)
  hours: number; // Số giờ mỗi hoạt động (Học sinh tự cho)
  isConfirmed: boolean; // Cột XÁC NHẬN (Checkbox)
  signedBy: string; // Cột NGƯỜI ĐÁNH GIÁ (KÝ TÊN)
  note?: string;
}

export interface StudentCommunityRecord {
  id: string; // studentId
  studentId: string;
  studentName?: string;
  classId?: string;
  schoolYearId?: string;
  entries: CommunityActivityEntry[]; // 7 mục bảng 1
  sportArtItems: SportArtActivityItem[]; // Chi tiết bảng 2
  teacherComment?: string; // Nhận xét đánh giá cuối năm của GV
  evaluationRating?: string; // 'Xuất sắc' | 'Tốt' | 'Đạt' | 'Cần cố gắng'
  updatedAt?: string;
}





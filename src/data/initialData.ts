/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ViolationRecord, WeeklyPlan, StudentTask, SystemUser } from '../types';

export const initialStudents: Student[] = [
  {
    id: 'HS001',
    name: 'Nguyễn Văn Nam',
    gender: 'Nam',
    dob: '2009-05-15',
    parentPhone: '0912345678',
    address: '12 Cầu Giấy, Hà Nội',
    status: 'Đang học',
    fatherName: 'Nguyễn Văn Hùng',
    fatherJob: 'Kỹ sư xây dựng',
    motherName: 'Lê Thị Hà',
    motherJob: 'Giáo viên viên tiểu học'
  },
  {
    id: 'HS002',
    name: 'Trần Thị Mai',
    gender: 'Nữ',
    dob: '2009-08-22',
    parentPhone: '0987654321',
    address: '45 Láng Hạ, Đống Đa, Hà Nội',
    status: 'Đang học',
    fatherName: 'Trần Minh Đức',
    fatherJob: 'Kinh doanh tự do',
    motherName: 'Phạm Thu Hương',
    motherJob: 'Nhân viên văn phòng'
  },
  {
    id: 'HS003',
    name: 'Lê Hoàng Long',
    gender: 'Nam',
    dob: '2009-11-02',
    parentPhone: '0904123456',
    address: '88 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    status: 'Đang học',
    fatherName: 'Lê Văn Khải',
    fatherJob: 'Bác sĩ quân y',
    motherName: 'Nguyễn Thị Bích',
    motherJob: 'Dược sĩ'
  },
  {
    id: 'HS004',
    name: 'Phạm Thanh Thảo',
    gender: 'Nữ',
    dob: '2009-02-14',
    parentPhone: '0936111222',
    address: '156 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    status: 'Đang học',
    fatherName: 'Phạm Văn Thành',
    fatherJob: 'Lái xe công nghệ',
    motherName: 'Ngô Thu Trang',
    motherJob: 'Nội trợ'
  },
  {
    id: 'HS005',
    name: 'Đỗ Minh Quân',
    gender: 'Nam',
    dob: '2009-07-30',
    parentPhone: '0975888999',
    address: '24 Bà Triệu, Hoàn Kiếm, Hà Nội',
    status: 'Đang học',
    fatherName: 'Đỗ Hải Phong',
    fatherJob: 'Lập trình viên',
    motherName: 'Hoàng Minh Thư',
    motherJob: 'Kế toán trưởng'
  },
  {
    id: 'HS006',
    name: 'Bùi Minh Tuấn',
    gender: 'Nam',
    dob: '2009-04-12',
    parentPhone: '0963444555',
    address: '102 Kim Mã, Ba Đình, Hà Nội',
    status: 'Nghỉ học',
    fatherName: 'Bùi Văn Tiến',
    fatherJob: 'Thợ điện',
    motherName: 'Trịnh Thị Nga',
    motherJob: 'Công nhân may'
  },
  {
    id: 'HS007',
    name: 'Hoàng Lê Vy',
    gender: 'Nữ',
    dob: '2009-10-05',
    parentPhone: '0915777888',
    address: '77 Giải Phóng, Hai Bà Trưng, Hà Nội',
    status: 'Đang học',
    fatherName: 'Hoàng Văn Lâm',
    fatherJob: 'Kiến trúc sư',
    motherName: 'Lê Thị Thủy',
    motherJob: 'Buôn bán nhỏ'
  }
];

export const initialViolationTypes = [
  { id: 'VPT01', label: 'Đi muộn', defaultPoints: -1 },
  { id: 'VPT02', label: 'Không làm bài tập', defaultPoints: -2 },
  { id: 'VPT03', label: 'Làm việc riêng', defaultPoints: -1 },
  { id: 'VPT04', label: 'Không đồng phục', defaultPoints: -1 },
  { id: 'VPT05', label: 'Nghỉ học không phép', defaultPoints: -3 },
  { id: 'VPT06', label: 'Nghỉ học có phép', defaultPoints: 0 },
  { id: 'VPT07', label: 'Mất trật tự trong lớp', defaultPoints: -1 },
  { id: 'VPT08', label: 'Khác', defaultPoints: -1 }
];

export const initialViolations: ViolationRecord[] = [
  {
    id: 'VP001',
    studentId: 'HS001',
    studentName: 'Nguyễn Văn Nam',
    date: '2026-06-22',
    type: 'Đi muộn',
    points: -1,
    note: 'Đến lớp muộn 15 phút không lý do',
    resolution: 'Yêu cầu viết cam kết đi học đúng giờ, trừ 1 điểm rèn luyện.'
  },
  {
    id: 'VP002',
    studentId: 'HS003',
    studentName: 'Lê Hoàng Long',
    date: '2026-06-23',
    type: 'Không làm bài tập',
    points: -2,
    note: 'Không hoàn thành bài tập toán về nhà bài 1, 2, 3',
    resolution: 'Yêu cầu hoàn thành bù trong giờ ra chơi và nộp lại vào sáng hôm sau.'
  },
  {
    id: 'VP003',
    studentId: 'HS005',
    studentName: 'Đỗ Minh Quân',
    date: '2026-06-23',
    type: 'Nghỉ học có phép',
    points: 0,
    note: 'Phụ huynh gọi điện xin nghỉ vì bị sốt',
    resolution: 'GVCN chúc sức khỏe, nhắc nhở nhờ bạn chép hộ bài đầy đủ.'
  },
  {
    id: 'VP004',
    studentId: 'HS001',
    studentName: 'Nguyễn Văn Nam',
    date: '2026-06-24',
    type: 'Không đồng phục',
    points: -1,
    note: 'Không thắt khăn quàng và đi dép lê',
    resolution: 'Mượn đồng phục dự phòng của lớp, nhắc nhở trước lớp.'
  },
  {
    id: 'VP005',
    studentId: 'HS004',
    studentName: 'Phạm Thanh Thảo',
    date: '2026-06-25',
    type: 'Đi muộn',
    points: -1,
    note: 'Đi học muộn do hỏng xe đạp giữa đường',
    resolution: 'Miễn phạt do lý do khách quan hợp lý, hướng dẫn đi sớm phòng ngừa sự cố.'
  },
  {
    id: 'VP006',
    studentId: 'HS002',
    studentName: 'Trần Thị Mai',
    date: '2026-06-25',
    type: 'Làm việc riêng',
    points: -1,
    note: 'Sử dụng điện thoại trong giờ học Tiếng Anh',
    resolution: 'Tạm giữ điện thoại đến hết buổi, yêu cầu viết kiểm điểm có chữ ký phụ huynh.'
  }
];

export const initialWeeklyPlans: WeeklyPlan[] = [
  {
    id: 'KH001',
    weekNumber: 35,
    dateRange: '22/06/2026 - 28/06/2026',
    title: 'Kế hoạch học tập tuần 35 - Ổn định và Ôn tập cuối kỳ',
    content: `### KẾ HOẠCH CHI TIẾT TUẦN 35
1. **Chuyên môn:**
   - Hoàn thành chương trình Toán Đại số và Giải tích (Chương cuối về Đạo hàm).
   - Ôn tập tập trung các chuyên đề Ngữ Văn lớp 11 giai đoạn cận thi.
   - Thử nghiệm thi thử trực tuyến môn Tiếng Anh.

2. **Hoạt động nề nếp:**
   - Tăng cường kiểm tra chuyên cần đầu giờ (Ban cán sự lớp phối hợp Sao đỏ).
   - Nhắc nhở học sinh nghiêm túc thực hiện đồng phục và nếp sống văn minh học đường.
   - Chấn chỉnh tình trạng đi muộn của một số cá nhân (như Nam, Thảo).

3. **Hoạt động ngoại khóa:**
   - Chuẩn bị nội dung sinh hoạt lớp chủ đề: "Kỹ năng quản lý thời gian thi cử".
   - Vệ sinh phòng học và khu vực hành lang phân công trực nhật.`,
    objectives: '- 100% học sinh ôn tập đầy đủ đề cương môn Toán.\n- Giảm tỷ lệ đi muộn xuống dưới 3%.\n- Hoàn thành đăng ký nguyện vọng hoạt động hè.',
    teacherNotes: 'Cần quan tâm động viên em Quân đang ốm. Kiểm tra chặt chẽ việc tự học của em Long.',
    createdAt: '2026-06-21',
  },
  {
    id: 'KH002',
    weekNumber: 36,
    dateRange: '29/06/2026 - 05/07/2026',
    title: 'Kế hoạch học tập tuần 36 - Thi học kỳ II và Tổng kết',
    content: `### KẾ HOẠCH CHI TIẾT TUẦN 36
1. **Thi cử & Đánh giá:**
   - Tổ chức lịch thi học kỳ II nghiêm túc, đúng quy chế các môn Toán, Văn, Anh, Lý, Hóa, Sinh.
   - Thu bài tập lớn môn Lịch sử và Địa lý nhóm.

2. **Nề nếp thi cử:**
   - Học sinh có mặt trước giờ thi 15 phút, trang phục nghiêm chỉnh.
   - Tuyệt đối không mang tài liệu và thiết bị điện tử vào phòng thi.

3. **Tổng kết lớp:**
   - Tổng hợp điểm chuyên cần, thi đua của các tổ.
   - Chuẩn bị hồ sơ học sinh, sổ liên lạc điện tử chuẩn bị họp phụ huynh cuối năm.`,
    objectives: '- Kỳ thi học kỳ diễn ra an toàn, nghiêm túc, không có học sinh vi phạm quy chế.\n- Hoàn thành báo cáo tổng hợp thi đua trước thứ Sáu.\n- Chuẩn bị đầy đủ quà thưởng cho học sinh xuất sắc.',
    teacherNotes: 'Liên hệ sớm với ban đại diện phụ huynh lớp để thống nhất kế hoạch họp vào Chủ Nhật.',
    createdAt: '2026-06-28',
  }
];

export const initialTasks: StudentTask[] = [
  {
    id: 'NV001',
    studentId: 'HS002',
    studentName: 'Trần Thị Mai',
    taskTitle: 'Tổng hợp điểm thi đua tuần 35',
    description: 'Thống kê điểm số thi đua, vi phạm của các tổ từ sổ theo dõi của lớp trưởng và sao đỏ để báo cáo vào giờ sinh hoạt thứ Bảy.',
    deadline: '2026-06-26',
    status: 'Đang thực hiện',
    feedback: '',
  },
  {
    id: 'NV002',
    studentId: 'Tất cả',
    studentName: 'Tất cả học sinh',
    taskTitle: 'Hoàn thành đề cương ôn tập môn Toán',
    description: 'Giải các bài tập ôn chương 5 trong sách giáo khoa Toán Giải tích để giáo viên bộ môn kiểm tra vào thứ Năm.',
    deadline: '2026-06-25',
    status: 'Chưa bắt đầu',
    feedback: '',
  },
  {
    id: 'NV003',
    studentId: 'HS003',
    studentName: 'Lê Hoàng Long',
    taskTitle: 'Soạn bài thuyết trình nhóm môn Sinh học',
    description: 'Thiết kế slide PowerPoint cho nhóm 2 về chủ đề "Bảo vệ đa dạng sinh học" và gửi cho cô giáo duyệt.',
    deadline: '2026-06-27',
    status: 'Đã hoàn thành',
    feedback: 'Slide trình bày đẹp, đầy đủ thông tin, đạt yêu cầu.',
  },
  {
    id: 'NV004',
    studentId: 'HS004',
    studentName: 'Phạm Thanh Thảo',
    taskTitle: 'Làm báo cáo hoạt động văn nghệ',
    description: 'Viết báo cáo tổng kết chi tiêu và tập luyện của đội văn nghệ chuẩn bị cho lễ bế giảng.',
    deadline: '2026-06-29',
    status: 'Chưa bắt đầu',
    feedback: '',
  }
];

export const initialAcademicUpdates: any[] = [
  {
    id: 'AC001',
    studentId: 'HS001',
    semester: 'Học kỳ I',
    title: 'Giữa Học kỳ I',
    date: '2025-10-15',
    gpaList: [
      { subject: 'Toán', score: 6.5 },
      { subject: 'Ngữ văn', score: 7.0 },
      { subject: 'Tiếng Anh', score: 5.5 },
      { subject: 'Vật lý', score: 6.0 },
      { subject: 'Hóa học', score: 6.2 },
      { subject: 'Sinh học', score: 7.5 },
      { subject: 'Lịch sử', score: 8.0 },
      { subject: 'Địa lý', score: 8.5 },
      { subject: 'Tin học', score: 9.0 },
      { subject: 'GDKT&PL', score: 7.5 }
    ],
    averageGpa: 7.17,
    teacherRemarks: 'Học lực khá, cần cố gắng hơn ở môn Tiếng Anh và các môn tự nhiên.'
  },
  {
    id: 'AC002',
    studentId: 'HS001',
    semester: 'Học kỳ I',
    title: 'Cuối Học kỳ I',
    date: '2025-12-22',
    gpaList: [
      { subject: 'Toán', score: 7.2 },
      { subject: 'Ngữ văn', score: 7.5 },
      { subject: 'Tiếng Anh', score: 6.2 },
      { subject: 'Vật lý', score: 6.8 },
      { subject: 'Hóa học', score: 6.5 },
      { subject: 'Sinh học', score: 7.8 },
      { subject: 'Lịch sử', score: 8.5 },
      { subject: 'Địa lý', score: 8.8 },
      { subject: 'Tin học', score: 9.2 },
      { subject: 'GDKT&PL', score: 8.0 }
    ],
    averageGpa: 7.65,
    teacherRemarks: 'Có tiến bộ rõ rệt ở môn Toán và Tiếng Anh so với giữa kỳ I.'
  },
  {
    id: 'AC003',
    studentId: 'HS001',
    semester: 'Học kỳ II',
    title: 'Giữa Học kỳ II',
    date: '2026-03-12',
    gpaList: [
      { subject: 'Toán', score: 8.0 },
      { subject: 'Ngữ văn', score: 7.8 },
      { subject: 'Tiếng Anh', score: 7.2 },
      { subject: 'Vật lý', score: 7.5 },
      { subject: 'Hóa học', score: 7.8 },
      { subject: 'Sinh học', score: 8.2 },
      { subject: 'Lịch sử', score: 8.8 },
      { subject: 'Địa lý', score: 9.0 },
      { subject: 'Tin học', score: 9.5 },
      { subject: 'GDKT&PL', score: 8.5 }
    ],
    averageGpa: 8.23,
    teacherRemarks: 'Tiến bộ vượt bậc, đạt học lực Giỏi ở giai đoạn giữa kỳ II. Ý thức học tập rất tốt.'
  },
  {
    id: 'AC004',
    studentId: 'HS002',
    semester: 'Học kỳ I',
    title: 'Cuối Học kỳ I',
    date: '2025-12-22',
    gpaList: [
      { subject: 'Toán', score: 8.5 },
      { subject: 'Ngữ văn', score: 8.0 },
      { subject: 'Tiếng Anh', score: 8.8 },
      { subject: 'Vật lý', score: 7.5 },
      { subject: 'Hóa học', score: 8.0 },
      { subject: 'Sinh học', score: 8.2 },
      { subject: 'Lịch sử', score: 7.8 },
      { subject: 'Địa lý', score: 8.0 },
      { subject: 'Tin học', score: 9.0 },
      { subject: 'GDKT&PL', score: 8.5 }
    ],
    averageGpa: 8.23,
    teacherRemarks: 'Học sinh giỏi toàn diện, tiếp thu nhanh, năng nổ phát biểu.'
  }
];

export const initialUsers: SystemUser[] = [
  {
    id: 'U001',
    stt: 1,
    ten: 'admin',
    matkhau: '123456',
    quyen: 'caocap'
  },
  {
    id: 'U002',
    stt: 2,
    ten: 'hotro',
    matkhau: '123456',
    quyen: 'hotro'
  }
];



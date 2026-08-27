/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ViolationRecord, WeeklyPlan, StudentTask, SystemUser, DocumentCategory, PhotoAlbum } from '../types';

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

export const initialDocumentCategories: DocumentCategory[] = [
  {
    id: 'CAT_01',
    schoolYearId: 'NH03', // 2026-2027
    title: 'QUY ĐỊNH NỀ NẾP',
    order: 1,
    items: [
      {
        id: 'DOC_01_01',
        title: 'MỘT SỐ QUY ĐỊNH CHUNG_NH2026-2027',
        url: 'https://docs.google.com/document/d/1sample-quy-dinh-chung/preview',
        visibility: 'public',
        description: 'Văn bản quy định khung nề nếp, nội quy trường lớp năm học 2026-2027',
        createdAt: '2026-08-15'
      },
      {
        id: 'DOC_01_02',
        title: 'ĐIỂM THI ĐUA & TIÊU CHUẨN XẾP LOẠI',
        url: 'https://docs.google.com/spreadsheets/d/1sample-diem-thi-dua/preview',
        visibility: 'public',
        description: 'Bảng quy chuẩn điểm trừ và xếp loại thi đua hàng tuần cho học sinh',
        createdAt: '2026-08-20'
      },
      {
        id: 'DOC_01_03',
        title: 'HƯỚNG DẪN XỬ LÝ KỶ LUẬT ĐẶC BIỆT (NỘI BỘ BGH & GVCN)',
        url: 'https://docs.google.com/document/d/1sample-ky-luat-noi-bo/preview',
        visibility: 'admin_only',
        description: 'Quy trình tiếp nhận và xử lý vi phạm nghiêm trọng (Chỉ dành cho GVCN)',
        createdAt: '2026-08-22'
      }
    ]
  },
  {
    id: 'CAT_02',
    schoolYearId: 'NH03', // 2026-2027
    title: 'KẾ HOẠCH & ĐỀ CƯƠNG CHUYÊN MÔN',
    order: 2,
    items: [
      {
        id: 'DOC_02_01',
        title: 'KẾ HOẠCH HOẠT ĐỘNG NGOẠI KHÓA TOÀN TRƯỜNG NH2026-2027',
        url: 'https://docs.google.com/document/d/1sample-ngoai-khoa/preview',
        visibility: 'public',
        description: 'Kế hoạch tổ chức các hoạt động trải nghiệm, dã ngoại và hội thi sáng tạo',
        createdAt: '2026-08-21'
      },
      {
        id: 'DOC_02_02',
        title: 'MẪU BÁO CÁO TỔNG KẾT THÁNG CỦA GVCN (NỘI BỘ)',
        url: 'https://docs.google.com/document/d/1sample-mau-bao-cao/preview',
        visibility: 'admin_only',
        description: 'Biểu mẫu nộp báo cáo tổng kết tình hình lớp chủ nhiệm cuối tháng',
        createdAt: '2026-08-23'
      }
    ]
  },
  {
    id: 'CAT_03',
    schoolYearId: 'NH02', // 2025-2026
    title: 'QUY ĐỊNH NỀ NẾP & HỌC VỤ 2025-2026',
    order: 1,
    items: [
      {
        id: 'DOC_03_01',
        title: 'QUY ĐỊNH ĐỒNG PHỤC VÀ TÁC PHONG_NH2025-2026',
        url: 'https://docs.google.com/document/d/1sample-dong-phuc/preview',
        visibility: 'public',
        description: 'Quy chuẩn trang phục học sinh THPT Nguyễn Hữu Cầu',
        createdAt: '2025-09-05'
      }
    ]
  }
];

export const initialAlbums: PhotoAlbum[] = [
  {
    id: 'ALBUM_01',
    title: 'Lễ Khai Giảng Năm Học Mới - Khát Vọng Tri Thức & Sáng Tạo',
    description: 'Chùm ảnh ghi lại không khí hân hoan rực rỡ cờ hoa trong ngày hội toàn dân đưa trẻ đến trường tại mái trường THPT Nguyễn Hữu Cầu.',
    category: 'Hoạt động trường',
    schoolYearId: 'NH03', // 2026-2027
    coverUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
    createdAt: '2026-09-05',
    isPublished: true,
    featured: true,
    photos: [
      {
        id: 'PHOTO_01_01',
        url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1200&auto=format&fit=crop',
        title: 'Toàn cảnh Lễ Khai giảng',
        caption: 'Toàn thể cán bộ giáo viên và học sinh trường THPT Nguyễn Hữu Cầu trang nghiêm trong nghi thức Chào cờ khai giảng năm học mới.',
        order: 1
      },
      {
        id: 'PHOTO_01_02',
        url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop',
        title: 'Tiếng trống trường rộn rã',
        caption: 'Thầy Hiệu trưởng đánh hồi trống khai trường mở đầu cho một năm học mới đầy ắp niềm tin, hy vọng và quyết tâm bứt phá.',
        order: 2
      },
      {
        id: 'PHOTO_01_03',
        url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=1200&auto=format&fit=crop',
        title: 'Nụ cười rạng rỡ của học sinh lớp 10',
        caption: 'Những gương mặt học sinh tân khóa 10 rạng ngời niềm vui, chính thức bước chân vào ngôi nhà chung Nguyễn Hữu Cầu giàu truyền thống.',
        order: 3
      },
      {
        id: 'PHOTO_01_04',
        url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1200&auto=format&fit=crop',
        title: 'Vinh danh giáo viên xuất sắc',
        caption: 'Ban Giám hiệu nhà trường trao tặng hoa và phần thưởng chúc mừng các thầy cô giáo đạt thành tích xuất sắc trong công tác bồi dưỡng học sinh giỏi.',
        order: 4
      }
    ]
  },
  {
    id: 'ALBUM_02',
    title: 'Hội Trại Truyền Thống 26/3 - Nhiệt Huyết Tuổi Trẻ Đoàn Trường',
    description: 'Hành trình trải nghiệm sôi động với chuỗi hoạt động giao lưu cắm trại, đồng diễn flashmob, trò chơi vận động và đêm nhạc hội kết đoàn.',
    category: 'Phong trào Đoàn',
    schoolYearId: 'NH03',
    coverUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop',
    createdAt: '2026-03-26',
    isPublished: true,
    featured: true,
    photos: [
      {
        id: 'PHOTO_02_01',
        url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=1200&auto=format&fit=crop',
        title: 'Cổng trại sáng tạo các chi đoàn',
        caption: 'Các chi đoàn lớp trổ tài thiết kế cổng trại tái chế xanh với chủ đề "Khát vọng vươn tầm và bảo vệ môi trường biển đảo quê hương".',
        order: 1
      },
      {
        id: 'PHOTO_02_02',
        url: 'https://images.unsplash.com/photo-1526976668912-1a811878dd37?q=80&w=1200&auto=format&fit=crop',
        title: 'Hội thi Trò chơi Dân gian & Kéo co',
        caption: 'Tinh thần đoàn kết nảy lửa trong trận chung kết kéo co giữa các khối lớp, tiếng reo hò cổ vũ vang dội khắp sân trường.',
        order: 2
      },
      {
        id: 'PHOTO_02_03',
        url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop',
        title: 'Đêm Lửa Trại Kết Đoàn Lung Linh',
        caption: 'Ánh lửa trại bùng cháy giữa đêm hội kết đoàn, các đoàn viên thanh niên tay nắm chặt tay hát vang bài ca truyền thống Đoàn.',
        order: 3
      }
    ]
  },
  {
    id: 'ALBUM_03',
    title: 'Ngày Hội STEM & Khát Vọng Sáng Tạo Khoa Học Kỹ Thuật',
    description: 'Nơi ươm mầm các ý tưởng khoa học độc đáo từ học sinh: robot tự động, tên lửa nước, mô hình công nghệ xanh và trí tuệ nhân tạo.',
    category: 'Học tập & STEM',
    schoolYearId: 'NH03',
    coverUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=1200&auto=format&fit=crop',
    createdAt: '2026-04-18',
    isPublished: true,
    featured: false,
    photos: [
      {
        id: 'PHOTO_03_01',
        url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=1200&auto=format&fit=crop',
        title: 'Gian hàng Trưng bày Dự án Khoa học',
        caption: 'Học sinh câu lạc bộ Khoa học tự hào thuyết trình mô hình lọc nước thông minh sử dụng năng lượng mặt trời trước hội đồng thẩm định.',
        order: 1
      },
      {
        id: 'PHOTO_03_02',
        url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop',
        title: 'Thực hành Lập trình & Điều khiển Robot',
        caption: 'Các bạn học sinh cùng nhau kiểm tra thuật toán tránh vật cản cho robot mini trên sa bàn thi đấu.',
        order: 2
      },
      {
        id: 'PHOTO_03_03',
        url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1200&auto=format&fit=crop',
        title: 'Trải nghiệm Hóa học Vui',
        caption: 'Tiết học trải nghiệm thực tế với các thí nghiệm biến đổi màu sắc kỳ thú, khơi dậy niềm đam mê nghiên cứu khoa học tự nhiên.',
        order: 3
      }
    ]
  },
  {
    id: 'ALBUM_04',
    title: 'Chiến Dịch Tình Nguyện Hoa Phượng Đỏ & Vì Cộng Đồng',
    description: 'Những bước chân tình nguyện vì an sinh xã hội, thắp sáng ước mơ cho các em nhỏ khó khăn và chung tay bảo vệ môi trường.',
    category: 'Phong trào Đoàn',
    schoolYearId: 'NH02', // 2025-2026
    coverUrl: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=1200&auto=format&fit=crop',
    createdAt: '2026-06-28',
    isPublished: true,
    featured: false,
    photos: [
      {
        id: 'PHOTO_04_01',
        url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?q=80&w=1200&auto=format&fit=crop',
        title: 'Lễ Xuất quân Chiến dịch Hoa Phượng Đỏ',
        caption: 'Chiến sĩ tình nguyện sẵn sàng lên đường thực hiện các phần việc ý nghĩa vì cộng đồng trên địa bàn quận và các huyện ngoại thành.',
        order: 1
      },
      {
        id: 'PHOTO_04_02',
        url: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1200&auto=format&fit=crop',
        title: 'Dạy học hè cho thiếu nhi vùng ven',
        caption: 'Lớp học tình thương ấm áp tiếng cười do các bạn đoàn viên trường trực tiếp đứng lớp ôn tập toán và tiếng Anh hè.',
        order: 2
      }
    ]
  }
];




/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, ViolationRecord, WeeklyPlan, StudentTask, ViolationType, Teacher, SchoolYear, ClassItem, AcademicUpdate, GPAEntry } from '../types';

// Convert Teacher objects to rows and vice versa
export function teachersToRows(teachers: Teacher[]): string[][] {
  const headers = ['Mã Giáo Viên', 'Tên Giáo Viên'];
  const rows = teachers.map(t => [t.id, t.name]);
  return [headers, ...rows];
}

export function rowsToTeachers(rows: string[][]): Teacher[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    name: row[1] || ''
  })).filter(t => t.id);
}

// Convert SchoolYear objects to rows and vice versa
export function schoolYearsToRows(schoolYears: SchoolYear[]): string[][] {
  const headers = ['Mã Niên Khóa', 'Tên Niên Khóa'];
  const rows = schoolYears.map(sy => [sy.id, sy.name]);
  return [headers, ...rows];
}

export function rowsToSchoolYears(rows: string[][]): SchoolYear[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    name: row[1] || ''
  })).filter(sy => sy.id);
}

// Convert ClassItem objects to rows and vice versa
export function classesToRows(classes: ClassItem[]): string[][] {
  const headers = ['Mã Lớp', 'Tên Lớp', 'Mã Niên Khóa', 'Mã Giáo Viên'];
  const rows = classes.map(c => [
    c.id,
    c.name,
    c.schoolYearId,
    c.teacherId
  ]);
  return [headers, ...rows];
}

export function rowsToClasses(rows: string[][]): ClassItem[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    name: row[1] || '',
    schoolYearId: row[2] || '',
    teacherId: row[3] || ''
  })).filter(c => c.id);
}

// Convert ViolationType objects to rows and vice versa
export function violationTypesToRows(violationTypes: ViolationType[]): string[][] {
  const headers = ['Mã Lỗi', 'Tên Lỗi Vi Phạm', 'Điểm Trừ Mặc Định'];
  const rows = violationTypes.map(vt => [
    vt.id,
    vt.label,
    vt.defaultPoints.toString()
  ]);
  return [headers, ...rows];
}

export function rowsToViolationTypes(rows: string[][]): ViolationType[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    label: row[1] || '',
    defaultPoints: parseInt(row[2] || '0', 10)
  })).filter(vt => vt.id);
}

// Convert student objects to rows and vice versa
export function studentsToRows(students: Student[]): string[][] {
  const headers = ['Mã Học Sinh', 'Họ và Tên', 'Giới Tính', 'Ngày Sinh', 'SĐT Phụ Huynh', 'Địa Chỉ', 'Trạng Thái', 'Họ Tên Cha', 'Nghề Nghiệp Cha', 'Họ Tên Mẹ', 'Nghề Nghiệp Mẹ', 'Mã Lớp', 'Lớp Fallback', 'Năm Học Fallback', 'Link Ảnh Chân Dung', 'Tổ', 'Hàng Ghế', 'Cột Ghế', 'Chức Vụ'];
  const rows = students.map(s => [
    s.id,
    s.name,
    s.gender,
    s.dob,
    s.parentPhone,
    s.address,
    s.status,
    s.fatherName || '',
    s.fatherJob || '',
    s.motherName || '',
    s.motherJob || '',
    s.classId || '',
    s.className || '',
    s.schoolYear || '',
    s.avatarUrl || '',
    s.groupName || '',
    s.seatRow !== undefined ? s.seatRow.toString() : '',
    s.seatCol !== undefined ? s.seatCol.toString() : '',
    s.role || ''
  ]);
  return [headers, ...rows];
}

export function rowsToStudents(rows: string[][]): Student[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    name: row[1] || '',
    gender: (row[2] === 'Nữ' ? 'Nữ' : 'Nam') as 'Nam' | 'Nữ',
    dob: row[3] || '',
    parentPhone: row[4] || '',
    address: row[5] || '',
    status: (row[6] || 'Đang học') as 'Đang học' | 'Nghỉ học' | 'Đình chỉ' | 'Lên lớp' | 'Chuyển lớp',
    fatherName: row[7] || '',
    fatherJob: row[8] || '',
    motherName: row[9] || '',
    motherJob: row[10] || '',
    classId: row[11] || '',
    className: row[12] || '',
    schoolYear: row[13] || '',
    avatarUrl: row[14] || '',
    groupName: row[15] || '',
    seatRow: row[16] ? parseInt(row[16], 10) : undefined,
    seatCol: row[17] ? parseInt(row[17], 10) : undefined,
    role: row[18] || ''
  })).filter(s => s.id);
}

// Convert violations to rows and vice-versa
export function violationsToRows(violations: ViolationRecord[]): string[][] {
  const headers = ['Mã Ghi Nhận', 'Mã Học Sinh', 'Tên Học Sinh', 'Ngày', 'Loại', 'Điểm Trừ', 'Ghi Chú', 'Hướng Giải Quyết', 'Mã Lớp Fallback', 'Lớp Fallback', 'Năm Học Fallback'];
  const rows = violations.map(v => [
    v.id,
    v.studentId,
    v.studentName,
    v.date,
    v.type,
    v.points.toString(),
    v.note,
    v.resolution || '',
    v.classId || '',
    v.className || '',
    v.schoolYear || ''
  ]);
  return [headers, ...rows];
}

export function rowsToViolations(rows: string[][]): ViolationRecord[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    studentId: row[1] || '',
    studentName: row[2] || '',
    date: row[3] || '',
    type: (row[4] || 'Khác') as any,
    points: parseInt(row[5] || '0', 10),
    note: row[6] || '',
    resolution: row[7] || '',
    classId: row[8] || '',
    className: row[9] || '',
    schoolYear: row[10] || ''
  })).filter(v => v.id);
}

// Convert weekly plans to rows and vice-versa
export function plansToRows(plans: WeeklyPlan[]): string[][] {
  const headers = ['Mã Kế Hoạch', 'Mã Lớp', 'Số Tuần', 'Khoảng Thời Gian', 'Tiêu Đề', 'Nội Dung', 'Mục Tiêu', 'Ghi Chú Giáo Viên', 'Ngày Tạo', 'Lớp Fallback', 'Năm Học Fallback'];
  const rows = plans.map(p => [
    p.id,
    p.classId,
    p.weekNumber.toString(),
    p.dateRange,
    p.title,
    p.content,
    p.objectives,
    p.teacherNotes,
    p.createdAt,
    p.className || '',
    p.schoolYear || ''
  ]);
  return [headers, ...rows];
}

export function rowsToPlans(rows: string[][]): WeeklyPlan[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    classId: row[1] || '',
    weekNumber: parseInt(row[2] || '0', 10),
    dateRange: row[3] || '',
    title: row[4] || '',
    content: row[5] || '',
    objectives: row[6] || '',
    teacherNotes: row[7] || '',
    createdAt: row[8] || '',
    className: row[9] || '',
    schoolYear: row[10] || ''
  })).filter(p => p.id);
}

// Convert tasks to rows and vice-versa
export function tasksToRows(tasks: StudentTask[]): string[][] {
  const headers = ['Mã Nhiệm Vụ', 'Mã Học Sinh', 'Tên Học Sinh', 'Mã Lớp Fallback', 'Tên Nhiệm Vụ', 'Mô Tả', 'Hạn Chót', 'Trạng Thái', 'Đánh Giá', 'Lớp Fallback', 'Năm Học Fallback'];
  const rows = tasks.map(t => [
    t.id,
    t.studentId,
    t.studentName,
    t.classId || '',
    t.taskTitle,
    t.description,
    t.deadline,
    t.status,
    t.feedback,
    t.className || '',
    t.schoolYear || ''
  ]);
  return [headers, ...rows];
}

export function rowsToTasks(rows: string[][]): StudentTask[] {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map(row => ({
    id: row[0] || '',
    studentId: row[1] || '',
    studentName: row[2] || '',
    classId: row[3] || '',
    taskTitle: row[4] || '',
    description: row[5] || '',
    deadline: row[6] || '',
    status: (row[7] || 'Chưa bắt đầu') as any,
    feedback: row[8] || '',
    className: row[9] || '',
    schoolYear: row[10] || ''
  })).filter(t => t.id);
}

// Convert system settings to rows and vice versa
export function settingsToRows(settings: {
  activeSchoolYearId: string;
  activeClassId: string;
}): string[][] {
  const headers = ['Mã Cấu Hình', 'Giá Trị', 'Mô Tả'];
  const rows = [
    ['ACTIVE_YEAR_ID', settings.activeSchoolYearId, 'ID Niên khóa hiện tại đang chọn'],
    ['ACTIVE_CLASS_ID', settings.activeClassId, 'ID Lớp học hiện tại đang chọn']
  ];
  return [headers, ...rows];
}

export function rowsToSettings(rows: string[][]): {
  activeSchoolYearId: string;
  activeClassId: string;
} {
  const result = {
    activeSchoolYearId: 'NH02',
    activeClassId: 'LH01'
  };
  if (!rows || rows.length <= 1) return result;
  
  rows.slice(1).forEach(row => {
    const key = row[0];
    const value = row[1] || '';
    if (key === 'ACTIVE_YEAR_ID') {
      result.activeSchoolYearId = value || result.activeSchoolYearId;
    } else if (key === 'ACTIVE_CLASS_ID') {
      result.activeClassId = value || result.activeClassId;
    }
  });
  return result;
}

// Convert AcademicUpdate objects to rows and vice versa
export function academicUpdatesToRows(updates: AcademicUpdate[]): string[][] {
  const headers = [
    'Mã Cập Nhật',
    'Mã Học Sinh',
    'Học Kỳ',
    'Tên Lần Cập Nhật',
    'Ngày Cập Nhật',
    'Điểm Toán',
    'Điểm Ngữ văn',
    'Điểm Tiếng Anh',
    'Điểm Vật lý',
    'Điểm Hóa học',
    'Điểm Sinh học',
    'Điểm Lịch sử',
    'Điểm Địa lý',
    'Điểm Tin học',
    'Điểm GDKT&PL',
    'Điểm Trung Bình',
    'Nhận Xét Giáo Viên'
  ];
  
  const rows = (updates || []).map(u => {
    const findScore = (sub: string) => {
      const g = u.gpaList?.find(item => item.subject === sub);
      return g ? g.score.toString() : '';
    };

    return [
      u.id,
      u.studentId,
      u.semester,
      u.title,
      u.date,
      findScore('Toán'),
      findScore('Ngữ văn'),
      findScore('Tiếng Anh'),
      findScore('Vật lý'),
      findScore('Hóa học'),
      findScore('Sinh học'),
      findScore('Lịch sử'),
      findScore('Địa lý'),
      findScore('Tin học'),
      findScore('GDKT&PL'),
      (u.averageGpa || 0).toString(),
      u.teacherRemarks || ''
    ];
  });

  return [headers, ...rows];
}

export function rowsToAcademicUpdates(rows: string[][]): AcademicUpdate[] {
  if (!rows || rows.length <= 1) return [];
  const subjects = [
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

  return rows.slice(1).map(row => {
    const gpaList: GPAEntry[] = [];
    subjects.forEach((sub, i) => {
      const scoreStr = row[5 + i];
      if (scoreStr !== undefined && scoreStr !== '') {
        gpaList.push({ subject: sub, score: parseFloat(scoreStr) || 0 });
      }
    });

    return {
      id: row[0] || '',
      studentId: row[1] || '',
      semester: (row[2] || 'Học kỳ I') as any,
      title: row[3] || '',
      date: row[4] || '',
      gpaList,
      averageGpa: parseFloat(row[15] || '0') || 0,
      teacherRemarks: row[16] || undefined
    };
  }).filter(u => u.id);
}


// REST Client calls to Google Sheets API
export async function pushToGoogleSheets(
  spreadsheetId: string,
  accessToken: string,
  data: {
    teachers: Teacher[];
    schoolYears: SchoolYear[];
    classes: ClassItem[];
    students: Student[];
    violations: ViolationRecord[];
    plans: WeeklyPlan[];
    tasks: StudentTask[];
    violationTypes: ViolationType[];
    academicUpdates?: AcademicUpdate[];
    settings: {
      activeSchoolYearId: string;
      activeClassId: string;
    };
  }
): Promise<void> {
  if (!spreadsheetId) throw new Error('Chưa cung cấp Spreadsheet ID');
  if (!accessToken) throw new Error('Yêu cầu tài khoản Google để thực hiện thao tác này');

  const sheets = [
    { name: 'GiaoVien', values: teachersToRows(data.teachers) },
    { name: 'NienHoc', values: schoolYearsToRows(data.schoolYears) },
    { name: 'LopHoc', values: classesToRows(data.classes) },
    { name: 'HocSinh', values: studentsToRows(data.students) },
    { name: 'ViPham_ChuyenCan', values: violationsToRows(data.violations) },
    { name: 'KeHoachTuan', values: plansToRows(data.plans) },
    { name: 'NhiemVu_BaoCao', values: tasksToRows(data.tasks) },
    { name: 'DanhMucViPham', values: violationTypesToRows(data.violationTypes) },
    { name: 'Diem_HocTap', values: academicUpdatesToRows(data.academicUpdates || []) },
    { name: 'ThongTinChung', values: settingsToRows(data.settings) }
  ];

  for (const sheet of sheets) {
    try {
      // Clear the range first to remove any old data (e.g. deleted students)
      const clearResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet.name}!A1:Z1000:clear`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!clearResponse.ok) {
        const errJson = await clearResponse.json().catch(() => ({}));
        if (errJson.error?.message?.includes('Unable to parse range') || clearResponse.status === 400) {
          // If the worksheet doesn't exist, create it
          await createWorksheetTab(spreadsheetId, accessToken, sheet.name);
        }
      }

      // Now write the updated values
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheet.name}!A1:Z1000?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: `${sheet.name}!A1:Z1000`,
          majorDimension: 'ROWS',
          values: sheet.values
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(`Lỗi đồng bộ bảng ${sheet.name}: ${errJson.error?.message || response.statusText}`);
      }
    } catch (e: any) {
      console.error(e);
      throw e;
    }
  }
}

export async function createWorksheetTab(spreadsheetId: string, accessToken: string, title: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [{
        addSheet: {
          properties: {
            title: title,
            gridProperties: {
              rowCount: 1000,
              columnCount: 20
            }
          }
        }
      }]
    })
  });
  return response.json();
}

export async function fetchFromGoogleSheets(
  spreadsheetId: string,
  accessToken: string
): Promise<{
  teachers: Teacher[] | null;
  schoolYears: SchoolYear[] | null;
  classes: ClassItem[] | null;
  students: Student[] | null;
  violations: ViolationRecord[] | null;
  plans: WeeklyPlan[] | null;
  tasks: StudentTask[] | null;
  violationTypes: ViolationType[] | null;
  academicUpdates: AcademicUpdate[] | null;
  settings: {
    activeSchoolYearId: string;
    activeClassId: string;
  } | null;
}> {
  if (!spreadsheetId) throw new Error('Chưa cung cấp Spreadsheet ID');
  if (!accessToken) throw new Error('Yêu cầu tài khoản Google để thực hiện thao tác này');

  // Verify connection and authentication status first by fetching spreadsheet metadata
  const metaResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!metaResponse.ok) {
    if (metaResponse.status === 401) {
      throw new Error('Phiên đăng nhập Google của bạn đã hết hạn (401). Vui lòng nhấn "Ngắt kết nối" rồi click "Kết nối tự động bằng Google" ở tab Đồng bộ để làm mới phiên.');
    }
    if (metaResponse.status === 403) {
      throw new Error('Tài khoản Google hiện tại không có quyền truy cập bảng tính này (403). Hãy chắc chắn rằng bạn đã mở quyền truy cập hoặc đăng nhập đúng tài khoản sở hữu tệp.');
    }
    if (metaResponse.status === 404) {
      throw new Error('Không tìm thấy tệp Google Sheets với ID đã nhập (404). Vui lòng kiểm tra chính xác Spreadsheet ID.');
    }
    const errJson = await metaResponse.json().catch(() => ({}));
    throw new Error(`Lỗi kết nối tới Google Sheets: ${errJson.error?.message || metaResponse.statusText}`);
  }

  const result: {
    teachers: Teacher[] | null;
    schoolYears: SchoolYear[] | null;
    classes: ClassItem[] | null;
    students: Student[] | null;
    violations: ViolationRecord[] | null;
    plans: WeeklyPlan[] | null;
    tasks: StudentTask[] | null;
    violationTypes: ViolationType[] | null;
    academicUpdates: AcademicUpdate[] | null;
    settings: {
      activeSchoolYearId: string;
      activeClassId: string;
    } | null;
  } = {
    teachers: null,
    schoolYears: null,
    classes: null,
    students: null,
    violations: null,
    plans: null,
    tasks: null,
    violationTypes: null,
    academicUpdates: null,
    settings: null
  };

  const sheets = [
    { name: 'GiaoVien', key: 'teachers', converter: rowsToTeachers },
    { name: 'NienHoc', key: 'schoolYears', converter: rowsToSchoolYears },
    { name: 'LopHoc', key: 'classes', converter: rowsToClasses },
    { name: 'HocSinh', key: 'students', converter: rowsToStudents },
    { name: 'ViPham_ChuyenCan', key: 'violations', converter: rowsToViolations },
    { name: 'KeHoachTuan', key: 'plans', converter: rowsToPlans },
    { name: 'NhiemVu_BaoCao', key: 'tasks', converter: rowsToTasks },
    { name: 'DanhMucViPham', key: 'violationTypes', converter: rowsToViolationTypes },
    { name: 'Diem_HocTap', key: 'academicUpdates', converter: rowsToAcademicUpdates },
    { name: 'ThongTinChung', key: 'settings', converter: rowsToSettings }
  ];

  for (const s of sheets) {
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${s.name}!A1:Z1000`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        (result as any)[s.key] = s.converter(data.values);
      } else {
        console.warn(`Không thể lấy dữ liệu từ bảng ${s.name} (Có thể chưa tồn tại bảng này)`);
      }
    } catch (e) {
      console.error(`Lỗi tải bảng ${s.name}:`, e);
    }
  }

  return result;
}

// Function to create a brand new Google Sheet
export async function createNewSpreadsheet(accessToken: string, title: string): Promise<string> {
  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: title
      },
      sheets: [
        { properties: { title: 'GiaoVien' } },
        { properties: { title: 'NienHoc' } },
        { properties: { title: 'LopHoc' } },
        { properties: { title: 'HocSinh' } },
        { properties: { title: 'ViPham_ChuyenCan' } },
        { properties: { title: 'KeHoachTuan' } },
        { properties: { title: 'NhiemVu_BaoCao' } },
        { properties: { title: 'DanhMucViPham' } },
        { properties: { title: 'Diem_HocTap' } },
        { properties: { title: 'ThongTinChung' } }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Không thể tạo tệp Google Sheets mới');
  }

  const data = await response.json();
  return data.spreadsheetId;
}

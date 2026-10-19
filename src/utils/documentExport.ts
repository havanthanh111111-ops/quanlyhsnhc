import * as XLSX from 'xlsx';

export interface StudentReportExportData {
  schoolName: string;
  className: string;
  reportType: 'end_year' | 'disciplinary';
  student: {
    id: string;
    name: string;
    dob?: string;
    parentPhone?: string;
  };
  reportDate: string;
  teacherComment: string;
  stats: {
    totalDeductions: number;
    violationsCount: number;
    completedTasks: number;
    taskList: Array<{
      id: string;
      taskTitle: string;
      description?: string;
      deadline: string;
      status: string;
      feedback?: string;
    }>;
    history: Array<{
      id: string;
      date: string;
      type: string;
      points: number;
      note?: string;
      resolution?: string;
    }>;
  };
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'Chưa cập nhật';
  // Handles YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

function formatFooterDate(dateStr: string): string {
  try {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return 'Ngày .... tháng .... năm 20....';
    return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  } catch {
    return 'Ngày .... tháng .... năm 20....';
  }
}

/**
 * Xuất Báo Cáo Học Sinh ra file Microsoft Word (.doc)
 * Tương thích Microsoft Word, Google Docs, WPS Office, LibreOffice
 */
export function exportStudentReportToWord(data: StudentReportExportData) {
  const { schoolName, className, reportType, student, reportDate, teacherComment, stats } = data;
  const reportTitle = reportType === 'end_year' 
    ? 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN CUỐI NĂM' 
    : 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN ĐỘT XUẤT';

  const dateFormatted = formatFooterDate(reportDate);

  // Build HTML table for violations
  let violationsHtml = '';
  if (stats.history.length === 0) {
    violationsHtml = `<p style="font-style: italic; color: #555;">Học sinh không ghi nhận vi phạm nề nếp nào trong thời gian học tập rèn luyện.</p>`;
  } else {
    violationsHtml = `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 11pt; border-color: #000;">
        <thead>
          <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
            <th style="width: 35px; border: 1px solid #000;">STT</th>
            <th style="width: 85px; border: 1px solid #000;">Ngày vi phạm</th>
            <th style="width: 140px; border: 1px solid #000; text-align: left;">Lỗi vi phạm</th>
            <th style="width: 50px; border: 1px solid #000;">Điểm trừ</th>
            <th style="border: 1px solid #000; text-align: left;">Lý do / Chi tiết lỗi</th>
            <th style="width: 180px; border: 1px solid #000; text-align: left;">Hướng giải quyết / Biện pháp giáo dục</th>
          </tr>
        </thead>
        <tbody>
          ${stats.history.map((h, i) => `
            <tr>
              <td style="text-align: center; border: 1px solid #000;">${i + 1}</td>
              <td style="text-align: center; border: 1px solid #000;">${formatDateDisplay(h.date)}</td>
              <td style="font-weight: bold; color: #b91c1c; border: 1px solid #000;">${h.type}</td>
              <td style="text-align: center; font-weight: bold; color: #b91c1c; border: 1px solid #000;">-${h.points}đ</td>
              <td style="font-style: italic; border: 1px solid #000;">${h.note || 'Không có lý do chi tiết.'}</td>
              <td style="border: 1px solid #000;">${h.resolution || 'Nhắc nhở, rút kinh nghiệm và rèn luyện'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Build HTML table for tasks
  let tasksHtml = '';
  if (stats.taskList.length === 0) {
    tasksHtml = `<p style="font-style: italic; color: #555;">Học sinh chưa được giao nhiệm vụ bổ sung hoặc đặc biệt nào.</p>`;
  } else {
    tasksHtml = `
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 11pt; border-color: #000;">
        <thead>
          <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
            <th style="width: 35px; border: 1px solid #000;">STT</th>
            <th style="width: 150px; border: 1px solid #000; text-align: left;">Tên nhiệm vụ</th>
            <th style="border: 1px solid #000; text-align: left;">Nội dung công việc</th>
            <th style="width: 85px; border: 1px solid #000;">Hạn nộp</th>
            <th style="width: 100px; border: 1px solid #000;">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${stats.taskList.map((t, i) => `
            <tr>
              <td style="text-align: center; border: 1px solid #000;">${i + 1}</td>
              <td style="font-weight: bold; border: 1px solid #000;">${t.taskTitle}</td>
              <td style="border: 1px solid #000;">
                ${t.description || 'Không có mô tả chi tiết.'}
                ${t.feedback ? `<br/><span style="color: #92400e; font-size: 10pt;"><b>GV nhận xét:</b> ${t.feedback}</span>` : ''}
              </td>
              <td style="text-align: center; border: 1px solid #000;">${formatDateDisplay(t.deadline)}</td>
              <td style="text-align: center; font-weight: bold; border: 1px solid #000;">${t.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${reportTitle} - ${student.name}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
          line-height: 1.4;
          color: #000;
          margin: 20mm;
        }
        h2 {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          margin: 15px 0 5px 0;
          text-transform: uppercase;
        }
        h3 {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 1.5px solid #000;
          padding-bottom: 3px;
          margin-top: 18px;
          margin-bottom: 8px;
        }
        p {
          margin: 4px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-table td {
          vertical-align: top;
          text-align: center;
          border: none;
        }
        .info-table td {
          padding: 4px 0;
          border: none;
        }
        .comment-box {
          border: 1px solid #000;
          padding: 10px;
          background-color: #fafafa;
          min-height: 80px;
          font-style: italic;
          line-height: 1.5;
        }
        .signature-table td {
          border: none;
          text-align: center;
          vertical-align: top;
          padding: 10px 5px;
        }
      </style>
    </head>
    <body>
      <!-- Header tiêu ngữ -->
      <table class="header-table" style="margin-bottom: 20px;">
        <tr>
          <td style="width: 45%; text-align: center;">
            <p style="font-weight: bold; text-transform: uppercase; margin: 0;">${schoolName.toUpperCase()}</p>
            <p style="font-weight: bold; text-transform: uppercase; margin: 2px 0;">LỚP: ${className.toUpperCase()}</p>
            <p style="font-style: italic; font-size: 10pt; margin: 2px 0;">Số: ...../BC-CN</p>
            <div style="width: 100px; height: 1px; background-color: #000; margin: 4px auto;"></div>
          </td>
          <td style="width: 55%; text-align: center;">
            <p style="font-weight: bold; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="font-weight: bold; font-size: 11pt; margin: 2px 0;">Độc lập - Tự do - Hạnh phúc</p>
            <div style="width: 160px; height: 1px; background-color: #000; margin: 4px auto;"></div>
          </td>
        </tr>
      </table>

      <!-- Tiêu đề chính -->
      <h2>${reportTitle}</h2>
      <p style="text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 20px;">Năm học: 2025 - 2026</p>

      <!-- 1. Thông tin học sinh -->
      <h3>1. THÔNG TIN HỌC SINH</h3>
      <table class="info-table" style="margin-bottom: 10px;">
        <tr>
          <td style="width: 50%;"><b>Họ và tên:</b> <span style="font-size: 13pt; font-weight: bold;">${student.name}</span></td>
          <td style="width: 50%;"><b>Ngày sinh:</b> ${formatDateDisplay(student.dob)}</td>
        </tr>
        <tr>
          <td colspan="2"><b>Số điện thoại phụ huynh:</b> ${student.parentPhone || 'Chưa cung cấp'}</td>
        </tr>
      </table>
      
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 15px; background-color: #f9fafb; border-color: #ccc;">
        <tr style="text-align: center; font-size: 11pt;">
          <td style="width: 33%;"><b>Điểm rèn luyện ròng:</b> <br/><span style="font-size: 13pt; font-weight: bold; color: ${stats.totalDeductions < 0 ? '#dc2626' : '#16a34a'};">${stats.totalDeductions}đ</span></td>
          <td style="width: 33%;"><b>Số lỗi nề nếp:</b> <br/><span style="font-size: 13pt; font-weight: bold; color: #d97706;">${stats.violationsCount}</span></td>
          <td style="width: 34%;"><b>Nhiệm vụ hoàn thành:</b> <br/><span style="font-size: 13pt; font-weight: bold; color: #2563eb;">${stats.completedTasks} / ${stats.taskList.length}</span></td>
        </tr>
      </table>

      <!-- 2. Chi tiết lỗi kỷ luật -->
      <h3>2. CHI TIẾT CÁC LỖI KỶ LUẬT & NỀ NẾP</h3>
      ${violationsHtml}

      <!-- 3. Nhiệm vụ được giao -->
      <h3>3. NHIỆM VỤ ĐƯỢC GIAO VÀ KẾT QUẢ THỰC HIỆN</h3>
      ${tasksHtml}

      <!-- 4. Đánh giá của GVCN -->
      <h3>4. ĐÁNH GIÁ CHUNG VÀ NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM</h3>
      <div class="comment-box">
        ${(teacherComment || '').replace(/\n/g, '<br/>')}
      </div>

      <!-- Chữ ký các bên -->
      <table class="signature-table" style="margin-top: 30px; width: 100%;">
        <tr>
          <td style="width: 33%;">
            <p style="font-weight: bold; text-transform: uppercase;">HỌC SINH</p>
            <p style="font-style: italic; font-size: 10pt; color: #666;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">${student.name}</p>
          </td>
          <td style="width: 33%;">
            <p style="font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN GIA ĐÌNH</p>
            <p style="font-style: italic; font-size: 10pt; color: #666;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">........................................</p>
          </td>
          <td style="width: 34%;">
            <p style="font-style: italic; font-size: 10pt;">${dateFormatted}</p>
            <p style="font-weight: bold; text-transform: uppercase;">GIÁO VIÊN CHỦ NHIỆM</p>
            <p style="font-style: italic; font-size: 10pt; color: #666;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">........................................</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword;charset=utf-8'
  });

  const safeStudentName = student.name.replace(/\s+/g, '_');
  const filename = `Bao_Cao_${reportType === 'end_year' ? 'Cuoi_Nam' : 'Dot_Xuat'}_${safeStudentName}_${className}.doc`;
  
  downloadBlob(blob, filename);
}

/**
 * Xuất Báo Cáo Học Sinh ra file Microsoft Excel (.xlsx) / tương thích Google Sheets
 * Với các sheet: Tổng quan, Lỗi nề nếp, Nhiệm vụ
 */
export function exportStudentReportToExcel(data: StudentReportExportData) {
  const { schoolName, className, reportType, student, reportDate, teacherComment, stats } = data;
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Tổng quan học sinh
  const overviewData = [
    ['TRƯỜNG:', schoolName.toUpperCase(), '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'],
    ['LỚP:', className.toUpperCase(), '', 'Độc lập - Tự do - Hạnh phúc'],
    [],
    [reportType === 'end_year' ? 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN CUỐI NĂM' : 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN ĐỘT XUẤT'],
    ['Năm học: 2025 - 2026'],
    [],
    ['1. THÔNG TIN HỌC SINH'],
    ['Mã số học sinh', student.id],
    ['Họ và tên', student.name],
    ['Ngày sinh', formatDateDisplay(student.dob)],
    ['SĐT phụ huynh', student.parentPhone || 'Chưa cung cấp'],
    [],
    ['2. KẾT QUẢ RÈN LUYỆN'],
    ['Điểm rèn luyện ròng', `${stats.totalDeductions} điểm`],
    ['Số lượt vi phạm nề nếp', stats.violationsCount],
    ['Số nhiệm vụ đã hoàn thành', `${stats.completedTasks} / ${stats.taskList.length}`],
    [],
    ['3. ĐÁNH GIÁ CHUNG VÀ NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM'],
    [teacherComment || 'Chưa có nhận xét'],
    [],
    ['Ngày lập báo cáo', formatFooterDate(reportDate)],
  ];
  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  // Cột rộng thoáng
  wsOverview['!cols'] = [{ wch: 25 }, { wch: 45 }, { wch: 15 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, wsOverview, 'Tong_Quan_Danh_Gia');

  // Sheet 2: Chi tiết lỗi vi phạm
  const violationHeaders = ['STT', 'Ngày vi phạm', 'Lỗi vi phạm', 'Điểm trừ', 'Lý do / Chi tiết lỗi', 'Hướng giải quyết / Biện pháp giáo dục'];
  const violationRows = stats.history.map((h, i) => [
    i + 1,
    formatDateDisplay(h.date),
    h.type,
    `-${h.points}đ`,
    h.note || 'Không có lý do chi tiết.',
    h.resolution || 'Nhắc nhở, rút kinh nghiệm và rèn luyện'
  ]);
  const wsViolations = XLSX.utils.aoa_to_sheet([
    ['BẢNG CHI TIẾT LỖI KỶ LUẬT & NỀ NẾP - HỌC SINH: ' + student.name.toUpperCase()],
    [],
    violationHeaders,
    ...violationRows
  ]);
  wsViolations['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 35 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(workbook, wsViolations, 'Chi_Tiet_Loi_Ne_Nep');

  // Sheet 3: Nhiệm vụ được giao
  const taskHeaders = ['STT', 'Tên nhiệm vụ', 'Nội dung công việc', 'Hạn nộp', 'Trạng thái', 'Nhận xét GV'];
  const taskRows = stats.taskList.map((t, i) => [
    i + 1,
    t.taskTitle,
    t.description || '',
    formatDateDisplay(t.deadline),
    t.status,
    t.feedback || ''
  ]);
  const wsTasks = XLSX.utils.aoa_to_sheet([
    ['BẢNG THEO DÕI NHIỆM VỤ ĐƯỢC GIAO - HỌC SINH: ' + student.name.toUpperCase()],
    [],
    taskHeaders,
    ...taskRows
  ]);
  wsTasks['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 40 }, { wch: 14 }, { wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, wsTasks, 'Nhiem_Vu_Duoc_Giao');

  const safeStudentName = student.name.replace(/\s+/g, '_');
  const filename = `Bang_Diem_Ren_Luyen_${safeStudentName}_${className}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/**
 * Sao chép toàn bộ bảng Báo Cáo vào Clipboard dạng Rich HTML & TSV
 * Để người dùng có thể mở Google Docs hoặc Google Sheets và bấm Ctrl + V dán trực tiếp!
 */
export async function copyReportForGoogleDocsSheets(data: StudentReportExportData): Promise<boolean> {
  try {
    const { schoolName, className, reportType, student, stats, teacherComment, reportDate } = data;
    const reportTitle = reportType === 'end_year' 
      ? 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN CUỐI NĂM' 
      : 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN ĐỘT XUẤT';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2 style="text-align: center; text-transform: uppercase; margin-bottom: 5px;">${reportTitle}</h2>
        <p style="text-align: center; font-style: italic; margin-top: 0;">Trường: ${schoolName} - Lớp: ${className} - Năm học 2025-2026</p>
        <hr/>
        <h3>1. Thông tin học sinh</h3>
        <p><b>Họ và tên:</b> ${student.name} | <b>Ngày sinh:</b> ${formatDateDisplay(student.dob)} | <b>SĐT PH:</b> ${student.parentPhone || 'Chưa có'}</p>
        <p><b>Điểm rèn luyện ròng:</b> ${stats.totalDeductions}đ | <b>Số lỗi nề nếp:</b> ${stats.violationsCount} | <b>Nhiệm vụ:</b> ${stats.completedTasks}/${stats.taskList.length}</p>
        
        <h3>2. Danh sách lỗi nề nếp</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #eee;"><th>STT</th><th>Ngày</th><th>Lỗi</th><th>Điểm trừ</th><th>Chi tiết</th><th>Hướng xử lý</th></tr>
          ${stats.history.map((h, i) => `
            <tr>
              <td style="text-align:center;">${i+1}</td>
              <td style="text-align:center;">${formatDateDisplay(h.date)}</td>
              <td><b>${h.type}</b></td>
              <td style="text-align:center; color:red;">-${h.points}đ</td>
              <td>${h.note || ''}</td>
              <td>${h.resolution || ''}</td>
            </tr>
          `).join('')}
        </table>

        <h3>3. Danh sách nhiệm vụ</h3>
        <table border="1" cellpadding="5" style="border-collapse: collapse; width: 100%;">
          <tr style="background-color: #eee;"><th>STT</th><th>Nhiệm vụ</th><th>Nội dung</th><th>Hạn nộp</th><th>Trạng thái</th></tr>
          ${stats.taskList.map((t, i) => `
            <tr>
              <td style="text-align:center;">${i+1}</td>
              <td><b>${t.taskTitle}</b></td>
              <td>${t.description || ''}</td>
              <td style="text-align:center;">${formatDateDisplay(t.deadline)}</td>
              <td style="text-align:center;">${t.status}</td>
            </tr>
          `).join('')}
        </table>

        <h3>4. Nhận xét của Giáo viên chủ nhiệm</h3>
        <p style="background: #f9f9f9; padding: 10px; border: 1px solid #ccc; font-style: italic;">${teacherComment}</p>
        <p style="text-align: right; font-style: italic;">${formatFooterDate(reportDate)}</p>
      </div>
    `;

    const plainText = `${reportTitle}\nTrường: ${schoolName} - Lớp: ${className}\nHọc sinh: ${student.name}\nĐiểm rèn luyện: ${stats.totalDeductions}đ\nNhận xét GVCN: ${teacherComment}`;

    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([plainText], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText
        })
      ]);
      return true;
    } else {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    return false;
  }
}

/**
 * Xuất Báo Cáo Hoạt Động Xã Hội & Phong Trào (Trình BGH 2 Trang) ra file Word (.doc)
 */
export function exportCommunityActivitiesToWord(student: any, record: any) {
  const entries = record.entries || [];
  const sportItems = record.sportArtItems || [];

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>BAO_CAO_HOAT_DONG_${student.name}</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.4; color: #000; margin: 20mm; }
        h2 { font-size: 14pt; font-weight: bold; text-align: center; text-transform: uppercase; margin: 15px 0 5px 0; }
        h3 { font-size: 12pt; font-weight: bold; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 3px; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #000; padding: 6px; font-size: 11pt; }
        th { background-color: #f2f2f2; text-align: center; }
        .no-border td { border: none; padding: 4px; }
      </style>
    </head>
    <body>
      <table class="no-border" style="width: 100%; margin-bottom: 20px;">
        <tr>
          <td style="width: 45%; text-align: center;">
            <p style="font-weight: bold; text-transform: uppercase; margin: 0;">ĐOÀN TNCS HỒ CHÍ MINH</p>
            <p style="font-weight: bold; text-transform: uppercase; margin: 2px 0;">LỚP: ${(student.className || student.classId || '').toUpperCase()}</p>
            <div style="width: 80px; height: 1px; background-color: #000; margin: 4px auto;"></div>
          </td>
          <td style="width: 55%; text-align: center;">
            <p style="font-weight: bold; text-transform: uppercase; margin: 0;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="font-weight: bold; font-size: 11pt; margin: 2px 0;">Độc lập - Tự do - Hạnh phúc</p>
            <div style="width: 160px; height: 1px; background-color: #000; margin: 4px auto;"></div>
          </td>
        </tr>
      </table>

      <h2>BÁO CÁO KẾT QUẢ THAM GIA HOẠT ĐỘNG XÃ HỘI & VĂN THỂ MỸ</h2>
      <p style="text-align: center; font-style: italic; margin-bottom: 20px;">Năm học: 2025 - 2026 (Trình Ban Giám Hiệu Phê Duyệt)</p>

      <table class="no-border" style="margin-bottom: 15px;">
        <tr>
          <td><b>Họ và tên học sinh:</b> ${student.name}</td>
          <td><b>Mã số học sinh:</b> ${student.id}</td>
        </tr>
        <tr>
          <td><b>Lớp:</b> ${student.className || student.classId || ''}</td>
          <td><b>Chức vụ:</b> ${student.role || 'Đoàn viên / Học sinh'}</td>
        </tr>
      </table>

      <h3>PHẦN 1: HOẠT ĐỘNG XÃ HỘI & TÌNH NGUYỆN CỘNG ĐỒNG</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Tên hoạt động / Phong trào</th>
            <th style="width: 85px;">Thời gian</th>
            <th style="width: 75px;">Số giờ</th>
            <th style="width: 140px;">Địa bàn / Đơn vị tổ chức</th>
            <th style="width: 110px;">Xác nhận</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map((e: any, idx: number) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: bold;">${e.activityName}</td>
              <td style="text-align: center;">${formatDateDisplay(e.date)}</td>
              <td style="text-align: center; font-weight: bold;">${e.hours} giờ</td>
              <td>${e.organization || 'Trường / Đoàn trường'}</td>
              <td style="text-align: center; font-weight: bold; color: ${e.isConfirmed ? '#16a34a' : '#d97706'};">
                ${e.isConfirmed ? 'ĐÃ XÁC NHẬN' : 'CHỜ XÁC NHẬN'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>PHẦN 2: THAM GIA HOẠT ĐỘNG VĂN THỂ MỸ & RÈN LUYỆN</h3>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th>Nội dung môn thể thao / Hoạt động</th>
            <th style="width: 90px;">Phân loại</th>
            <th style="width: 75px;">Số giờ</th>
            <th>Ghi chú / Thành tích đạt được</th>
            <th style="width: 110px;">Xác nhận</th>
          </tr>
        </thead>
        <tbody>
          ${sportItems.map((s: any, idx: number) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td style="font-weight: bold;">${s.sportName}</td>
              <td style="text-align: center;">${s.category || 'Thể thao'}</td>
              <td style="text-align: center; font-weight: bold;">${s.hours} giờ</td>
              <td>${s.notes || ''}</td>
              <td style="text-align: center; font-weight: bold; color: ${s.isConfirmed ? '#16a34a' : '#d97706'};">
                ${s.isConfirmed ? 'ĐÃ XÁC NHẬN' : 'CHỜ XÁC NHẬN'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <table class="no-border" style="margin-top: 40px; width: 100%;">
        <tr style="text-align: center;">
          <td style="width: 33%;">
            <p style="font-weight: bold; text-transform: uppercase;">NGƯỜI LẬP BÁO CÁO</p>
            <p style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">${student.name}</p>
          </td>
          <td style="width: 33%;">
            <p style="font-weight: bold; text-transform: uppercase;">GIÁO VIÊN CHỦ NHIỆM</p>
            <p style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">........................................</p>
          </td>
          <td style="width: 34%;">
            <p style="font-style: italic; font-size: 10pt;">Ngày .... tháng .... năm 2026</p>
            <p style="font-weight: bold; text-transform: uppercase;">HIỆU TRƯỞNG / BGH PHÊ DUYỆT</p>
            <p style="font-style: italic; font-size: 10pt;">(Ký tên và đóng dấu)</p>
            <div style="height: 60px;"></div>
            <p style="font-weight: bold;">........................................</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], {
    type: 'application/msword;charset=utf-8'
  });

  const safeName = student.name.replace(/\s+/g, '_');
  downloadBlob(blob, `Bao_Cao_Hoat_Dong_Trinh_BGH_${safeName}.doc`);
}

/**
 * Xuất Báo Cáo Hoạt Động Xã Hội & Phong Trào ra file Excel (.xlsx)
 */
export function exportCommunityActivitiesToExcel(student: any, record: any) {
  const workbook = XLSX.utils.book_new();
  const entries = record.entries || [];
  const sportItems = record.sportArtItems || [];

  // Sheet 1: Hoạt động xã hội
  const entriesData = [
    ['BÁO CÁO HOẠT ĐỘNG XÃ HỘI & TÌNH NGUYỆN CỘNG ĐỒNG'],
    ['Học sinh:', student.name, 'Lớp:', student.className || student.classId, 'Mã số:', student.id],
    [],
    ['STT', 'Tên hoạt động', 'Ngày tham gia', 'Số giờ', 'Đơn vị tổ chức', 'Trạng thái xác nhận']
  ];
  entries.forEach((e: any, idx: number) => {
    entriesData.push([
      idx + 1,
      e.activityName,
      formatDateDisplay(e.date),
      `${e.hours} giờ`,
      e.organization || 'Đoàn trường',
      e.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'
    ]);
  });
  const ws1 = XLSX.utils.aoa_to_sheet(entriesData);
  ws1['!cols'] = [{ wch: 6 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 25 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, ws1, 'Hoat_Dong_Xa_Hoi');

  // Sheet 2: Thể thao văn nghệ
  const sportData = [
    ['BÁO CÁO THAM GIA HOẠT ĐỘNG THỂ THAO & VĂN THỂ MỸ'],
    ['Học sinh:', student.name, 'Lớp:', student.className || student.classId],
    [],
    ['STT', 'Môn thể thao / Hoạt động', 'Phân loại', 'Số giờ', 'Ghi chú / Thành tích', 'Trạng thái']
  ];
  sportItems.forEach((s: any, idx: number) => {
    sportData.push([
      idx + 1,
      s.sportName,
      s.category || 'Thể thao',
      `${s.hours} giờ`,
      s.notes || '',
      s.isConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'
    ]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(sportData);
  ws2['!cols'] = [{ wch: 6 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 30 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, ws2, 'Van_The_My');

  const safeName = student.name.replace(/\s+/g, '_');
  XLSX.writeFile(workbook, `Hoat_Dong_Phong_Trao_${safeName}.xlsx`);
}

/**
 * Xuất danh sách học sinh & điểm rèn luyện toàn lớp ra file Excel (.xlsx / Google Sheets)
 */
export function exportClassStudentsToExcel(
  className: string, 
  students: Array<any>, 
  statsMap: Record<string, { totalDeductions: number; violationsCount: number; completedTasks: number; totalTasks: number }>
) {
  const workbook = XLSX.utils.book_new();

  const data = [
    ['DANH SÁCH HỌC SINH & ĐIỂM RÈN LUYỆN LỚP: ' + className.toUpperCase()],
    ['Năm học: 2025 - 2026', '', '', '', '', '', '', '', `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    [],
    [
      'STT', 
      'Mã học sinh', 
      'Họ và tên', 
      'Giới tính', 
      'Ngày sinh', 
      'Số ĐT Phụ huynh', 
      'Địa chỉ', 
      'Chức vụ', 
      'Tổ / Nhóm', 
      'Điểm rèn luyện', 
      'Số lỗi vi phạm', 
      'Nhiệm vụ', 
      'Trạng thái'
    ]
  ];

  students.forEach((s, idx) => {
    const stat = statsMap[s.id] || { totalDeductions: 0, violationsCount: 0, completedTasks: 0, totalTasks: 0 };
    data.push([
      idx + 1,
      s.id,
      s.name,
      s.gender || 'Nam',
      formatDateDisplay(s.dob),
      s.parentPhone || '',
      s.address || '',
      s.role || 'Học sinh',
      s.groupName || '',
      `${stat.totalDeductions}đ`,
      stat.violationsCount,
      `${stat.completedTasks}/${stat.totalTasks}`,
      s.status || 'Đang học'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 12 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(workbook, ws, `Danh_Sach_${className}`);

  XLSX.writeFile(workbook, `Danh_Sach_Hoc_Sinh_Lop_${className}.xlsx`);
}

/**
 * Xuất danh sách học sinh toàn lớp ra file Word (.doc)
 */
export function exportClassStudentsToWord(
  className: string, 
  students: Array<any>, 
  statsMap: Record<string, { totalDeductions: number; violationsCount: number; completedTasks: number; totalTasks: number }>
) {
  const tableRows = students.map((s, idx) => {
    const stat = statsMap[s.id] || { totalDeductions: 0, violationsCount: 0, completedTasks: 0, totalTasks: 0 };
    return `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="text-align: center; font-weight: bold;">${s.id}</td>
        <td style="font-weight: bold;">${s.name}</td>
        <td style="text-align: center;">${s.gender || 'Nam'}</td>
        <td style="text-align: center;">${formatDateDisplay(s.dob)}</td>
        <td>${s.parentPhone || ''}</td>
        <td style="text-align: center;">${s.role || 'Học sinh'}</td>
        <td style="text-align: center; font-weight: bold; color: ${stat.totalDeductions < 0 ? '#dc2626' : '#16a34a'};">${stat.totalDeductions}đ</td>
        <td style="text-align: center;">${stat.violationsCount}</td>
        <td style="text-align: center;">${s.status || 'Đang học'}</td>
      </tr>
    `;
  }).join('');

  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>DANH_SACH_HOC_SINH_${className}</title>
      <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 15mm; }
        h2 { text-align: center; font-size: 13pt; text-transform: uppercase; margin-bottom: 4px; }
        p { margin: 3px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #000; padding: 5px; font-size: 10pt; }
        th { background-color: #f2f2f2; text-align: center; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border: none; margin-bottom: 10px;">
        <tr style="border: none;">
          <td style="border: none; width: 45%; text-align: center;">
            <p style="font-weight: bold;">TRƯỜNG THPT NGUYỄN HỮU CẦU</p>
            <p style="font-weight: bold;">LỚP: ${className.toUpperCase()}</p>
          </td>
          <td style="border: none; width: 55%; text-align: center;">
            <p style="font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="font-weight: bold; font-size: 10pt;">Độc lập - Tự do - Hạnh phúc</p>
          </td>
        </tr>
      </table>

      <h2>DANH SÁCH HỌC SINH & ĐIỂM RÈN LUYỆN NỀ NẾP</h2>
      <p style="text-align: center; font-style: italic;">Năm học: 2025 - 2026 (Ngày xuất: ${new Date().toLocaleDateString('vi-VN')})</p>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;">STT</th>
            <th style="width: 60px;">Mã HS</th>
            <th>Họ và tên</th>
            <th style="width: 45px;">Phái</th>
            <th style="width: 75px;">Ngày sinh</th>
            <th style="width: 90px;">SĐT Phụ huynh</th>
            <th style="width: 80px;">Chức vụ</th>
            <th style="width: 60px;">Điểm RL</th>
            <th style="width: 45px;">Số lỗi</th>
            <th style="width: 70px;">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <table style="width: 100%; border: none; margin-top: 30px;">
        <tr style="border: none; text-align: center;">
          <td style="border: none; width: 50%;"></td>
          <td style="border: none; width: 50%;">
            <p style="font-style: italic;">TP. Hồ Chí Minh, ngày .... tháng .... năm 2026</p>
            <p style="font-weight: bold;">GIÁO VIÊN CHỦ NHIỆM</p>
            <div style="height: 50px;"></div>
            <p style="font-weight: bold;">........................................</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
  downloadBlob(blob, `Danh_Sach_Hoc_Sinh_${className}.doc`);
}

/**
 * Xuất bất kỳ container HTML nào ra file Word (.doc)
 */
export function exportHtmlElementToWord(element: HTMLElement, title: string, filename: string) {
  const content = element.innerHTML;
  const wordContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        body { font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.4; color: #000; margin: 20mm; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #000; padding: 6px; }
        th { background-color: #f2f2f2; text-align: center; }
        h1, h2, h3, h4 { margin: 8px 0; text-align: center; }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
  downloadBlob(blob, filename.endsWith('.doc') ? filename : `${filename}.doc`);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

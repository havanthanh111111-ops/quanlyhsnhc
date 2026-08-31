/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommunityActivityEntry, SportArtActivityItem, StudentCommunityRecord } from '../types';

export const defaultCommunityEntries: CommunityActivityEntry[] = [
  {
    stt: 1,
    categoryKey: 'mien_trung',
    title: 'Tham gia "Vì miền Trung yêu thương" & "Chuyến xe yêu thương"',
    guide: '• Vì miền Trung yêu thương: đóng gói: 3h, ủng hộ: 3h, vận chuyển: 3h, tiếp nhận: 2h, Hội chợ ẩm thực: 5h.\n• Tham gia "Chuyến xe yêu thương": ủng hộ: 3h, tham gia toàn bộ chương trình: 16h.',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: '+ GVCN\n+ Ban cán sự\n+ BCH Chi đoàn\n+ Phòng KNYT'
  },
  {
    stt: 2,
    categoryKey: 'clb',
    title: 'Tham gia Câu lạc bộ',
    guide: '1. Sinh hoạt thường xuyên (nếu ĐẠT yêu cầu của CLB):\n   - Chủ nhiệm: 12h/HK\n   - Các thành viên khác: 6h/HK\n2. Tổ chức hoạt động tiêu điểm (được TLTN duyệt):\n   - Trưởng BTC (nếu là học sinh): 4h/HĐ\n   - Các thành viên khác của BTC: 2h/HĐ',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: 'TLTN, GV quản lý và Ban chủ nhiệm'
  },
  {
    stt: 3,
    categoryKey: 'bch',
    title: 'Nhiệm vụ Ban Cán sự & Đoàn thể',
    guide: '- BCH đoàn trường, lớp trưởng, bí thư chi đoàn: 30h/HK\n- Các lớp phó, Phó bí thư, Thủ quỹ, Thư ký: 25h/HK\n- Tổ trưởng: 20h/HK\n- Nhóm trưởng các lớp chạy (nhóm từ 2 học sinh trở lên): 15h/HK\n(Nếu nhiều nhiệm vụ chỉ ghi mức cao nhất)',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: '+ GVCN\n+ Ban cán sự lớp\n+ BCH Chi đoàn'
  },
  {
    stt: 4,
    categoryKey: 'cap_cum',
    title: 'Các hoạt động từ cấp cụm trở lên',
    guide: 'Học sinh giỏi 12; Olympic 10, 11; nghiên cứu khoa học, khởi nghiệp; IOE; SEAMO; thể thao;…:\n- Trường cử đi (không đạt giải): 10h\n- Cấp Thành phố: 15h\n- Cấp Quốc gia/ Quốc tế: 20h',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: 'GV phụ trách hoặc GVCN'
  },
  {
    stt: 5,
    categoryKey: 'giup_ban',
    title: 'Giúp bạn học tốt',
    guide: 'Tính theo số giờ thực tế, được GVBM phân công',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: 'GVBM hoặc GVCN'
  },
  {
    stt: 6,
    categoryKey: 'khac',
    title: 'Các hoạt động khác (5h/ hoạt động)',
    guide: '- Cổ vũ Khởi nghiệp\n- Tổ chức đại hội/hội nghị chi đoàn\n- Tổ chức sinh hoạt chủ điểm (mỗi đợt tính 1 HĐ)\n- Họp cha mẹ học sinh\n- Ngày chủ nhật xanh\n- Open day\n- Hỗ trợ công tác thư viện, văn phòng\n...',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: 'GV phụ trách'
  },
  {
    stt: 7,
    categoryKey: 'the_thao_tong',
    title: 'Tham gia văn nghệ, thể thao, ngoại khoá (thi đấu giữa các lớp)',
    guide: '- Mỗi môn/ nội dung thi được tính riêng: tham gia 10h, vào vòng trong 12h, tứ kết 15h, bán kết 18h, chung kết 20h, thi giữa các khối 22h.\n- Hoạt động tham gia 1 buổi tính giải: tham gia 10h, khuyến khích 12h, hạng ba 15h, hạng hai 18h, hạng nhất 20h.\n- Cổ động viên được tối đa 50% số giờ của người tham gia.\n* Học sinh tính tổng số giờ của các hoạt động ở trang 2, sau đó điền vào ô kế bên.',
    studentNote: '',
    hours: 0,
    isConfirmed: false,
    signedBy: '+ GVCN\n+ Ban cán sự lớp\n+ BCH Chi đoàn'
  }
];

export const defaultSportArtList: Omit<SportArtActivityItem, 'id'>[] = [
  { name: 'Bóng đá hè', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng chuyền hè', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng rổ hè', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Cầu lông hè', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Sân khấu hoá tác phẩm văn học', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng đá', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng chuyền', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng rổ', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bóng bàn', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Điền kinh', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Bơi lội', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Cầu lông đơn nam/nữ', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Cầu lông đôi nam nữ', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Cờ vua', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Cờ tướng', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Tự tin học đường', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Tuần lễ không vi phạm', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Duyên dáng áo dài học đường', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Trại xuân (tối đa 30h)', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' },
  { name: 'Trại 09/01 (tối đa 20h)', role: 'Tham gia', achievement: '', hours: 0, isConfirmed: false, signedBy: 'Ký tên' }
];

export function createInitialStudentRecord(studentId: string, studentName?: string, classId?: string): StudentCommunityRecord {
  return {
    id: studentId,
    studentId,
    studentName,
    classId,
    entries: defaultCommunityEntries.map(e => ({ ...e })),
    sportArtItems: defaultSportArtList.map((item, index) => ({
      id: `sport_${studentId}_${index + 1}`,
      ...item
    })),
    teacherComment: '',
    evaluationRating: 'Đạt',
    updatedAt: new Date().toISOString()
  };
}

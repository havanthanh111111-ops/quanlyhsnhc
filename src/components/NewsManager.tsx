import React, { useState, useEffect } from 'react';
import { Announcement } from '../types';
import { 
  Megaphone, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Globe, 
  Calendar, 
  Tag, 
  Check, 
  AlertCircle,
  Sparkles,
  List,
  Table,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Type,
  Palette,
  Image as ImageIcon,
  ChevronDown
} from 'lucide-react';

interface NewsManagerProps {
  isReadOnly?: boolean;
}

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    date: '14/07/2026',
    title: 'Lịch thi tập trung và kiểm tra định kỳ Học kỳ II năm học 2025-2026',
    content: `### 📅 LỊCH THI VÀ ÔN TẬP CHI TIẾT Học kỳ II

Kính gửi Quý phụ huynh và các em học sinh,

Để chuẩn bị tốt nhất cho kỳ thi kết thúc học kỳ II, Ban Giám Hiệu nhà trường xin thông báo lịch ôn tập và kiểm tra định kỳ chi tiết như sau:

* **Thời gian ôn tập tập trung:** Từ ngày 15/05/2026 đến hết ngày 22/05/2026.
* **Thời gian thi chính thức:** Từ 25/05/2026 đến 29/05/2026.

| Ngày thi | Sáng (7h30) | Chiều (13h30) |
|---|---|---|
| **Thứ Hai (25/05)** | Toán (90 phút) | Ngữ Văn (120 phút) |
| **Thứ Ba (26/05)** | Tiếng Anh (60 phút) | Vật lý (45 phút) |

#### ⚠️ Một số lưu ý quan trọng:
* Học sinh phải có mặt tại phòng thi trước giờ làm bài **20 phút**.
* Mặc đồng phục đúng quy định, đeo thẻ học sinh đầy đủ.`,
    isNew: true,
    category: 'Học vụ'
  },
  {
    id: 'ann-2',
    date: '08/07/2026',
    title: 'Thông báo về việc tổ chức tập huấn Sử dụng Sách giáo khoa mới cho Giáo viên',
    content: `### 📘 TẬP HUẤN SÁCH GIÁO KHOA MỚI

Kính gửi toàn thể cán bộ, giáo viên trong tổ bộ môn,

Nhà trường tổ chức tập huấn Sử dụng Sách giáo khoa mới hỗ trợ giảng dạy trực quan:

* **Thời gian tập huấn:** 08h00 ngày 20/07/2026.
* **Địa điểm:** Hội trường Lớn tầng 2.
* **Báo cáo viên:** Chuyên gia Nhà xuất bản Giáo dục Việt Nam.

Đề nghị tất cả Giáo viên tham dự đông đủ, đúng giờ để buổi tập huấn diễn ra tốt đẹp!`,
    isNew: true,
    category: 'Đào tạo'
  },
  {
    id: 'ann-3',
    date: '02/07/2026',
    title: 'Kế hoạch triển khai Chiến dịch Tình nguyện Hoa Phượng Đỏ năm 2026',
    content: `### 🌸 CHIẾN DỊCH TÌNH NGUYỆN HÈ HOA PHƯỢNG ĐỎ 2026

Ban chấp hành Đoàn trường phát động chiến dịch tình nguyện hè sôi nổi:

* **Nội dung hoạt động:**
  1. Dọn dẹp vệ sinh khu vực đài tưởng niệm địa phương.
  2. Tổ chức ôn tập văn hóa hè cho thiếu nhi vùng khó khăn.
  3. Quyên góp sách giáo khoa cũ, quần áo ấm.

* **Đăng ký tham gia:** Học sinh đăng ký trực tiếp với Bí thư Chi đoàn lớp trước ngày 20/06/2026.`,
    isNew: false,
    category: 'Phong trào'
  },
  {
    id: 'ann-4',
    date: '25/06/2026',
    title: 'Danh sách tuyên dương các tập thể lớp xuất sắc đạt chuẩn nề nếp Tháng 6',
    content: `### 🏆 TUYÊN DƯƠNG THI ĐUA THÁNG 6

Ban thi đua nhà trường xin công bố danh sách các tập thể lớp đạt chuẩn xuất sắc về nề nếp và phong trào tháng 6:

1. **Lớp 11A1** - Đạt 99.5 điểm (Dẫn đầu khối)
2. **Lớp 10C2** - Đạt 98.2 điểm
3. **Lớp 12B5** - Đạt 97.8 điểm

Khen thưởng 100.000 VNĐ cho mỗi chi đoàn đạt danh hiệu này. Chúc mừng các tập thể xuất sắc!`,
    isNew: false,
    category: 'Nề nếp'
  }
];

const NEWS_TEMPLATES: Record<string, { title: string; content: string; description: string }[]> = {
  'Học vụ': [
    {
      description: 'Lịch kiểm tra định kỳ học kỳ II',
      title: 'Thông báo lịch thi tập trung và rà soát kiến thức Học kỳ II năm học 2025-2026',
      content: `### 📅 LỊCH THI VÀ ÔN TẬP CHI TIẾT Học kỳ II

Kính gửi Quý phụ huynh và các em học sinh,

Để chuẩn bị tốt nhất cho kỳ thi kết thúc học kỳ II, Ban Giám Hiệu nhà trường xin thông báo lịch ôn tập và kiểm tra định kỳ chi tiết như sau:

* **Thời gian ôn tập tập trung:** Từ ngày 15/05/2026 đến hết ngày 22/05/2026.
* **Thời gian thi chính thức:** Từ 25/05/2026 đến 29/05/2026.

| Ngày thi | Sáng (7h30) | Chiều (13h30) |
|---|---|---|
| **Thứ Hai (25/05)** | Toán (90 phút) | Ngữ Văn (120 phút) |
| **Thứ Ba (26/05)** | Tiếng Anh (60 phút) | Vật lý (45 phút) |
| **Thứ Tư (27/05)** | Hóa học (45 phút) | Sinh học (45 phút) |

#### ⚠️ Một số lưu ý quan trọng:
* Học sinh phải có mặt tại phòng thi trước giờ làm bài **20 phút**.
* Mặc đồng phục đúng quy định, đeo thẻ học sinh đầy đủ.
* Tuyệt đối không mang tài liệu, thiết bị di động vào phòng thi.

Chúc các em học sinh chuẩn bị thật tốt để đạt kết quả xuất sắc!`
    },
    {
      description: 'Bổ sung hồ sơ học bạ & sổ liên lạc',
      title: 'Thông báo hoàn tất hồ sơ học bạ cá nhân và ký nhận Sổ liên lạc cuối năm',
      content: `### 📂 THÔNG BÁO HOÀN TẤT HỒ SƠ CÁ NHÂN

Nhằm hoàn thiện dữ liệu học bạ số và báo cáo tổng kết cuối năm học, Ban cán sự lớp đề nghị các thành viên kiểm tra và nộp bổ sung:

1. **Sổ liên lạc học sinh:** Phụ huynh đọc, ghi ý kiến và ký xác nhận ở trang cuối.
2. **Ảnh thẻ cá nhân:** 02 ảnh kích cỡ 3x4 (mặt sau ghi rõ Họ tên, Ngày sinh).
3. **Giấy tờ chứng nhận ưu tiên (nếu có):** Bản sao công chứng.

* **Thời gian nộp:** Hạn chót trước **17h00 ngày 30/05/2026**.
* **Địa điểm nhận:** Lớp trưởng tổng hợp và nộp cho Giáo viên Chủ nhiệm.

Ban cán sự đề nghị các bạn nghiêm túc chấp hành đúng thời gian quy định!`
    }
  ],
  'Đào tạo': [
    {
      description: 'Tập huấn ứng dụng chuyển đổi số',
      title: 'Thông báo tổ chức buổi tập huấn ứng dụng Công nghệ số trong học tập chủ động',
      content: `### 💻 TẬP HUẤN ỨNG DỤNG CÔNG NGHỆ TRONG HỌC TẬP

Thực hiện kế hoạch chuyển đổi số giáo dục, lớp chúng ta sẽ tổ chức buổi sinh hoạt chuyên đề:

* **Chủ đề:** Hướng dẫn khai thác tài liệu học liệu số và công cụ AI hỗ trợ tự học hiệu quả.
* **Thời gian:** 08h00 - 10h30, Thứ Bảy tuần này.
* **Địa điểm:** Phòng máy tính trung tâm - tầng 3 khu B.
* **Báo cáo viên:** Thầy giáo công nghệ thông tin cùng Ban học tập của lớp.

#### 📝 Nội dung chính:
- Cách tra cứu kho đề thi thử và bài tập rèn luyện trên cổng thông tin.
- Phương pháp ôn tập qua các video bài giảng tương tác.
- Hỏi đáp và hỗ trợ kỹ thuật cài đặt ứng dụng.

*Khuyến khích học sinh mang theo thiết bị cá nhân (máy tính bảng/máy tính xách tay) để thực hành.*`
    },
    {
      description: 'Chuyên đề ôn luyện thi chuyển cấp',
      title: 'Tổ chức lớp học chuyên đề bồi dưỡng kỹ năng làm bài thi trắc nghiệm',
      content: `### ✍️ LỚP HỌC CHUYÊN ĐỀ PHƯƠNG PHÁP LÀM BÀI TRẮC NGHIỆM

Chào các em học sinh,

Nhằm trang bị phương pháp giải nhanh và kỹ thuật phân bổ thời gian trong bài thi trắc nghiệm khách quan:

* **Môn học áp dụng:** Toán, Vật lý, Hóa học, Tiếng Anh.
* **Lịch học:** Chiều Thứ Năm hàng tuần, từ 14h30 đến 16h30.
* **Địa điểm:** Phòng học chính của lớp.

#### 💡 Nội dung rèn luyện:
- Kỹ thuật loại trừ phương án nhiễu nhanh chóng.
- Sử dụng máy tính cầm tay giải toán tối ưu.
- Quản lý tâm lý và kiểm soát thời gian làm bài hiệu quả.`
    }
  ],
  'Phong trào': [
    {
      description: 'Chiến dịch hè Hoa Phượng Đỏ',
      title: 'Thông báo phát động Chiến dịch Tình nguyện hè Hoa Phượng Đỏ năm 2026',
      content: `### 🌸 CHIẾN DỊCH TÌNH NGUYỆN HÈ HOA PHƯỢNG ĐỎ 2026

BCH Chi đoàn chính thức phát động chiến dịch tình nguyện lớn nhất trong năm dành cho các đoàn viên, thanh niên lớp học:

* **Slogan hành động:** *Tuổi trẻ năng động - Chung tay vì cộng đồng.*
* **Thời gian:** Từ ngày 05/06/2026 đến ngày 25/06/2026.

#### 📍 Các hoạt động trọng tâm:
1. **Ngày chủ nhật xanh:** Dọn dẹp cảnh quan, trang trí bồn hoa và bảo vệ môi trường khu vực quanh trường.
2. **Chiến dịch tri ân:** Thăm hỏi và tặng quà các gia đình thương binh liệt sĩ tại địa phương nhân dịp tháng 7 tri ân.
3. **Áo ấm tình bạn:** Quyên góp tập vở học tập cũ và quần áo còn tốt gửi tặng trẻ em vùng cao.

*Các bạn liên hệ Bí thư Chi đoàn lớp để đăng ký và nhận áo đồng phục tình nguyện trước ngày 30/05.*`
    },
    {
      description: 'Giải bóng đá tranh cúp vô địch lớp',
      title: 'Khai mạc Giải bóng đá nam nữ giao hữu nội bộ Chào mừng Ngày thành lập Đoàn',
      content: `### ⚽ GIẢI BÓNG ĐÁ GIAO HỮU LỚP HỌC

Thiết thực lập thành tích chào mừng ngày thành lập Đoàn TNCS Hồ Chí Minh 26/03:

* **Cơ cấu giải thưởng:** 
  - **01 Giải Nhất:** Cúp vô địch + Cờ lưu niệm + 500k tiền mặt.
  - **01 Giải Nhì:** Cờ lưu niệm + 300k tiền mặt.
  - **Giải cầu thủ xuất sắc nhất & Vua phá lưới.**

* **Thể thức thi đấu:** Chia làm 4 tổ đấu vòng tròn tính điểm chọn ra 2 đội mạnh nhất vào chung kết.
* **Thời gian khai mạc:** 15h30 chiều Thứ Hai tuần tới tại sân bóng cỏ nhân tạo của trường.`
    }
  ],
  'Nề nếp': [
    {
      description: 'Chấn chỉnh nề nếp kỷ luật lớp học',
      title: 'Thông báo tăng cường kiểm tra tác phong, chuyên cần và nề nếp học đường tuần mới',
      content: `### 🚨 CHẤN CHỈNH KỶ LUẬT VÀ NỀ NẾP TUẦN MỚI

Để nâng cao điểm thi đua của lớp trong toàn trường, Ban cán sự lớp phối hợp cùng Ban cờ đỏ quy định nghiêm ngặt một số nội dung sau:

1. **Thời gian lên lớp:** Có mặt trước **07h15**. Sau 7h15 tính là đi muộn.
2. **Tác phong trang phục:** 
   - Đi giày hoặc dép có quai hậu.
   - Sơ vin, đeo thẻ học sinh và huy hiệu đầy đủ.
   - Tóc tai gọn gàng, không nhuộm màu sáng.
3. **Ý thức giữ gìn vệ sinh:** Không ăn quà vặt trong lớp học. Trực nhật tổ hoàn thành trước 7h00 sáng.

*Mọi trường hợp vi phạm sẽ bị trừ điểm thi đua cá nhân trực tiếp và phê bình trước lớp vào giờ sinh hoạt cuối tuần.*`
    },
    {
      description: 'Khen thưởng tổ xuất sắc thi đua tuần',
      title: 'Tuyên dương và chúc mừng Tổ học sinh có thành tích nề nếp xuất sắc tuần vừa qua',
      content: `### 🎉 TUYÊN DƯƠNG THI ĐUA NỀ NẾP TUẦN

Thay mặt Ban cán sự lớp, xin chúc mừng tập thể thành viên của **Tổ 3** đã xuất sắc dẫn đầu bảng xếp hạng thi đua nề nếp tuần vừa qua:

* **Thành tích:** Đạt 100/100 điểm thi đua (Không có ai đi muộn, đầy đủ bài tập về nhà, tác phong đồng phục hoàn hảo, bàn ghế sạch sẽ).
* **Phần thưởng:** 1 voucher liên hoan nước uống tự chọn trị giá 100.000 VNĐ cho cả tổ.

Hy vọng các tổ còn lại sẽ nỗ lực thi đua quyết liệt trong tuần tới để giành vị trí dẫn đầu!`
    }
  ],
  'Khác': [
    {
      description: 'Mời họp phụ huynh học sinh cuối kỳ',
      title: 'Giấy mời tham dự buổi họp mặt Cha mẹ học sinh cuối học kỳ II',
      content: `### ✉️ GIẤY MỜI HỌP PHỤ HUYNH HỌC SINH

**Trân trọng kính mời:** Quý Phụ huynh học sinh lớp,

Đến tham dự buổi họp phụ huynh cuối kỳ II nhằm trao đổi tình hình học tập và định hướng hoạt động hè cho học sinh:

* **Thời gian:** 08h00 - 10h30, Chủ Nhật ngày 14/06/2026.
* **Địa điểm:** Phòng học chính (Phòng 204 - lầu 2).
* **Nội dung cuộc họp:**
  - Báo cáo kết quả rèn luyện học tập của từng học sinh cuối năm.
  - Phổ biến kế hoạch ôn tập hè và định hướng chuyển cấp.
  - Thảo luận ý kiến đóng góp của Phụ huynh học sinh.

*Sự hiện diện đầy đủ của Quý phụ huynh là vinh hạnh và sự khích lệ to lớn cho tập thể lớp.*`
    },
    {
      description: 'Báo cáo quyết toán thu chi quỹ lớp',
      title: 'Công khai bảng tổng hợp quyết toán thu chi quỹ lớp học cuối Học kỳ II',
      content: `### 📊 BÁO CÁO QUYẾT TOÁN TÀI CHÍNH QUỸ LỚP

Đại diện Ban phụ huynh học sinh phối hợp cùng thủ quỹ lớp xin gửi tới Quý phụ huynh và toàn thể học sinh bảng công khai quyết toán hoạt động thu chi quỹ lớp cuối học kỳ II:

* **TỔNG SỐ THU:** 4.500.000 VNĐ (Quỹ tồn kỳ I chuyển sang + Thu bổ sung)
* **TỔNG SỐ CHI:** 3.820.000 VNĐ
  - Chi in ấn tài liệu, đề cương thi học kỳ: 820.000 VNĐ
  - Chi mua quà tặng khen thưởng học sinh giỏi: 1.500.000 VNĐ
  - Chi tổ chức liên hoan văn nghệ cuối năm: 1.500.000 VNĐ
* **SỐ DƯ QUỸ HIỆN TẠI:** **680.000 VNĐ** *(Chuyển vào quỹ tích lũy năm sau)*

*Toàn bộ hóa đơn bán lẻ, biên lai thu tiền được lưu giữ công khai và minh bạch. Mọi ý kiến thắc mắc xin vui lòng gửi trực tiếp cho Ban đại diện phụ huynh.*`
    }
  ]
};

// Simple Markdown parser to React Elements
const parseTextToReactElements = (text: string): React.ReactNode => {
  if (!text) return <p className="text-slate-400 italic text-xs">Chưa có nội dung nhập...</p>;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  
  lines.forEach((line, index) => {
    let trimmed = line.trim();
    
    // Check for headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${index}`} className="text-sm font-black text-blue-900 mt-4 mb-2 border-b border-slate-100 pb-1">
          {parseInlineElements(trimmed.substring(4))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${index}`} className="text-xs font-black text-slate-800 mt-3 mb-1.5">
          {parseInlineElements(trimmed.substring(5))}
        </h4>
      );
      return;
    }
    
    // Check for table row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (trimmed.includes('---')) return; // Ignore separator lines
      const cols = trimmed.split('|').map(c => c.trim()).filter((c, i, arr) => i > 0 && i < arr.length - 1);
      elements.push(
        <div key={`tbl-${index}`} className="grid grid-cols-3 gap-2 bg-slate-50 p-2 border-b border-slate-100 font-mono text-[10px] text-slate-600 rounded">
          {cols.map((col, cIdx) => (
            <span key={cIdx} className="font-semibold">{parseInlineElements(col)}</span>
          ))}
        </div>
      );
      return;
    }
    
    // Check for bullet list
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      elements.push(
        <li key={`li-${index}`} className="text-xs text-slate-600 list-disc ml-4 mb-1 leading-relaxed">
          {parseInlineElements(trimmed.substring(2))}
        </li>
      );
      return;
    }
    
    // Check for numbered list
    const numMatch = trimmed.match(/^\d+\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <li key={`oli-${index}`} className="text-xs text-slate-600 list-decimal ml-4 mb-1 leading-relaxed">
          {parseInlineElements(numMatch[1])}
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
      <p key={`p-${index}`} className="text-xs text-slate-700 leading-relaxed mb-1.5">
        {parseInlineElements(trimmed)}
      </p>
    );
  });
  
  return <div className="space-y-0.5">{elements}</div>;
};

// Sub-parser for inline styles
const parseInlineElements = (text: string): React.ReactNode => {
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
        <div className="my-3 rounded-xl overflow-hidden border border-slate-200 max-h-[180px]">
          <img src={url} alt={desc} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          <span className="block text-[9px] text-slate-500 text-center py-1.5 bg-slate-50">{desc}</span>
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
      return parseInlineElements(part);
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

export default function NewsManager({ isReadOnly = false }: NewsManagerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('Học vụ');
  const [date, setDate] = useState(() => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [isNew, setIsNew] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);

  // Load announcements on mount
  useEffect(() => {
    const saved = localStorage.getItem('app_announcements');
    if (saved) {
      try {
        setAnnouncements(JSON.parse(saved));
      } catch (e) {
        setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      }
    } else {
      setAnnouncements(DEFAULT_ANNOUNCEMENTS);
      localStorage.setItem('app_announcements', JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    }
  }, []);

  // Save/Publish announcements to web công (PublicPortal)
  const saveToStorage = (updatedList: Announcement[]) => {
    setAnnouncements(updatedList);
    localStorage.setItem('app_announcements', JSON.stringify(updatedList));
  };

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleAddOrUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!title.trim()) {
      showStatus('error', 'Tiêu đề tin tức không được để trống.');
      return;
    }

    if (editingId) {
      // Editing mode
      const updated = announcements.map(ann => {
        if (ann.id === editingId) {
          return {
            ...ann,
            title: title.trim(),
            content: content.trim(),
            category,
            date,
            isNew
          };
        }
        return ann;
      });
      saveToStorage(updated);
      setEditingId(null);
      showStatus('success', 'Đã cập nhật tin tức thành công!');
    } else {
      // Creating mode
      const newAnn: Announcement = {
        id: `ann-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        category,
        date,
        isNew
      };
      const updated = [newAnn, ...announcements];
      saveToStorage(updated);
      showStatus('success', 'Đã thêm tin tức mới thành công!');
    }

    // Reset Form
    setTitle('');
    setContent('');
    setIsNew(true);
    setCategory('Học vụ');
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setDate(`${day}/${month}/${year}`);
  };

  const handleEditInit = (ann: Announcement) => {
    if (isReadOnly) return;
    setEditingId(ann.id);
    setTitle(ann.title);
    setContent(ann.content || '');
    setCategory(ann.category);
    setDate(ann.date);
    setIsNew(ann.isNew);
    
    // Smooth scroll to form
    const formElement = document.getElementById('news-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setIsNew(true);
    setCategory('Học vụ');
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    setDate(`${day}/${month}/${year}`);
  };

  const handleDelete = (id: string) => {
    if (isReadOnly) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tin tức này không? Tin tức sẽ lập tức gỡ khỏi Web Công khai.')) {
      const filtered = announcements.filter(ann => ann.id !== id);
      saveToStorage(filtered);
      showStatus('success', 'Đã xóa và đồng bộ gỡ tin tức khỏi Web Công khai!');
    }
  };

  const handlePublishAll = () => {
    localStorage.setItem('app_announcements', JSON.stringify(announcements));
    showStatus('success', '🚀 Đã cập nhật và đồng bộ toàn bộ tin tức lên Web Công khai thành công!');
  };

  // Helper inserts formatted tags at cursor inside content textarea
  const handleToolbarAction = (action: string, value?: string) => {
    if (isReadOnly) return;
    let insertText = '';
    
    switch (action) {
      case 'bold':
        insertText = '**[Văn bản đậm]**';
        break;
      case 'italic':
        insertText = '*[Văn bản nghiêng]*';
        break;
      case 'h3':
        insertText = '\n### [Tiêu đề cấp 3]\n';
        break;
      case 'list':
        insertText = '\n* [Mục danh sách]\n';
        break;
      case 'table':
        insertText = '\n| Tiêu đề 1 | Tiêu đề 2 | Tiêu đề 3 |\n|---|---|---|\n| Nội dung A | Nội dung B | Nội dung C |\n';
        break;
      case 'link':
        insertText = '[Tên liên kết](https://google.com)';
        break;
      case 'calendar':
        const todayStr = new Date().toLocaleDateString('vi-VN');
        insertText = `📅 [Sự kiện ngày ${todayStr}]`;
        break;
      case 'align-left':
        insertText = '\n<div align="left">\n[Văn bản căn trái]\n</div>\n';
        break;
      case 'align-center':
        insertText = '\n<div align="center">\n[Văn bản căn giữa]\n</div>\n';
        break;
      case 'align-right':
        insertText = '\n<div align="right">\n[Văn bản căn phải]\n</div>\n';
        break;
      case 'align-justify':
        insertText = '\n<div align="justify">\n[Văn bản căn đều]\n</div>\n';
        break;
      case 'size':
        if (value === 'small') insertText = '<span style="font-size: 0.8rem">[Văn bản nhỏ]</span>';
        else if (value === 'medium') insertText = '<span style="font-size: 1.0rem">[Văn bản vừa]</span>';
        else if (value === 'large') insertText = '<span style="font-size: 1.2rem">[Văn bản lớn]</span>';
        else if (value === 'xlarge') insertText = '<span style="font-size: 1.5rem">[Văn bản cực đại]</span>';
        break;
      case 'font':
        if (value === 'serif') insertText = '<span style="font-family: Georgia, serif">[Văn bản serif]</span>';
        else if (value === 'mono') insertText = '`[Văn bản monospace]`';
        else if (value === 'sans') insertText = '<span style="font-family: sans-serif">[Văn bản sans-serif]</span>';
        break;
      case 'color':
        insertText = `<span style="color: ${value}">[Văn bản màu]</span>`;
        break;
      case 'image':
        insertText = '\n![Mô tả ảnh](https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=800&q=80)\n';
        break;
      default:
        break;
    }

    const textarea = document.getElementById('news-content-textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      
      const newText = before + insertText + after;
      setContent(newText);
      
      // Return focus and reposition selection cursor
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
      }, 50);
    } else {
      setContent(prev => prev + insertText);
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Học vụ':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Đào tạo':
        return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'Phong trào':
        return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'Nề nếp':
        return 'bg-rose-50 text-rose-700 border border-rose-100';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-100';
    }
  };

  const currentTemplates = NEWS_TEMPLATES[category] || [];

  return (
    <div className="space-y-6 md:space-y-8 animate-fadeIn text-slate-800">
      {/* Intro Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Megaphone size={16} className="text-amber-500" />
            Cổng quản lý và Đăng tải Tin tức lên Web Công
          </h3>
          <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
            Các tin tức, thông báo quan trọng được nhập tại đây sẽ được hiển thị đồng bộ trực tiếp trên 
            Cổng thông tin lớp học dành cho Phụ huynh và Học sinh tra cứu chi tiết.
          </p>
        </div>
        
        {!isReadOnly && (
          <button
            onClick={handlePublishAll}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center gap-1.5 cursor-pointer shrink-0 animate-pulse"
          >
            <Globe size={13} />
            Đồng bộ Cổng thông tin
          </button>
        )}
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-slideDown ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
            : 'bg-rose-50 border-rose-200 text-rose-700'
        }`}>
          {statusMessage.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span className="text-xs font-bold">{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Form Creator */}
        <div id="news-form-container" className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h4 className="text-xs text-slate-800 font-black uppercase tracking-wider flex items-center gap-2">
              {editingId ? <Edit2 size={13} className="text-amber-500" /> : <Plus size={13} className="text-amber-500" />}
              <span>{editingId ? 'Chỉnh sửa tin tức' : 'ĐĂNG TIN TỨC MỚI'}</span>
            </h4>
          </div>

          <form onSubmit={handleAddOrUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Tag size={10} /> CHUYÊN MỤC
                </label>
                <select
                  disabled={isReadOnly}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {['Học vụ', 'Đào tạo', 'Phong trào', 'Nề nếp', 'Khác'].map(cat => (
                    <option key={cat} value={cat} className="bg-white text-slate-800">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Calendar size={10} /> NGÀY ĐĂNG
                </label>
                <input
                  type="text"
                  disabled={isReadOnly}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="DD/MM/YYYY"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TIÊU ĐỀ THÔNG BÁO</label>
              <textarea
                rows={2}
                disabled={isReadOnly}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Kế hoạch tổ chức Đại hội Chi đoàn năm học mới..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-450 focus:outline-none focus:border-blue-500 transition duration-200"
              />
            </div>

            {/* Content Field with mockup rich toolbar style */}
            <div className="space-y-1.5 pt-1">
              <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
                <span>Nội Dung</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal">Hỗ trợ Markdown</span>
              </label>
              
              <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-2.5 space-y-2">
                {/* TOOLBAR (Identical to mockup) */}
                <div className="flex flex-col gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
                  {/* First row: Basic styles */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1.5 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('bold')}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition font-extrabold text-xs cursor-pointer"
                      title="In đậm"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('italic')}
                      className="w-7 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition italic text-xs cursor-pointer"
                      title="In nghiêng"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('h3')}
                      className="w-8 h-7 flex items-center justify-center hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-lg transition font-bold text-xs cursor-pointer"
                      title="Tiêu đề H3"
                    >
                      H3
                    </button>
                    
                    <div className="h-4 w-px bg-slate-200 mx-1"></div>
                    
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('list')}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Danh sách"
                    >
                      <List size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('table')}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Bảng biểu"
                    >
                      <Table size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('link')}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Liên kết"
                    >
                      <LinkIcon size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('calendar')}
                      className="p-1.5 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Lịch trình"
                    >
                      <Calendar size={13} />
                    </button>
                  </div>

                  {/* Second row: Alignments */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1.5 border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('align-left')}
                      className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Căn lề trái"
                    >
                      <AlignLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('align-center')}
                      className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Căn giữa"
                    >
                      <AlignCenter size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('align-right')}
                      className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Căn lề phải"
                    >
                      <AlignRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToolbarAction('align-justify')}
                      className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-lg transition cursor-pointer"
                      title="Căn đều hai bên"
                    >
                      <AlignJustify size={13} />
                    </button>
                  </div>

                  {/* Third row: Format configurations */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Type size={11} className="text-slate-400" />
                      <select
                        disabled={isReadOnly}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToolbarAction('size', e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-white border border-slate-200 text-[10px] text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                      >
                        <option value="">SIZE</option>
                        <option value="small">Nhỏ</option>
                        <option value="medium">Vừa</option>
                        <option value="large">Lớn</option>
                        <option value="xlarge">Cực đại</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Type size={11} className="text-slate-400" />
                      <select
                        disabled={isReadOnly}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToolbarAction('font', e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-white border border-slate-200 text-[10px] text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                      >
                        <option value="">FONT</option>
                        <option value="serif">Serif (Cổ điển)</option>
                        <option value="mono">Monospace</option>
                        <option value="sans">Sans-serif</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-1">
                      <Palette size={11} className="text-slate-400" />
                      <select
                        disabled={isReadOnly}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToolbarAction('color', e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="bg-white border border-slate-200 text-[10px] text-slate-700 rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 cursor-pointer font-bold"
                      >
                        <option value="">COLOR</option>
                        <option value="#3b82f6">Xanh</option>
                        <option value="#ef4444">Đỏ</option>
                        <option value="#f59e0b">Vàng</option>
                        <option value="#10b981">Xanh lá</option>
                        <option value="#a855f7">Tím</option>
                      </select>
                    </div>

                    <div className="h-4 w-px bg-slate-200"></div>

                    <button
                      type="button"
                      onClick={() => handleToolbarAction('image')}
                      className="p-1 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                      title="Chèn hình ảnh minh họa"
                    >
                      <ImageIcon size={11} />
                      <span>ẢNH</span>
                    </button>
                  </div>
                </div>

                {/* Main Content input area */}
                <textarea
                  id="news-content-textarea"
                  rows={7}
                  disabled={isReadOnly}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung bài viết tin tức tại đây (sử dụng Markdown hoặc dùng thanh công cụ hỗ trợ)..."
                  className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 focus:outline-none min-h-[140px] leading-relaxed font-mono resize-y pt-2 px-1"
                />
              </div>
            </div>

            {/* Is New Checkbox */}
            <div className="flex items-center gap-2 pt-1 select-none">
              <input
                type="checkbox"
                id="ann-new-checkbox"
                disabled={isReadOnly}
                checked={isNew}
                onChange={(e) => setIsNew(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="ann-new-checkbox" className="text-xs font-bold text-slate-600 cursor-pointer">
                Đánh dấu là tin tức mới (Có nhãn <span className="bg-rose-50 text-rose-600 border border-rose-100 text-[9px] px-1.5 py-0.5 rounded font-black">NEW</span>)
              </label>
            </div>

            {/* Buttons */}
            {!isReadOnly && (
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-black tracking-wide shadow-md transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={13} />
                  <span>{editingId ? 'Cập nhật tin tức' : 'ĐĂNG TIN LÊN WEB CÔNG'}</span>
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition duration-200 cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
          </form>

          {/* DYNAMIC NEWS TEMPLATES - Appears directly below the Input Form! */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200">
              <Sparkles size={13} className="text-amber-500 animate-pulse" />
              <h4 className="text-[10px] text-slate-700 font-black uppercase tracking-wider">
                MẪU TIN GỢI Ý CHUYÊN MỤC "{category}"
              </h4>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {currentTemplates.map((tpl, tIdx) => (
                <div 
                  key={tIdx}
                  className="p-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-300 rounded-xl transition text-left cursor-pointer group shadow-sm"
                  onClick={() => {
                    if (isReadOnly) return;
                    setTitle(tpl.title);
                    setContent(tpl.content);
                    showStatus('success', `Đã tự động điền mẫu tin: "${tpl.description}"`);
                  }}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[9px] text-blue-600 font-extrabold uppercase">
                      Mẫu {tIdx + 1}: {tpl.description}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold group-hover:text-blue-600 transition">
                      Áp dụng mẫu này →
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-800 mt-1 truncate">
                    {tpl.title}
                  </p>
                </div>
              ))}
              {currentTemplates.length === 0 && (
                <p className="text-[10px] text-slate-400 italic text-center py-2">
                  Không có mẫu tin gợi ý nào cho chuyên mục này.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: List of Announcements and Render Preview */}
        <div className="lg:col-span-6 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          {/* Section: Live Preview of current composing article */}
          {title.trim() && (
            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-3xl space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Xem trước bài viết thực tế trên Web Công
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">{date} • {category}</span>
              </div>
              <h3 className="text-sm font-black text-slate-800 leading-relaxed">{title}</h3>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 max-h-[160px] overflow-y-auto font-sans text-xs">
                {parseTextToReactElements(content)}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h4 className="text-xs text-slate-500 font-black uppercase tracking-wider">
                DANH SÁCH TIN ĐÃ ĐĂNG ({announcements.length})
              </h4>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
              {announcements.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  Chưa có tin tức nào được đăng. Nhập form bên trái để bắt đầu.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div 
                    key={ann.id} 
                    className={`p-4 border rounded-2xl flex flex-col gap-2.5 transition hover:bg-slate-50/50 ${
                      editingId === ann.id ? 'border-blue-500 bg-blue-50/30' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-[10px] text-slate-400 font-mono tracking-tight flex items-center gap-1 font-bold font-mono">
                            <Calendar size={10} /> {ann.date}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${getCategoryBadgeClass(ann.category)}`}>
                            {ann.category}
                          </span>
                          {ann.isNew && (
                            <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[9px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase animate-pulse">
                              New
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">
                          {ann.title}
                        </p>
                      </div>

                      {!isReadOnly && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEditInit(ann)}
                            title="Chỉnh sửa tin tức"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 hover:text-blue-600 text-slate-500 rounded-lg transition cursor-pointer"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(ann.id)}
                            title="Xóa tin tức"
                            className="p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>

                    {ann.content && (
                      <div className="bg-slate-50 p-3 rounded-xl text-[11px] border border-slate-200 text-slate-700 max-h-[120px] overflow-y-auto">
                        {parseTextToReactElements(ann.content)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

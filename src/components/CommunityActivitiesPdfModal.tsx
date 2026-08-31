/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Student, StudentCommunityRecord } from '../types';
import { Printer, X, FileText, CheckCircle2, HelpCircle } from 'lucide-react';

interface CommunityActivitiesPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  record: StudentCommunityRecord;
}

export default function CommunityActivitiesPdfModal({
  isOpen,
  onClose,
  student,
  record
}: CommunityActivitiesPdfModalProps) {
  if (!isOpen) return null;

  const totalCommunityHours = (record.entries || []).reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  const totalCommunityConfirmedHours = (record.entries || []).filter(e => e.isConfirmed).reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

  const totalSportHours = (record.sportArtItems || []).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
  const totalSportConfirmedHours = (record.sportArtItems || []).filter(s => s.isConfirmed).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden text-slate-800">
        
        {/* Top Header & Actions Bar */}
        <div className="p-4 bg-slate-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">
                Mẫu văn bản trình Ban Giám Hiệu (Báo cáo 2 trang)
              </h3>
              <p className="text-[11px] text-white/50">
                Học sinh: <strong className="text-white">{student.name}</strong> • Lớp: <strong className="text-amber-400">{student.className || student.classId}</strong> • Mã số: <strong className="text-white/80">{student.id}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-lg shadow-blue-500/25 active:scale-95"
              title="Mở hộp thoại in trình duyệt - Chọn Lưu dạng PDF để tải file chất lượng cao nhất"
            >
              <Printer size={16} /> In / Xuất PDF (2 Trang A4)
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-xl transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Informative Tip Banner */}
        <div className="px-4 py-2 bg-blue-950/60 border-b border-blue-500/20 text-blue-200 text-xs flex items-center gap-2">
          <HelpCircle size={15} className="shrink-0 text-blue-400" />
          <span>
            <strong>Hướng dẫn in / xuất PDF:</strong> Khi bảng in hiện ra, tại mục <em>Máy in (Destination)</em> bạn chọn <strong>"Lưu dưới dạng PDF" (Save as PDF)</strong> để xuất trọn vẹn văn bản 2 trang chuẩn A4.
          </span>
        </div>

        {/* Scrollable Preview Wrapper */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-900/80 flex flex-col items-center gap-8 custom-scrollbar">
          
          {/* Main Print Container for Both Pages */}
          <div
            id="community-activities-print-sheet"
            className="w-full max-w-[820px] text-black font-serif text-[11px] leading-relaxed space-y-0"
            style={{ fontFamily: '"Times New Roman", Times, serif' }}
          >
            
            {/* ========================================================================= */}
            {/* TRANG 1: BẢNG 1 - HOẠT ĐỘNG VÌ CỘNG ĐỒNG */}
            {/* ========================================================================= */}
            <div className="bg-white p-8 sm:p-11 shadow-2xl border border-slate-300 min-h-[1080px] flex flex-col justify-between mb-8 print:mb-0 print:border-none print:shadow-none print:min-h-[1050px]">
              <div className="space-y-4">
                {/* 1. Header: School & National Motto */}
                <div className="grid grid-cols-2 gap-4 pb-2 border-b border-black">
                  <div className="text-left space-y-0.5">
                    <p className="font-bold text-[11px] uppercase tracking-wide">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                    <p className="font-bold text-[11px] uppercase tracking-wide">TRƯỜNG THPT / ĐOÀN TRƯỜNG</p>
                    <p className="text-[11px] font-bold">LỚP: {student.className || student.classId || '..........'}</p>
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="font-bold text-[11px] uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[11px]">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-28 h-[1px] bg-black mx-auto mt-0.5"></div>
                  </div>
                </div>

                {/* 2. Document Title */}
                <div className="text-center pt-1 space-y-0.5">
                  <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                    BẢNG TÍNH GIỜ THAM GIA CÁC HOẠT ĐỘNG VÌ CỘNG ĐỒNG & NGOẠI KHÓA
                  </h1>
                  <p className="text-xs italic font-bold">
                    (Kèm theo hồ sơ đánh giá, nhận xét kết quả rèn luyện học sinh - Cả năm)
                  </p>
                </div>

                {/* 3. Student Profile Info */}
                <div className="text-[11px] space-y-1.5 border-b border-dashed border-slate-400 pb-2.5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>Họ và tên học sinh: <strong className="uppercase">{student.name}</strong></div>
                    <div>Mã số HS / ĐD: <strong>{student.id}</strong></div>
                    <div>Lớp: <strong>{student.className || student.classId}</strong></div>
                    <div>Tổ: <strong>{student.groupName || 'Tổ 1'}</strong></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-700">
                    <div>Số giờ tự khai (Bảng 1): <strong>{totalCommunityHours} giờ</strong></div>
                    <div>Số giờ đã được xác nhận: <strong>{totalCommunityConfirmedHours} giờ</strong></div>
                    <div>Xếp loại phong trào: <strong className="uppercase">{record.evaluationRating || 'Đạt'}</strong></div>
                  </div>
                </div>

                {/* 4. TABLE 1 */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-xs uppercase tracking-wide">
                      BẢNG 1: BẢNG TÍNH GIỜ THAM GIA CÁC HOẠT ĐỘNG VÌ CỘNG ĐỒNG
                    </h2>
                    <span className="text-[10px] italic text-slate-600">(Gồm 7 mục tiêu chuẩn)</span>
                  </div>
                  
                  <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center border-b border-black">
                        <th className="border border-black p-1.5 w-8">STT</th>
                        <th className="border border-black p-1.5 w-[28%] text-left">Nội dung công việc</th>
                        <th className="border border-black p-1.5 text-left">Diễn giải nội dung và số giờ tham gia</th>
                        <th className="border border-black p-1.5 w-14">Tổng giờ</th>
                        <th className="border border-black p-1.5 w-16">Xác nhận</th>
                        <th className="border border-black p-1.5 w-24">Người đánh giá<br/>(Ký tên)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(record.entries || []).map((entry) => {
                        const isChecked = entry.isConfirmed;
                        return (
                          <tr key={entry.stt} className="border-b border-black">
                            <td className="border border-black p-1.5 text-center font-bold align-top">
                              {entry.stt}
                            </td>
                            <td className="border border-black p-1.5 align-top">
                              <p className="font-bold">{entry.title}</p>
                              <p className="text-[9.5px] text-slate-600 whitespace-pre-line leading-tight mt-0.5">
                                {entry.guide}
                              </p>
                            </td>
                            <td className="border border-black p-1.5 align-top leading-relaxed">
                              {entry.studentNote ? (
                                <p className="whitespace-pre-line">{entry.studentNote}</p>
                              ) : (
                                <span className="italic text-slate-400 text-[10px]">Chưa có diễn giải</span>
                              )}
                            </td>
                            <td className="border border-black p-1.5 text-center font-bold font-mono align-top">
                              {entry.hours > 0 ? `${entry.hours}h` : '-'}
                            </td>
                            <td className="border border-black p-1.5 text-center font-bold align-top text-[10px]">
                              {isChecked ? 'Đã duyệt ✓' : 'Chưa'}
                            </td>
                            {/* Cột chữ ký để trống cho GV ký tay */}
                            <td className="border border-black p-1.5 text-center align-top font-serif italic text-slate-400">
                              {/* Để trống cho giáo viên ký */}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-black text-[11px]">
                        <td colSpan={3} className="border border-black p-2 text-right uppercase">
                          Tổng số giờ tham gia hoạt động vì cộng đồng (Bảng 1):
                        </td>
                        <td className="border border-black p-2 text-center font-mono">
                          {totalCommunityHours}h
                        </td>
                        <td className="border border-black p-2 text-center text-[10px]">
                          Duyệt: {totalCommunityConfirmedHours}h
                        </td>
                        <td className="border border-black p-2 text-center text-[10px] italic">
                          (Để trống ký)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Trang 1 Footer */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-600 italic">
                <span>Học sinh: {student.name} - Lớp: {student.className || student.classId}</span>
                <span>(Trang 1/2 - Bảng 2 Chi tiết Hoạt động Văn nghệ, Thể thao ở trang tiếp theo)</span>
              </div>
            </div>

            {/* Page Break for Printer */}
            <div className="print-page-break"></div>

            {/* ========================================================================= */}
            {/* TRANG 2: BẢNG 2 - VĂN NGHỆ & THỂ THAO + ĐÁNH GIÁ GVCN & CHỮ KÝ BGH */}
            {/* ========================================================================= */}
            <div className="bg-white p-8 sm:p-11 shadow-2xl border border-slate-300 min-h-[1080px] flex flex-col justify-between print:border-none print:shadow-none print:min-h-[1050px]">
              <div className="space-y-4">
                
                {/* Trang 2 Header */}
                <div className="flex justify-between items-center pb-2 border-b border-black text-xs">
                  <div>
                    <span>Học sinh: <strong className="uppercase">{student.name}</strong></span>
                    <span className="ml-3">Lớp: <strong>{student.className || student.classId}</strong></span>
                    <span className="ml-3">Mã số: <strong>{student.id}</strong></span>
                  </div>
                  <div className="font-bold uppercase tracking-wider text-[10px] text-slate-600">
                    BÁO CÁO HOẠT ĐỘNG CỘNG ĐỒNG & NGOẠI KHÓA (TRANG 2)
                  </div>
                </div>

                {/* TABLE 2 */}
                <div className="space-y-1.5">
                  <div className="space-y-0.5">
                    <h2 className="font-bold text-xs uppercase tracking-wide">
                      BẢNG 2: BẢNG CHI TIẾT CÁC HOẠT ĐỘNG VĂN NGHỆ, THỂ THAO, NGOẠI KHÓA
                    </h2>
                    <p className="text-[10px] italic text-slate-600">
                      (Quy định: Tham gia 10h, vòng trong 12h, tứ kết 15h, bán kết 18h, chung kết 20h. Cổ vũ tối đa 50% số giờ của người tham gia)
                    </p>
                  </div>
                  
                  <table className="w-full border-collapse border border-black text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-100 font-bold text-center border-b border-black">
                        <th className="border border-black p-1.5 w-8">STT</th>
                        <th className="border border-black p-1.5 text-left w-[34%]">Các hoạt động văn nghệ, thể thao, ngoại khoá</th>
                        <th className="border border-black p-1.5 w-24">Ghi "Cổ vũ", "Tham gia"</th>
                        <th className="border border-black p-1.5 text-left">Thành tích (Giải)</th>
                        <th className="border border-black p-1.5 w-14">Số giờ</th>
                        <th className="border border-black p-1.5 w-16">Xác nhận</th>
                        <th className="border border-black p-1.5 w-24">Ký tên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(record.sportArtItems || []).map((item, index) => {
                        const isChecked = item.isConfirmed;
                        return (
                          <tr key={item.id} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-bold align-middle">
                              {index + 1}
                            </td>
                            <td className="border border-black p-1 font-bold align-middle">
                              {item.name}
                            </td>
                            <td className="border border-black p-1 text-center align-middle">
                              {item.role || 'Tham gia'}
                            </td>
                            <td className="border border-black p-1 align-middle">
                              {item.achievement || 'Tham gia tích cực'}
                            </td>
                            <td className="border border-black p-1 text-center font-bold font-mono align-middle">
                              {item.hours > 0 ? `${item.hours}h` : '-'}
                            </td>
                            <td className="border border-black p-1 text-center font-bold align-middle text-[10px]">
                              {isChecked ? 'Đã duyệt ✓' : 'Chưa'}
                            </td>
                            {/* KÝ TÊN: ĐỂ TRỐNG ĐỂ PHỤ TRÁCH/GV KÝ TAY */}
                            <td className="border border-black p-1 text-center align-middle font-serif italic text-slate-400">
                              {/* Để trống ký tay */}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 font-bold border-t-2 border-black text-[11px]">
                        <td colSpan={4} className="border border-black p-2 text-right uppercase">
                          Tổng số giờ văn nghệ & thể thao (Bảng 2):
                        </td>
                        <td className="border border-black p-2 text-center font-mono">
                          {totalSportHours}h
                        </td>
                        <td className="border border-black p-2 text-center text-[10px]">
                          Duyệt: {totalSportConfirmedHours}h
                        </td>
                        <td className="border border-black p-2 text-center text-[10px] italic">
                          (Để trống ký)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ĐÁNH GIÁ CỦA GVCN VÀ CHỮ KÝ TRÌNH BAN GIÁM HIỆU */}
                <div className="pt-2 space-y-3 print-avoid-break">
                  <div className="border border-black p-3 space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold uppercase">Nhận xét & Đánh giá của Giáo viên chủ nhiệm:</span>
                      <span className="font-bold">Xếp loại rèn luyện: <strong className="uppercase">{record.evaluationRating || 'Đạt tiêu chuẩn'}</strong></span>
                    </div>
                    <p className="italic text-[11px] leading-relaxed">
                      {record.teacherComment ? `"${record.teacherComment}"` : 'Học sinh có ý thức rèn luyện tốt, hoàn thành đầy đủ các nhiệm vụ và chỉ tiêu giờ hoạt động vì cộng đồng trong năm học.'}
                    </p>
                  </div>

                  {/* 3-Column Formal Signatures Block */}
                  <div className="grid grid-cols-3 gap-4 pt-3 text-center text-xs">
                    <div className="space-y-1">
                      <p className="font-bold uppercase">HỌC SINH TỰ KHAI</p>
                      <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16 flex items-end justify-center">
                        {/* Để trống ký tay */}
                      </div>
                      <p className="font-bold uppercase">{student.name}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold uppercase">GIÁO VIÊN CHỦ NHIỆM</p>
                      <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                      <div className="h-16 flex items-end justify-center">
                        {/* Để trống ký tay */}
                      </div>
                      <p className="font-bold">......................................................</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] italic text-slate-600">Ngày ..... tháng ..... năm 202...</p>
                      <p className="font-bold uppercase">TRÌNH BAN GIÁM HIỆU</p>
                      <p className="text-[10px] italic text-slate-500">(Ký duyệt và đóng dấu)</p>
                      <div className="h-16 flex items-end justify-center">
                        {/* Để trống ký và đóng dấu */}
                      </div>
                      <p className="font-bold">......................................................</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Trang 2 Footer */}
              <div className="pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-600 italic">
                <span>Hồ sơ đánh giá kết quả rèn luyện học sinh - Trường THPT</span>
                <span>(Trang 2/2 - Hết)</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

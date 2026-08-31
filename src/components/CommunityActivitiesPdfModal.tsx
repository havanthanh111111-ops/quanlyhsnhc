/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Student, StudentCommunityRecord } from '../types';
import { Printer, Download, X, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  const printRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const totalCommunityHours = (record.entries || []).reduce((sum, e) => sum + (Number(e.hours) || 0), 0);
  const totalCommunityConfirmedHours = (record.entries || []).filter(e => e.isConfirmed).reduce((sum, e) => sum + (Number(e.hours) || 0), 0);

  const totalSportHours = (record.sportArtItems || []).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);
  const totalSportConfirmedHours = (record.sportArtItems || []).filter(s => s.isConfirmed).reduce((sum, s) => sum + (Number(s.hours) || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    try {
      const element = printRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `Bang_Hoat_Dong_Cong_Dong_${student.className || 'Lop'}_${student.name.replace(/\s+/g, '_')}_BGH.pdf`;
      pdf.save(fileName);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (error) {
      console.error('Lỗi khi xuất PDF:', error);
      alert('Đã xảy ra lỗi khi tạo file PDF. Bạn có thể dùng chức năng "In / Lưu PDF" để in trực tiếp từ trình duyệt!');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-white/20 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-800">
        
        {/* Top Control Bar */}
        <div className="p-4 bg-slate-950 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wide">
                Mẫu văn bản trình Ban Giám Hiệu (Báo cáo hoạt động cộng đồng)
              </h3>
              <p className="text-[11px] text-white/50">
                Học sinh: <strong className="text-white">{student.name}</strong> • Lớp: <strong className="text-amber-400">{student.className || student.classId}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer border border-white/10"
              title="In ra giấy A4 hoặc Lưu dạng PDF bằng trình duyệt"
            >
              <Printer size={15} /> In / Lưu PDF (A4)
            </button>
            <button
              type="button"
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Download size={15} /> {isExporting ? 'Đang xuất PDF...' : 'Tải file PDF (.pdf)'}
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

        {exportSuccess && (
          <div className="p-2.5 bg-emerald-500 text-white text-xs font-bold text-center flex items-center justify-center gap-2">
            <CheckCircle2 size={16} /> Đã tạo và tải file PDF thành công!
          </div>
        )}

        {/* Scrollable Paper Preview */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-900/60 flex justify-center custom-scrollbar">
          
          {/* Printable Official Document Sheet */}
          <div
            id="community-activities-print-sheet"
            ref={printRef}
            className="w-full max-w-[850px] bg-white text-black p-8 sm:p-12 shadow-2xl rounded-none font-sans text-xs leading-relaxed space-y-5 border border-slate-300"
            style={{ minHeight: '1100px', fontFamily: '"Times New Roman", Times, serif' }}
          >
            {/* 1. Header: School & National Motto */}
            <div className="grid grid-cols-2 gap-4 pb-2 border-b border-black">
              <div className="text-left space-y-0.5">
                <p className="font-bold text-xs uppercase tracking-wide">SỞ GIÁO DỤC VÀ ĐÀO TẠO</p>
                <p className="font-bold text-xs uppercase tracking-wide">TRƯỜNG THPT / ĐOÀN TRƯỜNG</p>
                <p className="text-[11px] font-bold">LỚP: {student.className || student.classId || '..........'}</p>
              </div>
              <div className="text-center space-y-0.5">
                <p className="font-bold text-xs uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</p>
                <div className="w-32 h-[1px] bg-black mx-auto mt-0.5"></div>
              </div>
            </div>

            {/* 2. Document Title */}
            <div className="text-center pt-2 space-y-1">
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wide">
                BẢNG TÍNH GIỜ THAM GIA CÁC HOẠT ĐỘNG VÌ CỘNG ĐỒNG & NGOẠI KHÓA
              </h1>
              <p className="text-xs italic font-bold">
                (Kèm theo hồ sơ đánh giá, nhận xét kết quả rèn luyện học sinh - Cả năm)
              </p>
            </div>

            {/* 3. Student Profile Info */}
            <div className="pt-2 text-xs space-y-1.5 border-b border-dashed border-slate-300 pb-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>Họ và tên học sinh: <strong className="uppercase">{student.name}</strong></div>
                <div>Mã số HS / ĐD: <strong>{student.id}</strong></div>
                <div>Lớp: <strong>{student.className || student.classId}</strong></div>
                <div>Tổ: <strong>{student.groupName || 'Tổ 1'}</strong></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                <div>Số giờ tự khai: <strong>{totalCommunityHours} giờ</strong></div>
                <div>Số giờ đã được xác nhận: <strong>{totalCommunityConfirmedHours} giờ</strong></div>
                <div>Xếp loại phong trào: <strong className="uppercase">{record.evaluationRating || 'Đạt'}</strong></div>
              </div>
            </div>

            {/* 4. TABLE 1: BẢNG TÍNH GIỜ THAM GIA HOẠT ĐỘNG VÌ CỘNG ĐỒNG */}
            <div className="space-y-2 pt-1">
              <h2 className="font-bold text-xs uppercase tracking-wide text-left">
                BẢNG 1: BẢNG TÍNH GIỜ THAM GIA CÁC HOẠT ĐỘNG VÌ CỘNG ĐỒNG
              </h2>
              
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center border-b border-black">
                    <th className="border border-black p-2 w-10">STT</th>
                    <th className="border border-black p-2 w-[28%] text-left">Nội dung công việc</th>
                    <th className="border border-black p-2 text-left">Diễn giải nội dung và số giờ tham gia mỗi nội dung</th>
                    <th className="border border-black p-2 w-14">Tổng giờ</th>
                    <th className="border border-black p-2 w-16">Xác nhận</th>
                    <th className="border border-black p-2 w-24">Người đánh giá (Ký tên)</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.entries || []).map((entry) => {
                    const isChecked = entry.isConfirmed;
                    return (
                      <tr key={entry.stt} className="border-b border-black">
                        <td className="border border-black p-2 text-center font-bold align-top">
                          {entry.stt}
                        </td>
                        <td className="border border-black p-2 align-top">
                          <p className="font-bold">{entry.title}</p>
                          <p className="text-[10px] text-slate-600 whitespace-pre-line leading-tight mt-0.5">
                            {entry.guide}
                          </p>
                        </td>
                        <td className="border border-black p-2 align-top leading-relaxed">
                          {entry.studentNote ? (
                            <p className="whitespace-pre-line">{entry.studentNote}</p>
                          ) : (
                            <span className="italic text-slate-400 text-[10px]">Chưa diễn giải</span>
                          )}
                        </td>
                        <td className="border border-black p-2 text-center font-bold font-mono align-top">
                          {entry.hours > 0 ? `${entry.hours}h` : '-'}
                        </td>
                        <td className="border border-black p-2 text-center font-bold align-top text-[10px]">
                          {isChecked ? 'Đã duyệt ✓' : 'Chưa'}
                        </td>
                        {/* KÝ TÊN: ĐỂ TRỐNG THEO YÊU CẦU CỦA USER ĐỂ GIÁO VIÊN KÝ TAY */}
                        <td className="border border-black p-2 text-center align-top font-serif italic text-slate-400">
                          {/* Để trống cho giáo viên ký */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-black text-xs">
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
                      (Để trống để ký)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 5. TABLE 2: BẢNG CHI TIẾT HOẠT ĐỘNG VĂN NGHỆ & THỂ THAO */}
            <div className="space-y-2 pt-2">
              <h2 className="font-bold text-xs uppercase tracking-wide text-left">
                BẢNG 2: BẢNG CHI TIẾT CÁC HOẠT ĐỘNG VĂN NGHỆ, THỂ THAO, NGOẠI KHÓA
              </h2>
              
              <table className="w-full border-collapse border border-black text-[11px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center border-b border-black">
                    <th className="border border-black p-2 w-10">STT</th>
                    <th className="border border-black p-2 text-left w-[32%]">Các hoạt động văn nghệ, thể thao, ngoại khoá</th>
                    <th className="border border-black p-2 w-24">Ghi "Cổ vũ", "Tham gia"</th>
                    <th className="border border-black p-2 text-left">Thành tích (Giải)</th>
                    <th className="border border-black p-2 w-14">Số giờ</th>
                    <th className="border border-black p-2 w-16">Xác nhận</th>
                    <th className="border border-black p-2 w-24">Ký tên</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.sportArtItems || []).map((item, index) => {
                    const isChecked = item.isConfirmed;
                    return (
                      <tr key={item.id} className="border-b border-black">
                        <td className="border border-black p-1.5 text-center font-bold align-middle">
                          {index + 1}
                        </td>
                        <td className="border border-black p-1.5 font-bold align-middle">
                          {item.name}
                        </td>
                        <td className="border border-black p-1.5 text-center align-middle">
                          {item.role || 'Tham gia'}
                        </td>
                        <td className="border border-black p-1.5 align-middle">
                          {item.achievement || 'Tham gia tích cực'}
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold font-mono align-middle">
                          {item.hours > 0 ? `${item.hours}h` : '-'}
                        </td>
                        <td className="border border-black p-1.5 text-center font-bold align-middle text-[10px]">
                          {isChecked ? 'Đã duyệt ✓' : 'Chưa'}
                        </td>
                        {/* KÝ TÊN: ĐỂ TRỐNG ĐỂ PHỤ TRÁCH/GV KÝ TAY */}
                        <td className="border border-black p-1.5 text-center align-middle font-serif italic text-slate-400">
                          {/* Để trống cho giáo viên ký */}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold border-t-2 border-black text-xs">
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
                      (Để trống để ký)
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* 6. ĐÁNH GIÁ CỦA GVCN VÀ CHỮ KÝ TRÌNH BAN GIÁM HIỆU */}
            <div className="pt-2 space-y-3">
              <div className="border border-black p-3 space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold uppercase">Nhận xét & Đánh giá của Giáo viên chủ nhiệm:</span>
                  <span className="font-bold">Xếp loại rèn luyện: <strong className="uppercase">{record.evaluationRating || 'Đạt tiêu chuẩn'}</strong></span>
                </div>
                <p className="italic text-[11px] leading-relaxed">
                  {record.teacherComment ? `"${record.teacherComment}"` : 'Học sinh có ý thức tốt, hoàn thành đầy đủ các nhiệm vụ và chỉ tiêu giờ hoạt động vì cộng đồng trong năm học.'}
                </p>
              </div>

              {/* 3-Column Formal Signatures Block */}
              <div className="grid grid-cols-3 gap-4 pt-4 text-center text-xs">
                <div className="space-y-1">
                  <p className="font-bold uppercase">HỌC SINH TỰ KHAI</p>
                  <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16 flex items-end justify-center">
                    {/* Để trống chỗ ký */}
                  </div>
                  <p className="font-bold">{student.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="font-bold uppercase">GIÁO VIÊN CHỦ NHIỆM</p>
                  <p className="text-[10px] italic text-slate-500">(Ký và ghi rõ họ tên)</p>
                  <div className="h-16 flex items-end justify-center">
                    {/* Để trống chỗ ký theo yêu cầu của user */}
                  </div>
                  <p className="font-bold">......................................................</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] italic text-slate-600">Ngày ..... tháng ..... năm 202...</p>
                  <p className="font-bold uppercase">TRÌNH BAN GIÁM HIỆU</p>
                  <p className="text-[10px] italic text-slate-500">(Ký duyệt và đóng dấu)</p>
                  <div className="h-16 flex items-end justify-center">
                    {/* Để trống chỗ ký và đóng dấu */}
                  </div>
                  <p className="font-bold">......................................................</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

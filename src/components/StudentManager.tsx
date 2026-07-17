/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Student, ViolationRecord, StudentTask, ClassItem, SchoolYear, AcademicUpdate, GPAEntry } from '../types';
import { Plus, Search, Edit2, Trash2, User, Phone, MapPin, Calendar, Heart, ShieldAlert, CheckCircle, Download, FileText, Printer, Check, X, ArrowRightLeft, Upload, Camera, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';
import { CustomConfirmModal } from './CustomConfirmModal';
import StudentAcademicTracker from './StudentAcademicTracker';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getAccessToken, googleSignIn } from '../services/authService';

const getDriveImageUrl = (urlOrId: string | undefined): string => {
  if (!urlOrId) return '';
  if (urlOrId.startsWith('data:image/') || urlOrId.startsWith('blob:') || (urlOrId.startsWith('http') && !urlOrId.includes('drive.google.com'))) {
    return urlOrId;
  }
  if (urlOrId.includes('lh3.googleusercontent.com') || urlOrId.includes('drive.google.com/thumbnail')) {
    return urlOrId;
  }
  let fileId = urlOrId;
  const matchD = urlOrId.match(/\/d\/([a-zA-Z0-9_-]+)/);
  const matchId = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchD) {
    fileId = matchD[1];
  } else if (matchId) {
    fileId = matchId[1];
  }
  return `https://lh3.googleusercontent.com/d/${fileId}`;
};

const getResolution = (type: string): string => {
  switch (type) {
    case 'Nghỉ học không phép':
      return 'Phê bình trước lớp, GVCN liên hệ gia đình làm rõ lý do, yêu cầu viết bản tường trình và có chữ ký xác nhận của phụ huynh.';
    case 'Nghỉ học có phép':
      return 'Nhắc nhở học sinh chủ động chép bài đầy đủ và nhờ bạn bè hoặc giáo viên hướng dẫn các nội dung kiến thức bị khuyết.';
    case 'Đi muộn':
      return 'Trừ điểm rèn luyện cá nhân, nhắc nhở nghiêm khắc. Nếu tái phạm quá 3 lần sẽ yêu cầu phụ huynh phối hợp đưa đón học sinh đúng giờ.';
    case 'Không đồng phục':
      return 'Yêu cầu mặc trang phục đúng tác phong trước khi vào lớp. Đăng ký nhắc nhở nề nếp và trừ điểm rèn luyện.';
    case 'Không làm bài tập':
      return 'Yêu cầu hoàn thành bù bài tập đầy đủ trong giờ ra chơi hoặc nộp lại trước buổi học kế tiếp dưới sự kiểm tra của lớp trưởng.';
    case 'Làm việc riêng':
      return 'Tịch thu vật dụng gây xao nhãng (trả lại sau buổi học), nhắc nhở trực tiếp và yêu cầu tập trung hoàn thành nội dung bài giảng.';
    default:
      return 'Gặp riêng học sinh để phân tích sai phạm, khuyên răn và giao Ban cán sự lớp theo dõi sát sao, giúp đỡ cải thiện.';
  }
};

const getDefaultComment = (studentName: string, points: number) => {
  if (points >= 0) {
    return `Học sinh ${studentName} có ý thức rèn luyện tốt, nghiêm túc chấp hành nội quy trường lớp và hoàn thành xuất sắc các nhiệm vụ được giao. Tinh thần học tập gương mẫu, xứng đáng được tuyên dương.`;
  } else if (points >= -3) {
    return `Học sinh ${studentName} học tập và sinh hoạt tương đối ổn định, tích cực tham gia các hoạt động lớp. Tuy nhiên vẫn còn một vài lỗi nhỏ cần chú ý sửa đổi để rèn luyện nề nếp tốt hơn trong thời gian tới.`;
  } else {
    return `Học sinh ${studentName} có nỗ lực trong học tập nhưng còn nhiều khuyết điểm về nề nếp kỷ luật cần nghiêm túc chấn chỉnh. Đề nghị gia đình phối hợp chặt chẽ với giáo viên chủ nhiệm để theo sát và nhắc nhở học sinh rèn luyện tốt hơn.`;
  }
};

const sortStudentsAlphabetically = (studentList: Student[]): Student[] => {
  return [...studentList].sort((a, b) => {
    const nameA = (a.name || '').trim();
    const nameB = (b.name || '').trim();
    
    const partsA = nameA.split(/\s+/);
    const partsB = nameB.split(/\s+/);
    
    const firstNameA = partsA[partsA.length - 1] || '';
    const firstNameB = partsB[partsB.length - 1] || '';
    
    // Sắp xếp theo Tên trước (Vietnamese alphabetical)
    const compareFirst = firstNameA.localeCompare(firstNameB, 'vi');
    if (compareFirst !== 0) return compareFirst;
    
    // Nếu trùng tên thì sắp xếp theo Họ và Chữ lót
    const restA = partsA.slice(0, partsA.length - 1).join(' ');
    const restB = partsB.slice(0, partsB.length - 1).join(' ');
    
    return restA.localeCompare(restB, 'vi');
  });
};

interface StudentManagerProps {
  students: Student[];
  allStudents?: Student[];
  violations: ViolationRecord[];
  tasks: StudentTask[];
  classes: ClassItem[];
  schoolYears: SchoolYear[];
  activeClassId?: string;
  activeSchoolYearId?: string;
  onAddStudent: (student: Student) => void;
  onUpdateStudent: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  academicUpdates?: AcademicUpdate[];
  onAddAcademicUpdate?: (update: AcademicUpdate) => void;
  onUpdateAcademicUpdate?: (update: AcademicUpdate) => void;
  onDeleteAcademicUpdate?: (id: string) => void;
  imageFolderId?: string;
  isReadOnly?: boolean;
}

export default function StudentManager({
  students,
  allStudents = [],
  violations,
  tasks,
  classes = [],
  schoolYears = [],
  activeClassId = '',
  activeSchoolYearId = '',
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  academicUpdates = [],
  onAddAcademicUpdate,
  onUpdateAcademicUpdate,
  onDeleteAcademicUpdate,
  imageFolderId = '',
  isReadOnly = false,
}: StudentManagerProps) {
  const [search, setSearch] = useState('');
  const [filterGender, setFilterGender] = useState<string>('Tất cả');
  const [filterStatus, setFilterStatus] = useState<string>('Tất cả');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(students[0]?.id || null);
  const [activeDetailTab, setActiveDetailTab] = useState<'so-yeu-ll' | 'hoc-tap'>('so-yeu-ll');

  // Reset tab to Sơ yếu LL when student changes
  useEffect(() => {
    setActiveDetailTab('so-yeu-ll');
  }, [selectedStudentId]);
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // State for student class transfer
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferClassId, setTransferClassId] = useState('');
  const [transferCurrentStatus, setTransferCurrentStatus] = useState<'Lên lớp' | 'Chuyển lớp' | 'Nghỉ học'>('Lên lớp');

  // States for CSV Import
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [parsedCsvStudents, setParsedCsvStudents] = useState<Student[]>([]);
  const [csvParseError, setCsvParseError] = useState<string | null>(null);

  // States for Class Transfer Side-by-Side Interface (Vietnamese labels matched to drawings)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSrcYearId, setTransferSrcYearId] = useState('');
  const [transferSrcClassId, setTransferSrcClassId] = useState('');
  const [transferDestYearId, setTransferDestYearId] = useState('');
  const [transferDestClassId, setTransferDestClassId] = useState('');
  const [leftCheckedIds, setLeftCheckedIds] = useState<string[]>([]);
  const [rightCheckedIds, setRightCheckedIds] = useState<string[]>([]);

  // Sync the transfer class selectors when modal opens
  useEffect(() => {
    if (isTransferModalOpen) {
      const srcYearId = activeSchoolYearId || schoolYears[0]?.id || '';
      setTransferSrcYearId(srcYearId);
      
      const srcClassId = activeClassId || classes.find(c => c.schoolYearId === srcYearId)?.id || '';
      setTransferSrcClassId(srcClassId);

      const activeYearIdx = schoolYears.findIndex(y => y.id === srcYearId);
      const destYearId = activeYearIdx !== -1 && activeYearIdx + 1 < schoolYears.length
        ? schoolYears[activeYearIdx + 1].id
        : (schoolYears[0]?.id || '');
      setTransferDestYearId(destYearId);

      const destClassId = classes.find(c => c.schoolYearId === destYearId && c.id !== srcClassId)?.id 
        || classes.find(c => c.schoolYearId === destYearId)?.id 
        || '';
      setTransferDestClassId(destClassId);

      setLeftCheckedIds([]);
      setRightCheckedIds([]);
    }
  }, [isTransferModalOpen, activeSchoolYearId, activeClassId]);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [formDob, setFormDob] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formStatus, setFormStatus] = useState<'Đang học' | 'Nghỉ học' | 'Đình chỉ'>('Đang học');
  const [formFatherName, setFormFatherName] = useState('');
  const [formFatherJob, setFormFatherJob] = useState('');
  const [formMotherName, setFormMotherName] = useState('');
  const [formMotherJob, setFormMotherJob] = useState('');
  const [formAvatarUrl, setFormAvatarUrl] = useState('');
  const [uploadingStudentId, setUploadingStudentId] = useState<string | null>(null);

  // PDF Export Modal & Customization States
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [reportType, setReportType] = useState<'end_year' | 'disciplinary'>('end_year');
  const [schoolName, setSchoolName] = useState('Trường THPT Nguyễn Hữu Cầu');
  const [className, setClassName] = useState('Lớp 11A1');
  const [teacherComment, setTeacherComment] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const reportPdfRef = useRef<HTMLDivElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // PDF download fallback state
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');

  const formatReportFooterDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `TP. Hồ Chí Minh, ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
    return `TP. Hồ Chí Minh, ngày ... tháng ... năm ...`;
  };

  const filteredStudents = sortStudentsAlphabetically(students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.toLowerCase().includes(search.toLowerCase());
    const matchesGender = filterGender === 'Tất cả' || s.gender === filterGender;
    const matchesStatus = filterStatus === 'Tất cả' || s.status === filterStatus;
    return matchesSearch && matchesGender && matchesStatus;
  }));

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // Student specific statistics
  const getStudentStats = (studentId: string) => {
    const studentViolations = violations.filter(v => v.studentId === studentId);
    const studentTasks = tasks.filter(t => t.studentId === studentId || t.studentId === 'Tất cả');
    
    const totalDeductions = studentViolations.reduce((sum, v) => sum + v.points, 0);
    const lateCount = studentViolations.filter(v => v.type === 'Đi muộn').length;
    const absentUnexcused = studentViolations.filter(v => v.type === 'Nghỉ học không phép').length;
    const absentExcused = studentViolations.filter(v => v.type === 'Nghỉ học có phép').length;
    
    const completedTasks = studentTasks.filter(t => t.status === 'Đã hoàn thành').length;
    const pendingTasks = studentTasks.filter(t => t.status !== 'Đã hoàn thành').length;

    return {
      completedTasks,
      pendingTasks,
      violationsCount: studentViolations.length,
      history: studentViolations,
      taskList: studentTasks,
      totalDeductions,
      lateCount,
      absentUnexcused,
      absentExcused
    };
  };

  const handleOpenExportModal = () => {
    if (!selectedStudent || !stats) return;
    setSchoolName('Trường THPT Nguyễn Hữu Cầu');
    const studentClass = classes.find(c => c.id === selectedStudent?.classId)?.name || selectedStudent?.className || 'Lớp 11A1';
    setClassName(studentClass);
    setTeacherComment(getDefaultComment(selectedStudent.name, stats.totalDeductions));
    setPdfDownloadUrl(null);
    setPdfFilename('');
    setIsExportModalOpen(true);
  };

  const handleExportPDF = async () => {
    if (!reportPdfRef.current || !selectedStudent) return;
    setIsGeneratingPdf(true);
    setPdfDownloadUrl(null);
    try {
      const element = reportPdfRef.current;
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileTypeLabel = reportType === 'end_year' ? 'CuoiNam' : 'DotXuat';
      const cleanName = selectedStudent.name.replace(/\s+/g, '_');
      const filename = `BaoCao_${cleanName}_${fileTypeLabel}.pdf`;

      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setPdfDownloadUrl(blobUrl);
      setPdfFilename(filename);

      try {
        pdf.save(filename);
      } catch (saveError) {
        console.warn("Direct pdf.save failed inside iframe, using blob URL fallback", saveError);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e: any) {
      console.error(e);
      alert('Không thể xuất tệp PDF. Lỗi: ' + (e?.message || e || 'Lỗi không xác định'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleOpenAdd = () => {
    // Auto-generate ID
    const nextNum = students.length > 0 
      ? Math.max(...students.map(s => {
          const num = parseInt(s.id.replace('HS', ''), 10);
          return isNaN(num) ? 0 : num;
        })) + 1 
      : 1;
    const nextId = `HS${nextNum.toString().padStart(3, '0')}`;
    
    setFormId(nextId);
    setFormName('');
    setFormGender('Nam');
    setFormDob('2009-01-01');
    setFormPhone('');
    setFormAddress('');
    setFormStatus('Đang học');
    setFormFatherName('');
    setFormFatherJob('');
    setFormMotherName('');
    setFormMotherJob('');
    setFormAvatarUrl('');
    setIsEditing(false);
    setIsAdding(true);
  };

  const handleOpenEdit = (student: Student) => {
    setFormId(student.id);
    setFormName(student.name);
    setFormGender(student.gender);
    setFormDob(student.dob);
    setFormPhone(student.parentPhone);
    setFormAddress(student.address);
    setFormStatus(student.status);
    setFormFatherName(student.fatherName || '');
    setFormFatherJob(student.fatherJob || '');
    setFormMotherName(student.motherName || '');
    setFormMotherJob(student.motherJob || '');
    setFormAvatarUrl(student.avatarUrl || '');
    setIsAdding(false);
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập tên học sinh');
      return;
    }

    const studentData: Student = {
      id: formId,
      name: formName,
      gender: formGender,
      dob: formDob,
      parentPhone: formPhone,
      address: formAddress,
      status: formStatus,
      fatherName: formFatherName.trim(),
      fatherJob: formFatherJob.trim(),
      motherName: formMotherName.trim(),
      motherJob: formMotherJob.trim(),
      classId: isAdding ? '' : (students.find(s => s.id === formId)?.classId || ''),
      avatarUrl: formAvatarUrl.trim()
    };

    if (isAdding) {
      onAddStudent(studentData);
      setSelectedStudentId(studentData.id);
      setIsAdding(false);
    } else {
      onUpdateStudent(studentData);
      setIsEditing(false);
    }
  };

  const compressAndResizeImage = (file: File, maxWidth = 300, maxHeight = 400): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUploadImage = async (studentId: string, file: File) => {
    setUploadingStudentId(studentId);
    try {
      // Compress/resize the photo to ensure it is lightweight (< 30KB) for cloud DB storage
      const base64DataUrl = await compressAndResizeImage(file);

      if (formId === studentId) {
        setFormAvatarUrl(base64DataUrl);
      }

      const currentStudent = students.find(s => s.id === studentId);
      if (currentStudent) {
        const updated: Student = {
          ...currentStudent,
          avatarUrl: base64DataUrl,
        };
        onUpdateStudent(updated);
      }
      alert('Tải ảnh chân dung thành công! Ảnh đã được lưu trữ trực tiếp trên cơ sở dữ liệu đám mây.');
    } catch (err: any) {
      console.error('Lỗi upload ảnh:', err);
      alert('Không thể tải ảnh lên: ' + (err.message || err));
    } finally {
      setUploadingStudentId(null);
    }
  };

  const handleTransferClass = () => {
    if (!selectedStudent) return;
    if (!transferClassId) {
      alert('Vui lòng chọn lớp học cần chuyển đến');
      return;
    }
    const targetClass = classes.find(c => c.id === transferClassId);
    if (!targetClass) {
      alert('Lớp học không tồn tại');
      return;
    }
    const targetYear = schoolYears.find(y => y.id === targetClass.schoolYearId);

    // 1. Generate a new Student ID for the target class
    const nextNum = students.length > 0 
      ? Math.max(...students.map(s => {
          const num = parseInt(s.id.replace('HS', ''), 10);
          return isNaN(num) ? 0 : num;
        })) + 1 
      : 1;
    const newStudentId = `HS${nextNum.toString().padStart(3, '0')}`;

    // 2. Clone student details into target class with active status 'Đang học'
    const clonedStudent: Student = {
      ...selectedStudent,
      id: newStudentId,
      classId: targetClass.id,
      className: targetClass.name,
      schoolYear: targetYear?.name || '',
      status: 'Đang học'
    };

    // 3. Update the original student's status in the current class
    const updatedOriginalStudent: Student = {
      ...selectedStudent,
      status: transferCurrentStatus
    };

    // 4. Save both records
    onUpdateStudent(updatedOriginalStudent);
    onAddStudent(clonedStudent);

    setIsTransferring(false);
    
    // Deselect student since they are moved out of the active class context
    setSelectedStudentId(students.find(s => s.id !== selectedStudent.id)?.id || null);
    
    alert(`Đã hoàn tất chuyển học sinh ${selectedStudent.name}:\n- Ở lớp cũ, trạng thái cập nhật thành: "${transferCurrentStatus}"\n- Ở lớp mới (${targetClass.name}), học sinh đã được thêm mới với mã học sinh mới: ${newStudentId}`);
  };

  // --- EXCEL/CSV IMPORTER LOGIC ---
  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvParseError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvParseError('Tệp rỗng hoặc không thể đọc được.');
          return;
        }

        const parsed = parseCsvContent(text);
        if (parsed.length === 0) {
          setCsvParseError('Không tìm thấy dữ liệu học sinh hợp lệ trong tệp CSV. Vui lòng kiểm tra lại cấu trúc cột.');
          return;
        }
        setParsedCsvStudents(parsed);
      } catch (err: any) {
        console.error('Lỗi phân tích CSV:', err);
        setCsvParseError('Đã xảy ra lỗi khi đọc tệp: ' + (err.message || err));
      }
    };
    reader.onerror = () => {
      setCsvParseError('Không thể đọc được tệp tin.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseCsvContent = (text: string): Student[] => {
    const lines = text.split(/\r?\n/);
    if (lines.length <= 1) return [];

    const parseCSVLine = (line: string) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    
    let nameIdx = headers.findIndex(h => h.includes('tên') || h.includes('name') || h.includes('họ và tên') || h.includes('họ tên'));
    let genderIdx = headers.findIndex(h => h.includes('giới tính') || h.includes('gioi tinh') || h.includes('gender') || h.includes('phái'));
    let dobIdx = headers.findIndex(h => h.includes('ngày sinh') || h.includes('ngay sinh') || h.includes('dob') || h.includes('năm sinh'));
    let phoneIdx = headers.findIndex(h => h.includes('điện thoại') || h.includes('dien thoai') || h.includes('sđt') || h.includes('phone') || h.includes('liên hệ'));
    let addressIdx = headers.findIndex(h => h.includes('địa chỉ') || h.includes('dia chi') || h.includes('address') || h.includes('thường trú'));
    let fatherNameIdx = headers.findIndex(h => h.includes('bố') || h.includes('cha') || h.includes('father'));
    let fatherJobIdx = headers.findIndex(h => h.includes('nghề nghiệp bố') || h.includes('nghề bố') || h.includes('bố làm'));
    let motherNameIdx = headers.findIndex(h => h.includes('mẹ') || h.includes('mother'));
    let motherJobIdx = headers.findIndex(h => h.includes('nghề nghiệp mẹ') || h.includes('nghề mẹ') || h.includes('mẹ làm'));
    let studentIdIdx = headers.findIndex(h => h.includes('mã học sinh') || h.includes('mã hs') || h.includes('ma hs') || h.includes('ma hoc sinh') || h.includes('id') || h.includes('student id') || h.includes('student_id'));

    if (nameIdx === -1) nameIdx = 0;
    if (genderIdx === -1) genderIdx = 1;
    if (dobIdx === -1) dobIdx = 2;
    if (phoneIdx === -1) phoneIdx = 3;
    if (addressIdx === -1) addressIdx = 4;
    if (fatherNameIdx === -1) fatherNameIdx = 5;
    if (fatherJobIdx === -1) fatherJobIdx = 6;
    if (motherNameIdx === -1) motherNameIdx = 7;
    if (motherJobIdx === -1) motherJobIdx = 8;

    const list: Student[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = parseCSVLine(line);
      if (cols.length === 0 || !cols[nameIdx]) continue;

      let rawDob = cols[dobIdx] || '2009-01-01';
      let dob = '2009-01-01';
      const partsSlash = rawDob.split('/');
      const partsDash = rawDob.split('-');
      if (partsSlash.length === 3) {
        const d = partsSlash[0].padStart(2, '0');
        const m = partsSlash[1].padStart(2, '0');
        const y = partsSlash[2];
        dob = `${y}-${m}-${d}`;
      } else if (partsDash.length === 3) {
        if (partsDash[0].length === 4) {
          dob = rawDob;
        } else {
          const d = partsDash[0].padStart(2, '0');
          const m = partsDash[1].padStart(2, '0');
          const y = partsDash[2];
          dob = `${y}-${m}-${d}`;
        }
      }

      let gender: 'Nam' | 'Nữ' = 'Nam';
      const rawGender = (cols[genderIdx] || '').toLowerCase();
      if (rawGender.includes('nữ') || rawGender.includes('nu') || rawGender === 'female' || rawGender === 'f' || rawGender === 'girl') {
        gender = 'Nữ';
      }

      let studentId = '';
      if (studentIdIdx !== -1 && cols[studentIdIdx]) {
        studentId = cols[studentIdIdx].trim();
      }

      list.push({
        id: studentId,
        name: cols[nameIdx],
        gender,
        dob,
        parentPhone: cols[phoneIdx] || '',
        address: cols[addressIdx] || '',
        status: 'Đang học',
        fatherName: cols[fatherNameIdx] || '',
        fatherJob: cols[fatherJobIdx] || '',
        motherName: cols[motherNameIdx] || '',
        motherJob: cols[motherJobIdx] || '',
      });
    }

    return list;
  };

  const handleExecuteImport = () => {
    if (parsedCsvStudents.length === 0) return;

    const currentStudents = allStudents.length > 0 ? allStudents : students;
    let maxIdNum = currentStudents.length > 0 
      ? Math.max(...currentStudents.map(s => {
          const num = parseInt(s.id.replace('HS', ''), 10);
          return isNaN(num) ? 0 : num;
        }))
      : 0;

    let added = 0;
    parsedCsvStudents.forEach((stud) => {
      let finalId = stud.id;
      if (!finalId) {
        maxIdNum++;
        finalId = `HS${maxIdNum.toString().padStart(3, '0')}`;
      }
      
      const activeClass = classes.find(c => c.id === activeClassId);
      const activeYear = schoolYears.find(y => y.id === activeSchoolYearId);

      const newStudent: Student = {
        ...stud,
        id: finalId,
        classId: activeClassId,
        className: activeClass?.name || '',
        schoolYear: activeYear?.name || '',
      };

      onAddStudent(newStudent);
      added++;
    });

    setIsCsvModalOpen(false);
    setParsedCsvStudents([]);
    alert(`Đã nhập thành công ${added} học sinh từ tệp CSV vào lớp hiện tại! Dữ liệu đã được lưu trữ.`);
  };

  // --- CLASS TRANSFER SIDE-BY-SIDE INTERFACE LOGIC ---
  const handleToggleLeftCheckbox = (studentKey: string) => {
    setLeftCheckedIds(prev => 
      prev.includes(studentKey) ? prev.filter(key => key !== studentKey) : [...prev, studentKey]
    );
  };

  const handleToggleRightCheckbox = (studentKey: string) => {
    setRightCheckedIds(prev => 
      prev.includes(studentKey) ? prev.filter(key => key !== studentKey) : [...prev, studentKey]
    );
  };

  const handleLeftSelectAll = (sourceStudents: Student[]) => {
    const activeSourceKeys = sourceStudents.map(s => `${s.id}-${s.name}`);
    const allSelected = activeSourceKeys.every(key => leftCheckedIds.includes(key));
    if (allSelected) {
      setLeftCheckedIds(prev => prev.filter(key => !activeSourceKeys.includes(key)));
    } else {
      setLeftCheckedIds(prev => {
        const newSelected = [...prev];
        activeSourceKeys.forEach(key => {
          if (!newSelected.includes(key)) newSelected.push(key);
        });
        return newSelected;
      });
    }
  };

  const handleRightSelectAll = (destStudents: Student[]) => {
    const activeDestKeys = destStudents.map(s => `${s.id}-${s.name}`);
    const allSelected = activeDestKeys.every(key => rightCheckedIds.includes(key));
    if (allSelected) {
      setRightCheckedIds(prev => prev.filter(key => !activeDestKeys.includes(key)));
    } else {
      setRightCheckedIds(prev => {
        const newSelected = [...prev];
        activeDestKeys.forEach(key => {
          if (!newSelected.includes(key)) newSelected.push(key);
        });
        return newSelected;
      });
    }
  };

  const handleTransferSelectedRight = () => {
    if (leftCheckedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một học sinh từ cột Lớp cũ (trái) để chuyển.');
      return;
    }
    if (!transferDestClassId) {
      alert('Vui lòng chọn Lớp đích ở cột bên phải.');
      return;
    }

    const currentStudents = allStudents.length > 0 ? allStudents : students;
    const destClass = classes.find(c => c.id === transferDestClassId);
    const destYear = schoolYears.find(y => y.id === destClass?.schoolYearId);

    if (!destClass) {
      alert('Không tìm thấy lớp đích phù hợp.');
      return;
    }

    let maxIdNum = currentStudents.length > 0 
      ? Math.max(...currentStudents.map(s => {
          const num = parseInt(s.id.replace('HS', ''), 10);
          return isNaN(num) ? 0 : num;
        }))
      : 0;

    let addedCount = 0;
    leftCheckedIds.forEach(studentKey => {
      const original = currentStudents.find(s => `${s.id}-${s.name}` === studentKey);
      if (!original) return;

      const alreadyExists = currentStudents.some(s => 
        s.classId === transferDestClassId && 
        s.name.toLowerCase() === original.name.toLowerCase() && 
        s.dob === original.dob
      );

      if (alreadyExists) return;

      addedCount++;
      maxIdNum++;
      const nextId = `HS${maxIdNum.toString().padStart(3, '0')}`;

      const clonedStudent: Student = {
        ...original,
        id: nextId,
        classId: transferDestClassId,
        className: destClass.name,
        schoolYear: destYear?.name || '',
        status: 'Đang học'
      };

      const updatedOriginal: Student = {
        ...original,
        status: 'Lên lớp'
      };

      onUpdateStudent(updatedOriginal);
      onAddStudent(clonedStudent);
    });

    setLeftCheckedIds([]);
    alert(`Đã hoàn thành thăng cấp/chuyển lớp cho ${addedCount} học sinh thành công sang lớp ${destClass.name}!`);
  };

  const handleTransferSelectedLeft = () => {
    if (rightCheckedIds.length === 0) {
      alert('Vui lòng chọn ít nhất một học sinh từ cột Lớp đích (phải) để hoàn trả.');
      return;
    }
    if (!transferSrcClassId) {
      alert('Lớp nguồn chưa được xác định.');
      return;
    }

    const currentStudents = allStudents.length > 0 ? allStudents : students;

    rightCheckedIds.forEach(studentKey => {
      const destStudent = currentStudents.find(s => `${s.id}-${s.name}` === studentKey);
      if (!destStudent) return;

      const original = currentStudents.find(s => 
        s.classId === transferSrcClassId &&
        s.name.toLowerCase() === destStudent.name.toLowerCase() &&
        s.dob === destStudent.dob &&
        (s.status === 'Lên lớp' || s.status === 'Chuyển lớp')
      );

      onDeleteStudent(destStudent.id);

      if (original) {
        onUpdateStudent({
          ...original,
          status: 'Đang học'
        });
      }
    });

    setRightCheckedIds([]);
    alert(`Đã hoàn trả thành công ${rightCheckedIds.length} học sinh và khôi phục trạng thái lớp cũ!`);
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      title: 'Xác nhận xóa học sinh',
      message: `Bạn có chắc chắn muốn xoá học sinh "${name}" (${id}) không? Thao tác này cũng sẽ ảnh hưởng đến các bản ghi vi phạm và nhiệm vụ liên quan.`,
      onConfirm: () => {
        onDeleteStudent(id);
        if (selectedStudentId === id) {
          setSelectedStudentId(students.find(s => s.id !== id)?.id || null);
        }
        setConfirmModal(null);
      }
    });
  };

  const stats = selectedStudent ? getStudentStats(selectedStudent.id) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="student-manager-section">
      {/* Left pane: Search, filters & Student list */}
      <div className="lg:col-span-5 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 flex flex-col h-[700px]">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
          <h2 className="text-base font-semibold text-white uppercase tracking-wider">Danh sách học sinh</h2>
          {!isReadOnly && (
            <div className="flex flex-wrap gap-1.5">
              <button
                id="btn-add-student"
                onClick={handleOpenAdd}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-black rounded-xl text-xs font-bold transition shadow-sm"
                title="Thêm học sinh mới thủ công"
              >
                <Plus size={14} /> Thêm mới
              </button>
              <button
                id="btn-import-csv"
                onClick={() => setIsCsvModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold border border-amber-500/10 transition shadow-sm"
                title="Nhập danh sách học sinh từ file CSV"
              >
                <Upload size={14} /> Nhập CSV
              </button>
              <button
                id="btn-transfer-class-panel"
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl text-xs font-bold border border-amber-500/10 transition shadow-sm"
                title="Chuyển lớp/Thăng cấp học sinh hàng loạt"
              >
                <ArrowRightLeft size={14} /> Chuyển lớp
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-2.5 text-white/30" />
          <input
            id="student-search-input"
            type="text"
            placeholder="Tìm kiếm theo tên, mã HS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-amber-500 text-white placeholder-white/30 transition-colors"
          />
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">Giới tính</label>
            <select
              id="filter-gender-select"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl p-2 focus:outline-none focus:border-amber-500"
            >
              <option value="Tất cả" className="bg-[#111]">Tất cả</option>
              <option value="Nam" className="bg-[#111]">Nam</option>
              <option value="Nữ" className="bg-[#111]">Nữ</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1 block">Trạng thái</label>
            <select
              id="filter-status-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs bg-white/5 border border-white/10 text-white rounded-xl p-2 focus:outline-none focus:border-amber-500"
            >
              <option value="Tất cả" className="bg-[#111]">Tất cả</option>
              <option value="Đang học" className="bg-[#111]">Đang học</option>
              <option value="Nghỉ học" className="bg-[#111]">Nghỉ học</option>
              <option value="Đình chỉ" className="bg-[#111]">Đình chỉ</option>
            </select>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-xs italic">
              Không tìm thấy học sinh nào phù hợp
            </div>
          ) : (
            filteredStudents.map((s) => {
              const studentPoints = violations
                .filter(v => v.studentId === s.id)
                .reduce((sum, v) => sum + v.points, 0);
              
              const isSelected = selectedStudentId === s.id;
              
              return (
                <div
                  id={`student-item-${s.id}`}
                  key={s.id}
                  onClick={() => {
                    setSelectedStudentId(s.id);
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                    isSelected
                      ? 'border-amber-500/80 bg-white/5 shadow-md'
                      : 'border-white/5 hover:border-white/10 bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {s.avatarUrl ? (
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0">
                        <img 
                          src={getDriveImageUrl(s.avatarUrl)} 
                          alt={s.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    ) : (
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0 ${
                        s.gender === 'Nữ' 
                          ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' 
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {s.name.split(' ').pop()?.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-white text-xs sm:text-sm flex items-center gap-2">
                        {s.name}
                        <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/60 font-mono">
                          {s.id}
                        </span>
                      </div>
                      <div className="text-[10px] text-white/40 mt-0.5">
                        {s.gender} • {s.dob.split('-').reverse().join('/')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Points Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      studentPoints < 0
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {studentPoints === 0 ? '0' : `${studentPoints}`}đ
                    </span>

                    {/* Status Dot */}
                    <span className={`w-2 h-2 rounded-full ${
                      s.status === 'Đang học' 
                        ? 'bg-emerald-500' 
                        : s.status === 'Lên lớp'
                        ? 'bg-sky-400'
                        : s.status === 'Chuyển lớp'
                        ? 'bg-indigo-400'
                        : s.status === 'Nghỉ học' 
                        ? 'bg-amber-400' 
                        : 'bg-rose-500'
                    }`} title={s.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right pane: Student Form or Details */}
      <div className="lg:col-span-7 h-[700px]">
        {isAdding || isEditing ? (
          /* Add/Edit Student Form */
          <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-6 h-full flex flex-col">
            <h3 className="text-base font-semibold text-white mb-6 border-b border-white/5 pb-3">
              {isAdding ? 'Thêm học sinh mới' : `Cập nhật thông tin học sinh: ${formName}`}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 flex-1 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Mã học sinh (Tự động)</label>
                  <input
                    id="form-student-id"
                    type="text"
                    value={formId}
                    disabled
                    className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white/30 cursor-not-allowed focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Họ và Tên <span className="text-rose-500">*</span></label>
                  <input
                    id="form-student-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Giới tính</label>
                  <div className="flex gap-4 py-2">
                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                      <input
                        id="form-student-gender-male"
                        type="radio"
                        name="gender"
                        checked={formGender === 'Nam'}
                        onChange={() => setFormGender('Nam')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      Nam
                    </label>
                    <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                      <input
                        id="form-student-gender-female"
                        type="radio"
                        name="gender"
                        checked={formGender === 'Nữ'}
                        onChange={() => setFormGender('Nữ')}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      Nữ
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Ngày sinh</label>
                  <input
                    id="form-student-dob"
                    type="date"
                    required
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Số điện thoại Phụ huynh</label>
                  <input
                    id="form-student-phone"
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 09xxxxxxxx"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Trạng thái học tập</label>
                  <select
                    id="form-student-status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#111] border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  >
                    <option value="Đang học">Đang học</option>
                    <option value="Nghỉ học">Nghỉ học</option>
                    <option value="Đình chỉ">Đình chỉ</option>
                    <option value="Lên lớp">Lên lớp (Đã tốt nghiệp/Ra lớp)</option>
                    <option value="Chuyển lớp">Chuyển lớp khác</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Họ tên bố (cha)</label>
                  <input
                    id="form-student-father-name"
                    type="text"
                    value={formFatherName}
                    onChange={(e) => setFormFatherName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Hùng"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Nghề nghiệp bố</label>
                  <input
                    id="form-student-father-job"
                    type="text"
                    value={formFatherJob}
                    onChange={(e) => setFormFatherJob(e.target.value)}
                    placeholder="VD: Kỹ sư xây dựng"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Họ tên mẹ</label>
                  <input
                    id="form-student-mother-name"
                    type="text"
                    value={formMotherName}
                    onChange={(e) => setFormMotherName(e.target.value)}
                    placeholder="VD: Lê Thị Hà"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Nghề nghiệp mẹ</label>
                  <input
                    id="form-student-mother-job"
                    type="text"
                    value={formMotherJob}
                    onChange={(e) => setFormMotherJob(e.target.value)}
                    placeholder="VD: Giáo viên"
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Link ảnh chân dung (Dán link hoặc bấm tải từ máy)</label>
                <div className="flex gap-2">
                  <input
                    id="form-student-avatar-url"
                    type="text"
                    value={formAvatarUrl}
                    onChange={(e) => setFormAvatarUrl(e.target.value)}
                    placeholder="Dán link ảnh hoặc chọn tải trực tiếp..."
                    className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500"
                  />
                  <label className="shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:border-amber-500/30 rounded-xl text-xs font-bold transition duration-150 cursor-pointer shadow-sm">
                    <Upload size={14} className={uploadingStudentId === formId ? 'animate-pulse' : ''} />
                    <span>{uploadingStudentId === formId ? 'Đang tải...' : 'Tải từ máy'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingStudentId === formId}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadImage(formId, file);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Địa chỉ thường trú</label>
                <textarea
                  id="form-student-address"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Nhập số nhà, tên đường, phường/xã, quận/huyện..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-white/5 mt-auto">
                <button
                  id="form-btn-cancel"
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setIsEditing(false);
                  }}
                  className="px-5 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 rounded-xl text-xs font-medium transition"
                >
                  Hủy bỏ
                </button>
                <button
                  id="form-btn-submit"
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-black rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Lưu thông tin
                </button>
              </div>
            </form>
          </div>
        ) : selectedStudent && stats ? (
          /* Student Details Card */
          <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-6 h-full flex flex-col overflow-y-auto custom-scrollbar">
            {/* Tab Navigation Menu (Sơ yếu LL & Học tập) */}
            <div className="flex gap-2 mb-6 border-b border-white/5 pb-3">
              <button
                onClick={() => setActiveDetailTab('so-yeu-ll')}
                className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition duration-200 ${
                  activeDetailTab === 'so-yeu-ll'
                    ? 'bg-white text-black border-white font-extrabold shadow-md shadow-white/5'
                    : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                Sơ yếu LL
              </button>
              <button
                onClick={() => setActiveDetailTab('hoc-tap')}
                className={`px-5 py-2 text-xs font-black uppercase tracking-wider rounded-lg border transition duration-200 ${
                  activeDetailTab === 'hoc-tap'
                    ? 'bg-white text-black border-white font-extrabold shadow-md shadow-white/5'
                    : 'bg-transparent text-white/50 border-white/10 hover:text-white hover:border-white/20'
                }`}
              >
                Học tập
              </button>
            </div>

            {/* Header Block */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
              <div className="flex gap-4">
                {uploadingStudentId === selectedStudent.id ? (
                  <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold text-[9px] border border-amber-500/30 bg-amber-500/5 text-amber-400 shrink-0 animate-pulse">
                    <span className="animate-pulse text-xs mb-0.5">⏳</span>
                    <span>Đang tải...</span>
                  </div>
                ) : selectedStudent.avatarUrl ? (
                  <div className="relative group w-14 h-14 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                    <img 
                      src={getDriveImageUrl(selectedStudent.avatarUrl)} 
                      alt={selectedStudent.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] text-amber-400 font-bold transition duration-200 cursor-pointer text-center">
                      <Camera size={14} className="mb-0.5" />
                      <span>Thay đổi</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(selectedStudent.id, file);
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                ) : (
                  <div className="relative group w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-base border shrink-0 bg-white/[0.02] border-white/5 hover:border-amber-500/30 transition">
                    <div className="text-center">
                      <User size={16} className="mx-auto mb-0.5 text-white/30" />
                      <span className="text-[10px] text-white/40">{selectedStudent.name.split(' ').pop()?.substring(0, 2)}</span>
                    </div>
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] text-amber-400 font-bold transition duration-200 cursor-pointer rounded-2xl text-center">
                      <Upload size={14} className="mb-0.5" />
                      <span>Tải ảnh</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadImage(selectedStudent.id, file);
                        }}
                        className="hidden" 
                      />
                    </label>
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedStudent.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono bg-white/5 text-white/60 px-2 py-0.5 rounded border border-white/5">
                      ID: {selectedStudent.id}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      selectedStudent.status === 'Đang học' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : selectedStudent.status === 'Lên lớp'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                        : selectedStudent.status === 'Chuyển lớp'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : selectedStudent.status === 'Nghỉ học'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {selectedStudent.status}
                    </span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 font-medium font-sans">
                      Lớp: {classes.find(c => c.id === selectedStudent.classId)?.name || selectedStudent.className || 'Chưa phân lớp'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 items-center">
                {!isReadOnly && (
                  <button
                    id="btn-transfer-student"
                    onClick={() => {
                      setIsTransferring(true);
                      const otherClasses = classes.filter(c => c.id !== selectedStudent.classId);
                      setTransferClassId(otherClasses[0]?.id || '');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-black rounded-xl text-xs font-bold transition shadow-sm border border-amber-500/20"
                    title="Chuyển lớp học sinh"
                  >
                    <ArrowRightLeft size={14} />
                    <span>Chuyển lớp</span>
                  </button>
                )}
                <button
                  id="btn-export-student-pdf"
                  onClick={handleOpenExportModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm border border-emerald-500/20"
                  title="Xuất báo cáo cá nhân PDF"
                >
                  <Download size={14} />
                  <span>Báo cáo PDF</span>
                </button>
                {!isReadOnly && (
                  <>
                    <button
                      id="btn-edit-student"
                      onClick={() => handleOpenEdit(selectedStudent)}
                      className="p-2 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-amber-500 transition"
                      title="Sửa học sinh"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      id="btn-delete-student"
                      onClick={() => handleDelete(selectedStudent.id, selectedStudent.name)}
                      className="p-2 hover:bg-rose-500/10 border border-white/10 rounded-lg text-white/60 hover:text-rose-500 transition"
                      title="Xoá học sinh"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Content under the selected Tab */}
            {activeDetailTab === 'so-yeu-ll' && (
              <div className="space-y-6 flex-1 animate-fadeIn">
                {/* General Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <Calendar size={16} className="text-white/40 shrink-0" />
                    <div>
                      <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">Ngày sinh</div>
                      <div className="text-xs font-semibold text-white/80">{selectedStudent.dob.split('-').reverse().join('/')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <Phone size={16} className="text-white/40 shrink-0" />
                    <div>
                      <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">SĐT Phụ huynh</div>
                      <div className="text-xs font-semibold text-white/80">{selectedStudent.parentPhone || 'Chưa cung cấp'}</div>
                    </div>
                  </div>
                  <div className="col-span-2 flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <MapPin size={16} className="text-white/40 shrink-0" />
                    <div>
                      <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">Địa chỉ thường trú</div>
                      <div className="text-xs font-semibold text-white/80">{selectedStudent.address || 'Chưa cung cấp'}</div>
                    </div>
                  </div>
                </div>

                {/* Parent Info Grid */}
                <div>
                  <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Thông tin gia đình</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">Họ tên bố (cha)</div>
                      <div className="text-xs font-semibold text-white/85 mt-0.5">{selectedStudent.fatherName || 'Chưa cung cấp'}</div>
                      <div className="text-[10px] text-white/40 mt-1.5">
                        <span className="text-white/20">Nghề nghiệp:</span> {selectedStudent.fatherJob || 'Chưa cập nhật'}
                      </div>
                    </div>
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/5">
                      <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">Họ tên mẹ</div>
                      <div className="text-xs font-semibold text-white/85 mt-0.5">{selectedStudent.motherName || 'Chưa cung cấp'}</div>
                      <div className="text-[10px] text-white/40 mt-1.5">
                        <span className="text-white/20">Nghề nghiệp:</span> {selectedStudent.motherJob || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Metrics */}
                <div>
                  <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-3">Tình hình học tập & rèn luyện</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-center">
                      <div className="text-base font-bold text-rose-400">{stats.totalDeductions}đ</div>
                      <div className="text-[9px] text-white/40 mt-1 font-medium">Tổng điểm trừ</div>
                    </div>
                    <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-center">
                      <div className="text-base font-bold text-amber-400">{stats.violationsCount}</div>
                      <div className="text-[9px] text-white/40 mt-1 font-medium">Số lỗi ghi nhận</div>
                    </div>
                    <div className="p-3 bg-[#0d0d0d] border border-white/5 rounded-xl text-center">
                      <div className="text-base font-bold text-white">
                        {stats.taskList.length > 0
                          ? `${Math.round((stats.completedTasks / stats.taskList.length) * 100)}%`
                          : '100%'}
                      </div>
                      <div className="text-[9px] text-white/40 mt-1 font-medium">Nhiệm vụ xong</div>
                    </div>
                  </div>
                </div>

                {/* History Tabs split in two panels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Infraction Log */}
                  <div className="border border-white/5 rounded-xl p-4 bg-white/[0.02]">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-[10px] font-bold text-white/40 uppercase flex items-center gap-1.5">
                        <ShieldAlert size={12} className="text-rose-400" /> Nhật ký nề nếp
                      </h5>
                      <span className="text-[9px] text-white/30 font-mono">{stats.history.length} mục</span>
                    </div>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {stats.history.length === 0 ? (
                        <div className="text-center py-6 text-[10px] text-white/30 italic">Không có vi phạm nào</div>
                      ) : (
                        stats.history.map(h => (
                          <div key={h.id} className="p-2.5 bg-[#0d0d0d] border border-white/5 rounded-xl text-[11px]">
                            <div className="flex justify-between font-semibold">
                              <span className="text-rose-400">{h.type}</span>
                              <span className="text-white/30 font-mono text-[9px]">{h.date.split('-').reverse().join('/')}</span>
                            </div>
                            <p className="text-white/60 mt-1 text-[10px]">{h.note}</p>
                            {(h.resolution || getResolution(h.type)) && (
                              <div className="mt-1 text-[9px] text-amber-300 font-medium leading-relaxed">
                                <span className="text-white/40">Hướng giải quyết: </span>{h.resolution || getResolution(h.type)}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Mission Log */}
                  <div className="border border-white/5 rounded-xl p-4 bg-white/[0.02]">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="text-[10px] font-bold text-white/40 uppercase flex items-center gap-1.5">
                        <CheckCircle size={12} className="text-emerald-400" /> Nhiệm vụ được giao
                      </h5>
                      <span className="text-[9px] text-white/30 font-mono">{stats.taskList.length} mục</span>
                    </div>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {stats.taskList.length === 0 ? (
                        <div className="text-center py-6 text-[10px] text-white/30 italic">Chưa giao nhiệm vụ</div>
                      ) : (
                        stats.taskList.map(t => (
                          <div key={t.id} className="p-2.5 bg-[#0d0d0d] border border-white/5 rounded-xl text-[11px]">
                            <div className="flex justify-between font-semibold items-center">
                              <span className="text-white/80 truncate max-w-[120px]">{t.taskTitle}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                                t.status === 'Đã hoàn thành' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>{t.status}</span>
                            </div>
                            <p className="text-[9px] text-white/30 mt-0.5">Hạn: {t.deadline.split('-').reverse().join('/')}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDetailTab === 'hoc-tap' && (
              <div className="flex-1 animate-fadeIn">
                <StudentAcademicTracker
                  studentId={selectedStudent.id}
                  studentName={selectedStudent.name}
                  academicUpdates={academicUpdates}
                  onAddAcademicUpdate={onAddAcademicUpdate || (() => {})}
                  onUpdateAcademicUpdate={onUpdateAcademicUpdate || (() => {})}
                  onDeleteAcademicUpdate={onDeleteAcademicUpdate || (() => {})}
                  isReadOnly={isReadOnly}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-12 text-center text-white/30 h-full flex flex-col justify-center items-center">
            <User size={48} className="text-white/10 mb-2" />
            <p className="text-xs">Vui lòng chọn hoặc thêm mới một học sinh để xem chi tiết</p>
          </div>
        )}
      </div>

      {/* PDF Export Preview & Customization Modal */}
      {isExportModalOpen && selectedStudent && stats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#111] rounded-3xl border border-white/10 shadow-2xl max-w-5xl w-full flex flex-col lg:flex-row h-[90vh] overflow-hidden">
            {/* Left Column: Configuration Controls */}
            <div className="lg:w-1/3 p-6 border-r border-white/5 flex flex-col justify-between overflow-y-auto bg-[#141414]">
              <div className="space-y-5">
                <div className="flex justify-between items-center pb-3 border-b border-white/5">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                    <FileText size={16} className="text-emerald-400" /> Tùy chỉnh báo cáo
                  </h3>
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Report Type */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Loại báo cáo</label>
                  <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl border border-white/5">
                    <button
                      type="button"
                      onClick={() => setReportType('end_year')}
                      className={`py-2 px-3 text-xs rounded-lg font-medium transition ${
                        reportType === 'end_year' 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      Cuối năm học
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportType('disciplinary')}
                      className={`py-2 px-3 text-xs rounded-lg font-medium transition ${
                        reportType === 'disciplinary' 
                          ? 'bg-emerald-600 text-white shadow-sm' 
                          : 'text-white/40 hover:text-white/80'
                      }`}
                    >
                      Đột xuất
                    </button>
                  </div>
                </div>

                {/* School Name */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Tên trường học</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Nhập tên trường..."
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Class Name */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Lớp học</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Nhập tên lớp..."
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Report Date */}
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block font-sans">Ngày viết báo cáo (Ngày ký)</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Teacher Comment */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block">Nhận xét của GVCN</label>
                    <button
                      type="button"
                      onClick={() => setTeacherComment(getDefaultComment(selectedStudent.name, stats.totalDeductions))}
                      className="text-[9px] text-emerald-400 hover:underline font-medium"
                    >
                      Đặt lại mặc định
                    </button>
                  </div>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Nhập nhận xét chi tiết..."
                    rows={6}
                    className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 resize-none leading-relaxed"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-white/5 mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
                >
                  <Printer size={14} />
                  <span>In báo cáo / Lưu PDF (Nét tinh tế)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-xl text-xs font-medium transition"
                >
                  Đóng lại
                </button>

                {pdfDownloadUrl && (
                  <div className="mt-4 p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-center animate-fadeIn">
                    <p className="text-[11px] text-emerald-400 font-semibold">🎉 Đã tạo báo cáo thành công!</p>
                    <p className="text-[10px] text-white/50 leading-relaxed">Nếu trình duyệt chặn không tự động tải xuống (do bảo mật iframe), vui lòng nhấn nút bên dưới:</p>
                    <a
                      href={pdfDownloadUrl}
                      download={pdfFilename}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl text-[11px] font-bold transition mt-1 w-full justify-center shadow-sm"
                    >
                      <Download size={12} /> Tải xuống thủ công / Xem trực tiếp
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: PDF Canvas Sheet Preview */}
            <div className="lg:w-2/3 p-6 bg-black flex flex-col overflow-hidden">
              <div className="mb-3 flex justify-between items-center">
                <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider">Xem trước tài liệu (Khổ A4)</span>
                <span className="text-[10px] text-emerald-400 font-mono italic">Thiết kế chuẩn hóa để in ấn</span>
              </div>
              <div className="flex-1 overflow-auto rounded-2xl bg-white/5 p-4 border border-white/5 custom-scrollbar">
                <div 
                  ref={reportPdfRef} 
                  id="student-report-print-preview"
                  className="w-[794px] bg-white text-black p-10 font-sans shadow-2xl mx-auto text-left relative"
                  style={{ minHeight: '1123px' }}
                >
                  {/* National Brand & School Headers */}
                  <div className="grid grid-cols-12 gap-2 text-center text-[11px] mb-8">
                    <div className="col-span-5 uppercase">
                      <p className="font-bold">{schoolName.toUpperCase()}</p>
                      <p className="font-bold">LỚP: {className.toUpperCase()}</p>
                      <p className="text-[10px] italic mt-0.5">Số: ...../BC-CN</p>
                      <div className="w-24 h-[1px] bg-black mx-auto mt-1"></div>
                    </div>
                    <div className="col-span-7 uppercase">
                      <p className="font-bold text-[11px]">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                      <p className="font-bold text-[10px] tracking-wide mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
                      <div className="w-40 h-[1px] bg-black mx-auto mt-1"></div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mb-8">
                    <h2 className="text-md font-bold uppercase tracking-wider">
                      {reportType === 'end_year' ? 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN CUỐI NĂM' : 'BÁO CÁO TÌNH HÌNH HỌC TẬP & RÈN LUYỆN ĐỘT XUẤT'}
                    </h2>
                    <p className="text-xs italic mt-1">Năm học: 2025 - 2026</p>
                  </div>

                  {/* Section 1: Student Details */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold uppercase border-b border-black pb-0.5 mb-2 tracking-wider">1. THÔNG TIN HỌC SINH</h4>
                    <div className="grid grid-cols-2 gap-y-1.5 text-[11px] leading-relaxed">
                      <div><span className="font-semibold text-gray-700">Họ và tên:</span> <span className="font-bold">{selectedStudent.name}</span></div>
                      <div><span className="font-semibold text-gray-700">Ngày sinh:</span> {selectedStudent.dob ? selectedStudent.dob.split('-').reverse().join('/') : 'Chưa cập nhật'}</div>
                      <div className="col-span-2"><span className="font-semibold text-gray-700">Số điện thoại phụ huynh:</span> {selectedStudent.parentPhone || 'Chưa cung cấp'}</div>
                      <div className="col-span-2 flex gap-6 mt-1 bg-gray-50 p-2 rounded border border-gray-100">
                        <div><span className="font-semibold">Điểm rèn luyện ròng:</span> <span className={`font-bold ${stats.totalDeductions < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{stats.totalDeductions}đ</span></div>
                        <div><span className="font-semibold">Số lỗi nề nếp:</span> <span className="font-bold text-amber-600">{stats.violationsCount}</span></div>
                        <div><span className="font-semibold">Nhiệm vụ hoàn thành:</span> <span className="font-bold text-blue-600">{stats.completedTasks} / {stats.taskList.length}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Violation log */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold uppercase border-b border-black pb-0.5 mb-2 tracking-wider">2. CHI TIẾT CÁC LỖI KỶ LUẬT & NỀ NẾP</h4>
                    {stats.history.length === 0 ? (
                      <p className="text-[11px] italic text-gray-500 pl-2">Học sinh không ghi nhận vi phạm nề nếp nào trong thời gian học tập rèn luyện.</p>
                    ) : (
                      <table className="w-full text-[10px] border-collapse border border-black text-left">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center w-[35px] font-bold">STT</th>
                            <th className="border border-black p-1 text-center w-[85px] font-bold">Ngày vi phạm</th>
                            <th className="border border-black p-1 w-[140px] font-bold">Lỗi vi phạm</th>
                            <th className="border border-black p-1 font-bold">Lý do / Chi tiết lỗi</th>
                            <th className="border border-black p-1 w-[220px] font-bold">Hướng giải quyết / Biện pháp giáo dục</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                          {stats.history.map((h, idx) => (
                            <tr key={h.id} className="align-top">
                              <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                              <td className="border border-black p-1.5 text-center">{h.date.split('-').reverse().join('/')}</td>
                              <td className="border border-black p-1.5 font-bold text-red-700">{h.type} <span className="text-[9px] text-gray-500 font-normal">({h.points}đ)</span></td>
                              <td className="border border-black p-1.5 text-gray-800 italic leading-snug">{h.note || 'Không có lý do chi tiết.'}</td>
                              <td className="border border-black p-1.5 text-gray-700 leading-snug">{h.resolution || getResolution(h.type)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 3: Tasks log */}
                  <div className="mb-6">
                    <h4 className="text-[12px] font-bold uppercase border-b border-black pb-0.5 mb-2 tracking-wider">3. NHIỆM VỤ ĐƯỢC GIAO VÀ KẾT QUẢ THỰC HIỆN</h4>
                    {stats.taskList.length === 0 ? (
                      <p className="text-[11px] italic text-gray-500 pl-2">Học sinh chưa được giao nhiệm vụ bổ sung hoặc đặc biệt nào.</p>
                    ) : (
                      <table className="w-full text-[10px] border-collapse border border-black text-left">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-black p-1 text-center w-[35px] font-bold">STT</th>
                            <th className="border border-black p-1 w-[150px] font-bold">Tên nhiệm vụ</th>
                            <th className="border border-black p-1 font-bold">Nội dung công việc</th>
                            <th className="border border-black p-1 text-center w-[85px] font-bold">Hạn nộp</th>
                            <th className="border border-black p-1 text-center w-[90px] font-bold">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                          {stats.taskList.map((t, idx) => (
                            <tr key={t.id} className="align-top">
                              <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                              <td className="border border-black p-1.5 font-bold text-gray-800">{t.taskTitle}</td>
                              <td className="border border-black p-1.5 text-gray-600 leading-snug">
                                {t.description || 'Không có mô tả chi tiết.'}
                                {t.feedback && (
                                  <div className="mt-1 text-[9px] text-amber-800 bg-amber-50 p-1 rounded border border-amber-100 font-normal">
                                    <b>GV Phản hồi:</b> {t.feedback}
                                  </div>
                                )}
                              </td>
                              <td className="border border-black p-1.5 text-center">{t.deadline.split('-').reverse().join('/')}</td>
                              <td className="border border-black p-1.5 text-center">
                                <span className={`font-bold text-[8px] px-1.5 py-0.5 rounded border ${
                                  t.status === 'Đã hoàn thành' 
                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                                    : t.status === 'Đang thực hiện'
                                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                                      : 'text-rose-700 bg-rose-50 border-rose-200'
                                }`}>
                                  {t.status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Section 4: Teacher Remarks */}
                  <div className="mb-10">
                    <h4 className="text-[12px] font-bold uppercase border-b border-black pb-0.5 mb-2 tracking-wider">4. ĐÁNH GIÁ CHUNG VÀ NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM</h4>
                    <div className="border border-black p-2.5 rounded bg-gray-50 min-h-[70px] text-[11px] whitespace-pre-wrap leading-relaxed italic">
                      {teacherComment}
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-semibold mt-10 leading-relaxed">
                    <div>
                      <p className="uppercase font-bold mb-14">HỌC SINH</p>
                      <p className="italic text-gray-400 text-[9px] mb-0.5 font-normal">(Ký và ghi rõ họ tên)</p>
                      <p className="font-bold text-gray-800">{selectedStudent.name}</p>
                    </div>
                    <div>
                      <p className="uppercase font-bold mb-14">ĐẠI DIỆN GIA ĐÌNH</p>
                      <p className="italic text-gray-400 text-[9px] mb-0.5 font-normal">(Ký và ghi rõ họ tên)</p>
                      <p className="font-bold text-gray-800">........................................</p>
                    </div>
                    <div>
                      <p className="italic text-gray-500 mb-0.5 text-[9px] font-normal">{formatReportFooterDate(reportDate)}</p>
                      <p className="uppercase font-bold mb-14">GIÁO VIÊN CHỦ NHIỆM</p>
                      <p className="italic text-gray-400 text-[9px] mb-0.5 font-normal">(Ký và ghi rõ họ tên)</p>
                      <p className="font-bold text-gray-800">........................................</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Class Transfer Modal */}
      {isTransferring && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div 
            className="rounded-3xl border border-white/10 shadow-2xl max-w-md w-full p-6 space-y-4"
            style={{ backgroundColor: '#0f172a', color: '#ffffff' }}
          >
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: '#ffffff' }}>
                <ArrowRightLeft size={16} className="text-amber-500" /> Chuyển lớp học sinh
              </h3>
              <button 
                onClick={() => setIsTransferring(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs leading-relaxed" style={{ color: '#cbd5e1' }}>
                Khi chuyển lớp, danh sách của lớp hiện tại <span className="text-emerald-400 font-semibold">vẫn không đổi</span>. Bản ghi vi phạm và nhiệm vụ cũ sẽ được lưu giữ nguyên vẹn tại lớp cũ. Hệ thống sẽ cập nhật trạng thái ở lớp cũ và tự động tạo mới một hồ sơ học sinh ở lớp mới.
              </p>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-1">
                <div>
                  <span style={{ color: '#94a3b8' }}>Học sinh:</span> <span className="font-medium" style={{ color: '#ffffff' }}>{selectedStudent.name} ({selectedStudent.id})</span>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Lớp hiện tại:</span>{' '}
                  <span className="font-medium" style={{ color: '#ffffff' }}>
                    {classes.find(c => c.id === selectedStudent.classId)?.name || selectedStudent.className || 'Chưa phân lớp'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: '#94a3b8' }}>Trạng thái mới ở lớp hiện tại</label>
                <select
                  value={transferCurrentStatus}
                  onChange={(e) => setTransferCurrentStatus(e.target.value as any)}
                  className="w-full text-xs bg-slate-800 border border-white/10 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-medium"
                  style={{ color: '#ffffff', backgroundColor: '#1e293b' }}
                >
                  <option value="Lên lớp" className="bg-[#1e293b] text-white">Lên lớp (Đã tốt nghiệp/Ra lớp)</option>
                  <option value="Chuyển lớp" className="bg-[#1e293b] text-white">Chuyển lớp khác</option>
                  <option value="Nghỉ học" className="bg-[#1e293b] text-white">Nghỉ học</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block font-sans" style={{ color: '#94a3b8' }}>Chọn lớp chuyển đến (Tạo hồ sơ mới ở lớp này)</label>
                <select
                  value={transferClassId}
                  onChange={(e) => setTransferClassId(e.target.value)}
                  className="w-full text-xs bg-slate-800 border border-white/10 text-white rounded-xl p-2.5 focus:outline-none focus:border-amber-500 font-medium"
                  style={{ color: '#ffffff', backgroundColor: '#1e293b' }}
                >
                  <option value="" disabled className="bg-[#1e293b] text-white">Chọn lớp học...</option>
                  {classes.map(c => {
                    const year = schoolYears.find(y => y.id === c.schoolYearId);
                    return (
                      <option key={c.id} value={c.id} className="bg-[#1e293b] text-white">
                        {c.name} {year ? `(${year.name})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsTransferring(false)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white transition border border-white/10 rounded-xl text-xs font-semibold"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleTransferClass}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        type="danger"
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />

      {/* CSV Import Modal */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] rounded-3xl border border-white/10 shadow-2xl max-w-2xl w-full p-6 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Upload size={16} className="text-amber-500" /> Nhập học sinh từ tệp CSV
              </h3>
              <button 
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setParsedCsvStudents([]);
                  setCsvParseError(null);
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar">
              {parsedCsvStudents.length === 0 ? (
                <>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2 text-white/80">
                    <p className="font-semibold text-amber-500">⚠️ Hướng dẫn định dạng tệp CSV:</p>
                    <ul className="list-disc list-inside space-y-1 text-white/70">
                      <li>Tệp CSV nên được mã hóa chuẩn <strong className="text-amber-500">UTF-8</strong> để không bị lỗi chữ tiếng Việt có dấu.</li>
                      <li>Hệ thống tự động phát hiện cột dựa trên tiêu đề: <strong className="text-amber-500">Mã học sinh (Mã HS), Họ và Tên, Giới tính, Ngày sinh, SĐT Phụ huynh, Địa chỉ, Họ tên bố, Nghề nghiệp bố, Họ tên mẹ, Nghề nghiệp mẹ</strong>.</li>
                      <li>Nếu không có dòng tiêu đề hoặc cột <strong className="text-amber-500">Mã học sinh</strong> trống, hệ thống sẽ tự động tạo mã tăng dần (VD: HS001, HS002...).</li>
                      <li>Định dạng ngày sinh chuẩn: <strong className="text-amber-500">YYYY-MM-DD</strong> hoặc <strong className="text-amber-500">DD/MM/YYYY</strong>.</li>
                    </ul>
                  </div>

                  <div 
                    onClick={() => csvInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-amber-500/50 transition cursor-pointer relative group bg-white/5"
                  >
                    <input 
                      ref={csvInputRef}
                      type="file" 
                      accept=".csv" 
                      onChange={handleCsvFileChange} 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                    />
                    <Upload className="mx-auto text-amber-500/60 mb-2 group-hover:scale-110 transition duration-200" size={32} />
                    <p className="text-xs font-semibold text-white">Kéo thả hoặc nhấp để chọn tệp .CSV</p>
                    <p className="text-[10px] text-white/40 mt-1">Hỗ trợ ngăn cách bởi dấu phẩy (,) hoặc chấm phẩy (;)</p>
                  </div>

                  {csvParseError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-xl text-xs font-medium">
                      {csvParseError}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                    <span className="text-xs text-emerald-500 font-semibold">
                      ✓ Đã phân tích thành công {parsedCsvStudents.length} học sinh. Vui lòng kiểm tra lại trước khi lưu:
                    </span>
                    <button
                      onClick={() => setParsedCsvStudents([])}
                      className="text-xs text-white/50 hover:text-white underline font-semibold"
                    >
                      Chọn tệp khác
                    </button>
                  </div>

                  <div className="border border-white/10 rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="max-h-[280px] overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-white/5 text-white/60 uppercase text-[9px] tracking-wider border-b border-white/10">
                            <th className="p-2.5">Mã HS</th>
                            <th className="p-2.5">Họ và Tên</th>
                            <th className="p-2.5">Giới tính</th>
                            <th className="p-2.5">Ngày sinh</th>
                            <th className="p-2.5">SĐT Phụ huynh</th>
                            <th className="p-2.5">Địa chỉ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                          {parsedCsvStudents.map((stud, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] text-white/80">
                              <td className="p-2.5 font-mono text-amber-500 font-semibold">{stud.id || '(Tự động)'}</td>
                              <td className="p-2.5 font-semibold text-white">{stud.name}</td>
                              <td className="p-2.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  stud.gender === 'Nữ' ? 'bg-pink-500/10 text-pink-600' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                  {stud.gender}
                                </span>
                              </td>
                              <td className="p-2.5 font-mono">{stud.dob.split('-').reverse().join('/')}</td>
                              <td className="p-2.5 font-mono">{stud.parentPhone || '-'}</td>
                              <td className="p-2.5 truncate max-w-[150px]" title={stud.address}>{stud.address || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-3 border-t border-white/10 mt-auto">
              <button
                type="button"
                onClick={() => {
                  setIsCsvModalOpen(false);
                  setParsedCsvStudents([]);
                  setCsvParseError(null);
                }}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 rounded-xl text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              {parsedCsvStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Nhập {parsedCsvStudents.length} học sinh
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Class Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] rounded-3xl border border-white/10 shadow-2xl max-w-6xl w-full h-[90vh] flex flex-col overflow-hidden text-white">
            
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="text-amber-500" size={20} />
                <h3 className="text-base font-extrabold uppercase tracking-wider text-white">
                  Chuyển lớp & Thăng cấp học sinh hàng loạt
                </h3>
              </div>
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Split Content */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 p-5 overflow-hidden min-h-0">
              
              {/* Left Column (Source / Old Class) */}
              <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl p-4 overflow-hidden h-full min-h-0">
                
                {/* selectors */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/40 mb-1 block">Niên khóa cũ</label>
                    <select
                      value={transferSrcYearId}
                      onChange={(e) => {
                        const yearId = e.target.value;
                        setTransferSrcYearId(yearId);
                        const firstClass = classes.find(c => c.schoolYearId === yearId);
                        setTransferSrcClassId(firstClass?.id || '');
                        setLeftCheckedIds([]);
                      }}
                      className="w-full text-xs rounded-xl p-2 focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {schoolYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/40 mb-1 block">Lớp cũ</label>
                    <select
                      value={transferSrcClassId}
                      onChange={(e) => {
                        setTransferSrcClassId(e.target.value);
                        setLeftCheckedIds([]);
                      }}
                      className="w-full text-xs rounded-xl p-2 focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="">-- Lớp nguồn --</option>
                      {classes.filter(c => c.schoolYearId === transferSrcYearId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* List Header */}
                {(() => {
                  const leftClassStudents = sortStudentsAlphabetically((allStudents.length > 0 ? allStudents : students)
                    .filter(s => s.classId === transferSrcClassId));
                  const selectedCount = leftCheckedIds.filter(key => leftClassStudents.some(s => `${s.id}-${s.name}` === key)).length;
                  const allSelected = leftClassStudents.length > 0 && selectedCount === leftClassStudents.length;

                  return (
                    <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white/80">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => handleLeftSelectAll(leftClassStudents)}
                          className="rounded border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-transparent"
                        />
                        <span>Chọn tất cả ({leftClassStudents.length})</span>
                      </label>
                      {selectedCount > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold font-mono">
                          Đã chọn: {selectedCount}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Scrollable Student List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 mt-3 pr-1 custom-scrollbar min-h-0">
                  {(() => {
                    const leftClassStudents = sortStudentsAlphabetically((allStudents.length > 0 ? allStudents : students)
                      .filter(s => s.classId === transferSrcClassId));

                    if (leftClassStudents.length === 0) {
                      return (
                        <div className="text-center py-12 text-white/25 text-xs italic">
                          Không có học sinh nào ở lớp này.
                        </div>
                      );
                    }

                    return leftClassStudents.map(s => {
                      const studentKey = `${s.id}-${s.name}`;
                      const isChecked = leftCheckedIds.includes(studentKey);
                      return (
                        <div
                          key={studentKey}
                          onClick={() => handleToggleLeftCheckbox(studentKey)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                            isChecked
                              ? 'border-amber-500/80 bg-amber-500/10 shadow-sm'
                              : 'border-white/10 hover:border-amber-500/30 bg-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleLeftCheckbox(studentKey);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-transparent shrink-0"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">{s.name}</span>
                              <span className="text-[9px] text-white/40 font-mono">ID: {s.id} • {s.gender}</span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            s.status === 'Đang học'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Center Arrows */}
              <div className="flex md:flex-col items-center justify-center gap-4 py-3 md:py-0 shrink-0 px-2">
                <button
                  onClick={handleTransferSelectedRight}
                  className="w-16 h-12 flex flex-col items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-lg hover:scale-105 transition active:scale-95 duration-200 border border-amber-500/20 shrink-0"
                  title="Chuyển học sinh được chọn qua lớp đích"
                >
                  <ArrowRight size={20} className="stroke-[2.5]" />
                  <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5">CHUYỂN</span>
                </button>
                <button
                  onClick={handleTransferSelectedLeft}
                  className="w-16 h-12 flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 rounded-xl shadow-lg hover:scale-105 transition active:scale-95 duration-200 shrink-0"
                  title="Hoàn trả học sinh được chọn về lớp cũ"
                >
                  <ArrowLeft size={20} className="stroke-[2.5]" />
                  <span className="text-[8px] font-extrabold uppercase tracking-wider mt-0.5">TRẢ VỀ</span>
                </button>
                <div className="hidden md:block text-center max-w-[120px] text-[10px] text-white/30 leading-relaxed font-sans">
                  Chọn ô rồi nhấn nút để chuyển/trả
                </div>
              </div>

              {/* Right Column (Destination / New Class) */}
              <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl p-4 overflow-hidden h-full min-h-0">
                
                {/* selectors */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/40 mb-1 block">Niên khóa mới</label>
                    <select
                      value={transferDestYearId}
                      onChange={(e) => {
                        const yearId = e.target.value;
                        setTransferDestYearId(yearId);
                        const firstClass = classes.find(c => c.schoolYearId === yearId && c.id !== transferSrcClassId);
                        setTransferDestClassId(firstClass?.id || '');
                        setRightCheckedIds([]);
                      }}
                      className="w-full text-xs rounded-xl p-2 focus:outline-none focus:border-amber-500 font-bold"
                    >
                      {schoolYears.map(y => (
                        <option key={y.id} value={y.id}>{y.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] uppercase tracking-wider text-white/40 mb-1 block">Lớp đích</label>
                    <select
                      value={transferDestClassId}
                      onChange={(e) => {
                        setTransferDestClassId(e.target.value);
                        setRightCheckedIds([]);
                      }}
                      className="w-full text-xs rounded-xl p-2 focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="">-- Lớp đích --</option>
                      {classes.filter(c => c.schoolYearId === transferDestYearId).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* List Header */}
                {(() => {
                  const rightClassStudents = sortStudentsAlphabetically((allStudents.length > 0 ? allStudents : students)
                    .filter(s => s.classId === transferDestClassId));
                  const selectedCount = rightCheckedIds.filter(key => rightClassStudents.some(s => `${s.id}-${s.name}` === key)).length;
                  const allSelected = rightClassStudents.length > 0 && selectedCount === rightClassStudents.length;

                  return (
                    <div className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2 shrink-0">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white/80">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => handleRightSelectAll(rightClassStudents)}
                          className="rounded border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-transparent"
                        />
                        <span>Chọn tất cả ({rightClassStudents.length})</span>
                      </label>
                      {selectedCount > 0 && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-bold font-mono">
                          Đã chọn: {selectedCount}
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Scrollable Student List */}
                <div className="flex-1 overflow-y-auto space-y-1.5 mt-3 pr-1 custom-scrollbar min-h-0">
                  {(() => {
                    const rightClassStudents = sortStudentsAlphabetically((allStudents.length > 0 ? allStudents : students)
                      .filter(s => s.classId === transferDestClassId));

                    if (rightClassStudents.length === 0) {
                      return (
                        <div className="text-center py-12 text-white/25 text-xs italic">
                          Không có học sinh nào ở lớp này.
                        </div>
                      );
                    }

                    return rightClassStudents.map(s => {
                      const studentKey = `${s.id}-${s.name}`;
                      const isChecked = rightCheckedIds.includes(studentKey);
                      return (
                        <div
                          key={studentKey}
                          onClick={() => handleToggleRightCheckbox(studentKey)}
                          className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                            isChecked
                              ? 'border-amber-500/80 bg-amber-500/10 shadow-sm'
                              : 'border-white/10 hover:border-amber-500/30 bg-white shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleRightCheckbox(studentKey);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-white/20 text-amber-500 focus:ring-amber-500 w-4 h-4 bg-transparent shrink-0"
                            />
                            <div>
                              <span className="text-xs font-semibold text-white block">{s.name}</span>
                              <span className="text-[9px] text-white/40 font-mono">ID: {s.id} • {s.gender}</span>
                            </div>
                          </div>

                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                            s.status === 'Đang học'
                              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          }`}>
                            {s.status}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 shrink-0 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/5 rounded-xl text-xs font-bold transition duration-200"
              >
                Đóng lại
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

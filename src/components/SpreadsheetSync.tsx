/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { SheetSyncConfig, Student, ViolationRecord, WeeklyPlan, StudentTask } from '../types';
import { Database, RefreshCw, ArrowUpCircle, ArrowDownCircle, FileSpreadsheet, Lock, HelpCircle, Download, CheckCircle2, AlertTriangle, Key, LogIn, LogOut } from 'lucide-react';
import { studentsToRows, violationsToRows, plansToRows, tasksToRows } from '../services/sheetsService';
import { CustomConfirmModal } from './CustomConfirmModal';
import { auth, googleSignIn, logout as authLogout, onTokenChange } from '../services/authService';
import { User } from 'firebase/auth';

interface SpreadsheetSyncProps {
  config: SheetSyncConfig;
  onUpdateConfig: (newConfig: SheetSyncConfig) => void;
  onPushToSheets: () => Promise<void>;
  onFetchFromSheets: () => Promise<void>;
  onCreateNewSheet: () => Promise<string>;
  students: Student[];
  violations: ViolationRecord[];
  plans: WeeklyPlan[];
  tasks: StudentTask[];
  onImportCSVData: (type: 'students' | 'violations' | 'plans' | 'tasks', rows: string[][]) => void;
}

export default function SpreadsheetSync({
  config,
  onUpdateConfig,
  onPushToSheets,
  onFetchFromSheets,
  onCreateNewSheet,
  students,
  violations,
  plans,
  tasks,
  onImportCSVData
}: SpreadsheetSyncProps) {
  const [activeSheetTab, setActiveSheetTab] = useState<'students' | 'violations' | 'plans' | 'tasks'>('students');
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(config.spreadsheetId);
  const [accessTokenInput, setAccessTokenInput] = useState(config.accessToken);
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [syncMessage, setSyncMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [showGuide, setShowGuide] = useState(false); // Default collapse since we have single-click login now!
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
  } | null>(null);

  const [customClientIdInput, setCustomClientIdInput] = useState(config.customClientId || '');
  const [customUserEmail, setCustomUserEmail] = useState(() => localStorage.getItem('app_custom_oauth_email') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [imageFolderIdInput, setImageFolderIdInput] = useState(config.imageFolderId || '');

  // Check hash on mount for OAuth redirect callback
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const token = params.get('access_token');
      if (token) {
        if (window.opener) {
          window.opener.postMessage({ type: 'GOOGLE_OAUTH_TOKEN', token }, '*');
          window.close();
        } else {
          setAccessTokenInput(token);
          onUpdateConfig({
            ...config,
            accessToken: token,
            useLocalStorage: !spreadsheetIdInput.trim()
          });
          // Clear URL hash cleanly
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }
    }
  }, []);

  // Listen to popup message event for custom OAuth
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'GOOGLE_OAUTH_TOKEN') {
        const token = event.data.token;
        setAccessTokenInput(token);
        setIsAuthLoading(true);

        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(userInfo => {
          const email = userInfo.email || 'Giáo viên khác';
          setCustomUserEmail(email);
          localStorage.setItem('app_custom_oauth_email', email);
          setSyncMessage({ text: `Đã kết nối thành công qua Google OAuth (Client ID riêng)! Email: ${email}`, isError: false });
          onUpdateConfig({
            ...config,
            accessToken: token,
            useLocalStorage: !spreadsheetIdInput.trim(),
            customClientId: customClientIdInput.trim()
          });
        })
        .catch(() => {
          setSyncMessage({ text: `Đã kết nối thành công với Client ID riêng!`, isError: false });
          onUpdateConfig({
            ...config,
            accessToken: token,
            useLocalStorage: !spreadsheetIdInput.trim(),
            customClientId: customClientIdInput.trim()
          });
        })
        .finally(() => {
          setIsAuthLoading(false);
        });
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [config, spreadsheetIdInput, customClientIdInput]);

  // Keep local inputs in sync with parent config props when they change (e.g. on load or creation)
  useEffect(() => {
    setSpreadsheetIdInput(config.spreadsheetId);
  }, [config.spreadsheetId]);

  useEffect(() => {
    setAccessTokenInput(config.accessToken);
  }, [config.accessToken]);

  useEffect(() => {
    setImageFolderIdInput(config.imageFolderId || '');
  }, [config.imageFolderId]);

  useEffect(() => {
    // Listen to Firebase Authentication status
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    // Listen to token updates
    const unsubscribeToken = onTokenChange((token) => {
      if (token && !customUserEmail) { // Only overwrite if not using custom client flow
        setAccessTokenInput(token);
        // Sync parent configuration immediately
        onUpdateConfig({
          ...config,
          accessToken: token,
          useLocalStorage: !config.spreadsheetId
        });
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeToken();
    };
  }, [customUserEmail]);

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setSyncMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setAccessTokenInput(result.accessToken);
        onUpdateConfig({
          ...config,
          accessToken: result.accessToken,
          useLocalStorage: !spreadsheetIdInput.trim()
        });
        setSyncMessage({ text: `Đã kết nối tự động với tài khoản Google: ${result.user.email}!`, isError: false });
      }
    } catch (err: any) {
      setSyncMessage({ text: `Không thể kết nối Google: ${err.message || err}`, isError: true });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    setIsAuthLoading(true);
    try {
      await authLogout();
      setAccessTokenInput('');
      onUpdateConfig({
        ...config,
        accessToken: '',
        useLocalStorage: true
      });
      setSyncMessage({ text: 'Đã ngắt kết nối tài khoản Google.', isError: false });
    } catch (err: any) {
      setSyncMessage({ text: `Lỗi đăng xuất: ${err.message || err}`, isError: true });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleCustomClientSignIn = () => {
    const clientId = customClientIdInput.trim();
    if (!clientId) {
      setSyncMessage({ text: 'Vui lòng nhập Google Client ID riêng trước khi kết nối.', isError: true });
      return;
    }
    
    setIsAuthLoading(true);
    setSyncMessage(null);

    // Save custom Client ID in config
    onUpdateConfig({
      ...config,
      customClientId: clientId
    });

    const redirectUri = window.location.origin;
    const scopes = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email';
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes)}&state=custom_oauth&prompt=select_account`;

    const width = 550;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const authWindow = window.open(
      oauthUrl,
      'google_custom_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (!authWindow) {
      setSyncMessage({ text: 'Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng cho phép popup để đăng nhập bằng Google.', isError: true });
      setIsAuthLoading(false);
    } else {
      // Periodic status check
      const timer = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(timer);
          setIsAuthLoading(false);
        }
      }, 1000);
    }
  };

  const handleCustomClientSignOut = () => {
    setCustomUserEmail('');
    localStorage.removeItem('app_custom_oauth_email');
    setAccessTokenInput('');
    onUpdateConfig({
      ...config,
      accessToken: '',
      useLocalStorage: true
    });
    setSyncMessage({ text: 'Đã ngắt kết nối tài khoản Google khỏi Client ID riêng.', isError: false });
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      spreadsheetId: spreadsheetIdInput.trim(),
      accessToken: accessTokenInput.trim(),
      imageFolderId: imageFolderIdInput.trim(),
      useLocalStorage: !spreadsheetIdInput.trim() // Offline if empty
    });
    setSyncMessage({ text: 'Cấu hình kết nối Google Sheets & Google Drive đã được ghi nhận!', isError: false });
  };

  const executePush = async () => {
    setIsLoading(true);
    setSyncMessage(null);
    try {
      await onPushToSheets();
      setSyncMessage({ text: `Đồng bộ dữ liệu lên Google Sheets thành công lúc ${new Date().toLocaleTimeString()}!`, isError: false });
    } catch (e: any) {
      setSyncMessage({ text: `Lỗi đồng bộ lên Sheets: ${e.message || e}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePush = () => {
    if (!config.spreadsheetId) {
      setSyncMessage({ text: 'Vui lòng điền hoặc tạo mới một Spreadsheet ID trước khi đồng bộ.', isError: true });
      return;
    }
    setConfirmModal({
      title: 'Xác nhận đồng bộ lên đám mây',
      message: 'CẢNH BÁO: Hành động này sẽ GHI ĐÈ toàn bộ dòng dữ liệu trên các bảng tính Google Sheets ("HocSinh", "ViPham_ChuyenCan", "KeHoachTuan", "NhiemVu_BaoCao", "DanhMucViPham") bằng dữ liệu hiện tại trong ứng dụng này. Bạn có đồng ý thực hiện không?',
      type: 'warning',
      onConfirm: () => {
        setConfirmModal(null);
        executePush();
      }
    });
  };

  const executeFetch = async () => {
    setIsLoading(true);
    setSyncMessage(null);
    try {
      await onFetchFromSheets();
      setSyncMessage({ text: `Tải và cập nhật dữ liệu từ Google Sheets thành công lúc ${new Date().toLocaleTimeString()}!`, isError: false });
    } catch (e: any) {
      setSyncMessage({ text: `Lỗi tải dữ liệu: ${e.message || e}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFetch = () => {
    if (!config.spreadsheetId) {
      setSyncMessage({ text: 'Vui lòng cấu hình Spreadsheet ID trước khi đồng bộ.', isError: true });
      return;
    }
    setConfirmModal({
      title: 'Tải dữ liệu từ đám mây',
      message: 'Hành động này sẽ TẢI VỀ và đồng bộ dữ liệu từ Google Sheets về máy, cập nhật toàn bộ thông tin học sinh hiện tại. Tiếp tục?',
      type: 'info',
      onConfirm: () => {
        setConfirmModal(null);
        executeFetch();
      }
    });
  };

  const handleCreateNewSheet = async () => {
    if (!accessTokenInput.trim()) {
      setSyncMessage({ text: 'Vui lòng nhập Google OAuth Access Token để tạo mới tệp.', isError: true });
      return;
    }
    setIsLoading(true);
    setSyncMessage(null);
    try {
      // Temporarily update token
      onUpdateConfig({ ...config, accessToken: accessTokenInput.trim() });
      const newId = await onCreateNewSheet();
      setSpreadsheetIdInput(newId);
      setSyncMessage({ text: 'Đã tạo thành công Google Sheets mới trong Drive của bạn với đầy đủ các bảng tách biệt và tự động điền ID!', isError: false });
    } catch (e: any) {
      setSyncMessage({ text: `Lỗi tạo file mới: ${e.message || e}`, isError: true });
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Generator/Exporter
  const downloadCSV = (tab: 'students' | 'violations' | 'plans' | 'tasks') => {
    let rows: string[][] = [];
    let filename = '';
    if (tab === 'students') {
      rows = studentsToRows(students);
      filename = 'DanhSachHocSinh.csv';
    } else if (tab === 'violations') {
      rows = violationsToRows(violations);
      filename = 'NhatKyViPhamChuyenCan.csv';
    } else if (tab === 'plans') {
      rows = plansToRows(plans);
      filename = 'KeHoachTuanGiaoVien.csv';
    } else if (tab === 'tasks') {
      rows = tasksToRows(tasks);
      filename = 'BangNhiemVuHocSinh.csv';
    }

    const csvContent = "\uFEFF" + rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Extract current preview rows
  const getPreviewRows = (): string[][] => {
    if (activeSheetTab === 'students') return studentsToRows(students);
    if (activeSheetTab === 'violations') return violationsToRows(violations);
    if (activeSheetTab === 'plans') return plansToRows(plans);
    return tasksToRows(tasks);
  };

  const previewRows = getPreviewRows();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="spreadsheet-sync-section">
      {/* Configuration Column */}
      <div className="xl:col-span-4 flex flex-col gap-5">
        {/* Connection Setup */}
        <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Database size={16} className="text-amber-500" /> Kết nối Google Sheets
          </h3>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Google Spreadsheet ID</label>
              <input
                id="sync-spreadsheet-id-input"
                type="text"
                placeholder="Nhập ID từ URL của Google Sheet..."
                value={spreadsheetIdInput}
                onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[9px] text-white/30 mt-1 block leading-normal">
                VD: https://docs.google.com/spreadsheets/d/<b className="text-white/50">[SPREADSHEET_ID]</b>/edit
              </span>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1.5 block">Mã thư mục lưu ảnh chân dung (Google Drive Folder ID - Tùy chọn)</label>
              <input
                id="sync-image-folder-id-input"
                type="text"
                placeholder="Nhập ID thư mục Google Drive để chứa ảnh chân dung..."
                value={imageFolderIdInput}
                onChange={(e) => setImageFolderIdInput(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[9px] text-white/30 mt-1 block leading-normal">
                Ảnh chân dung sẽ được lưu vào thư mục này thay vì lưu tại thư mục gốc của Google Drive.
              </span>
            </div>

            {/* Google Authentication Status or Action */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-white/40 block flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Key size={12} className="text-amber-500" /> Tài khoản Google Drive & Sheets
                </span>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-[9px] text-amber-500 hover:underline font-bold transition-all duration-150"
                >
                  {showAdvanced ? 'Dùng kết nối mẫu 🗲' : 'Dùng Client ID riêng ⚙'}
                </button>
              </label>

              {!showAdvanced ? (
                /* Sandbox flow */
                currentUser ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-emerald-400">Đã liên kết (Mẫu Sandbox)</div>
                        <div className="text-[10px] text-white/50 font-mono truncate" title={currentUser.email || ''}>
                          {currentUser.email}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      disabled={isAuthLoading}
                      className="text-[10px] font-bold text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 px-2.5 py-1.5 rounded-xl transition shrink-0"
                    >
                      Ngắt kết nối
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isAuthLoading}
                      className="w-full py-2.5 px-4 bg-white hover:bg-white/90 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-2.5 shadow-md active:scale-95 duration-100 cursor-pointer"
                    >
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                      {isAuthLoading ? 'Đang kết nối...' : 'Kết nối tự động bằng Google'}
                    </button>
                    <p className="text-[9.5px] text-white/40 leading-normal text-center bg-white/[0.02] border border-white/5 p-2.5 rounded-xl">
                      ⚠️ <b>Lưu ý chia sẻ:</b> Kết nối mẫu ở trên chỉ dành cho tài khoản nhà phát triển. Khi chia sẻ cho giáo viên khác, họ sẽ bị lỗi <span className="text-amber-500 font-semibold">403: access_denied</span>. Hãy bấm nút <span className="text-amber-500">"Dùng Client ID riêng"</span> ở trên để thiết lập hệ thống tự do chia sẻ cho bất kỳ ai!
                    </p>
                  </div>
                )
              ) : (
                /* Custom Client ID flow */
                <div className="space-y-3 bg-amber-500/[0.02] border border-amber-500/10 p-4 rounded-2xl">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80 block mb-1">Mã Google OAuth Client ID của bạn</label>
                    <input
                      type="text"
                      placeholder="Nhập Client ID của bạn (.apps.googleusercontent.com)..."
                      value={customClientIdInput}
                      onChange={(e) => setCustomClientIdInput(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {customUserEmail ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-emerald-400">Đã liên kết (Client ID riêng)</div>
                        <div className="text-[10px] text-white/50 truncate font-mono">{customUserEmail}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCustomClientSignOut}
                        className="text-[9px] font-bold text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-500/10 border border-rose-500/10 shrink-0"
                      >
                        Đổi tài khoản
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCustomClientSignIn}
                      disabled={isAuthLoading || !customClientIdInput.trim()}
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isAuthLoading ? 'Đang kết nối...' : 'Đăng nhập bằng Client ID riêng'}
                    </button>
                  )}

                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 space-y-1.5 text-[9.5px] leading-relaxed text-white/50">
                     <p className="font-bold text-amber-500 text-[10px] flex items-center gap-1">🛠️ Cách tự tạo Google Client ID miễn phí (2 phút):</p>
                     <ol className="list-decimal pl-4 space-y-1.5">
                       <li>Truy cập trang quản lý <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Google Cloud Console</a> bằng tài khoản Gmail của bạn.</li>
                       <li>Tạo một dự án mới (bấm danh sách dự án ở trên cùng bên trái &gt; chọn <b>New Project</b>).</li>
                       <li>Tìm mục <b>APIs & Services</b> &gt; <b>OAuth consent screen</b>. Chọn <b>External</b>, điền tên app, email của bạn rồi bấm Save.</li>
                       <li>Chuyển qua mục <b>Credentials</b> &gt; Bấm <b>Create Credentials</b> &gt; Chọn <b>OAuth client ID</b>.</li>
                       <li>Chọn Application type là <b>Web application</b>.</li>
                       <li>Tại mục <b>Authorized JavaScript origins</b>, thêm URL ứng dụng của bạn: <code className="bg-white/5 px-1 py-0.5 rounded text-white font-mono break-all">{window.location.origin}</code></li>
                       <li>Bấm <b>Create</b> và sao chép mã <b>Client ID</b> dài dán vào ô bên trên!</li>
                     </ol>
                     <p className="text-[9px] text-amber-500/80 italic mt-1 leading-normal">
                       * Với Client ID riêng của bạn, bất kỳ giáo viên nào cũng đăng nhập và tạo file Sheets riêng của họ được, hoàn toàn bỏ qua mọi giới hạn Sandbox!
                     </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-2.5">
              <details className="group">
                <summary className="text-[10px] font-bold text-white/40 hover:text-white/60 cursor-pointer list-none flex items-center gap-1 select-none">
                  <span className="transition-transform duration-150 group-open:rotate-90">▶</span>
                  Xem / Nhập mã Access Token thủ công
                </summary>
                <div className="space-y-2 mt-2 pt-1">
                  <input
                    id="sync-access-token-input"
                    type="password"
                    placeholder="ya29.a0..."
                    value={accessTokenInput}
                    onChange={(e) => setAccessTokenInput(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <span className="text-[9px] text-white/30 block leading-normal">
                    Mã Token tự động điền khi bạn đăng nhập ở trên. Nếu muốn dùng mã riêng, hãy dán trực tiếp vào đây.
                  </span>
                </div>
              </details>
            </div>

            <div className="flex gap-2">
              <button
                id="sync-save-btn"
                type="submit"
                className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition"
              >
                Ghi nhớ kết nối
              </button>
              <button
                id="sync-create-new-btn"
                type="button"
                onClick={handleCreateNewSheet}
                disabled={isLoading}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-black rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
              >
                <FileSpreadsheet size={14} /> Tạo mới bảng
              </button>
            </div>
          </form>
        </div>

        {/* Sync Controls Panel */}
        <div className="bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">Đồng bộ đám mây</h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              id="btn-sheets-push"
              onClick={handlePush}
              disabled={isLoading || !config.spreadsheetId}
              className="flex flex-col items-center justify-center p-4 bg-amber-500/[0.03] hover:bg-amber-500/[0.08] text-amber-400 rounded-2xl border border-amber-500/10 transition gap-2 font-semibold text-xs disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowUpCircle size={24} className="text-amber-500" />
              Đồng bộ LÊN mây
            </button>
            <button
              id="btn-sheets-fetch"
              onClick={handleFetch}
              disabled={isLoading || !config.spreadsheetId}
              className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 text-white/80 rounded-2xl border border-white/5 transition gap-2 font-semibold text-xs disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ArrowDownCircle size={24} className="text-white/40" />
              Đồng bộ VỀ máy
            </button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 mt-4 text-xs font-medium text-white/40 animate-pulse">
              <RefreshCw size={14} className="animate-spin text-amber-500" /> Đang truyền dữ liệu với máy chủ Google...
            </div>
          )}

          {syncMessage && (
            <div className={`mt-4 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              syncMessage.isError 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {syncMessage.isError ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
              <span>{syncMessage.text}</span>
            </div>
          )}
        </div>

        {/* User Education Block */}
        <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-5 text-xs leading-relaxed text-white/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-amber-500 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <HelpCircle size={14} className="text-amber-500" /> HƯỚNG DẪN KẾT NỐI CHI TIẾT:
            </h4>
            <button 
              type="button" 
              onClick={() => setShowGuide(!showGuide)}
              className="text-[10px] font-bold uppercase text-amber-500 hover:underline px-2 py-0.5 rounded bg-amber-500/10"
            >
              {showGuide ? 'Thu gọn' : 'Xem hướng dẫn lấy mã'}
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl">
              <p className="font-bold text-emerald-400 text-[11px] mb-1">⚡ Cách nhanh nhất: Kết nối tự động (Khuyên dùng)</p>
              <p className="text-[11px] leading-relaxed text-white/60">
                Hãy sử dụng nút <b className="text-white">"Kết nối tự động bằng Google"</b> ở phía trên. Hệ thống sẽ tự cấp và làm mới Token liên kết Google Drive & Sheets của bạn chỉ với 1 cú click chuột, loại bỏ hoàn toàn việc phải copy paste mã thủ công.
              </p>
            </div>

            {showGuide && (
              <div className="space-y-4 text-white/70 border-t border-white/5 pt-3 mt-3 animate-fadeIn">
                {/* Case 1: No Google Sheet yet */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <p className="font-bold text-white text-[11px] mb-1">💡 1. Bạn CHƯA CÓ file Google Sheet?</p>
                  <p className="text-[11px] leading-relaxed text-white/50">
                    Bạn <b>không cần tự tạo file thủ công</b>. Hãy điền hoặc lấy mã <span className="text-amber-400 font-medium">Access Token</span> ở ô trên, sau đó bấm nút <b className="text-amber-500">"Tạo mới bảng"</b>. Hệ thống sẽ tự động khởi tạo một tệp Google Sheet hoàn toàn mới trong tài khoản Google Drive của bạn, thiết lập đầy đủ 4 phân hệ dữ liệu, và tự động điền mã ID bảng tính cho bạn.
                  </p>
                </div>

                {/* Case 2: How to get Access Token */}
                <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                  <p className="font-bold text-white text-[11px] mb-1">🔑 2. Làm thế nào để lấy "Access Token" thủ công?</p>
                  <p className="text-[11px] text-white/50 mb-2 leading-relaxed">
                    Nếu không muốn dùng Đăng nhập tự động, bạn có thể lấy Token nhanh qua <b>Google OAuth Playground</b>:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-[10px] text-white/60 ml-1">
                    <li>
                      Truy cập trang: <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline font-bold">Google OAuth Playground ↗</a>
                    </li>
                    <li>
                      Tại cột bên trái (Bước 1), cuộn xuống tìm và nhấp chọn <span className="font-semibold text-white">Google Sheets API v4</span>, tích chọn scope <code className="bg-white/5 px-1 py-0.5 rounded text-amber-300 font-mono text-[9px]">.../auth/spreadsheets</code>.
                    </li>
                    <li>
                      Tìm tiếp <span className="font-semibold text-white">Google Drive API v3</span>, tích chọn scope <code className="bg-white/5 px-1 py-0.5 rounded text-amber-300 font-mono text-[9px]">.../auth/drive.file</code>.
                    </li>
                    <li>
                      Nhấn nút <b className="text-emerald-500">Authorize APIs</b> màu xanh ở dưới cùng, đăng nhập và chọn tài khoản Google của bạn để cấp quyền.
                    </li>
                    <li>
                      Bạn sẽ chuyển sang Bước 2. Hãy nhấn nút <b className="text-amber-500">Exchange authorization code for tokens</b> màu xanh dương.
                    </li>
                    <li>
                      Sao chép toàn bộ dòng mã trong mục <span className="font-semibold text-white font-mono">Access Token</span> (một chuỗi ký tự dài bắt đầu bằng <code className="text-amber-300">ya29.a0...</code>).
                    </li>
                    <li>
                      Quay lại ứng dụng này, dán mã vừa sao chép vào ô <span className="font-semibold text-white">Mã Access Token thủ công</span> và bấm nút <b className="text-amber-500">"Ghi nhớ kết nối"</b>.
                    </li>
                  </ol>
                </div>

                <div className="text-[10px] text-white/40 leading-normal">
                  📍 <i>Lưu ý: Mọi Access Token của Google đều có thời hạn sử dụng trong vòng 1 giờ vì lý do bảo mật. Khi hết hạn, phương pháp "Kết nối tự động" ở trên sẽ giúp bạn gia hạn lại chỉ bằng 1 lượt nhấp chuột mà không cần lặp lại các bước thủ công này.</i>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spreadsheet grid visualizer */}
      <div className="xl:col-span-8 bg-[#111] rounded-3xl border border-white/5 shadow-lg p-5 h-[620px] flex flex-col">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bảng tính trực quan</h3>
            <p className="text-[10px] text-white/30 mt-0.5">Hiển thị dữ liệu thực tế đang lưu trữ trên các bảng biểu tách biệt.</p>
          </div>

          <button
            id="btn-download-csv"
            onClick={() => downloadCSV(activeSheetTab)}
            className="flex items-center gap-1.5 px-4 py-2 border border-white/10 hover:bg-white/5 text-white/80 rounded-xl text-xs font-semibold transition"
          >
            <Download size={12} /> Xuất tệp Excel/CSV
          </button>
        </div>

        {/* WorkSheet Tab Selector */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 mb-4 text-[10px] font-semibold uppercase tracking-wider shrink-0">
          <button
            id="sheet-tab-students"
            onClick={() => setActiveSheetTab('students')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              activeSheetTab === 'students' ? 'bg-amber-600 text-black font-bold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            HocSinh ({students.length})
          </button>
          <button
            id="sheet-tab-violations"
            onClick={() => setActiveSheetTab('violations')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              activeSheetTab === 'violations' ? 'bg-amber-600 text-black font-bold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            ViPham ({violations.length})
          </button>
          <button
            id="sheet-tab-plans"
            onClick={() => setActiveSheetTab('plans')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              activeSheetTab === 'plans' ? 'bg-amber-600 text-black font-bold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            KeHoach ({plans.length})
          </button>
          <button
            id="sheet-tab-tasks"
            onClick={() => setActiveSheetTab('tasks')}
            className={`flex-1 py-2 text-center rounded-lg transition ${
              activeSheetTab === 'tasks' ? 'bg-amber-600 text-black font-bold' : 'text-white/40 hover:text-white/60'
            }`}
          >
            NhiemVu ({tasks.length})
          </button>
        </div>

        {/* Editable Spreadsheet Table Grid */}
        <div className="flex-1 border border-white/5 rounded-2xl overflow-auto custom-scrollbar bg-black/40">
          <table className="w-full text-left text-xs border-collapse font-sans bg-transparent min-w-[700px]">
            <thead className="bg-[#161616] border-b border-white/5 sticky top-0 font-semibold text-white/40 uppercase tracking-wider select-none z-10 text-[10px]">
              <tr>
                <th className="p-3 border-r border-white/5 w-12 text-center bg-[#161616] text-white/30">STT</th>
                {previewRows[0]?.map((header, idx) => (
                  <th key={idx} className="p-3 border-r border-white/5 bg-[#161616]">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white/80 text-[11px]">
              {previewRows.slice(1).length === 0 ? (
                <tr>
                  <td colSpan={(previewRows[0]?.length || 0) + 1} className="p-12 text-center text-white/30 italic font-medium">
                    Chưa có dòng dữ liệu nào trong bảng này
                  </td>
                </tr>
              ) : (
                previewRows.slice(1).map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.02] transition">
                    <td className="p-3 text-center bg-[#161616]/40 font-mono text-[10px] text-white/30 border-r border-white/5 select-none">
                      {rIdx + 1}
                    </td>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-3 border-r border-white/5 text-white/70">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomConfirmModal
        isOpen={!!confirmModal}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
        type={confirmModal?.type || 'danger'}
        onConfirm={() => confirmModal?.onConfirm()}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}

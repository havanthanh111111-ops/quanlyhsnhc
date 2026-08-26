/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ImageIcon, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Play, 
  Eye, 
  EyeOff, 
  Star, 
  ExternalLink, 
  Sparkles, 
  Check, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Calendar, 
  Tag, 
  Layers, 
  FolderPlus,
  Link as LinkIcon,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import { PhotoAlbum, AlbumPhoto, SchoolYear, SystemUser } from '../types';
import { AlbumSlideshowModal } from './AlbumSlideshowModal';
import { CustomConfirmModal } from './CustomConfirmModal';

interface AlbumManagerProps {
  schoolYears: SchoolYear[];
  albums: PhotoAlbum[];
  onAddAlbum: (album: PhotoAlbum) => Promise<void> | void;
  onUpdateAlbum: (album: PhotoAlbum) => Promise<void> | void;
  onDeleteAlbum: (albumId: string) => Promise<void> | void;
  activeSchoolYearId: string;
  isReadOnly?: boolean;
  currentUser?: SystemUser | null;
}

const CATEGORIES = [
  'Hoạt động trường',
  'Phong trào Đoàn',
  'Học tập & STEM',
  'Tri ân & Kỷ niệm',
  'Ngoại khóa',
  'Hoạt động Lớp',
  'Khác'
];

export default function AlbumManager({
  schoolYears,
  albums = [],
  onAddAlbum,
  onUpdateAlbum,
  onDeleteAlbum,
  activeSchoolYearId,
  isReadOnly = false,
  currentUser
}: AlbumManagerProps) {
  // Filter States
  const [selectedYearId, setSelectedYearId] = useState<string>(activeSchoolYearId || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States for Album Form
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);

  // Form Field States
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('Hoạt động trường');
  const [formYearId, setFormYearId] = useState<string>(activeSchoolYearId || (schoolYears[0]?.id || ''));
  const [formCoverUrl, setFormCoverUrl] = useState<string>('');
  const [formIsPublished, setFormIsPublished] = useState<boolean>(true);
  const [formFeatured, setFormFeatured] = useState<boolean>(false);
  const [formPhotos, setFormPhotos] = useState<AlbumPhoto[]>([]);

  // Sub-modal for adding/editing a single photo inside the album
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState<string>('');
  const [photoCaptionInput, setPhotoCaptionInput] = useState<string>('');
  const [photoTitleInput, setPhotoTitleInput] = useState<string>('');
  const [photoLinkInput, setPhotoLinkInput] = useState<string>('');

  // Batch add photos modal
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [batchText, setBatchText] = useState<string>('');

  // Live Slideshow Preview Modal State
  const [previewAlbum, setPreviewAlbum] = useState<PhotoAlbum | null>(null);

  // Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    albumId: string;
    title: string;
  }>({
    isOpen: false,
    albumId: '',
    title: ''
  });

  // Filtered Albums
  const filteredAlbums = useMemo(() => {
    return albums
      .filter(album => {
        // School year filter
        if (selectedYearId !== 'all' && album.schoolYearId && album.schoolYearId !== selectedYearId) {
          return false;
        }
        // Category filter
        if (selectedCategory !== 'all' && album.category !== selectedCategory) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = album.title.toLowerCase().includes(q);
          const matchDesc = album.description?.toLowerCase().includes(q);
          const matchCaptions = album.photos?.some(p => 
            p.caption?.toLowerCase().includes(q) || p.title?.toLowerCase().includes(q)
          );
          if (!matchTitle && !matchDesc && !matchCaptions) return false;
        }
        return true;
      })
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [albums, selectedYearId, selectedCategory, searchQuery]);

  // Statistics
  const totalAlbumsCount = albums.length;
  const totalPhotosCount = albums.reduce((sum, a) => sum + (a.photos?.length || 0), 0);
  const publishedCount = albums.filter(a => a.isPublished !== false).length;
  const featuredCount = albums.filter(a => a.featured).length;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingAlbum(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('Hoạt động trường');
    setFormYearId(activeSchoolYearId || (schoolYears[0]?.id || ''));
    setFormCoverUrl('');
    setFormIsPublished(true);
    setFormFeatured(false);
    setFormPhotos([]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (album: PhotoAlbum) => {
    setEditingAlbum(album);
    setFormTitle(album.title);
    setFormDescription(album.description || '');
    setFormCategory(album.category || 'Hoạt động trường');
    setFormYearId(album.schoolYearId || activeSchoolYearId || (schoolYears[0]?.id || ''));
    setFormCoverUrl(album.coverUrl || '');
    setFormIsPublished(album.isPublished !== false);
    setFormFeatured(!!album.featured);
    setFormPhotos(album.photos ? [...album.photos] : []);
    setIsModalOpen(true);
  };

  // Save Album Form
  const handleSaveAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('Vui lòng nhập tên Album / Tiêu đề câu chuyện!');
      return;
    }

    const effectiveCover = formCoverUrl.trim() || formPhotos[0]?.url || '';

    const newAlbumData: PhotoAlbum = {
      id: editingAlbum ? editingAlbum.id : `ALBUM_${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      schoolYearId: formYearId,
      coverUrl: effectiveCover,
      isPublished: formIsPublished,
      featured: formFeatured,
      photos: formPhotos,
      createdAt: editingAlbum ? editingAlbum.createdAt : new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0]
    };

    if (editingAlbum) {
      await onUpdateAlbum(newAlbumData);
    } else {
      await onAddAlbum(newAlbumData);
    }

    setIsModalOpen(false);
  };

  // Photo editing actions inside form
  const handleOpenAddPhotoModal = () => {
    setEditingPhotoIndex(null);
    setPhotoUrlInput('');
    setPhotoCaptionInput('');
    setPhotoTitleInput('');
    setPhotoLinkInput('');
    setIsPhotoModalOpen(true);
  };

  const handleOpenEditPhotoModal = (index: number) => {
    const photo = formPhotos[index];
    if (!photo) return;
    setEditingPhotoIndex(index);
    setPhotoUrlInput(photo.url || '');
    setPhotoCaptionInput(photo.caption || '');
    setPhotoTitleInput(photo.title || '');
    setPhotoLinkInput(photo.link || '');
    setIsPhotoModalOpen(true);
  };

  const handleSavePhotoItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrlInput.trim()) {
      alert('Vui lòng nhập đường dẫn (Hyperlink) hình ảnh!');
      return;
    }

    const photoObj: AlbumPhoto = {
      id: editingPhotoIndex !== null ? formPhotos[editingPhotoIndex].id : `PHOTO_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: photoUrlInput.trim(),
      caption: photoCaptionInput.trim(),
      title: photoTitleInput.trim() || undefined,
      link: photoLinkInput.trim() || undefined,
      order: editingPhotoIndex !== null ? editingPhotoIndex + 1 : formPhotos.length + 1
    };

    if (editingPhotoIndex !== null) {
      const updated = [...formPhotos];
      updated[editingPhotoIndex] = photoObj;
      setFormPhotos(updated);
    } else {
      setFormPhotos(prev => [...prev, photoObj]);
    }

    // Auto set cover URL if empty
    if (!formCoverUrl) {
      setFormCoverUrl(photoUrlInput.trim());
    }

    setIsPhotoModalOpen(false);
  };

  const handleDeletePhoto = (index: number) => {
    setFormPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleMovePhoto = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formPhotos.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...formPhotos];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFormPhotos(updated);
  };

  const handleSetCoverPhoto = (url: string) => {
    setFormCoverUrl(url);
  };

  // Batch add photos parser
  const handleBatchAdd = () => {
    if (!batchText.trim()) return;
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    const newItems: AlbumPhoto[] = [];

    lines.forEach((line, idx) => {
      // Split by | or tab
      const parts = line.includes('|') ? line.split('|') : [line];
      const url = parts[0]?.trim();
      const caption = parts[1]?.trim() || `Hình ảnh hoạt động ${formPhotos.length + idx + 1}`;
      const title = parts[2]?.trim() || undefined;

      if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/'))) {
        newItems.push({
          id: `PHOTO_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          url: url,
          caption: caption,
          title: title,
          order: formPhotos.length + idx + 1
        });
      }
    });

    if (newItems.length > 0) {
      setFormPhotos(prev => [...prev, ...newItems]);
      if (!formCoverUrl) {
        setFormCoverUrl(newItems[0].url);
      }
      setIsBatchModalOpen(false);
      setBatchText('');
      alert(`Đã thêm thành công ${newItems.length} hình ảnh vào danh sách!`);
    } else {
      alert('Không tìm thấy link ảnh hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://');
    }
  };

  // Quick toggle actions
  const handleTogglePublished = async (album: PhotoAlbum) => {
    if (isReadOnly) return;
    await onUpdateAlbum({
      ...album,
      isPublished: album.isPublished === false ? true : false,
      updatedAt: new Date().toISOString().split('T')[0]
    });
  };

  const handleToggleFeatured = async (album: PhotoAlbum) => {
    if (isReadOnly) return;
    await onUpdateAlbum({
      ...album,
      featured: !album.featured,
      updatedAt: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 pb-12">
      {/* 1. Header with Title and Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200/60">
              <ImageIcon size={22} />
            </span>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Quản lý Album Ảnh & Câu Chuyện Bằng Hình
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium pl-1">
            Thiết kế các bộ sưu tập hình ảnh, câu chuyện hoạt động học đường, phóng sự ảnh và trình chiếu Slide Show tương tác.
          </p>
        </div>

        <button
          id="btn-create-new-album"
          disabled={isReadOnly}
          onClick={handleOpenCreateModal}
          className={`px-5 py-3 rounded-2xl text-xs font-black tracking-wide shadow-md transition flex items-center justify-center gap-2 ${
            isReadOnly 
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 cursor-pointer active:scale-95'
          }`}
        >
          <Plus size={16} />
          <span>TẠO ALBUM MỚI</span>
        </button>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{totalAlbumsCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Tổng số Album</div>
          </div>
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100">
            <Layers size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{totalPhotosCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Tổng số hình ảnh</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
            <ImageIcon size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{publishedCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Công khai trên Web</div>
          </div>
          <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center border border-amber-100">
            <Eye size={20} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-slate-900">{featuredCount}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-1">Album nổi bật</div>
          </div>
          <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center border border-purple-100">
            <Star size={20} />
          </div>
        </div>
      </div>

      {/* 3. Search and Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm album, tiêu đề hoặc chú thích ảnh..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
          </div>

          {/* School Year Filter */}
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Tất cả năm học</option>
            {schoolYears.map(yr => (
              <option key={yr.id} value={yr.id}>{yr.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="all">Tất cả thể loại</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Clear filter button */}
        {(selectedYearId !== 'all' || selectedCategory !== 'all' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedYearId('all');
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* 4. Album Grid List */}
      {filteredAlbums.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto text-slate-400">
            <ImageIcon size={32} />
          </div>
          <h3 className="text-base font-extrabold text-slate-700">Chưa tìm thấy Album nào</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy bắt đầu tạo Album mới hoặc điều chỉnh lại bộ lọc tìm kiếm của bạn.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Tạo Album đầu tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map(album => {
            const photoCount = album.photos?.length || 0;
            const coverImage = album.coverUrl || album.photos?.[0]?.url || 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=600&auto=format&fit=crop';
            const yearObj = schoolYears.find(y => y.id === album.schoolYearId);

            return (
              <div 
                key={album.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
              >
                {/* Album Cover Thumbnail */}
                <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                  <img
                    src={coverImage}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none"></div>

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase tracking-wider rounded-xl border border-white/20">
                      {album.category || 'Hoạt động'}
                    </span>

                    <div className="flex items-center gap-1">
                      {album.featured && (
                        <span className="px-2 py-0.5 bg-purple-500/90 text-white text-[9px] font-black uppercase rounded-lg shadow-xs flex items-center gap-1">
                          <Star size={10} fill="currentColor" /> Nổi bật
                        </span>
                      )}
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg shadow-xs flex items-center gap-1 ${
                        album.isPublished !== false 
                          ? 'bg-emerald-500/90 text-white' 
                          : 'bg-slate-600/90 text-slate-200'
                      }`}>
                        {album.isPublished !== false ? 'Công khai' : 'Tạm ẩn'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Photo Count & Slide Preview Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <div className="flex items-center gap-1.5 text-xs font-bold bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-xl">
                      <ImageIcon size={13} className="text-amber-400" />
                      <span>{photoCount} hình ảnh</span>
                    </div>

                    <button
                      onClick={() => setPreviewAlbum(album)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition hover:scale-105 active:scale-95"
                    >
                      <Play size={12} fill="currentColor" /> Xem Slide Show
                    </button>
                  </div>
                </div>

                {/* Album Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {album.createdAt}
                      </span>
                      {yearObj && (
                        <>
                          <span>•</span>
                          <span className="text-blue-600 uppercase">{yearObj.name}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-sm md:text-base font-extrabold text-slate-900 leading-snug line-clamp-2">
                      {album.title}
                    </h3>

                    {album.description && (
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {album.description}
                      </p>
                    )}
                  </div>

                  {/* Action Controls */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Quick status toggles */}
                    <div className="flex items-center gap-1">
                      <button
                        disabled={isReadOnly}
                        onClick={() => handleTogglePublished(album)}
                        title={album.isPublished !== false ? 'Nhấp để Ẩn khỏi Web công khai' : 'Nhấp để Công khai trên Web'}
                        className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                          album.isPublished !== false
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {album.isPublished !== false ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>

                      <button
                        disabled={isReadOnly}
                        onClick={() => handleToggleFeatured(album)}
                        title={album.featured ? 'Bỏ nhãn Nổi bật' : 'Đặt làm Album Nổi bật'}
                        className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                          album.featured
                            ? 'bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100'
                            : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Star size={14} className={album.featured ? 'fill-current' : ''} />
                      </button>
                    </div>

                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1.5">
                      <button
                        disabled={isReadOnly}
                        onClick={() => handleOpenEditModal(album)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Sửa</span>
                      </button>

                      <button
                        disabled={isReadOnly}
                        onClick={() => setDeleteConfirm({
                          isOpen: true,
                          albumId: album.id,
                          title: album.title
                        })}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-transparent hover:border-rose-100 transition cursor-pointer"
                        title="Xóa Album này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. MODAL: CREATE / EDIT ALBUM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden animate-scaleUp text-left">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingAlbum ? 'Chỉnh sửa Album Ảnh' : 'Tạo Album Ảnh & Câu Chuyện Mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Nhập thông tin câu chuyện và bổ sung các hình ảnh kèm chú thích.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveAlbum} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Basic Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Tên Album / Tiêu đề câu chuyện <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Lễ Khai Giảng Năm Học Mới 2026-2027"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Thể loại / Chủ đề
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      Năm học áp dụng
                    </label>
                    <select
                      value={formYearId}
                      onChange={(e) => setFormYearId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition cursor-pointer"
                    >
                      {schoolYears.map(yr => (
                        <option key={yr.id} value={yr.id}>{yr.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Lời dẫn / Tóm tắt câu chuyện
                  </label>
                  <textarea
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Nhập mô tả tóm tắt về chuỗi hoạt động, ý nghĩa của album ảnh này..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                    Link Ảnh bìa Album (Tùy chọn - nếu để trống sẽ lấy ảnh đầu tiên)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={formCoverUrl}
                      onChange={(e) => setFormCoverUrl(e.target.value)}
                      placeholder="https://... hoặc dán link ảnh bìa"
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                    />
                    {formCoverUrl && (
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-300 shrink-0">
                        <img src={formCoverUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Status switches */}
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsPublished}
                      onChange={(e) => setFormIsPublished(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-extrabold text-slate-800">Hiển thị công khai trên Web</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formFeatured}
                      onChange={(e) => setFormFeatured(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
                      <Star size={12} className="text-purple-600 fill-current" /> Đặt làm Album nổi bật
                    </span>
                  </label>
                </div>
              </div>

              {/* Photos List Manager */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Danh sách hình ảnh & Chú thích ({formPhotos.length} ảnh)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mỗi bức ảnh là một phần của câu chuyện kèm chú thích chi tiết hiển thị dưới ảnh trong slide show.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBatchModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Dán nhiều ảnh
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddPhotoModal}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={14} /> Thêm ảnh
                    </button>
                  </div>
                </div>

                {formPhotos.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
                    <ImageIcon size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold text-slate-500">Chưa có bức ảnh nào trong album này.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddPhotoModal}
                      className="text-xs font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      + Nhấp vào đây để thêm hình ảnh và chú thích
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                    {formPhotos.map((photo, idx) => (
                      <div
                        key={photo.id || idx}
                        className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 group hover:bg-blue-50/20 transition"
                      >
                        {/* Thumbnail */}
                        <div className="w-16 h-12 rounded-xl overflow-hidden border border-slate-300 bg-slate-200 shrink-0 relative">
                          <img src={photo.url} alt="" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 right-0 px-1 bg-black/70 text-[8px] font-mono text-white font-bold">
                            #{idx + 1}
                          </div>
                        </div>

                        {/* Caption & Title details */}
                        <div className="flex-1 min-w-0 space-y-1">
                          {photo.title && (
                            <div className="text-xs font-extrabold text-slate-800 truncate">
                              {photo.title}
                            </div>
                          )}
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {photo.caption || <span className="italic text-slate-400">Không có chú thích</span>}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span className="truncate max-w-[200px]">{photo.url}</span>
                            {formCoverUrl === photo.url && (
                              <span className="text-blue-600 font-bold bg-blue-100 px-1.5 rounded">Ảnh bìa</span>
                            )}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 shrink-0 pt-1">
                          {/* Set as cover */}
                          <button
                            type="button"
                            onClick={() => handleSetCoverPhoto(photo.url)}
                            title="Đặt làm ảnh bìa"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                          >
                            <Star size={14} className={formCoverUrl === photo.url ? 'text-amber-500 fill-current' : ''} />
                          </button>

                          {/* Move Up */}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMovePhoto(idx, 'up')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition"
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={14} />
                          </button>

                          {/* Move Down */}
                          <button
                            type="button"
                            disabled={idx === formPhotos.length - 1}
                            onClick={() => handleMovePhoto(idx, 'down')}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg transition"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={14} />
                          </button>

                          {/* Edit photo */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditPhotoModal(idx)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Chỉnh sửa chú thích ảnh"
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Delete photo */}
                          <button
                            type="button"
                            onClick={() => handleDeletePhoto(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Xóa ảnh này"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit / Cancel Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  {editingAlbum ? 'LƯU THAY ĐỔI' : 'TẠO ALBUM MỚI'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. SUB-MODAL: ADD / EDIT SINGLE PHOTO */}
      {isPhotoModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-scaleUp text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <ImageIcon size={16} className="text-blue-600" />
                {editingPhotoIndex !== null ? 'Chỉnh sửa hình ảnh & chú thích' : 'Thêm hình ảnh vào Album'}
              </h4>
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSavePhotoItem} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Đường dẫn ảnh (Hyperlink / Image URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  placeholder="https://images.unsplash.com/... hoặc link Google Drive, Imgur"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Live Preview */}
              {photoUrlInput && (
                <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex items-center justify-center">
                  <img
                    src={photoUrlInput}
                    alt="Preview"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as any).src = 'https://via.placeholder.com/600x400?text=Link+Anh+Khong+Hop+Le';
                    }}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Tiêu đề bức ảnh (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={photoTitleInput}
                  onChange={(e) => setPhotoTitleInput(e.target.value)}
                  placeholder="Ví dụ: Nghi thức Chào cờ khai mạc"
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Chú thích chi tiết (Hiển thị dưới ảnh trong Slide Show) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={photoCaptionInput}
                  onChange={(e) => setPhotoCaptionInput(e.target.value)}
                  placeholder="Viết câu chuyện hoặc thông điệp ý nghĩa cho bức ảnh này..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
                  Hyperlink mở rộng (Khi click vào nút xem liên kết ngoài - tùy chọn)
                </label>
                <input
                  type="url"
                  value={photoLinkInput}
                  onChange={(e) => setPhotoLinkInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPhotoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition"
                >
                  {editingPhotoIndex !== null ? 'CẬP NHẬT ẢNH' : 'THÊM VÀO ALBUM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. SUB-MODAL: BATCH ADD PHOTOS */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4 animate-scaleUp text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Layers size={16} className="text-blue-600" />
                Dán hàng loạt link ảnh & Chú thích
              </h4>
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p className="font-bold text-slate-800">Cấu trúc mỗi dòng:</p>
              <div className="p-3 bg-slate-100 rounded-xl font-mono text-[11px] text-slate-700 space-y-1">
                <p>Link_Anh | Chú_thích_bức_ảnh | Tiêu_đề_ngắn</p>
                <p className="text-slate-400 italic font-sans text-[10px]">
                  (Ví dụ: https://images.unsplash.com/... | Toàn cảnh lễ khai giảng rộn ràng | Lễ Khai giảng)
                </p>
              </div>

              <textarea
                rows={6}
                value={batchText}
                onChange={(e) => setBatchText(e.target.value)}
                placeholder="Dán các dòng link ảnh vào đây..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              ></textarea>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBatchAdd}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md transition"
              >
                TIẾP NHẬN & THÊM VÀO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SLIDESHOW PREVIEW MODAL */}
      {previewAlbum && (
        <AlbumSlideshowModal
          album={previewAlbum}
          onClose={() => setPreviewAlbum(null)}
        />
      )}

      {/* 9. DELETE CONFIRM MODAL */}
      <CustomConfirmModal
        isOpen={deleteConfirm.isOpen}
        title="Xác nhận xóa Album"
        message={`Bạn có chắc chắn muốn xóa album "${deleteConfirm.title}" và toàn bộ hình ảnh trong album này không? Hành động này không thể khôi phục.`}
        confirmLabel="XÓA ALBUM"
        cancelLabel="HỦY"
        type="danger"
        onConfirm={async () => {
          const id = deleteConfirm.albumId;
          setDeleteConfirm({ isOpen: false, albumId: '', title: '' });
          if (id) {
            try {
              await onDeleteAlbum(id);
            } catch (err) {
              console.error('Lỗi khi xóa album:', err);
            }
          }
        }}
        onCancel={() => setDeleteConfirm({ isOpen: false, albumId: '', title: '' })}
      />
    </div>
  );
}

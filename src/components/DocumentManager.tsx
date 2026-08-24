/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FolderArchive, 
  Plus, 
  Search, 
  ExternalLink, 
  Globe, 
  Lock, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  FileText, 
  Folder, 
  Calendar, 
  Link as LinkIcon, 
  Eye, 
  EyeOff, 
  Share2, 
  Info,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { DocumentCategory, ArchivedDocItem, SchoolYear, SystemUser } from '../types';
import { CustomConfirmModal } from './CustomConfirmModal';

interface DocumentManagerProps {
  schoolYears: SchoolYear[];
  documentCategories: DocumentCategory[];
  onAddCategory: (category: DocumentCategory) => Promise<void> | void;
  onUpdateCategory: (category: DocumentCategory) => Promise<void> | void;
  onDeleteCategory: (categoryId: string) => Promise<void> | void;
  activeSchoolYearId: string;
  isReadOnly?: boolean;
  currentUser?: SystemUser | null;
}

export default function DocumentManager({
  schoolYears,
  documentCategories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  activeSchoolYearId,
  isReadOnly = false,
  currentUser
}: DocumentManagerProps) {
  // Filters
  const [selectedYearId, setSelectedYearId] = useState<string>(activeSchoolYearId || (schoolYears[0]?.id || ''));
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'public' | 'admin_only'>('all');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [categoryTitle, setCategoryTitle] = useState('');
  const [categoryYearId, setCategoryYearId] = useState('');
  const [categoryOrder, setCategoryOrder] = useState<number>(1);

  // Document Item Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [editingItem, setEditingItem] = useState<ArchivedDocItem | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [itemVisibility, setItemVisibility] = useState<'public' | 'admin_only'>('public');
  const [itemDescription, setItemDescription] = useState('');

  // Delete Confirm Modal State
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'category' | 'item';
    categoryId: string;
    itemId?: string;
    title: string;
  }>({
    isOpen: false,
    type: 'category',
    categoryId: '',
    title: ''
  });

  // Copied toast state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Quick preview modal
  const [previewDoc, setPreviewDoc] = useState<ArchivedDocItem | null>(null);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return documentCategories
      .filter(cat => {
        // School Year Filter
        const matchesYear = selectedYearId === 'all' || cat.schoolYearId === selectedYearId;
        if (!matchesYear) return false;

        // Search Query
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const matchesCatTitle = cat.title.toLowerCase().includes(q);
        const matchesItems = cat.items.some(
          item => item.title.toLowerCase().includes(q) || 
                  item.description?.toLowerCase().includes(q) || 
                  item.url.toLowerCase().includes(q)
        );
        return matchesCatTitle || matchesItems;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [documentCategories, selectedYearId, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let totalCats = 0;
    let totalItems = 0;
    let publicCount = 0;
    let adminOnlyCount = 0;

    documentCategories
      .filter(c => selectedYearId === 'all' || c.schoolYearId === selectedYearId)
      .forEach(cat => {
        totalCats++;
        cat.items.forEach(item => {
          totalItems++;
          if (item.visibility === 'admin_only') {
            adminOnlyCount++;
          } else {
            publicCount++;
          }
        });
      });

    return { totalCats, totalItems, publicCount, adminOnlyCount };
  }, [documentCategories, selectedYearId]);

  // Handle open Category Modal (Add / Edit)
  const handleOpenCategoryModal = (cat?: DocumentCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryTitle(cat.title);
      setCategoryYearId(cat.schoolYearId);
      setCategoryOrder(cat.order || 1);
    } else {
      setEditingCategory(null);
      setCategoryTitle('');
      setCategoryYearId(selectedYearId !== 'all' ? selectedYearId : (schoolYears[0]?.id || ''));
      setCategoryOrder(filteredCategories.length + 1);
    }
    setIsCategoryModalOpen(true);
  };

  // Handle save Category
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryTitle.trim() || !categoryYearId) return;

    if (editingCategory) {
      const updated: DocumentCategory = {
        ...editingCategory,
        title: categoryTitle.trim().toUpperCase(),
        schoolYearId: categoryYearId,
        order: Number(categoryOrder) || 1,
        updatedAt: new Date().toISOString()
      };
      await onUpdateCategory(updated);
    } else {
      const newCat: DocumentCategory = {
        id: `CAT_${Date.now()}`,
        title: categoryTitle.trim().toUpperCase(),
        schoolYearId: categoryYearId,
        order: Number(categoryOrder) || 1,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await onAddCategory(newCat);
    }

    setIsCategoryModalOpen(false);
  };

  // Handle open Item Modal (Add / Edit)
  const handleOpenItemModal = (catId: string, item?: ArchivedDocItem) => {
    setTargetCategoryId(catId);
    if (item) {
      setEditingItem(item);
      setItemTitle(item.title);
      setItemUrl(item.url);
      setItemVisibility(item.visibility || 'public');
      setItemDescription(item.description || '');
    } else {
      setEditingItem(null);
      setItemTitle('');
      setItemUrl('');
      setItemVisibility('public');
      setItemDescription('');
    }
    setIsItemModalOpen(true);
  };

  // Handle save Document Item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim() || !itemUrl.trim() || !targetCategoryId) return;

    const parentCat = documentCategories.find(c => c.id === targetCategoryId);
    if (!parentCat) return;

    let cleanUrl = itemUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let updatedItems: ArchivedDocItem[];
    if (editingItem) {
      updatedItems = parentCat.items.map(it => 
        it.id === editingItem.id 
          ? {
              ...it,
              title: itemTitle.trim().toUpperCase(),
              url: cleanUrl,
              visibility: itemVisibility,
              description: itemDescription.trim() || undefined
            }
          : it
      );
    } else {
      const newItem: ArchivedDocItem = {
        id: `DOC_${Date.now()}`,
        title: itemTitle.trim().toUpperCase(),
        url: cleanUrl,
        visibility: itemVisibility,
        description: itemDescription.trim() || undefined,
        createdAt: new Date().toISOString().split('T')[0]
      };
      updatedItems = [...parentCat.items, newItem];
    }

    const updatedCat: DocumentCategory = {
      ...parentCat,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    };

    await onUpdateCategory(updatedCat);
    setIsItemModalOpen(false);
  };

  // Handle toggle visibility of an item
  const handleToggleItemVisibility = async (catId: string, itemId: string) => {
    if (isReadOnly) return;
    const cat = documentCategories.find(c => c.id === catId);
    if (!cat) return;

    const updatedItems = cat.items.map(it => {
      if (it.id === itemId) {
        return {
          ...it,
          visibility: (it.visibility === 'public' ? 'admin_only' : 'public') as 'public' | 'admin_only'
        };
      }
      return it;
    });

    await onUpdateCategory({
      ...cat,
      items: updatedItems,
      updatedAt: new Date().toISOString()
    });
  };

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (deleteConfirm.type === 'category') {
      await onDeleteCategory(deleteConfirm.categoryId);
    } else if (deleteConfirm.type === 'item' && deleteConfirm.itemId) {
      const cat = documentCategories.find(c => c.id === deleteConfirm.categoryId);
      if (cat) {
        const updatedItems = cat.items.filter(it => it.id !== deleteConfirm.itemId);
        await onUpdateCategory({
          ...cat,
          items: updatedItems,
          updatedAt: new Date().toISOString()
        });
      }
    }
    setDeleteConfirm({ isOpen: false, type: 'category', categoryId: '', title: '' });
  };

  // Handle Copy Link
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  // Toggle Collapse
  const toggleCollapse = (catId: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/60 border border-blue-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <FolderArchive size={14} className="text-amber-400" />
              <span>HỆ THỐNG QUẢN LÝ VĂN BẢN CẦN & KHO TÀI LIỆU</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white uppercase font-sans">
              DANH MỤC VĂN BẢN & LƯU TRỮ
            </h2>
            <p className="text-slate-300 text-xs md:text-sm font-medium max-w-2xl leading-relaxed">
              Phân loại tài liệu theo <span className="text-amber-300 font-bold">Niên học</span>, cấu trúc <span className="text-amber-300 font-bold">Tiêu đề cha</span> và các <span className="text-amber-300 font-bold">Tiêu đề con</span> liên kết trực tiếp tới file Google Drive, Google Docs, Sheets. Thiết lập quyền hiển thị trên <span className="text-emerald-400 font-bold">Web Công Khai</span> hoặc <span className="text-rose-300 font-bold">Chỉ Admin/Giáo viên</span> xem được.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!isReadOnly && (
              <button
                id="btn-add-category-main"
                onClick={() => handleOpenCategoryModal()}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <Plus size={16} /> + Thêm Tiêu Đề Cha
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-blue-800/60">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tiêu đề cha (Chủ đề)</span>
            <span className="text-xl font-black text-amber-400 font-mono mt-0.5 block">{stats.totalCats}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Tổng văn bản con</span>
            <span className="text-xl font-black text-white font-mono mt-0.5 block">{stats.totalItems}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">Hiển thị Web Công</span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-0.5 block">{stats.publicCount}</span>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block">Ẩn / Chỉ Admin</span>
            <span className="text-xl font-black text-rose-400 font-mono mt-0.5 block">{stats.adminOnlyCount}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTER & CONTROLS TOOLBAR */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Niên học Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <Calendar size={15} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-600">Niên học:</span>
            <select
              id="filter-doc-year"
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-900 border-none p-0 focus:ring-0 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả niên học</option>
              {schoolYears.map(y => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setVisibilityFilter('all')}
              className={`px-3 py-1 rounded-xl transition ${
                visibilityFilter === 'all' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setVisibilityFilter('public')}
              className={`px-3 py-1 rounded-xl transition flex items-center gap-1.5 ${
                visibilityFilter === 'public' 
                  ? 'bg-emerald-500 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Globe size={12} /> Web Công ({stats.publicCount})
            </button>
            <button
              onClick={() => setVisibilityFilter('admin_only')}
              className={`px-3 py-1 rounded-xl transition flex items-center gap-1.5 ${
                visibilityFilter === 'admin_only' 
                  ? 'bg-rose-600 text-white shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Lock size={12} /> Chỉ Admin ({stats.adminOnlyCount})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px] md:w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="search-doc-input"
            type="text"
            placeholder="Tìm theo tiêu đề, link, nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 3. CATEGORIES & DOCUMENTS LIST */}
      {filteredCategories.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderArchive size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 uppercase tracking-wide">CHƯA CÓ VĂN BẢN NÀO</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Không tìm thấy tiêu đề cha hoặc tài liệu nào phù hợp với bộ lọc hiện tại. Bấm nút bên dưới để tạo danh mục văn bản mới.
            </p>
          </div>
          {!isReadOnly && (
            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-bold uppercase tracking-wider transition inline-flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Plus size={15} /> Tạo Tiêu Đề Cha Đầu Tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((category) => {
            const yearObj = schoolYears.find(y => y.id === category.schoolYearId);
            const isCollapsed = collapsedCategories[category.id];

            // Filter items within category based on visibilityFilter
            const displayItems = category.items.filter(item => {
              if (visibilityFilter === 'public') return item.visibility !== 'admin_only';
              if (visibilityFilter === 'admin_only') return item.visibility === 'admin_only';
              return true;
            });

            const catPublicCount = category.items.filter(it => it.visibility !== 'admin_only').length;
            const catAdminCount = category.items.filter(it => it.visibility === 'admin_only').length;

            return (
              <div 
                key={category.id}
                id={`cat-card-${category.id}`}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition hover:border-slate-300"
              >
                {/* CATEGORY HEADER */}
                <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCollapse(category.id)}
                      className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                    >
                      {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>

                    <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
                      <Folder size={18} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-black text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          TIÊU ĐỀ CHA
                        </span>
                        <h3 className="text-sm md:text-base font-black text-slate-900 uppercase tracking-tight">
                          {category.title}
                        </h3>
                        {yearObj && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md font-mono">
                            {yearObj.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 font-medium">
                        <span>{category.items.length} văn bản con</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">{catPublicCount} công khai</span>
                        <span>•</span>
                        <span className="text-rose-700 font-bold">{catAdminCount} chỉ admin</span>
                      </div>
                    </div>
                  </div>

                  {/* Category Actions */}
                  <div className="flex items-center gap-2">
                    {!isReadOnly && (
                      <>
                        <button
                          onClick={() => handleOpenItemModal(category.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                          title="Thêm tiêu đề con vào chủ đề này"
                        >
                          <Plus size={13} /> + Thêm Tiêu Đề Con
                        </button>
                        <button
                          onClick={() => handleOpenCategoryModal(category)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-xl transition border border-transparent hover:border-slate-200"
                          title="Sửa tiêu đề cha"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({
                            isOpen: true,
                            type: 'category',
                            categoryId: category.id,
                            title: category.title
                          })}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition"
                          title="Xóa tiêu đề cha này"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* CATEGORY ITEMS CONTENT */}
                {!isCollapsed && (
                  <div className="p-4 md:p-6">
                    {displayItems.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/50">
                        <FileText size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500 font-medium">Chưa có văn bản con nào trong danh mục này.</p>
                        {!isReadOnly && (
                          <button
                            onClick={() => handleOpenItemModal(category.id)}
                            className="mt-3 text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                          >
                            + Thêm tiêu đề con ngay
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {displayItems.map((item, idx) => {
                          const isPublic = item.visibility !== 'admin_only';

                          return (
                            <div 
                              key={item.id}
                              id={`item-row-${item.id}`}
                              className={`p-4 rounded-2xl border transition flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                isPublic 
                                  ? 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs' 
                                  : 'bg-rose-50/40 border-rose-200/70 hover:border-rose-300'
                              }`}
                            >
                              {/* Left: Item Info */}
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>

                                  <h4 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">
                                    {item.title}
                                  </h4>

                                  {/* Visibility Badge */}
                                  {isPublic ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <Globe size={10} /> HIỂN THỊ WEBCONG
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                                      <Lock size={10} /> ẨN (CHỈ ADMIN)
                                    </span>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-xs text-slate-600 font-medium pl-8">
                                    {item.description}
                                  </p>
                                )}

                                {/* URL and Date */}
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 pl-8 flex-wrap">
                                  <div className="flex items-center gap-1 font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md max-w-sm truncate">
                                    <LinkIcon size={11} className="shrink-0 text-blue-500" />
                                    <span className="truncate">{item.url}</span>
                                  </div>

                                  <button
                                    onClick={() => handleCopyLink(item.url)}
                                    className="text-slate-400 hover:text-slate-700 transition flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                    title="Sao chép liên kết"
                                  >
                                    {copiedUrl === item.url ? (
                                      <span className="text-emerald-600 flex items-center gap-0.5 font-bold">
                                        <Check size={11} /> Đã sao chép!
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-0.5">
                                        <Copy size={11} /> Copy Link
                                      </span>
                                    )}
                                  </button>

                                  {item.createdAt && (
                                    <span className="text-slate-400 font-mono text-[10px]">
                                      Ngày tạo: {item.createdAt}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                                {/* READ / OPEN LINK BUTTON */}
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 rounded-xl text-xs font-black uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                >
                                  <BookOpen size={13} />
                                  <span>ĐỌC &gt;&gt;</span>
                                </a>

                                {!isReadOnly && (
                                  <>
                                    {/* Toggle Visibility */}
                                    <button
                                      onClick={() => handleToggleItemVisibility(category.id, item.id)}
                                      className={`p-1.5 rounded-xl border transition ${
                                        isPublic 
                                          ? 'bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border-slate-200' 
                                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      }`}
                                      title={isPublic ? 'Chuyển sang Ẩn (Chỉ Admin)' : 'Chuyển sang Hiển thị Web Công'}
                                    >
                                      {isPublic ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>

                                    {/* Edit */}
                                    <button
                                      onClick={() => handleOpenItemModal(category.id, item)}
                                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition"
                                      title="Chỉnh sửa thông tin văn bản này"
                                    >
                                      <Edit3 size={14} />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      onClick={() => setDeleteConfirm({
                                        isOpen: true,
                                        type: 'item',
                                        categoryId: category.id,
                                        itemId: item.id,
                                        title: item.title
                                      })}
                                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl border border-rose-200 transition"
                                      title="Xóa văn bản này"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 4. MODAL: THÊM / SỬA TIÊU ĐỀ CHA (CATEGORY) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                  <Folder size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {editingCategory ? 'CHỈNH SỬA TIÊU ĐỀ CHA' : 'TẠO MỚI TIÊU ĐỀ CHA'}
                </h3>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              {/* Niên học */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Niên Học <span className="text-rose-500">*</span>
                </label>
                <select
                  value={categoryYearId}
                  onChange={(e) => setCategoryYearId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {schoolYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </div>

              {/* Tên Tiêu Đề Cha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Tên Tiêu Đề Cha (Danh Mục) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: QUY ĐỊNH NỀ NẾP, VĂN BẢN CHUYÊN MÔN, KẾ HOẠCH NĂM HỌC..."
                  value={categoryTitle}
                  onChange={(e) => setCategoryTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">Gợi ý: Đặt tên ngắn gọn, rõ ràng theo nhóm văn bản.</p>
              </div>

              {/* Thứ tự sắp xếp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Thứ Tự Hiển Thị
                </label>
                <input
                  type="number"
                  min="1"
                  value={categoryOrder}
                  onChange={(e) => setCategoryOrder(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-sm"
                >
                  {editingCategory ? 'Lưu Thay Đổi' : 'Tạo Tiêu Đề Cha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: THÊM / SỬA TIÊU ĐỀ CON (DOCUMENT ITEM) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-700 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {editingItem ? 'CHỈNH SỬA TIÊU ĐỀ CON' : 'THÊM MỚI TIÊU ĐỀ CON'}
                </h3>
              </div>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Chọn Tiêu Đề Cha */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Thuộc Tiêu Đề Cha <span className="text-rose-500">*</span>
                </label>
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  {documentCategories.map(c => {
                    const yObj = schoolYears.find(y => y.id === c.schoolYearId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.title} ({yObj ? yObj.name : ''})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Tên Tiêu Đề Con */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Tên Tiêu Đề Con <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: MỘT SỐ QUY ĐỊNH CHUNG_NH2026-2027, ĐIỂM THI ĐUA..."
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Đường dẫn link chia sẻ Google */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Link File Google Chia Sẻ (Drive/Docs/Sheets) <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="url"
                    placeholder="https://docs.google.com/... hoặc https://drive.google.com/..."
                    value={itemUrl}
                    onChange={(e) => setItemUrl(e.target.value)}
                    required
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Dán liên kết xem/chia sẻ của Google Drive, Google Docs, Sheets hoặc file PDF.
                </p>
              </div>

              {/* Quyền hiển thị */}
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                  Chế Độ Hiển Thị <span className="text-rose-500">*</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Public Option */}
                  <label 
                    className={`p-3 rounded-2xl border-2 flex items-start gap-2.5 cursor-pointer transition ${
                      itemVisibility === 'public' 
                        ? 'border-emerald-500 bg-emerald-50/50' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={itemVisibility === 'public'}
                      onChange={() => setItemVisibility('public')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="text-xs">
                      <p className="font-black text-emerald-900 flex items-center gap-1">
                        <Globe size={13} className="text-emerald-600" /> HIỂN THỊ WEBCONG
                      </p>
                      <p className="text-[10px] text-emerald-700 mt-0.5 leading-tight">
                        Xuất hiện trên menu Lưu trữ của Web Công để học sinh & phụ huynh đọc.
                      </p>
                    </div>
                  </label>

                  {/* Admin Only Option */}
                  <label 
                    className={`p-3 rounded-2xl border-2 flex items-start gap-2.5 cursor-pointer transition ${
                      itemVisibility === 'admin_only' 
                        ? 'border-rose-500 bg-rose-50/50' 
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value="admin_only"
                      checked={itemVisibility === 'admin_only'}
                      onChange={() => setItemVisibility('admin_only')}
                      className="mt-0.5 text-rose-600 focus:ring-rose-500"
                    />
                    <div className="text-xs">
                      <p className="font-black text-rose-900 flex items-center gap-1">
                        <Lock size={13} className="text-rose-600" /> ẨN (CHỈ ADMIN)
                      </p>
                      <p className="text-[10px] text-rose-700 mt-0.5 leading-tight">
                        Chỉ có tài khoản Quản trị viên và Giáo viên mới xem được.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mô tả / Ghi chú */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Ghi Chú / Mô Tả Ngắn (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả tóm tắt nội dung văn bản..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
                >
                  {editingItem ? 'Lưu Thay Đổi' : 'Thêm Tiêu Đề Con'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. DELETE CONFIRM MODAL */}
      <CustomConfirmModal
        isOpen={deleteConfirm.isOpen}
        title={deleteConfirm.type === 'category' ? 'XÁC NHẬN XÓA TIÊU ĐỀ CHA' : 'XÁC NHẬN XÓA TIÊU ĐỀ CON'}
        message={
          deleteConfirm.type === 'category'
            ? `Bạn có chắc chắn muốn xóa tiêu đề cha "${deleteConfirm.title}" cùng toàn bộ văn bản con bên trong? Thao tác này không thể hoàn tác.`
            : `Bạn có chắc chắn muốn xóa văn bản con "${deleteConfirm.title}"?`
        }
        confirmLabel="Xóa Ngay"
        cancelLabel="Hủy Bỏ"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, type: 'category', categoryId: '', title: '' })}
      />
    </div>
  );
}

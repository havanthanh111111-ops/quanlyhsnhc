/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Maximize2, 
  Minimize2, 
  ExternalLink, 
  Copy, 
  Check, 
  ImageIcon, 
  Sparkles,
  Info,
  Calendar,
  Grid,
  Layers
} from 'lucide-react';
import { PhotoAlbum, AlbumPhoto } from '../types';

interface AlbumSlideshowModalProps {
  album: PhotoAlbum;
  initialIndex?: number;
  autoPlayInitial?: boolean;
  onClose: () => void;
}

export const AlbumSlideshowModal: React.FC<AlbumSlideshowModalProps> = ({
  album,
  initialIndex = 0,
  autoPlayInitial = false,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(
    Math.max(0, Math.min(initialIndex, (album.photos.length || 1) - 1))
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(autoPlayInitial);
  const [playIntervalSec, setPlayIntervalSec] = useState<number>(4);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slideshow' | 'grid'>('slideshow');
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  const photos = album.photos || [];
  const currentPhoto: AlbumPhoto | undefined = photos[currentIndex];

  const handleNext = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex(prev => (prev + 1) % photos.length);
  }, [photos.length]);

  const handlePrev = useCallback(() => {
    setImageLoaded(false);
    setCurrentIndex(prev => (prev - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, onClose]);

  // Autoplay slideshow timer
  useEffect(() => {
    if (!isPlaying || photos.length <= 1) return;
    const timer = setInterval(() => {
      handleNext();
    }, playIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [isPlaying, playIntervalSec, photos.length, handleNext]);

  // Auto scroll thumbnail strip
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeThumb = thumbnailsRef.current.children[currentIndex] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [currentIndex]);

  const handleCopyLink = () => {
    if (!currentPhoto?.url) return;
    navigator.clipboard.writeText(currentPhoto.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  if (!photos.length) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fadeIn">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-600">
            <ImageIcon size={28} />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Album chưa có ảnh</h3>
          <p className="text-xs text-slate-500">Album này hiện chưa được thêm hình ảnh nào.</p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-fadeIn overflow-hidden text-white"
    >
      {/* Top Header Bar */}
      <header className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 z-20">
        {/* Left: Album info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                {album.category || 'Câu chuyện ảnh'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {album.createdAt}
              </span>
            </div>
            <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-md lg:max-w-xl">
              {album.title}
            </h2>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
            <button
              onClick={() => setViewMode('slideshow')}
              title="Chế độ Trình chiếu"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'slideshow' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={14} />
              <span className="hidden md:inline text-[11px]">Slide Show</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Xem tất cả ảnh"
              className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                viewMode === 'grid' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Grid size={14} />
              <span className="hidden md:inline text-[11px]">Lưới ảnh</span>
            </button>
          </div>

          {/* Slideshow play/pause & speed (Only in slideshow mode) */}
          {viewMode === 'slideshow' && photos.length > 1 && (
            <div className="flex items-center bg-slate-800 rounded-xl p-0.5 border border-slate-700">
              <button
                onClick={() => setIsPlaying(prev => !prev)}
                className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  isPlaying ? 'bg-emerald-600 text-white animate-pulse' : 'text-slate-300 hover:text-white'
                }`}
                title={isPlaying ? 'Tạm dừng trình chiếu (Phím Space)' : 'Tự động chạy Slide Show (Phím Space)'}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                <span className="hidden sm:inline text-[11px]">
                  {isPlaying ? 'Đang chạy' : 'Tự chạy'}
                </span>
              </button>

              <select
                value={playIntervalSec}
                onChange={(e) => setPlayIntervalSec(Number(e.target.value))}
                className="bg-transparent text-slate-300 text-[10px] font-bold px-1.5 py-1 focus:outline-none cursor-pointer"
                title="Tốc độ chuyển ảnh"
              >
                <option value={3} className="bg-slate-900 text-white">3s</option>
                <option value={5} className="bg-slate-900 text-white">5s</option>
                <option value={8} className="bg-slate-900 text-white">8s</option>
              </select>
            </div>
          )}

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>

          {/* Close button */}
          <button
            onClick={onClose}
            title="Đóng (Phím Esc)"
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      {viewMode === 'slideshow' ? (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Slideshow Viewport */}
          <div className="flex-1 relative flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            {/* Previous Button */}
            {photos.length > 1 && (
              <button
                onClick={handlePrev}
                title="Ảnh trước (Mũi tên trái ←)"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white border border-slate-700 hover:border-blue-500 flex items-center justify-center transition shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* Next Button */}
            {photos.length > 1 && (
              <button
                onClick={handleNext}
                title="Ảnh sau (Mũi tên phải →)"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/70 hover:bg-blue-600 text-white border border-slate-700 hover:border-blue-500 flex items-center justify-center transition shadow-xl backdrop-blur-sm cursor-pointer hover:scale-105"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* Current Image Container */}
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <img
                src={currentPhoto?.url}
                alt={currentPhoto?.title || currentPhoto?.caption || `Ảnh ${currentIndex + 1}`}
                onLoad={() => setImageLoaded(true)}
                className={`max-h-[52vh] sm:max-h-[58vh] max-w-[92vw] object-contain rounded-2xl shadow-2xl border border-slate-800 transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </div>
          </div>

          {/* CAPTION & STORY SECTION (UNDER IMAGE - AS REQUESTED) */}
          <div className="bg-slate-900/90 border-t border-slate-800/90 px-4 py-3 shrink-0 z-10 backdrop-blur-sm shadow-xl">
            <div className="max-w-4xl mx-auto space-y-2">
              {/* Caption Header: Index badge & Title & Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 rounded-full text-[11px] font-mono font-bold">
                    Ảnh {currentIndex + 1} / {photos.length}
                  </span>
                  {currentPhoto?.title && (
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      {currentPhoto.title}
                    </span>
                  )}
                </div>

                {/* Hyperlink & Copy tools */}
                <div className="flex items-center gap-2">
                  {currentPhoto?.url && (
                    <a
                      href={currentPhoto.link || currentPhoto.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                      title="Mở liên kết ảnh gốc"
                    >
                      <ExternalLink size={12} />
                      <span>Xem ảnh gốc</span>
                    </a>
                  )}

                  <button
                    onClick={handleCopyLink}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    title="Sao chép đường dẫn ảnh"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copied ? 'Đã chép link' : 'Sao chép link'}</span>
                  </button>
                </div>
              </div>

              {/* CAPTION TEXT - CHÚ THÍCH CÂU CHUYỆN */}
              <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
                <p className="text-xs sm:text-[13px] leading-relaxed text-slate-200 font-medium">
                  {currentPhoto?.caption || 'Không có chú thích cho bức ảnh này.'}
                </p>
              </div>
            </div>
          </div>

          {/* Thumbnails strip at the bottom */}
          {photos.length > 1 && (
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800/80 shrink-0 overflow-x-auto custom-scrollbar">
              <div 
                ref={thumbnailsRef}
                className="flex items-center justify-start sm:justify-center gap-2 min-w-max mx-auto py-1"
              >
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    onClick={() => {
                      setImageLoaded(false);
                      setCurrentIndex(idx);
                    }}
                    className={`relative w-14 h-10 sm:w-16 sm:h-11 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                      idx === currentIndex 
                        ? 'border-blue-500 ring-2 ring-blue-500/40 scale-105 opacity-100 shadow-md' 
                        : 'border-slate-700 opacity-50 hover:opacity-90 hover:border-slate-500'
                    }`}
                  >
                    <img 
                      src={photo.url} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute bottom-0 right-0 px-1 bg-black/70 text-[8px] font-mono font-bold text-white rounded-tl">
                      {idx + 1}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Grid Gallery Mode */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-white">Tất cả {photos.length} hình ảnh & chú thích trong Album</h3>
                <p className="text-xs text-slate-400 mt-0.5">Nhấp vào bất kỳ ảnh nào để mở trình chiếu Slide Show tương ứng.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo, idx) => (
                <div
                  key={photo.id || idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setViewMode('slideshow');
                  }}
                  className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden hover:border-blue-500/60 hover:shadow-xl transition group cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img 
                      src={photo.url} 
                      alt={photo.title || `Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md">
                      #{idx + 1}
                    </div>
                    <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5">
                        <Play size={12} fill="currentColor" /> Xem trình chiếu
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 space-y-1.5 flex-1 flex flex-col justify-between">
                    {photo.title && (
                      <h4 className="text-xs font-extrabold text-white group-hover:text-blue-400 transition">
                        {photo.title}
                      </h4>
                    )}
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                      {photo.caption}
                    </p>
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="truncate max-w-[180px] font-mono text-slate-500">
                        {photo.url}
                      </span>
                      <span className="text-blue-400 font-bold flex items-center gap-1">
                        Xem chi tiết →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumSlideshowModal;

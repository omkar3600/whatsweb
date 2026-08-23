"use client";

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import {
    X, Grid3X3, Upload, Trash2, Send, Image, Video, Music,
    FileArchive, FileText, Loader2, Plus, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';

type GalleryTab = 'all' | 'images' | 'video' | 'audio' | 'pdf' | 'other';

interface MediaGalleryModalProps {
    open: boolean;
    onClose: () => void;
    /** When set, clicking a media item calls this with the item. Used in inbox/campaigns to "pick" media. */
    onSelect?: (item: { id: string; fileUrl: string; fileType: string; fileName: string | null }) => void;
    /** Label for the select action button overlay. Defaults to "Send" */
    selectLabel?: string;
    /** If true, shows delete buttons on each item. Default true. */
    showDelete?: boolean;
}

export default function MediaGalleryModal({
    open,
    onClose,
    onSelect,
    selectLabel = 'Send',
    showDelete = true,
}: MediaGalleryModalProps) {
    const [items, setItems] = useState<any[]>([]);
    const [tab, setTab] = useState<GalleryTab>('all');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) fetchItems();
    }, [open]);

    const fetchItems = async () => {
        try {
            const { data } = await api.get('/media');
            setItems(data);
        } catch { }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            await api.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))),
            });
            toast.success('Uploaded to gallery');
            fetchItems();
        } catch {
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    };

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ open: false, title: '', description: '', action: () => {} });

    const handleDelete = (id: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Media File',
            description: 'Are you sure you want to delete this media file permanently?',
            action: async () => {
                setDeletingId(id);
                try {
                    await api.delete(`/media/${id}`);
                    setItems(prev => prev.filter(i => i.id !== id));
                    toast.success('Deleted');
                } catch {
                    toast.error('Failed to delete');
                } finally {
                    setDeletingId(null);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    if (!open) return null;

    const tabs: { key: GalleryTab; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'images', label: 'Images' },
        { key: 'video', label: 'Video' },
        { key: 'audio', label: 'Audio' },
        { key: 'pdf', label: 'PDF' },
        { key: 'other', label: 'Other' },
    ];

    const filtered = items.filter((item: any) => {
        const ft = item.fileType || '';
        const matchesTab =
            tab === 'all' ? true :
            tab === 'images' ? ft.startsWith('image/') :
            tab === 'video' ? ft.startsWith('video/') :
            tab === 'audio' ? ft.startsWith('audio/') :
            tab === 'pdf' ? ft === 'application/pdf' :
            !ft.startsWith('image/') && !ft.startsWith('video/') && !ft.startsWith('audio/') && ft !== 'application/pdf';

        const matchesSearch = !search || (item.fileName || '').toLowerCase().includes(search.toLowerCase());
        return matchesTab && matchesSearch;
    });

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200"
                style={{ height: '520px' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
                    <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Grid3X3 className="h-5 w-5 text-emerald-500" />
                        Media Gallery
                    </h2>
                    <div className="flex items-center gap-2">
                        {isUploading ? (
                            <div className="flex items-center gap-2 text-xs text-emerald-500 font-bold">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {uploadProgress !== null && `${uploadProgress}%`}
                            </div>
                        ) : (
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                            >
                                <Plus className="h-3.5 w-3.5" /> Upload
                            </button>
                        )}
                        <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <input type="file" ref={fileRef} className="hidden" onChange={handleUpload} />

                {/* Search + Tabs */}
                <div className="px-5 pt-3 pb-2 space-y-2.5 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by filename..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-muted/50 border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex gap-1 overflow-x-auto">
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
                                    tab === t.key
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid — fixed height scrollable */}
                <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
                    {filtered.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <Grid3X3 className="h-12 w-12 opacity-15 mb-3" />
                            <p className="text-sm font-medium">No media found</p>
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="mt-3 text-xs font-bold text-emerald-500 hover:underline"
                            >
                                Upload your first file
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {filtered.map((item: any) => {
                                const isImage = item.fileType?.startsWith('image/');
                                const isVideo = item.fileType?.startsWith('video/');
                                const isAudio = item.fileType?.startsWith('audio/');
                                const isPdf = item.fileType === 'application/pdf';
                                const isDeleting = deletingId === item.id;

                                return (
                                    <div
                                        key={item.id}
                                        className={`relative aspect-square rounded-xl overflow-hidden border border-border group transition-all ${
                                            isDeleting ? 'opacity-40' : 'hover:ring-2 hover:ring-emerald-500'
                                        }`}
                                    >
                                        {/* Thumbnail */}
                                        {isImage ? (
                                            <img src={item.fileUrl} alt="" className="w-full h-full object-cover" />
                                        ) : isVideo ? (
                                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
                                                <Video className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Video</span>
                                            </div>
                                        ) : isAudio ? (
                                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
                                                <Music className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">Audio</span>
                                            </div>
                                        ) : isPdf ? (
                                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1">
                                                <FileText className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[8px] font-bold text-muted-foreground uppercase">PDF</span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-1 p-1">
                                                <FileArchive className="h-6 w-6 text-muted-foreground" />
                                                <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                                                    {item.fileName || 'File'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                                            {onSelect && (
                                                <button
                                                    onClick={() => onSelect(item)}
                                                    className="h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg"
                                                    title={selectLabel}
                                                >
                                                    <Send className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {showDelete && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                                                    className="h-8 w-8 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 transition-colors shadow-lg"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Filename strip */}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                                            <p className="text-[8px] text-white truncate font-medium">{item.fileName || 'Untitled'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-2.5 border-t border-border bg-muted/30 text-[11px] text-muted-foreground font-medium flex items-center justify-between shrink-0">
                    <span>{items.length} total files • {filtered.length} shown</span>
                    <span>{(items.reduce((s: number, i: any) => s + (i.fileSize || 0), 0) / (1024 * 1024)).toFixed(1)} MB used</span>
                </div>
            </div>

            {/* Confirmation Modal */}
            <ConfirmModal
                open={confirmState.open}
                onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                description={confirmState.description}
                variant="destructive"
                confirmText="Delete File"
            />
        </div>
    );
}

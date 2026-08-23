"use client";

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import {
    Grid3X3, Upload, Trash2, Search, Image, Video, Music,
    FileText, FileArchive, Loader2, Plus, ExternalLink, Download, Info
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConfirmModal } from '@/components/ui/confirm-modal';

type Tab = 'all' | 'images' | 'video' | 'audio' | 'pdf' | 'other';

export default function MediaPage() {
    const { data: fetchedItems, mutate } = useSWR<any[]>('/media');
    const items = fetchedItems || [];
    const [tab, setTab] = useState<Tab>('all');
    const [search, setSearch] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchItems = () => mutate();

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (files.length === 0) return;

        setIsUploading(true);
        let uploaded = 0;
        for (let i = 0; i < files.length; i++) {
            try {
                const formData = new FormData();
                formData.append('file', files[i]);
                await api.post('/media/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / (p.total || 1))),
                });
                uploaded++;
            } catch {
                toast.error(`Failed to upload: ${files[i].name}`);
            }
        }
        setIsUploading(false);
        setUploadProgress(null);
        if (uploaded > 0) {
            toast.success(`Uploaded ${uploaded} file${uploaded > 1 ? 's' : ''}`);
            fetchItems();
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
            description: 'Are you sure you want to delete this file permanently? Any template headers using this media may be broken.',
            action: async () => {
                setDeletingId(id);
                try {
                    await api.delete(`/media/${id}`);
                    mutate((prev: any[] | undefined) => prev?.filter((i: any) => i.id !== id), { revalidate: false });
                    if (selectedItem?.id === id) setSelectedItem(null);
                    toast.success('File deleted');
                } catch {
                    toast.error('Failed to delete');
                } finally {
                    setDeletingId(null);
                    setConfirmState(prev => ({ ...prev, open: false }));
                }
            }
        });
    };

    const tabs: { key: Tab; label: string; icon: any }[] = [
        { key: 'all', label: 'All Files', icon: Grid3X3 },
        { key: 'images', label: 'Images', icon: Image },
        { key: 'video', label: 'Video', icon: Video },
        { key: 'audio', label: 'Audio', icon: Music },
        { key: 'pdf', label: 'PDF', icon: FileText },
        { key: 'other', label: 'Other', icon: FileArchive },
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

    const totalSize = items.reduce((s: number, i: any) => s + (i.fileSize || 0), 0);
    const tabCounts = {
        all: items.length,
        images: items.filter(i => i.fileType?.startsWith('image/')).length,
        video: items.filter(i => i.fileType?.startsWith('video/')).length,
        audio: items.filter(i => i.fileType?.startsWith('audio/')).length,
        pdf: items.filter(i => i.fileType === 'application/pdf').length,
        other: items.filter(i => {
            const ft = i.fileType || '';
            return !ft.startsWith('image/') && !ft.startsWith('video/') && !ft.startsWith('audio/') && ft !== 'application/pdf';
        }).length,
    };

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-7xl mx-auto">
            <input type="file" ref={fileRef} className="hidden" multiple onChange={handleUpload} />

            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Media Asset Workspace</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage images, documents, videos, and audio assets for WhatsApp broadcasts and templates.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block pr-2">
                        <p className="text-xs font-semibold text-foreground">{items.length} assets stored</p>
                        <p className="text-[10px] text-muted-foreground">{formatSize(totalSize)} total volume</p>
                    </div>
                    <button
                        onClick={() => fileRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all disabled:opacity-50"
                    >
                        {isUploading ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading {uploadProgress}%</>
                        ) : (
                            <><Upload className="h-3.5 w-3.5" /> Upload Media</>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Main Content Area (3 cols) */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Controls Bar: Tabs & Search */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/80 p-2.5 rounded-xl shadow-sm">
                        {/* Tabs */}
                        <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                            {tabs.map(t => {
                                const Icon = t.icon;
                                const active = tab === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        onClick={() => setTab(t.key)}
                                        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                                            active
                                                ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        <span>{t.label}</span>
                                        <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                                            active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                                        }`}>
                                            {tabCounts[t.key]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-56 shrink-0">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            />
                        </div>
                    </div>

                    {/* Media Grid */}
                    {filtered.length === 0 ? (
                        <div className="p-16 text-center border border-dashed border-border rounded-xl bg-card/50">
                            <Grid3X3 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                            <p className="text-sm font-semibold text-foreground">No media assets found</p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">Upload new images, PDFs, videos or audio clips to manage them in your workspace.</p>
                            <button
                                onClick={() => fileRef.current?.click()}
                                className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline"
                            >
                                <Upload className="h-3.5 w-3.5" /> Upload First Asset
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filtered.map((item: any) => {
                                const isImage = item.fileType?.startsWith('image/');
                                const isVideo = item.fileType?.startsWith('video/');
                                const isAudio = item.fileType?.startsWith('audio/');
                                const isPdf = item.fileType === 'application/pdf';
                                const isSelected = selectedItem?.id === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setSelectedItem(item)}
                                        className={`relative aspect-square rounded-xl overflow-hidden border transition-all group text-left ${
                                            isSelected
                                                ? 'border-primary ring-2 ring-primary/20 shadow-md'
                                                : 'border-border/80 bg-card hover:border-border hover:shadow-sm'
                                        } ${deletingId === item.id ? 'opacity-40' : ''}`}
                                    >
                                        {isImage ? (
                                            <img src={item.fileUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : isVideo ? (
                                            <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-1.5 p-2">
                                                <Video className="h-7 w-7 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Video</span>
                                            </div>
                                        ) : isAudio ? (
                                            <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-1.5 p-2">
                                                <Music className="h-7 w-7 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Audio</span>
                                            </div>
                                        ) : isPdf ? (
                                            <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-1.5 p-2">
                                                <FileText className="h-7 w-7 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">PDF</span>
                                            </div>
                                        ) : (
                                            <div className="w-full h-full bg-muted/40 flex flex-col items-center justify-center gap-1.5 p-2">
                                                <FileArchive className="h-7 w-7 text-muted-foreground/80 group-hover:text-primary transition-colors" />
                                                <span className="text-[8px] text-muted-foreground truncate w-full text-center">
                                                    {item.fileName || 'File'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Overlay Filename Tag */}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                                            <p className="text-[10px] text-white font-medium truncate">{item.fileName || 'Untitled'}</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Media Details Sidebar Panel */}
                <div className="lg:col-span-1 border border-border/80 bg-card rounded-xl shadow-sm overflow-hidden sticky top-4">
                    {selectedItem ? (
                        <div>
                            {/* Media Preview Box */}
                            <div className="h-44 bg-muted/40 border-b border-border/80 flex items-center justify-center overflow-hidden p-2">
                                {selectedItem.fileType?.startsWith('image/') ? (
                                    <img src={selectedItem.fileUrl} alt="" className="w-full h-full object-contain" />
                                ) : selectedItem.fileType?.startsWith('video/') ? (
                                    <video src={selectedItem.fileUrl} controls className="w-full h-full object-contain" />
                                ) : selectedItem.fileType?.startsWith('audio/') ? (
                                    <div className="p-4 w-full text-center">
                                        <Music className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                        <audio src={selectedItem.fileUrl} controls className="w-full text-xs" />
                                    </div>
                                ) : (
                                    <div className="text-center p-6">
                                        <FileArchive className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-xs text-muted-foreground font-medium">No inline preview</p>
                                    </div>
                                )}
                            </div>

                            {/* Details Information */}
                            <div className="p-4 space-y-3">
                                <div>
                                    <h3 className="font-semibold text-xs text-foreground truncate" title={selectedItem.fileName}>
                                        {selectedItem.fileName || 'Untitled'}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{selectedItem.fileType}</p>
                                </div>

                                <div className="space-y-1.5 text-xs border-t border-b border-border/50 py-2.5">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-[11px]">Size</span>
                                        <span className="text-foreground font-medium text-[11px]">{formatSize(selectedItem.fileSize || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground text-[11px]">Uploaded</span>
                                        <span className="text-foreground font-medium text-[11px]">{format(new Date(selectedItem.createdAt), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>

                                {/* URL Copy Box */}
                                <div>
                                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Direct CDN URL</label>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(selectedItem.fileUrl); toast.success('URL copied to clipboard!'); }}
                                        className="w-full text-[10px] text-muted-foreground hover:text-foreground p-2 bg-muted/50 rounded-lg truncate text-left font-mono border border-border/60 transition-colors"
                                        title="Click to copy URL"
                                    >
                                        {selectedItem.fileUrl}
                                    </button>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <a
                                        href={selectedItem.fileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground px-3 py-1.5 rounded-lg transition-colors border border-border/60"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" /> Open
                                    </a>
                                    <button
                                        onClick={() => handleDelete(selectedItem.id)}
                                        disabled={deletingId === selectedItem.id}
                                        className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 border border-rose-500/20"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-10 text-center text-muted-foreground">
                            <Info className="h-8 w-8 mx-auto opacity-20 mb-2" />
                            <p className="text-xs font-medium text-foreground">No File Selected</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Click any asset in the gallery to inspect its details and copy link.</p>
                        </div>
                    )}
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

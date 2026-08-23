"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import useSWR from 'swr';
import { Bot, Plus, Trash2, Power, Zap, MessageSquare, Clock, Edit2 } from 'lucide-react';
import { PageLoading } from '@/components/ui/loading';
import { toast } from 'sonner';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function AutomationsPage() {
    const { data: fetchedAutomations, mutate, isLoading } = useSWR<any[]>('/automations');
    const automations = fetchedAutomations || [];
    const loading = isLoading && !fetchedAutomations;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAutomation, setNewAutomation] = useState({
        type: 'keyword',
        triggerKeyword: '',
        replyText: '',
    });
    const [isEditing, setIsEditing] = useState<string | null>(null);

    const fetchAutomations = () => mutate();

    const [confirmState, setConfirmState] = useState<{
        open: boolean;
        title: string;
        description: string;
        action: () => void;
    }>({ open: false, title: '', description: '', action: () => {} });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await api.put(`/automations/${isEditing}`, newAutomation);
            } else {
                await api.post('/automations', newAutomation);
            }
            setIsModalOpen(false);
            setNewAutomation({ type: 'keyword', triggerKeyword: '', replyText: '' });
            setIsEditing(null);
            fetchAutomations();
        } catch (err) {
            console.error(err);
            toast.error(isEditing ? 'Failed to update automation' : 'Failed to create automation');
        }
    };

    const handleEdit = (auto: any) => {
        setNewAutomation({
            type: auto.type,
            triggerKeyword: auto.triggerKeyword || '',
            replyText: auto.replyText
        });
        setIsEditing(auto.id);
        setIsModalOpen(true);
    };

    const toggleStatus = async (id: string, current: boolean) => {
        try {
            await api.put(`/automations/${id}`, { isActive: !current });
            fetchAutomations();
        } catch (err) { console.error(err); toast.error("An unexpected error occurred"); }
    };

    const deleteAutomation = (id: string) => {
        setConfirmState({
            open: true,
            title: 'Delete Automation',
            description: 'Are you sure you want to delete this automation rule?',
            action: async () => {
                try {
                    await api.delete(`/automations/${id}`);
                    toast.success('Automation deleted');
                    fetchAutomations();
                } catch (err) { console.error(err); toast.error("An unexpected error occurred"); }
                finally { setConfirmState(prev => ({ ...prev, open: false })); }
            }
        });
    };

    if (loading) return <PageLoading label="Loading automations" />;

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Smart Automations</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Configure instant keyword triggers, welcome messages, and out-of-office automated replies.
                    </p>
                </div>
                <button
                    onClick={() => { setIsEditing(null); setNewAutomation({ type: 'keyword', triggerKeyword: '', replyText: '' }); setIsModalOpen(true); }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span>New Automation</span>
                </button>
            </div>

            {/* Automation Rules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {automations.map((auto) => (
                    <div
                        key={auto.id}
                        className={`bg-card p-5 rounded-xl border transition-all flex flex-col justify-between ${
                            auto.isActive ? 'border-border/80 shadow-sm' : 'border-border/40 opacity-70 bg-muted/20'
                        }`}
                    >
                        <div>
                            {/* Card Top: Icon & Controls */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${
                                        auto.type === 'welcome' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
                                        auto.type === 'away' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                                        'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                                    }`}>
                                        {auto.type === 'welcome' ? <Zap className="h-4 w-4" /> : auto.type === 'away' ? <Clock className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-xs text-foreground capitalize">{auto.type} Rule</h3>
                                        <span className="text-[10px] text-muted-foreground">
                                            {auto.isActive ? 'Active' : 'Disabled'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleEdit(auto)}
                                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                                        title="Edit automation"
                                    >
                                        <Edit2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => deleteAutomation(auto.id)}
                                        className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-colors"
                                        title="Delete automation"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => toggleStatus(auto.id, auto.isActive)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${auto.isActive ? 'bg-primary' : 'bg-muted'}`}
                                    >
                                        <span className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${auto.isActive ? 'translate-x-4' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Trigger details */}
                            {auto.triggerKeyword && (
                                <div className="mb-3">
                                    <span className="text-[10px] font-mono font-semibold bg-muted text-foreground px-2 py-0.5 rounded border border-border/50">
                                        Trigger: &quot;{auto.triggerKeyword}&quot;
                                    </span>
                                </div>
                            )}

                            {/* Reply preview */}
                            <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                                <p className="text-xs text-foreground/90 font-normal leading-relaxed line-clamp-3">
                                    &quot;{auto.replyText}&quot;
                                </p>
                            </div>
                        </div>
                    </div>
                ))}

                {automations.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-card rounded-xl border border-dashed border-border p-6">
                        <Bot className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
                        <h3 className="text-sm font-semibold text-foreground">No Automations Configured</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            Save time by automating repetitive customer inquiries, greeting new leads, and setting out-of-office responses.
                        </p>
                        <button
                            onClick={() => { setIsEditing(null); setNewAutomation({ type: 'keyword', triggerKeyword: '', replyText: '' }); setIsModalOpen(true); }}
                            className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary hover:underline"
                        >
                            <Plus className="h-3.5 w-3.5" /> Create Automation Rule
                        </button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-base font-semibold text-foreground mb-4">{isEditing ? 'Edit Automation Rule' : 'Create Automation Rule'}</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Automation Type</label>
                                <select
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none"
                                    value={newAutomation.type}
                                    onChange={(e) => setNewAutomation({ ...newAutomation, type: e.target.value })}
                                >
                                    <option value="keyword">Keyword Trigger</option>
                                    <option value="welcome">Welcome Message</option>
                                    <option value="away">Away Reply</option>
                                </select>
                            </div>

                            {newAutomation.type === 'keyword' && (
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Trigger Keyword</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. price, hours, location"
                                        className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                                        value={newAutomation.triggerKeyword}
                                        onChange={(e) => setNewAutomation({ ...newAutomation, triggerKeyword: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Automated Reply Text</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Enter the message to automatically respond with..."
                                    className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none placeholder:text-muted-foreground"
                                    value={newAutomation.replyText}
                                    onChange={(e) => setNewAutomation({ ...newAutomation, replyText: e.target.value })}
                                />
                            </div>

                            <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-border/50">
                                <button
                                    type="button"
                                    onClick={() => { setIsModalOpen(false); setIsEditing(null); setNewAutomation({ type: 'keyword', triggerKeyword: '', replyText: '' }); }}
                                    className="rounded-lg px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                                >
                                    {isEditing ? 'Update Automation' : 'Save Automation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmModal
                open={confirmState.open}
                onClose={() => setConfirmState(prev => ({ ...prev, open: false }))}
                onConfirm={confirmState.action}
                title={confirmState.title}
                description={confirmState.description}
                variant="destructive"
                confirmText="Delete Automation"
            />
        </div>
    );
}

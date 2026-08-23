"use client";

import React from 'react';
import { AlertTriangle, Trash2, ShieldAlert, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'destructive' | 'primary' | 'warning';
    isLoading?: boolean;
    /** Optional controlled reason field rendered inside the modal (e.g. for consent changes). */
    reason?: string;
    onReasonChange?: (reason: string) => void;
    reasonPlaceholder?: string;
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'destructive',
    isLoading: controlledLoading = false,
    reason,
    onReasonChange,
    reasonPlaceholder = 'Optional reason...',
}: ConfirmModalProps) {
    const [localLoading, setLocalLoading] = React.useState(false);
    const isLoading = controlledLoading || localLoading;

    if (!open) return null;

    const variantStyles = {
        destructive: {
            iconBg: 'bg-destructive/10 text-destructive',
            icon: Trash2,
            confirmBtn: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        },
        warning: {
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
            icon: AlertTriangle,
            confirmBtn: 'bg-amber-600 text-white hover:bg-amber-700',
        },
        primary: {
            iconBg: 'bg-primary/10 text-primary',
            icon: ShieldAlert,
            confirmBtn: 'bg-primary text-primary-foreground hover:bg-primary/90',
        },
    };

    const currentVariant = variantStyles[variant] || variantStyles.destructive;
    const Icon = currentVariant.icon;

    const handleConfirmClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isLoading) return;
        
        const result = onConfirm() as unknown;
        if (result && result instanceof Promise) {
            setLocalLoading(true);
            try {
                await result;
            } finally {
                setLocalLoading(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-start gap-3">
                    <div className={`p-2.5 rounded-lg shrink-0 ${currentVariant.iconBg}`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                    </div>
                </div>

                {typeof reason === 'string' && onReasonChange && (
                    <textarea
                        value={reason}
                        onChange={(e) => onReasonChange(e.target.value)}
                        placeholder={reasonPlaceholder}
                        rows={2}
                        className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground resize-none"
                    />
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirmClick}
                        disabled={isLoading}
                        className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold shadow-2xs transition-all duration-200 active:scale-[0.98] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed ${currentVariant.confirmBtn}`}
                    >
                        {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        <span>{isLoading ? 'Processing...' : confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

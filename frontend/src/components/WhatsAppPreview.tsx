"use client";

import React from 'react';
import { ExternalLink, Phone, PlayCircle, FileText, Image as ImageIcon } from 'lucide-react';

interface WhatsAppPreviewProps {
    template: any; // The Meta template object containing components
    templateParams?: Record<string, string>; // Mapping of { "1": "Value" } or { "{{1}}": "Value" }
    buttonParams?: Record<string, string>; // Mapping of button index to dynamic param
    headerMediaUrl?: string; // Optional URL for media preview
}

const formatText = (text: string, params: Record<string, string>, template?: any) => {
    if (!text) return null;

    // Extract example values from the template's BODY component
    const bodyComponent = template?.components?.find((c: any) => c.type === 'BODY');
    const exampleValues = bodyComponent?.example?.body_text?.[0] || [];

    // 1. Replace variables {{1}}, {{2}} with params or highlight them
    let processed = text.replace(/{{\d+}}/g, (match) => {
        const key = match.replace(/[{}]/g, '');
        // Check all potential keys: "1", "{{1}}", "body_1", "header_1", etc.
        const val = params[key] || params[match] || params[`{{${key}}}`]
            || params[`body_${key}`] || params[`header_${key}`] || params[`footer_${key}`];
        
        // If user typed a value in the form, render it live in real time
        if (val !== undefined && val.trim() !== '') {
            return val;
        }
        
        // Otherwise, show sample value if available
        const index = parseInt(key, 10) - 1;
        if (exampleValues[index]) {
            return `<span class="bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded text-xs border border-amber-300/60 mx-0.5 inline-block leading-none italic" title="Placeholder (Variable ${key})">${exampleValues[index]}</span>`;
        }

        // Default placeholder
        return `<span class="bg-amber-100/80 text-amber-900 px-1.5 py-0.5 rounded font-mono text-xs border border-amber-300/60 mx-0.5 inline-block leading-none italic">[Var {{${key}}}]</span>`;
    });

    // 2. Handle line breaks
    const lines = processed.split('\n');

    return (
        <>
            {lines.map((line, i) => {
                // Escape HTML tags to prevent XSS (except our own span)
                let safeLine = line.replace(/<(?!\/?span[^>]*>)/g, '&lt;').replace(/(?<!<span[^>]*)> /g, '&gt;');
                
                // Basic WhatsApp Markdown
                const formatted = safeLine
                    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
                    .replace(/_(.*?)_/g, '<em>$1</em>')
                    .replace(/~(.*?)~/g, '<del>$1</del>');

                return (
                    <span key={i}>
                        <span dangerouslySetInnerHTML={{ __html: formatted }} />
                        {i !== lines.length - 1 && <br />}
                    </span>
                );
            })}
        </>
    );
};

export default function WhatsAppPreview({ template, templateParams = {}, buttonParams = {}, headerMediaUrl }: WhatsAppPreviewProps) {
    if (!template || !template.components) {
        return (
            <div className="h-[600px] w-full max-w-[350px] mx-auto flex items-center justify-center bg-slate-50 border-[8px] border-slate-200 rounded-[30px] text-muted-foreground text-sm p-4 text-center">
                Select a template to view preview
            </div>
        );
    }

    const header = template.components.find((c: any) => c.type === 'HEADER');
    const body = template.components.find((c: any) => c.type === 'BODY');
    const footer = template.components.find((c: any) => c.type === 'FOOTER');
    const buttons = template.components.find((c: any) => c.type === 'BUTTONS')?.buttons || [];

    return (
        <div className="w-full max-w-[350px] mx-auto rounded-[30px] border-[8px] border-slate-900 bg-[#EFEAE2] overflow-hidden shadow-xl relative h-[600px] flex flex-col">
            {/* WhatsApp App Header Simulation */}
            <div className="bg-[#075E54] text-white px-4 py-3 flex items-center gap-3 z-10 shadow-sm">
                <div className="w-8 h-8 rounded-full bg-slate-300 overflow-hidden flex items-center justify-center shrink-0">
                    <span className="text-slate-500 text-xs font-bold">WH</span>
                </div>
                <div>
                    <div className="font-bold text-sm leading-tight">Business Account</div>
                    <div className="text-[10px] text-white/70">Official Business Account</div>
                </div>
            </div>

            {/* Chat Background Pattern Simulation */}
            <div 
                className="absolute inset-0 opacity-10 pointer-events-none" 
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%23000000' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                    backgroundSize: '100px'
                }}
            />

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 z-10 scrollbar-hide flex flex-col items-start">
                <div className="bg-white rounded-lg rounded-tl-none shadow-sm w-fit max-w-[90%] p-1.5 relative mb-2">
                    {/* Header Rendering */}
                    {header && (
                        <div className="mb-1.5">
                            {header.format === 'IMAGE' && (
                                <div className="w-full aspect-video bg-slate-100 rounded-md overflow-hidden flex items-center justify-center relative min-w-[200px]">
                                    {headerMediaUrl ? (
                                        <img src={headerMediaUrl} alt="Header" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                                            <ImageIcon className="h-8 w-8 opacity-60" />
                                            <span className="text-[10px]">Header Image</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {header.format === 'VIDEO' && (
                                <div className="w-full aspect-video bg-slate-800 rounded-md overflow-hidden flex items-center justify-center relative min-w-[200px]">
                                    {headerMediaUrl ? (
                                        <video src={headerMediaUrl} controls className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-white/70 gap-1">
                                            <PlayCircle className="h-10 w-10 opacity-70" />
                                            <span className="text-[10px]">Header Video</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {header.format === 'DOCUMENT' && (
                                <div className="w-full h-24 bg-rose-50 border border-rose-100 rounded-md flex flex-col items-center justify-center text-rose-500 min-w-[200px]">
                                    <FileText className="h-8 w-8 mb-1" />
                                    <span className="text-[10px] font-bold">
                                        {headerMediaUrl ? 'DOCUMENT ATTACHED' : 'DOCUMENT PDF'}
                                    </span>
                                </div>
                            )}
                            {header.format === 'TEXT' && (
                                <div className="px-1.5 pt-1 font-bold text-[14px] text-slate-800">
                                    {formatText(header.text, templateParams, template)}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Body Rendering */}
                    {body && (
                        <div className="px-1.5 py-1 text-[14px] text-slate-800 leading-[1.3] whitespace-pre-wrap font-sans">
                            {formatText(body.text, templateParams, template)}
                        </div>
                    )}

                    {/* Footer Rendering */}
                    {footer && (
                        <div className="px-1.5 pt-1 pb-2 text-[11px] text-slate-400">
                            {formatText(templateParams['footer_1'] || footer.text, templateParams, template)}
                        </div>
                    )}

                    {/* Timestamp dummy */}
                    <div className="text-[9px] text-slate-400 text-right px-2 pb-1 mt-1">
                        12:00 PM
                    </div>
                </div>

                {/* Buttons Rendering */}
                {buttons.length > 0 && (
                    <div className="w-fit max-w-[90%] min-w-[200px] bg-white rounded-lg shadow-sm flex flex-col overflow-hidden divide-y divide-slate-100 mt-1">
                        {buttons.map((btn: any, idx: number) => {
                            const btnParam = buttonParams[idx] || buttonParams[String(idx)];
                            return (
                                <div key={idx} className="px-4 py-2.5 flex items-center justify-center gap-2 text-[#00a884] bg-white hover:bg-slate-50 cursor-pointer transition-colors active:bg-slate-100">
                                    {btn.type === 'URL' && <ExternalLink className="h-4 w-4 shrink-0" />}
                                    {btn.type === 'PHONE_NUMBER' && <Phone className="h-4 w-4 shrink-0" />}
                                    <span className="text-sm font-medium truncate">
                                        {btn.text}
                                        {btnParam ? ` (${btnParam})` : ''}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

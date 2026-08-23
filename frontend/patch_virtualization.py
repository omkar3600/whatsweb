with open(r'd:\root\WhatsHub\frontend\src\app\(dashboard)\inbox\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace sidebar mapping with virtualizer
old_sidebar = '''                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/50">
                                <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            conversations.map(convo => (
                                <button
                                    key={convo.id}
                                    onClick={() => handleSelectConvo(convo)}
                                    className={w-full flex items-start gap-3 p-3.5 text-left transition-colors border-b border-border/50 hover:bg-muted/40 }
                                >
                                    {activeConvo?.id === convo.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                                    
                                    <div className="relative shrink-0">
                                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary shadow-inner border border-primary/10">
                                            {convo.contact?.name?.charAt(0)?.toUpperCase() || convo.contact?.phone?.charAt(0) || '?'}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex justify-between items-baseline mb-1">
                                            <h3 className={	ext-[13px] truncate pr-2 }>
                                                {convo.contact?.name || convo.contact?.phone || 'Unknown'}
                                            </h3>
                                            <span className={	ext-[10px] shrink-0 font-medium }>
                                                {formatTime(convo.lastMessageAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={	ext-xs truncate }>
                                                {convo.contact?.phone}
                                            </p>
                                            {convo.unreadCount > 0 && (
                                                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                                                    {convo.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}'''

new_sidebar = '''                        {conversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground/50">
                                <MessageSquare className="h-10 w-10 mb-3 opacity-20" />
                                <p className="text-sm font-medium">No conversations yet</p>
                            </div>
                        ) : (
                            <VirtualConversationList 
                                conversations={conversations} 
                                activeConvo={activeConvo} 
                                handleSelectConvo={handleSelectConvo} 
                                formatTime={formatTime} 
                            />
                        )}'''

# Inject VirtualConversationList component at the top of the file
import_search = "export default function InboxPage() {"
virtual_list_component = '''function VirtualConversationList({ conversations, activeConvo, handleSelectConvo, formatTime }: any) {
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
        count: conversations.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 72,
        overscan: 5,
    });

    return (
        <div ref={parentRef} className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div style={{ height: ${virtualizer.getTotalSize()}px, width: '100%', position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualItem) => {
                    const convo = conversations[virtualItem.index];
                    return (
                        <div
                            key={virtualItem.key}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: ${virtualItem.size}px,
                                transform: 	ranslateY(px),
                            }}
                        >
                            <button
                                onClick={() => handleSelectConvo(convo)}
                                className={w-full h-full flex items-start gap-3 p-3.5 text-left transition-colors border-b border-border/50 hover:bg-muted/40 }
                            >
                                {activeConvo?.id === convo.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />}
                                
                                <div className="relative shrink-0">
                                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center font-bold text-primary shadow-inner border border-primary/10">
                                        {convo.contact?.name?.charAt(0)?.toUpperCase() || convo.contact?.phone?.charAt(0) || '?'}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <h3 className={	ext-[13px] truncate pr-2 }>
                                            {convo.contact?.name || convo.contact?.phone || 'Unknown'}
                                        </h3>
                                        <span className={	ext-[10px] shrink-0 font-medium }>
                                            {formatTime(convo.lastMessageAt)}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className={	ext-xs truncate }>
                                            {convo.contact?.phone}
                                        </p>
                                        {convo.unreadCount > 0 && (
                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-xs">
                                                {convo.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function InboxPage() {'''

content = content.replace(old_sidebar, new_sidebar)
content = content.replace(import_search, virtual_list_component)

with open(r'd:\root\WhatsHub\frontend\src\app\(dashboard)\inbox\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Virtualization injected successfully!")

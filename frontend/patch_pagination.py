with open(r'd:\root\WhatsWeb\frontend\src\app\(dashboard)\contacts\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = '''                            {hasMore && (
                                <div className="p-4 text-center border-t border-border">
                                    <Button variant="outline" size="sm" onClick={() => setPage(prev => prev + 1)}>
                                        Load More
                                    </Button>
                                </div>
                            )}'''

new_btn = '''                            <div className="p-4 flex items-center justify-between border-t border-border">
                                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                                    Previous
                                </Button>
                                <span className="text-xs text-muted-foreground">Page {page} of {fetchedData?.totalPages || 1}</span>
                                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>
                                    Next
                                </Button>
                            </div>'''

content = content.replace(old_btn, new_btn)

with open(r'd:\root\WhatsWeb\frontend\src\app\(dashboard)\contacts\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Pagination UI updated!")

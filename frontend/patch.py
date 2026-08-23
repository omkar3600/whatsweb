import re

with open(r'd:\root\WhatsHub\frontend\src\app\(dashboard)\contacts\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace state and useSWR
old_fetch = '''    const [consentFilter, setConsentFilter] = useState<string>('all');
    const { data: fetchedContacts, mutate, isLoading } = useSWR(
        consentFilter === 'all' ? '/contacts' : /contacts?consent=
    );
    const contacts = fetchedContacts || [];
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const router = useRouter();

    const [visibleCount, setVisibleCount] = useState(100);

    // Reset visible count when filter or search changes
    useEffect(() => {
        setVisibleCount(100);
    }, [search, selectedTag, consentFilter]);'''

new_fetch = '''    const [consentFilter, setConsentFilter] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [selectedTag, setSelectedTag] = useState<string>('all');
    const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
    const [page, setPage] = useState(1);
    const router = useRouter();

    const [debouncedSearch, setDebouncedSearch] = useState(search);
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, selectedTag, consentFilter]);

    const qs = new URLSearchParams({ page: page.toString(), limit: '50' });
    if (consentFilter !== 'all') qs.append('consent', consentFilter);
    if (selectedTag !== 'all') qs.append('tag', selectedTag);
    if (debouncedSearch) qs.append('search', debouncedSearch);

    const { data: fetchedData, mutate, isLoading } = useSWR(/contacts?);
    const contacts = fetchedData?.data || [];
    const hasMore = fetchedData?.hasMore;
    
    const { data: statsData } = useSWR('/contacts/stats');
    const stats = statsData || { total: 0, taggedCount: 0, citiesCount: 0, optedIn: 0, optedOut: 0, consentUnknown: 0 };
    
    const { data: tagsData } = useSWR('/contacts/tags');
    const availableTags = (tagsData || []).map((t: any) => t.tag);'''

content = content.replace(old_fetch, new_fetch)

# 2. Remove availableTags and stats useMemo
old_memos = '''    // Extract unique tags across all contacts
    const availableTags = useMemo(() => {
        const set = new Set<string>();
        contacts.forEach((c: any) => {
            if (Array.isArray(c.tags)) {
                c.tags.forEach((t: string) => { if (t?.trim()) set.add(t.trim()); });
            }
        });
        return Array.from(set).sort();
    }, [contacts]);

    // Summary statistics
    const stats = useMemo(() => {
        const total = contacts.length;
        const taggedCount = contacts.filter((c: any) => Array.isArray(c.tags) && c.tags.length > 0).length;
        const citiesCount = new Set(contacts.map((c: any) => c.city?.trim()).filter(Boolean)).size;
        const optedIn = contacts.filter((c: any) => (c.consentStatus || 'UNKNOWN') === 'OPTED_IN').length;
        const optedOut = contacts.filter((c: any) => (c.consentStatus || 'UNKNOWN') === 'OPTED_OUT').length;
        const consentUnknown = contacts.filter((c: any) => ['UNKNOWN', 'PENDING'].includes(c.consentStatus || 'UNKNOWN')).length;
        return { total, taggedCount, citiesCount, optedIn, optedOut, consentUnknown };
    }, [contacts]);'''

content = content.replace(old_memos, '')

# 3. Remove filteredContacts and visibleContacts
old_filters = '''    const filteredContacts = useMemo(() => {
        return contacts.filter((c: any) => {
            const matchesSearch = !search ||
                (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
                (c.phone || '').includes(search) ||
                (c.city || '').toLowerCase().includes(search.toLowerCase());

            const matchesTag = selectedTag === 'all' ||
                (Array.isArray(c.tags) && c.tags.includes(selectedTag));

            return matchesSearch && matchesTag;
        });
    }, [contacts, search, selectedTag]);

    const visibleContacts = useMemo(() => {
        return filteredContacts.slice(0, visibleCount);
    }, [filteredContacts, visibleCount]);'''

content = content.replace(old_filters, '')

# 4. Replace ilteredContacts.length with contacts.length (or etchedData?.total || 0) in UI
content = content.replace('filteredContacts.length > 0', 'contacts.length > 0')
content = content.replace('filteredContacts.length', '(fetchedData?.total || 0)')

# 5. Replace isibleContacts.map with contacts.map
content = content.replace('visibleContacts.map', 'contacts.map')

# 6. Replace isibleCount < filteredContacts.length with hasMore
content = content.replace('visibleCount < (fetchedData?.total || 0)', 'hasMore')
content = content.replace('setVisibleCount(prev => prev + 100)', 'setPage(prev => prev + 1)')

with open(r'd:\root\WhatsHub\frontend\src\app\(dashboard)\contacts\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch successful!")

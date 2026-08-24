import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ContactsService {
    private readonly logger = new Logger(ContactsService.name);
    private tagCountCache = new Map<string, { data: { tag: string; count: number }[]; expiresAt: number }>();

    constructor(
        private prisma: PrismaService
    ) { }

    clearTagCache(shopId?: string) {
        if (shopId) {
            this.tagCountCache.delete(shopId);
        } else {
            this.tagCountCache.clear();
        }
    }

    async createContact(shopId: string, data: any) {
        const { name, phone, tags, city, notes } = data;
        const contact = await this.prisma.contact.create({
            data: {
                shopId,
                name,
                phone,
                tags: tags || [],
                city,
                notes,
            },
        });
        this.clearTagCache(shopId);
        return contact;
    }

    async importFromExcel(shopId: string, file: Express.Multer.File): Promise<{ imported: number; skipped: number; errors: string[] }> {
        const ext = file.originalname.toLowerCase();
        if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls') && !ext.endsWith('.csv')) {
            throw new BadRequestException('Only .xlsx, .xls, and .csv files are supported');
        }

        let rows: any[];
        try {
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
        } catch (err) {
            this.logger.error('Failed to parse Excel file', err);
            throw new BadRequestException('Could not parse the uploaded file. Please check the format.');
        }

        if (!rows.length) {
            throw new BadRequestException('The file is empty or has no data rows.');
        }

        // Normalize column names — accept various header formats
        const normalizeKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, '');
        const headerMap: Record<string, string> = {};
        const rawHeaders = Object.keys(rows[0]);
        for (const h of rawHeaders) {
            const norm = normalizeKey(h);
            if (['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber', 'number', 'contact'].includes(norm)) {
                headerMap[h] = 'phone';
            } else if (['name', 'fullname', 'contactname', 'customername'].includes(norm)) {
                headerMap[h] = 'name';
            } else if (['tags', 'tag', 'label', 'labels', 'group', 'groups'].includes(norm)) {
                headerMap[h] = 'tags';
            } else if (['city', 'location', 'area'].includes(norm)) {
                headerMap[h] = 'city';
            } else if (['notes', 'note', 'comment', 'comments', 'description'].includes(norm)) {
                headerMap[h] = 'notes';
            }
        }

        // Ensure phone column exists
        if (!Object.values(headerMap).includes('phone')) {
            throw new BadRequestException(
                `Could not find a "Phone" column. Found columns: ${rawHeaders.join(', ')}. ` +
                `Expected: phone, name, tags, city, notes`
            );
        }

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const mapped: Record<string, any> = {};
            for (const [rawKey, mappedKey] of Object.entries(headerMap)) {
                mapped[mappedKey] = row[rawKey];
            }

            // Clean phone number
            let phone = String(mapped.phone || '').replace(/[\s\-\(\)\+\.]/g, '').trim();
            if (!phone || phone.length < 7) {
                skipped++;
                if (phone) errors.push(`Row ${i + 2}: Invalid phone "${phone}"`);
                continue;
            }

            // Auto-prefix with 91 if phone starts without country code (10 digits)
            if (phone.length === 10 && /^\d+$/.test(phone)) {
                phone = '91' + phone;
            }

            const name = String(mapped.name || '').trim() || 'Unknown';
            const city = mapped.city ? String(mapped.city).trim() : undefined;
            const notes = mapped.notes ? String(mapped.notes).trim() : undefined;
            let tags: string[] = [];
            if (mapped.tags) {
                tags = String(mapped.tags).split(',').map(t => t.trim()).filter(Boolean);
            }

            try {
                const contact = await this.prisma.contact.upsert({
                    where: { shopId_phone: { shopId, phone } },
                    create: { shopId, name, phone, tags, city, notes },
                    update: {
                        // Only update non-empty values — don't overwrite existing data with blanks
                        ...(name !== 'Unknown' ? { name } : {}),
                        ...(tags.length > 0 ? { tags } : {}),
                        ...(city ? { city } : {}),
                        ...(notes ? { notes } : {}),
                    },
                });
                
                imported++;
            } catch (err: any) {
                skipped++;
                errors.push(`Row ${i + 2}: ${err?.message?.substring(0, 80) || 'Database error'}`);
            }
        }

        this.logger.log(`[Import] shopId=${shopId}: imported=${imported}, skipped=${skipped}`);
        return { imported, skipped, errors: errors.slice(0, 20) }; // Max 20 error messages
    }

    async importBulk(shopId: string, rows: any[]): Promise<{ imported: number; skipped: number; errors: string[] }> {
        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            const mapped = rows[i];
            
            // Clean phone number
            let phone = String(mapped.phone || '').replace(/[\s\-\(\)\+\.]/g, '').trim();
            if (!phone || phone.length < 7) {
                skipped++;
                if (phone) errors.push(`Row ${i + 2}: Invalid phone "${phone}"`);
                continue;
            }

            // Auto-prefix with 91 if phone starts without country code (10 digits)
            if (phone.length === 10 && /^\d+$/.test(phone)) {
                phone = '91' + phone;
            }

            const name = String(mapped.name || '').trim() || 'Unknown';
            const city = mapped.city ? String(mapped.city).trim() : undefined;
            const notes = mapped.notes ? String(mapped.notes).trim() : undefined;
            let tags: string[] = [];
            if (mapped.tags) {
                tags = Array.isArray(mapped.tags) ? mapped.tags : String(mapped.tags).split(',').map(t => t.trim()).filter(Boolean);
            }

            try {
                const contact = await this.prisma.contact.upsert({
                    where: { shopId_phone: { shopId, phone } },
                    create: { shopId, name, phone, tags, city, notes },
                    update: {
                        // Only update non-empty values — don't overwrite existing data with blanks
                        ...(name !== 'Unknown' ? { name } : {}),
                        ...(tags.length > 0 ? { tags } : {}),
                        ...(city ? { city } : {}),
                        ...(notes ? { notes } : {}),
                    },
                });
                
                imported++;
            } catch (err: any) {
                skipped++;
                errors.push(`Row ${i + 2}: ${err?.message?.substring(0, 80) || 'Database error'}`);
            }
        }

        return { imported, skipped, errors };
    }

    private buildWhereClause(shopId: string, filters: any) {
        const { search, consent, tag, tags, cities } = filters || {};
        const conditions: any[] = [];
        
        if (tag && tag !== 'all') {
            conditions.push({ tags: { array_contains: tag } });
        }
        
        if (tags) {
            const tagArray = tags.split(',').map((t: string) => t.trim()).filter(Boolean);
            if (tagArray.length > 0) {
                conditions.push({
                    OR: tagArray.map((t: string) => ({ tags: { array_contains: t } }))
                });
            }
        }

        if (cities) {
            const cityArray = cities.split(',').map((c: string) => c.trim()).filter(Boolean);
            if (cityArray.length > 0) {
                conditions.push({ city: { in: cityArray } });
            }
        }

        if (search) {
            conditions.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } }
                ]
            });
        }
        
        if (consent === 'UNKNOWN') {
            conditions.push({
                OR: [
                    { marketingConsent: { is: null } },
                    { marketingConsent: { is: { status: 'UNKNOWN' } } },
                ],
            });

        } else if (consent && consent !== 'all') {
            conditions.push({ marketingConsent: { is: { status: consent } } });
        }
        
        return { shopId, ...(conditions.length > 0 ? { AND: conditions } : {}) };
    }

    async getContactCities(shopId: string) {
        if (!shopId) return [];
        const result = await this.prisma.contact.findMany({
            where: { shopId, city: { not: null } },
            select: { city: true },
            distinct: ['city']
        });
        return result.map(r => r.city).filter(c => c && c.trim() !== '');
    }

    async getAllMatchingIds(shopId: string, filters: any) {
        if (!shopId) return { ids: [] };
        const where = this.buildWhereClause(shopId, filters);
        const contacts = await this.prisma.contact.findMany({
            where,
            select: { id: true }
        });
        return { ids: contacts.map(c => c.id) };
    }

    async getContacts(shopId: string, filters: any) {
        const { page, limit, sortBy, sortOrder } = filters || {};

        if (!shopId) {
            this.logger.warn('[getContacts] Request made without valid shopId');
            if (page && limit) {
                return { data: [], total: 0, page: 1, totalPages: 0 };
            }
            return [];
        }

        const where = this.buildWhereClause(shopId, filters);
        let orderBy: any = { createdAt: 'desc' };
        if (sortBy) {
            orderBy = { [sortBy]: sortOrder || 'asc' };
        }

        const include = { marketingConsent: { select: { status: true } } } as any;
        const mapContact = (c: any) => ({
            ...c,
            consentStatus: c.marketingConsent?.status || 'UNKNOWN',
            marketingConsent: undefined,
        });

        try {
            if (page && limit) {
                const pageNumber = parseInt(page as string, 10) || 1;
                const limitNumber = parseInt(limit as string, 10) || 50;

                const [data, total] = await Promise.all([
                    this.prisma.contact.findMany({
                        where,
                        include,
                        orderBy,
                        skip: (pageNumber - 1) * limitNumber,
                        take: limitNumber,
                    }),
                    this.prisma.contact.count({ where })
                ]);

                return {
                    data: data.map(mapContact),
                    total,
                    page: pageNumber,
                    totalPages: Math.ceil(total / limitNumber),
                };
            }

            const contacts = await this.prisma.contact.findMany({
                where,
                include,
                orderBy,
                take: 1000,
            });
            return contacts.map(mapContact);
        } catch (err: any) {
            this.logger.error(`[getContacts] Database query failed for shopId="${shopId}": ${err?.message}`, err?.stack);
            throw err;
        }
    }

    async getContact(shopId: string, id: string) {
        const contact = await this.prisma.contact.findFirst({
            where: { id, shopId },
        });
        if (!contact) throw new NotFoundException('Contact not found');
        return contact;
    }

    async updateContact(shopId: string, id: string, data: any) {
        await this.getContact(shopId, id);
        const { name, phone, tags, city, notes } = data;
        const contact = await this.prisma.contact.update({
            where: { id },
            data: { name, phone, tags, city, notes },
        });
        this.clearTagCache(shopId);
        return contact;
    }

    async deleteContact(shopId: string, id: string) {
        await this.getContact(shopId, id);
        // Delete dependent records first
        const conversations = await this.prisma.conversation.findMany({ where: { shopId, contactId: id } });
        const convIds = conversations.map(c => c.id);
        
        if (convIds.length > 0) {
            await this.prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
            await this.prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
        }
        await this.prisma.campaignContact.updateMany({ where: { contactId: id }, data: { contactId: null } });
        
        this.clearTagCache(shopId);
        return this.prisma.contact.delete({
            where: { id },
        });
    }

    async deleteBulk(shopId: string, ids: string[]) {
        if (!ids || ids.length === 0) return { count: 0 };
        // Delete all dependent records for these specific contacts
        const conversations = await this.prisma.conversation.findMany({ where: { shopId, contactId: { in: ids } } });
        const convIds = conversations.map(c => c.id);
        
        if (convIds.length > 0) {
            await this.prisma.message.deleteMany({ where: { conversationId: { in: convIds } } });
            await this.prisma.conversation.deleteMany({ where: { id: { in: convIds } } });
        }
        await this.prisma.campaignContact.updateMany({
            where: { contactId: { in: ids } },
            data: { contactId: null }
        });
        
        this.clearTagCache(shopId);
        return this.prisma.contact.deleteMany({
            where: { shopId, id: { in: ids } },
        });
    }

    async normalizeContacts(shopId: string) {
        const contacts = await this.prisma.contact.findMany({ where: { shopId } });
        let updatedCount = 0;
        let invalidCount = 0;
        let errorCount = 0;

        for (const contact of contacts) {
            let phone = contact.phone.trim();
            let newPhone = phone;
            let isValid = true;
            let tags = Array.isArray(contact.tags) ? [...contact.tags as string[]] : [];

            if (phone.startsWith('+91')) {
                newPhone = '91' + phone.substring(3);
            } else if (phone.startsWith('91') && phone.length === 12 && /^\d+$/.test(phone)) {
                newPhone = phone;
            } else if (phone.length === 10 && /^\d+$/.test(phone)) {
                newPhone = '91' + phone;
            } else {
                isValid = false;
            }

            if (!isValid) {
                if (!tags.includes('Invalid Number')) {
                    tags.push('Invalid Number');
                    try {
                        await this.prisma.contact.update({
                            where: { id: contact.id },
                            data: { tags }
                        });
                        invalidCount++;
                    } catch (e) {
                        errorCount++;
                    }
                }
            } else if (newPhone !== contact.phone) {
                try {
                    await this.prisma.contact.update({
                        where: { id: contact.id },
                        data: { phone: newPhone }
                    });
                    updatedCount++;
                } catch (e) {
                    errorCount++;
                    if (!tags.includes('Duplicate Number')) {
                         tags.push('Duplicate Number');
                         await this.prisma.contact.update({
                            where: { id: contact.id },
                            data: { tags }
                         }).catch(() => {});
                    }
                }
            }
        }

        return { message: 'Normalization complete' };
    }

    async getContactStats(shopId: string) {
        const [total, taggedCount, citiesCountResult, optIn, optOut, consentUnknown] = await Promise.all([
            this.prisma.contact.count({ where: { shopId } }),
            this.prisma.$queryRaw<{count: number}[]>`SELECT COUNT(*) FROM "Contact" WHERE "shopId" = ${shopId} AND tags IS NOT NULL AND tags::text != '[]'`,
            this.prisma.$queryRaw<{count: number}[]>`SELECT COUNT(DISTINCT city) FROM "Contact" WHERE "shopId" = ${shopId} AND city IS NOT NULL AND city != ''`,
            this.prisma.contact.count({ where: { shopId, marketingConsent: { is: { status: 'OPTED_IN' } } } }),
            this.prisma.contact.count({ where: { shopId, marketingConsent: { is: { status: 'OPTED_OUT' } } } }),
            this.prisma.contact.count({
                where: {
                    shopId,
                    OR: [
                        { marketingConsent: { is: null } },
                        { marketingConsent: { is: { status: 'UNKNOWN' } } },
                        { marketingConsent: { is: { status: 'PENDING' } } }
                    ]
                }
            })
        ]);

        return {
            total,
            taggedCount: Number((taggedCount as any)[0]?.count || 0),
            citiesCount: Number(citiesCountResult[0]?.count || 0),
            optedIn: optIn,
            optedOut: optOut,
            consentUnknown
        };
    }

    async getContactTagsWithCount(shopId: string): Promise<{ tag: string; count: number }[]> {
        if (!shopId) return [];

        const cached = this.tagCountCache.get(shopId);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data;
        }

        try {
            // PostgreSQL unnest JSONB array and aggregate counts directly in the database engine
            const rawResult = await this.prisma.$queryRaw<{ tag: string; count: bigint | number }[]>`
                SELECT elem AS tag, COUNT(*)::int AS count
                FROM "Contact",
                     jsonb_array_elements_text(CASE WHEN tags IS NOT NULL AND jsonb_typeof(tags::jsonb) = 'array' THEN tags::jsonb ELSE '[]'::jsonb END) AS elem
                WHERE "shopId" = ${shopId} AND elem IS NOT NULL AND TRIM(elem) != ''
                GROUP BY elem
                ORDER BY count DESC
            `;

            const data = (rawResult || []).map(r => ({
                tag: String(r.tag).trim(),
                count: Number(r.count || 0)
            })).filter(t => t.tag.length > 0);

            this.tagCountCache.set(shopId, { data, expiresAt: Date.now() + 30 * 1000 });
            return data;
        } catch (err: any) {
            this.logger.warn(`[getContactTagsWithCount] Raw SQL failed, falling back to Prisma: ${err?.message}`);
            const contacts = await this.prisma.contact.findMany({
                where: { shopId },
                select: { tags: true },
                take: 5000,
            });

            const tagMap: Record<string, number> = {};
            for (const c of contacts) {
                if (Array.isArray(c.tags)) {
                    for (const t of c.tags) {
                        if (typeof t === 'string' && t.trim()) {
                            const tagStr = t.trim();
                            tagMap[tagStr] = (tagMap[tagStr] || 0) + 1;
                        }
                    }
                }
            }

            const data = Object.entries(tagMap)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count);

            this.tagCountCache.set(shopId, { data, expiresAt: Date.now() + 30 * 1000 });
            return data;
        }
    }

    async addTagsBulk(shopId: string, body: { contactIds?: string[]; phones?: string[]; tags: string[] }) {
        const { contactIds, phones, tags } = body;
        const newTags = Array.isArray(tags) ? tags.map(t => String(t).trim()).filter(Boolean) : [];
        if (newTags.length === 0) return { updated: 0 };

        const where: any = { shopId };
        if (contactIds && contactIds.length > 0) where.id = { in: contactIds };
        else if (phones && phones.length > 0) where.phone = { in: phones };
        else return { updated: 0 };

        const contacts = await this.prisma.contact.findMany({ where, select: { id: true, tags: true } });
        let updatedCount = 0;
        for (const c of contacts) {
            const existing = (c.tags as string[]) || [];
            const merged = Array.from(new Set([...existing, ...newTags]));
            await this.prisma.contact.update({
                where: { id: c.id },
                data: { tags: merged }
            });
            updatedCount++;
        }
        this.clearTagCache(shopId);
        return { updated: updatedCount, message: `Tags added to ${updatedCount} contacts` };
    }

    async removeTagsBulk(shopId: string, body: { contactIds?: string[]; phones?: string[]; tags?: string[]; removeAll?: boolean }) {
        const { contactIds, phones, tags, removeAll } = body;
        const tagsToRemove = Array.isArray(tags) ? tags.map(t => String(t).trim().toLowerCase()).filter(Boolean) : [];

        const where: any = { shopId };
        if (contactIds && contactIds.length > 0) where.id = { in: contactIds };
        else if (phones && phones.length > 0) where.phone = { in: phones };
        else return { updated: 0 };

        const contacts = await this.prisma.contact.findMany({ where, select: { id: true, tags: true } });
        let updatedCount = 0;
        const removeSet = new Set(tagsToRemove);

        for (const c of contacts) {
            const existing = (c.tags as string[]) || [];
            const updatedTags = removeAll ? [] : existing.filter(t => !removeSet.has(String(t).trim().toLowerCase()));
            await this.prisma.contact.update({
                where: { id: c.id },
                data: { tags: updatedTags }
            });
            updatedCount++;
        }
        this.clearTagCache(shopId);
        return { updated: updatedCount, message: `Tags removed from ${updatedCount} contacts` };
    }
}

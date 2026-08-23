import { NotFoundException } from '@nestjs/common';
import { ConsentService } from './consent.service';

describe('ConsentService', () => {
    const createPrisma = () => ({
        shopConsentConfig: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
        },
        contactMarketingConsent: {
            findUnique: jest.fn(),
            upsert: jest.fn(),
            findMany: jest.fn(),
            count: jest.fn(),
        },
        consentAuditLog: {
            create: jest.fn(),
        },
        contact: {
            findFirst: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
        },
        campaignContact: {
            updateMany: jest.fn(),
        },
    });

    it('rejects manual consent updates for a contact in another shop', async () => {
        const prisma = createPrisma();
        prisma.contact.findFirst.mockResolvedValue(null);
        const service = new ConsentService(prisma as any);

        await expect(service.updateConsentForShopContact(
            'shop-a',
            'contact-from-shop-b',
            { status: 'OPTED_IN', reason: 'Admin confirmation' },
            'admin-1',
        )).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.contactMarketingConsent.upsert).not.toHaveBeenCalled();
    });

    it('records a manual opt-out, audit event, and cancellation of pending sends', async () => {
        const prisma = createPrisma();
        prisma.contact.findFirst.mockResolvedValue({ id: 'contact-1' });
        prisma.contactMarketingConsent.findUnique.mockResolvedValue(null);
        prisma.contactMarketingConsent.upsert.mockResolvedValue({
            id: 'consent-1',
            shopId: 'shop-a',
            contactId: 'contact-1',
            status: 'OPTED_OUT',
        });
        prisma.consentAuditLog.create.mockResolvedValue({ id: 'audit-1' });
        prisma.campaignContact.updateMany.mockResolvedValue({ count: 2 });
        const service = new ConsentService(prisma as any);

        const result = await service.updateConsentForShopContact(
            'shop-a',
            'contact-1',
            { status: 'OPTED_OUT', source: 'ADMIN', reason: 'Requested by customer' },
            'admin-1',
        );

        expect(result.status).toBe('OPTED_OUT');
        expect(prisma.contactMarketingConsent.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { contactId: 'contact-1' },
            create: expect.objectContaining({
                shopId: 'shop-a',
                contactId: 'contact-1',
                status: 'OPTED_OUT',
                source: 'ADMIN',
                updatedBy: 'admin-1',
            }),
        }));
        expect(prisma.consentAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                shopId: 'shop-a',
                contactId: 'contact-1',
                toStatus: 'OPTED_OUT',
                reason: 'Requested by customer',
            }),
        }));
        expect(prisma.campaignContact.updateMany).toHaveBeenCalledWith({
            where: { contactId: 'contact-1', status: 'pending' },
            data: { status: 'aborted', failReason: 'contact_opted_out' },
        });
    });

    it('bulk updates only contacts belonging to the requested shop', async () => {
        const prisma = createPrisma();
        prisma.contact.findMany.mockResolvedValue([{ id: 'owned-contact' }]);
        prisma.contactMarketingConsent.findUnique.mockResolvedValue(null);
        prisma.contactMarketingConsent.upsert.mockResolvedValue({
            id: 'consent-1', status: 'OPTED_IN', contactId: 'owned-contact', shopId: 'shop-a',
        });
        prisma.consentAuditLog.create.mockResolvedValue({});
        const service = new ConsentService(prisma as any);

        const result = await service.setBulkConsent(
            'shop-a',
            ['owned-contact', 'foreign-contact'],
            'OPTED_IN',
            { source: 'ADMIN', updatedBy: 'admin-1' },
        );

        expect(result.updated).toBe(1);
        expect(prisma.contact.findMany).toHaveBeenCalledWith({
            where: { shopId: 'shop-a', id: { in: ['owned-contact', 'foreign-contact'] } },
            select: { id: true },
        });
        expect(prisma.contactMarketingConsent.upsert).toHaveBeenCalledTimes(1);
        expect(prisma.contactMarketingConsent.upsert.mock.calls[0][0].create.shopId).toBe('shop-a');
    });

    it('processes an opt-out reply and cancels pending campaign contacts', async () => {
        const prisma = createPrisma();
        prisma.shopConsentConfig.findUnique.mockResolvedValue(null);
        prisma.contactMarketingConsent.findUnique.mockResolvedValue(null);
        prisma.contactMarketingConsent.upsert.mockResolvedValue({
            id: 'consent-1', status: 'OPTED_OUT', contactId: 'contact-1', shopId: 'shop-a',
        });
        prisma.consentAuditLog.create.mockResolvedValue({});
        prisma.campaignContact.updateMany.mockResolvedValue({ count: 1 });
        const service = new ConsentService(prisma as any);

        const result = await service.processIncomingMessage('shop-a', 'contact-1', 'STOP');

        expect(result?.intent).toBe('OPT_OUT');
        expect(prisma.contactMarketingConsent.upsert).toHaveBeenCalled();
        expect(prisma.campaignContact.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { contactId: 'contact-1', status: 'pending' },
        }));
    });
});

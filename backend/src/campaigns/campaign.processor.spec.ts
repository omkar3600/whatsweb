import { CampaignProcessor } from './campaign.processor';

describe('CampaignProcessor consent queue validation', () => {
    const createPrisma = () => ({
        campaign: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
        campaignContact: {
            count: jest.fn(),
            findMany: jest.fn(),
            updateMany: jest.fn(),
            update: jest.fn(),
        },
        contactMarketingConsent: {
            findMany: jest.fn(),
        },
        contact: {
            findMany: jest.fn(),
        },
        conversation: {
            upsert: jest.fn(),
        },
        message: {
            create: jest.fn(),
        },
    });

    it('aborts a pending queue entry when consent changes to opted out before send', async () => {
        const prisma = createPrisma();
        const campaign = {
            id: 'campaign-1',
            shopId: 'shop-a',
            name: 'Offers',
            status: 'scheduled',
            targetPhones: null,
            targetTags: null,
            targetFilters: null,
            stats: { sendDelay: 0 },
            audienceFilters: { marketingConsent: 'EXCLUDE_OPTED_OUT' },
            templateParams: [],
            headerMediaUrl: null,
            template: {
                templateName: 'offer_template',
                language: 'en_US',
                components: [{ type: 'BODY', text: 'Hello' }],
            },
        };
        const pending = {
            id: 'campaign-contact-1',
            contactId: 'contact-1',
            phone: '919876543210',
            name: 'Customer',
            status: 'pending',
        };

        prisma.campaign.findUnique
            .mockResolvedValueOnce({ ...campaign })
            .mockResolvedValueOnce({ status: 'processing' })
            .mockResolvedValueOnce({ status: 'processing' });
        prisma.campaign.update.mockResolvedValue({});
        prisma.campaignContact.count.mockResolvedValue(1);
        prisma.campaignContact.findMany
            .mockResolvedValueOnce([pending])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ status: 'aborted' }]);
        prisma.contactMarketingConsent.findMany.mockResolvedValue([
            { contactId: 'contact-1', status: 'OPTED_OUT' },
        ]);
        prisma.contact.findMany.mockResolvedValue([{ id: 'contact-1' }]);
        prisma.campaignContact.updateMany.mockResolvedValue({ count: 1 });
        prisma.campaignContact.update.mockResolvedValue({});

        const whatsappService = { sendOutboundMessage: jest.fn() };
        const consentService = { getConsentStatusMap: jest.fn() };
        const processor = new CampaignProcessor(
            prisma as any,
            whatsappService as any,
            consentService as any,
        );

        await processor.process({ data: { campaignId: 'campaign-1' } } as any);

        expect(whatsappService.sendOutboundMessage).not.toHaveBeenCalled();
        expect(prisma.campaignContact.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['campaign-contact-1'] } },
            data: { status: 'aborted', failReason: 'contact_opted_out' },
        });
        expect(prisma.campaignContact.update).not.toHaveBeenCalled();
    });

    it('does not send to a contact deleted during a campaign', async () => {
        const prisma = createPrisma();
        const campaign = {
            id: 'campaign-2', shopId: 'shop-a', name: 'Offers', status: 'processing',
            targetPhones: null, targetTags: null, targetFilters: null,
            stats: { sendDelay: 0 }, audienceFilters: { marketingConsent: 'ALL' },
            templateParams: [], headerMediaUrl: null,
            template: { templateName: 'offer_template', language: 'en_US', components: [] },
        };
        prisma.campaign.findUnique
            .mockResolvedValueOnce(campaign)
            .mockResolvedValueOnce({ status: 'processing' });
        prisma.campaign.update.mockResolvedValue({});
        prisma.campaignContact.count.mockResolvedValue(1);
        prisma.campaignContact.findMany
            .mockResolvedValueOnce([{ id: 'cc-2', contactId: 'deleted-contact', phone: '123', name: 'Gone', status: 'pending' }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([{ status: 'aborted' }]);
        prisma.contactMarketingConsent.findMany.mockResolvedValue([]);
        prisma.contact.findMany.mockResolvedValue([]);
        prisma.campaignContact.updateMany.mockResolvedValue({ count: 1 });

        const processor = new CampaignProcessor(
            prisma as any,
            { sendOutboundMessage: jest.fn() } as any,
            { getConsentStatusMap: jest.fn() } as any,
        );

        await processor.process({ data: { campaignId: 'campaign-2' } } as any);

        expect(prisma.campaignContact.updateMany).toHaveBeenCalledWith({
            where: { id: { in: ['cc-2'] } },
            data: { status: 'aborted', failReason: 'contact_opted_out' },
        });
    });
});

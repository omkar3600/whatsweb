export interface Shop {
    id: string;
    shopName: string;
    phone: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface User {
    id: string;
    username: string;
    role: string;
}

export interface WhatsAppCredentials {
    businessAccountId: string;
    phoneNumberId: string;
    accessToken: string;
    webhookVerifyToken?: string;
}

export interface Contact {
    id: string;
    phone: string;
    name?: string | null;
    tags: string[];
    createdAt?: string;
}

export interface Campaign {
    id: string;
    name: string;
    templateName: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    targetTags: string[];
    scheduledAt?: string | null;
    createdAt: string;
}

export interface Template {
    id: string;
    templateName: string;
    status: string;
    components: any[];
}

export interface Automation {
    id: string;
    trigger: string;
    action: string;
    isActive: boolean;
}

export interface Flow {
    id: string;
    name: string;
    description?: string;
    nodes: any[];
    edges: any[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

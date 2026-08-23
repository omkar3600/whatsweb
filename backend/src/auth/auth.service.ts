import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async submitDemoRequest(data: any) {
        const { name, phone, businessName, businessType, city, state } = data;

        await this.prisma.demoRequest.create({
            data: {
                name,
                phone,
                businessName,
                businessType,
                city,
                state,
                status: 'pending'
            },
        });

        return { message: 'Demo request submitted successfully. We will contact you soon.' };
    }

    async registerShop(data: any) {
        const { username, password, shopName, phone } = data;

        const existingUser = await this.prisma.user.findFirst({
            where: {
                username: { equals: username, mode: 'insensitive' }
            }
        });
        if (existingUser) {
            throw new ConflictException('Username already in use');
        }

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);

        const user = await this.prisma.user.create({
            data: {
                username,
                passwordHash,
                role: 'user',
            },
        });

        const shop = await this.prisma.shop.create({
            data: {
                ownerId: user.id,
                shopName,
                phone,
            },
        });

        return { message: 'Shop registered successfully', shopId: shop.id };
    }

    async login(data: any) {
        const { username, password } = data;
        this.logger.log(`Attempting login for username: "${username}"`);

        const user = await this.prisma.user.findUnique({
            where: { username },
            include: { shop: true }
        });

        if (!user) {
            this.logger.warn(`User NOT FOUND for username: "${username}"`);
            throw new UnauthorizedException('Invalid credentials');
        }

        // Strictly enforce username case matching
        if (user.username !== username) {
            this.logger.warn(`Username case MISMATCH for username: "${username}" (expected: "${user.username}")`);
            throw new UnauthorizedException('Invalid credentials');
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            this.logger.warn(`Password MISMATCH for username: "${username}"`);
            throw new UnauthorizedException('Invalid credentials');
        }

        this.logger.log(`Login SUCCESS for username: "${username}"`);

        const role = user.role?.toLowerCase() || 'user';

        const payload = {
            sub: user.id,
            username: user.username,
            role,
            shopId: user.shop?.id
        };

        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                role,
                shopId: user.shop?.id,
                shop: user.shop ? {
                    id: user.shop.id,
                    shopName: user.shop.shopName,
                    phone: user.shop.phone
                } : null
            }
        };
    }
}

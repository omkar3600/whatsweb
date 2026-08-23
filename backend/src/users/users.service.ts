import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async getProfile(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
                shop: {
                    select: {
                        id: true,
                        shopName: true,
                        phone: true,
                        status: true,
                        subscription: {
                            select: {
                                status: true,
                                expiryDate: true
                            }
                        }
                    }
                }
            },
        });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    async updateProfile(userId: string, data: { username?: string }) {
        const { username } = data;

        if (username) {
            const existing = await this.prisma.user.findFirst({
                where: { username, NOT: { id: userId } },
            });
            if (existing) throw new ConflictException('Username already taken');
        }

        return this.prisma.user.update({
            where: { id: userId },
            data: { username },
            select: {
                id: true,
                username: true,
                role: true,
            },
        });
    }

    async changePassword(userId: string, data: any) {
        const { currentPassword, newPassword } = data;
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new NotFoundException('User not found');

        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) throw new ConflictException('Current password incorrect');

        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await this.prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });

        return { message: 'Password updated successfully' };
    }
}

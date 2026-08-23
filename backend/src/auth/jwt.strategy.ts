import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

import { ConfigService } from '@nestjs/config';

const cookieExtractor = (req: any) => {
    let token = null;
    if (req && req.cookies) {
        token = req.cookies['token'];
    }
    return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private prisma: PrismaService, private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                cookieExtractor
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'default_secret',
        });
    }

    async validate(payload: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { shop: { include: { subscription: true } } }
        });

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            id: payload.sub,
            username: payload.username,
            role: (user.role || payload.role)?.toLowerCase() || 'user',
            shopId: user.shop?.id || payload.shopId,
            shopStatus: user.shop?.status,
            subscriptionExpiry: user.shop?.subscription?.expiryDate
        };
    }
}

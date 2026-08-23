import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ForbiddenException } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_SHOP_STATUS_KEY } from '../decorators/bypass-shop-status.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActiveShopInterceptor implements NestInterceptor {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // Check if route has @BypassShopStatus()
        const isBypassed = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_SHOP_STATUS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isBypassed) {
            return next.handle();
        }

        const req = context.switchToHttp().getRequest();
        const user = req.user;

        if (user && user.role?.toLowerCase() !== 'admin') {
            const userId = user.sub || user.id;
            const shopId = user.shopId;
            if (userId || shopId) {
                return from(
                    this.prisma.shop.findFirst({
                        where: {
                            OR: [
                                ...(shopId ? [{ id: shopId }] : []),
                                ...(userId ? [{ ownerId: userId }] : [])
                            ]
                        },
                        include: { subscription: true }
                    })
                ).pipe(
                    mergeMap((shop) => {
                        const shopStatus = shop?.status || user.shopStatus;
                        const subExpiry = shop?.subscription?.expiryDate || user.subscriptionExpiry;

                        if (shopStatus && shopStatus !== 'active') {
                            throw new ForbiddenException({
                                code: 'ACCOUNT_SUSPENDED',
                                message: 'Your account has been temporarily seized. Contact administrator for more.'
                            });
                        }

                        if (subExpiry && new Date(subExpiry) < new Date()) {
                            throw new ForbiddenException({
                                code: 'SUBSCRIPTION_EXPIRED',
                                message: 'Your subscription date is over.'
                            });
                        }

                        return next.handle();
                    })
                );
            }
        }

        return next.handle();
    }
}

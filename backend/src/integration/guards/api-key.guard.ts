import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected "Bearer <api_key>"');
    }

    const rawKey = authHeader.split(' ')[1];
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash },
      include: { shop: true }
    });

    if (!apiKey || apiKey.status !== 'active') {
      throw new UnauthorizedException('Invalid or inactive API Key');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new UnauthorizedException('API Key has expired');
    }

    // Update lastUsedAt asynchronously (throttled to once per 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (!apiKey.lastUsedAt || apiKey.lastUsedAt < fiveMinutesAgo) {
      this.prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      }).catch(() => {});
    }

    // Attach shop to request for controllers to use
    request.shop = apiKey.shop;
    request.apiKey = apiKey;

    return true;
  }
}

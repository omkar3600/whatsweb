import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        this.extractTokenFromCookie(client.handshake.headers?.cookie);

      if (token) {
        const secret = process.env.JWT_SECRET || 'default_secret';
        const decoded = jwt.verify(token, secret) as any;
        client.data.user = {
          id: decoded.sub,
          shopId: decoded.shopId,
          role: decoded.role,
        };
      }
    } catch (err: any) {
      this.logger.debug(`Socket authentication failed: ${err.message}`);
    }
  }

  private extractTokenFromCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    return cookies['token'] || null;
  }

  @SubscribeMessage('joinRoom')
  handleJoin(@MessageBody() shopId: string, @ConnectedSocket() client: Socket) {
    if (!shopId) return;

    const user = client.data?.user;
    if (!user) {
      this.logger.warn(`Unauthenticated socket tried to join room ${shopId}`);
      return;
    }

    // STRICT MULTI-TENANT ISOLATION: Only allow joining user's own shop room or if user is admin.
    // Client-supplied handshake.auth.shopId is explicitly ignored to prevent identity forgery.
    if (user.role?.toLowerCase() !== 'admin' && user.shopId !== shopId) {
      this.logger.warn(`Unauthorized socket join attempt by shopId=${user.shopId} to target shopId=${shopId}`);
      return;
    }

    client.join(shopId);
    this.logger.log(`Socket ${client.id} joined room ${shopId}`);
  }

  notifyNewMessage(shopId: string, message: any) {
    this.server.to(shopId).emit('newMessage', message);
  }

  notifyRead(shopId: string, conversationId: string) {
    this.server.to(shopId).emit('read', { conversationId });
  }

  notifyMessageStatus(shopId: string, data: { conversationId: string, messageId: string, status: string }) {
    this.server.to(shopId).emit('messageStatusUpdate', data);
  }
}

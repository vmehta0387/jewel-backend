import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { InjectRepository } from '@nestjs/typeorm';
import { Server, Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { JwtPayload } from '../auth/interfaces/auth-user.interface';

@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private server?: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async handleConnection(@ConnectedSocket() socket: Socket) {
    try {
      const token = this.extractToken(socket);
      if (!token) {
        socket.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET') || 'change_me',
      });

      const user = await this.userRepo.findOne({
        where: { id: payload.sub, isActive: true },
        select: ['id'],
      });

      if (!user) {
        socket.disconnect(true);
        return;
      }

      socket.data.userId = user.id;
      await socket.join(this.userRoom(user.id));
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() socket: Socket) {
    const userId = typeof socket.data?.userId === 'string' ? socket.data.userId : null;
    if (!userId) return;
    void socket.leave(this.userRoom(userId));
  }

  emitUnreadCount(userId: string, unreadCount: number) {
    if (!this.server) return;
    try {
      this.server.to(this.userRoom(userId)).emit('notification.unread_count_updated', {
        unreadCount,
      });
    } catch (error) {
      this.logger.warn(`Unable to emit unread notification count for user ${userId}: ${String(error)}`);
    }
  }

  private extractToken(socket: Socket): string | null {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const bearer = socket.handshake.headers.authorization;
    if (typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
      return bearer.slice('Bearer '.length).trim();
    }

    return null;
  }

  private userRoom(userId: string) {
    return `user:${userId}`;
  }
}

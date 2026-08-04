import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';

@Injectable()
@WebSocketGateway({ cors: { origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean), credentials: true } })
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);
  @WebSocketServer() server: Server;

  handleConnection(client: any) {
    const userId = client.handshake?.auth?.userId || client.handshake?.query?.userId;
    if (userId) {
      client.join(`user:${userId}`);
      client.join('all');
    }
  }

  handleDisconnect() {
    /* rooms cleaned automatically */
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    try {
      this.server.to(`user:${userId}`).emit(event, payload);
    } catch (err) {
      this.logger.warn(`Socket emit failed: ${(err as Error).message}`);
    }
  }

  emitToAll(event: string, payload: unknown) {
    try {
      this.server.to('all').emit(event, payload);
    } catch (err) {
      this.logger.warn(`Socket broadcast failed: ${(err as Error).message}`);
    }
  }
}

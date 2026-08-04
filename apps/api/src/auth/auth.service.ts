import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { hashToken } from './utils/token-hash';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private redis: RedisService,
  ) {}

  private payloadOf(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      departmentId: user.departmentId,
    };
  }

  private accessToken(payload: JwtPayload) {
    const ttl = parseInt(this.config.get('ACCESS_TOKEN_TTL', '900'), 10);
    return this.jwt.sign(payload, { expiresIn: ttl, secret: this.config.get('JWT_SECRET') });
  }

  private async issueRefreshToken(user: User, ip?: string, userAgent?: string) {
    const raw = crypto.randomBytes(48).toString('base64url');
    const jti = crypto.randomUUID();
    const expiresIn = parseInt(this.config.get('REFRESH_TOKEN_TTL', '604800'), 10);
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(raw),
        jti,
        userId: user.id,
        ip,
        userAgent,
        expiresAt,
      },
    });

    return { refreshToken: raw, expiresAt };
  }

  async login(loginDto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: loginDto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    const portalRole: Role = loginDto.portal === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE';
    if (loginDto.portal === 'MANAGER' && user.role !== 'MANAGER') {
      throw new ForbiddenException('This account is not authorised for the Management portal');
    }
    if (loginDto.portal === 'EMPLOYEE' && user.role === 'MANAGER') {
      throw new ForbiddenException('Management accounts must use the Management portal');
    }
    // ensure a MANAGEMENT login also yields a manager-scope role in response
    const effectiveRole = portalRole;

    const accessToken = this.accessToken(this.payloadOf({ ...user, role: effectiveRole }));
    const { refreshToken, expiresAt } = await this.issueRefreshToken(user, ip, userAgent);

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt: expiresAt,
      user: this.sanitise(user),
    };
  }

  async refresh(refreshToken: string, ip?: string, userAgent?: string) {
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account no longer valid');
    }

    // Rotate
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    const accessToken = this.accessToken(this.payloadOf(user));
    const next = await this.issueRefreshToken(user, ip, userAgent);

    return {
      accessToken,
      refreshToken: next.refreshToken,
      refreshExpiresAt: next.expiresAt,
      user: this.payloadToSanitised(user),
    };
  }

  async logout(jti: string) {
    if (jti) {
      await this.prisma.refreshToken.updateMany({ where: { jti }, data: { revokedAt: new Date() } });
    }
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { department: true },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitise(user);
  }

  async dashboardMeta(userId: string) {
    const unread = await this.prisma.notification.count({ where: { userId, read: false } });
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { department: true } });
    if (!user) throw new UnauthorizedException('User not found');
    return {
      unreadNotifications: unread,
      role: user.role,
      name: user.name,
    };
  }

  private payloadToSanitised(user: User) {
    const { password, ...rest } = user;
    return rest;
  }

  private sanitise(user: User) {
    const { password, ...rest } = user;
    return rest;
  }
}
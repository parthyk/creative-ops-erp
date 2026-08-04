import { Injectable } from '@nestjs/common';

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  departmentId?: string | null;
}

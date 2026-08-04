import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ClientPriority, ClientStatus, ContractType, StakeholderRole } from '@prisma/client';

export class CreateClientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(ClientPriority)
  priority?: ClientPriority;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsObject()
  brandColors?: Record<string, string>;

  @IsOptional()
  @IsArray()
  fonts?: string[];

  @IsOptional()
  @IsArray()
  brandAssets?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(ClientPriority)
  priority?: ClientPriority;

  @IsOptional()
  @IsEnum(ClientStatus)
  status?: ClientStatus;

  @IsOptional()
  @IsObject()
  brandColors?: Record<string, string>;

  @IsOptional()
  @IsArray()
  fonts?: string[];

  @IsOptional()
  @IsArray()
  brandAssets?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssignStakeholderDto {
  @IsEnum(StakeholderRole)
  role: StakeholderRole;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(['MANAGER', 'EMPLOYEE'])
  portal: 'MANAGER' | 'EMPLOYEE';
}
import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Headers('user-agent') ua?: string, @Headers('x-forwarded-for') ip?: string) {
    return this.authService.login(dto, ip, ua);
  }

  @Public()
  @Post('refresh')
  refresh(@Body('refreshToken') token: string, @Headers('user-agent') ua?: string, @Headers('x-forwarded-for') ip?: string) {
    return this.authService.refresh(token, ip, ua);
  }

  @Post('logout')
  logout(@Body('jti') jti?: string) {
    return this.authService.logout(jti ?? '');
  }

  @Get('me')
  me(@CurrentUser('sub') userId: string) {
    return this.authService.me(userId);
  }
}
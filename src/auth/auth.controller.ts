import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Body() loginData: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginData);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      token: result.token,
    };
  }

  @Post('register')
  async register(@Body() registerData: any) {
    return this.authService.register(registerData);
  }

  @Get('me')
  async getProfile(@Req() req: Request) {
    const token = req.cookies?.token;

    if (!token) {
      return { user: null, isAuthenticated: false };
    }

    return { user: null, isAuthenticated: false };
  }

  @Get('profile')
  getProfileOld(@Req() req: Request) {
    return (req as any).user;
  }
}
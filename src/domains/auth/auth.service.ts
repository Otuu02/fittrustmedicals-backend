import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../../common/enums/prisma.enums';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ 
      where: { email },
    });

    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      const { passwordHash: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new UnauthorizedException('Email already registered');

    const hashed = bcrypt.hashSync(password, 10);

    const user = await this.prisma.user.create({
      data: { 
        email, 
        passwordHash: hashed,
        firstName, 
        lastName,
        status: 'ACTIVE',
        role: UserRole.CUSTOMER,
        emailVerified: false,
      },
    });

    const { passwordHash: _, ...result } = user;
    return result;
  }
}

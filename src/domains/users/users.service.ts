import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UserRole, UserStatus } from '../../common/enums/prisma.enums';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: any) {
    const existing = await this.prisma.user.findUnique({ 
      where: { email: createUserDto.email } 
    });
    if (existing) throw new BadRequestException('Email already exists');

    const hashedPassword = bcrypt.hashSync(createUserDto.password || 'defaultPass123', 10);
    
    const user = await this.prisma.user.create({
      data: { 
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        email: createUserDto.email,
        phoneNumber: createUserDto.phoneNumber || null,
        passwordHash: hashedPassword,
        status: UserStatus.ACTIVE,
        role: createUserDto.role || UserRole.CUSTOMER,
        emailVerified: false,
      },
      select: {
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        role: true, 
        status: true, 
        phoneNumber: true,
        emailVerified: true,
        createdAt: true, 
        updatedAt: true,
        lastLoginAt: true,
      },
    });
    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        role: true, 
        status: true, 
        phoneNumber: true,
        emailVerified: true,
        createdAt: true, 
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: { addresses: true },
    });
    if (!user) throw new NotFoundException('User not found');
    
    const { passwordHash, ...result } = user;
    return result;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async update(id: string, updateUserDto: any) {
    await this.findOne(id);
    
    const { password, ...dataToUpdate } = updateUserDto;
    
    return this.prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true,
        role: true, 
        status: true, 
        phoneNumber: true,
        emailVerified: true,
        createdAt: true, 
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.user.delete({ 
      where: { id },
      select: { 
        id: true, 
        email: true, 
        firstName: true, 
        lastName: true 
      }
    });
  }

  async changePassword(id: string, changePasswordDto: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = bcrypt.compareSync(changePasswordDto.currentPassword, user.passwordHash);
    if (!isValid) throw new BadRequestException('Current password is incorrect');

    const hashed = bcrypt.hashSync(changePasswordDto.newPassword, 10);
    
    await this.prisma.user.update({ 
      where: { id }, 
      data: { passwordHash: hashed }
    });
    
    return { message: 'Password changed successfully' };
  }

  async getStats() {
    const total = await this.prisma.user.count();
    const active = await this.prisma.user.count({ where: { status: UserStatus.ACTIVE } });
    const inactive = await this.prisma.user.count({ where: { status: UserStatus.INACTIVE } });
    
    return {
      total,
      active,
      inactive,
      lastUpdated: new Date(),
    };
  }
}

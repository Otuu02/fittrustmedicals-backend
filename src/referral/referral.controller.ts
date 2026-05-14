import { Controller, Post, Get, Body, Query, Headers, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/referral')
export class ReferralController {
  constructor(private prisma: PrismaService) {}

  @Post('generate')
  async generateLink(
    @Body('userId') userId: string,
    @Body('staffEmail') staffEmail: string,
    @Headers('authorization') auth: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('User ID required');
    }

    // Check if user exists, create if not
    let user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: userId,
          firstName: 'Staff',
          lastName: 'Member',
          email: staffEmail || `staff-${userId}@fittrust.local`,
          passwordHash: 'external-auth',
          role: 'STAFF',
          status: 'ACTIVE',
        },
      });
    } else if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      throw new ForbiddenException('Staff access required');
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = 'FIT-' + userId.slice(-4) + '-' + timestamp.slice(-4) + random;

    await this.prisma.referralLink.create({
      data: {
        code,
        staffId: userId,
        isActive: true,
      },
    });

    const storeUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return {
      success: true,
      referralCode: code,
      referralLink: storeUrl + '/?ref=' + code,
    };
  }

  @Get('stats')
  async getStats(
    @Query('staffId') staffId: string,
    @Headers('authorization') auth: string,
  ) {
    if (!staffId) {
      return {
        error: 'Staff ID required',
        summary: { totalClicks: 0, totalConversions: 0, totalRevenue: 0, totalLinks: 0 },
        links: [],
      };
    }

    const links = await this.prisma.referralLink.findMany({
      where: { staffId },
      orderBy: { createdAt: 'desc' },
    });

    const sales = await this.prisma.referralSale.findMany({
      where: { staffId },
    });

    const totalRevenue = sales.reduce((sum, sale) => sum + sale.amount, 0);

    return {
      summary: {
        totalLinks: links.length,
        totalClicks: links.reduce((s, l) => s + l.clicks, 0),
        totalConversions: sales.length,
        totalRevenue,
      },
      links: links.map((l) => ({
        code: l.code,
        clicks: l.clicks,
        conversions: sales.filter((s) => s.referralCode === l.code).length,
      })),
    };
  }

  @Post('track')
  async trackClick(@Body('code') code: string) {
    if (!code) {
      return { error: 'No code provided' };
    }

    const referral = await this.prisma.referralLink.findUnique({
      where: { code, isActive: true },
    });

    if (!referral) {
      return { error: 'Invalid code' };
    }

    await this.prisma.referralLink.update({
      where: { code },
      data: { clicks: { increment: 1 } },
    });

    return {
      success: true,
      staffId: referral.staffId,
      code: referral.code,
    };
  }

  @Post('convert')
  async trackConversion(
    @Body('code') code: string,
    @Body('orderId') orderId: string,
    @Body('saleAmount') saleAmount: number,
    @Body('customerId') customerId?: string,
  ) {
    if (!code || !orderId || !saleAmount) {
      return { error: 'Missing required fields' };
    }

    const referral = await this.prisma.referralLink.findUnique({
      where: { code, isActive: true },
    });

    if (!referral) {
      return { error: 'Invalid referral code' };
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { referralCode: code },
    });

    await this.prisma.referralSale.create({
      data: {
        referralCode: code,
        staffId: referral.staffId,
        orderId,
        amount: saleAmount,
        customerId: customerId || null,
      },
    });

    await this.prisma.referralLink.update({
      where: { code },
      data: {
        conversions: { increment: 1 },
        revenue: { increment: saleAmount },
      },
    });

    return {
      success: true,
      message: 'Conversion tracked',
      staffId: referral.staffId,
    };
  }
}
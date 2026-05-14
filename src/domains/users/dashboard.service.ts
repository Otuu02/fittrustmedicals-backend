import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto, DashboardResponseDto } from './dto/dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  // Dashboard Overview
  async getDashboardOverview(userId: string): Promise<DashboardResponseDto> {
    const [user, orders, addresses, wishlist] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          createdAt: true,
        },
      }),
      this.prisma.order.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      this.prisma.address.findMany({
        where: { userId },
      }),
      this.prisma.wishlist.findMany({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const totalOrders = await this.prisma.order.count({ where: { userId } });
    const totalSpentAggregate = await this.prisma.order.aggregate({
      where: { userId },
      _sum: { totalAmount: true },
    });

    return {
      totalOrders,
      totalSpent: totalSpentAggregate._sum.totalAmount || 0,
      recentOrders: orders,
      addresses,
      wishlistCount: wishlist.length,
    };
  }

  // Profile Management
  async getCustomerProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
      },
    });
  }

  // Order Management
  async getOrderHistory(userId: string, options: { page: number; limit: number; status?: string }) {
    const { page, limit, status } = options;
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data: orders, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getOrderDetails(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async trackOrder(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true, trackingNumber: true, createdAt: true, updatedAt: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // Address Management
  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addAddress(userId: string, createAddressDto: CreateAddressDto) {
    if (createAddressDto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }

    return this.prisma.address.create({
      data: { userId, ...createAddressDto },
    });
  }

  async updateAddress(addressId: string, updateAddressDto: UpdateAddressDto) {
    return this.prisma.address.update({ where: { id: addressId }, data: updateAddressDto });
  }

  async deleteAddress(addressId: string) {
    await this.prisma.address.delete({ where: { id: addressId } });
  }

  async setDefaultAddress(userId: string, addressId: string) {
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id: addressId }, data: { isDefault: true } }),
    ]);
    return { message: 'Default address updated successfully' };
  }

  // Wishlist Management
  async getWishlist(userId: string, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const [wishlist, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { userId },
        include: { product: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wishlist.count({ where: { userId } }),
    ]);

    return { data: wishlist, total, page, totalPages: Math.ceil(total / limit) };
  }

  async addToWishlist(userId: string, productId: string) {
    return this.prisma.wishlist.upsert({
      where: { userId_productId: { userId, productId } },
      update: {},
      create: { userId, productId },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    await this.prisma.wishlist.delete({ where: { userId_productId: { userId, productId } } });
  }

  // Receipts & Notifications (placeholder logic)
  async getReceipts(userId: string, options: { page: number; limit: number }) {
    return { data: [], total: 0, page: 1, totalPages: 0 };
  }

  async getReceiptDetails(userId: string, receiptId: string) {
    return {};
  }

  async downloadReceipt(userId: string, receiptId: string) {
    return {};
  }

  async getNotifications(userId: string, options: { page: number; limit: number; isRead?: boolean }) {
    const { page, limit, isRead } = options;
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
    ]);

    return { data: notifications, total, page, totalPages: Math.ceil(total / limit) };
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
    return { message: 'All notifications marked as read' };
  }

  async deleteNotification(userId: string, notificationId: string) {
    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  // Account Statistics
  async getAccountStatistics(userId: string) {
    const [totalOrders, totalSpentAggregate, wishlistCount] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.aggregate({ where: { userId }, _sum: { totalAmount: true } }),
      this.prisma.wishlist.count({ where: { userId } }),
    ]);

    return {
      totalOrders,
      totalSpent: totalSpentAggregate._sum.totalAmount || 0,
      wishlistCount,
    };
  }
}
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import {
  UpdateProfileDto,
  CreateAddressDto,
  UpdateAddressDto,
  DashboardResponseDto,
} from './dto/dashboard.dto';

interface AuthRequest extends Request {
  user: {
    userId: string;
  };
}

@Controller('api/customer/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // ✅ Helper to safely extract userId
  private getUserId(req: AuthRequest): string {
    if (!req.user?.userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    return req.user.userId;
  }

  // Dashboard Overview
  @Get('overview')
  async getDashboardOverview(@Req() req: AuthRequest): Promise<DashboardResponseDto> {
    try {
      return await this.dashboardService.getDashboardOverview(this.getUserId(req));
    } catch {
      throw new HttpException('Failed to fetch dashboard overview', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // Profile
  @Get('profile')
  async getProfile(@Req() req: AuthRequest) {
    try {
      return await this.dashboardService.getCustomerProfile(this.getUserId(req));
    } catch {
      throw new HttpException('Failed to fetch profile', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('profile')
  async updateProfile(
    @Req() req: AuthRequest,
    @Body() dto: UpdateProfileDto,
  ) {
    try {
      return await this.dashboardService.updateProfile(this.getUserId(req), dto);
    } catch {
      throw new HttpException('Failed to update profile', HttpStatus.BAD_REQUEST);
    }
  }

  // Orders
  @Get('orders')
  async getOrderHistory(@Req() req: AuthRequest, @Query() query: any) {
    try {
      const { page = 1, limit = 10, status } = query;
      return await this.dashboardService.getOrderHistory(this.getUserId(req), {
        page: Number(page),
        limit: Number(limit),
        status,
      });
    } catch {
      throw new HttpException('Failed to fetch orders', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('orders/:orderId')
  async getOrderDetails(@Req() req: AuthRequest, @Param('orderId') orderId: string) {
    try {
      return await this.dashboardService.getOrderDetails(this.getUserId(req), orderId);
    } catch {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
  }

  @Get('orders/:orderId/track')
  async trackOrder(@Req() req: AuthRequest, @Param('orderId') orderId: string) {
    try {
      return await this.dashboardService.trackOrder(this.getUserId(req), orderId);
    } catch {
      throw new HttpException('Failed to track order', HttpStatus.NOT_FOUND);
    }
  }

  // Addresses
  @Get('addresses')
  async getAddresses(@Req() req: AuthRequest) {
    try {
      return await this.dashboardService.getAddresses(this.getUserId(req));
    } catch {
      throw new HttpException('Failed to fetch addresses', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('addresses')
  async addAddress(
    @Req() req: AuthRequest,
    @Body() dto: CreateAddressDto,
  ) {
    try {
      return await this.dashboardService.addAddress(this.getUserId(req), dto);
    } catch {
      throw new HttpException('Failed to add address', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('addresses/:addressId')
  async updateAddress(
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    try {
      return await this.dashboardService.updateAddress(addressId, dto);
    } catch {
      throw new HttpException('Failed to update address', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('addresses/:addressId')
  async deleteAddress(@Param('addressId') addressId: string) {
    try {
      await this.dashboardService.deleteAddress(addressId);
      return { message: 'Address deleted successfully' };
    } catch {
      throw new HttpException('Failed to delete address', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('addresses/:addressId/default')
  async setDefaultAddress(
    @Req() req: AuthRequest,
    @Param('addressId') addressId: string,
  ) {
    try {
      return await this.dashboardService.setDefaultAddress(this.getUserId(req), addressId);
    } catch {
      throw new HttpException('Failed to set default address', HttpStatus.BAD_REQUEST);
    }
  }

  // Wishlist
  @Get('wishlist')
  async getWishlist(@Req() req: AuthRequest, @Query() query: any) {
    try {
      const { page = 1, limit = 12 } = query;
      return await this.dashboardService.getWishlist(this.getUserId(req), {
        page: Number(page),
        limit: Number(limit),
      });
    } catch {
      throw new HttpException('Failed to fetch wishlist', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('wishlist/:productId')
  async addToWishlist(@Req() req: AuthRequest, @Param('productId') productId: string) {
    try {
      return await this.dashboardService.addToWishlist(this.getUserId(req), productId);
    } catch {
      throw new HttpException('Failed to add to wishlist', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('wishlist/:productId')
  async removeFromWishlist(@Req() req: AuthRequest, @Param('productId') productId: string) {
    try {
      await this.dashboardService.removeFromWishlist(this.getUserId(req), productId);
      return { message: 'Product removed from wishlist' };
    } catch {
      throw new HttpException('Failed to remove from wishlist', HttpStatus.BAD_REQUEST);
    }
  }

  // Notifications
  @Get('notifications')
  async getNotifications(@Req() req: AuthRequest, @Query() query: any) {
    try {
      const { page = 1, limit = 20, isRead } = query;
      return await this.dashboardService.getNotifications(this.getUserId(req), {
        page: Number(page),
        limit: Number(limit),
        isRead,
      });
    } catch {
      throw new HttpException('Failed to fetch notifications', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put('notifications/:notificationId/read')
  async markNotificationAsRead(
    @Req() req: AuthRequest,
    @Param('notificationId') notificationId: string,
  ) {
    try {
      return await this.dashboardService.markNotificationAsRead(this.getUserId(req), notificationId);
    } catch {
      throw new HttpException('Failed to mark notification as read', HttpStatus.BAD_REQUEST);
    }
  }

  @Put('notifications/mark-all-read')
  async markAllNotificationsAsRead(@Req() req: AuthRequest) {
    try {
      return await this.dashboardService.markAllNotificationsAsRead(this.getUserId(req));
    } catch {
      throw new HttpException('Failed to mark all notifications as read', HttpStatus.BAD_REQUEST);
    }
  }

  @Delete('notifications/:notificationId')
  async deleteNotification(
    @Req() req: AuthRequest,
    @Param('notificationId') notificationId: string,
  ) {
    try {
      await this.dashboardService.deleteNotification(this.getUserId(req), notificationId);
      return { message: 'Notification deleted successfully' };
    } catch {
      throw new HttpException('Failed to delete notification', HttpStatus.BAD_REQUEST);
    }
  }

  // Statistics
  @Get('statistics')
  async getAccountStatistics(@Req() req: AuthRequest) {
    try {
      return await this.dashboardService.getAccountStatistics(this.getUserId(req));
    } catch {
      throw new HttpException('Failed to fetch account statistics', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
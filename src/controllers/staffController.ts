import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface StaffPerformance {
  staffId: string;
  staffName: string;
  ordersProcessed: number;
  totalSales: number;
  customersServed: number;
  lastActive: Date;
}

// Get all staff performance
export const getStaffPerformance = async (req: Request, res: Response) => {
  try {
    // Get all users with role STAFF or ADMIN
    const staffUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'ADMIN'],
        },
      },
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
        },
      },
    });

    const performance: StaffPerformance[] = staffUsers.map((staff) => {
      const paidOrders = staff.orders.filter((order) => order.paymentStatus === 'PAID');
      const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      // Get unique customers served
      const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));
      
      // Get last active date from most recent order
      const lastOrderDate = paidOrders.length > 0
        ? new Date(Math.max(...paidOrders.map((o) => new Date(o.createdAt).getTime())))
        : staff.lastLoginAt || staff.createdAt;

      return {
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: lastOrderDate,
      };
    });

    // Sort by total sales descending
    performance.sort((a, b) => b.totalSales - a.totalSales);

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Get staff performance error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get top performing staff
export const getTopPerformingStaff = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    const staffUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'ADMIN'],
        },
      },
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
        },
      },
    });

    const performance: StaffPerformance[] = staffUsers.map((staff) => {
      const paidOrders = staff.orders.filter((order) => order.paymentStatus === 'PAID');
      const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
      
      const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));

      return {
        staffId: staff.id,
        staffName: `${staff.firstName} ${staff.lastName}`,
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: staff.lastLoginAt || staff.createdAt,
      };
    });

    // Sort by total sales and take top N
    performance.sort((a, b) => b.totalSales - a.totalSales);
    const topPerformers = performance.slice(0, limit);

    return res.status(200).json({
      success: true,
      data: topPerformers,
    });
  } catch (error: any) {
    console.error('Get top staff error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get staff performance by ID
export const getStaffPerformanceById = async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;

    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
          include: {
            items: true,
            user: true,
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    const paidOrders = staff.orders;
    const totalSales = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));

    const performance = {
      staffId: staff.id,
      staffName: `${staff.firstName} ${staff.lastName}`,
      staffEmail: staff.email,
      staffPhone: staff.phoneNumber,
      ordersProcessed: paidOrders.length,
      totalSales: totalSales,
      customersServed: uniqueCustomers.size,
      lastActive: staff.lastLoginAt || staff.createdAt,
      orders: paidOrders.map((order) => ({
        id: order.id,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        status: order.paymentStatus,
      })),
    };

    return res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error: any) {
    console.error('Get staff by ID error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
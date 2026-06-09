import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get all staff members
export const getAllStaff = async (req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      where: {
        role: {
          in: ['STAFF', 'ADMIN'],
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phoneNumber: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const formattedStaff = staff.map((s) => ({
      id: s.id,
      name: s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
      email: s.email,
      phone: s.phoneNumber || s.phone || 'N/A',
      role: s.role.toLowerCase(),
      status: s.status.toLowerCase(),
      joinedAt: s.createdAt,
      lastActive: s.lastLoginAt || s.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedStaff,
    });
  } catch (error: any) {
    console.error('Get all staff error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get staff performance
export const getStaffPerformance = async (req: Request, res: Response) => {
  try {
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
          include: {
            items: true,
          },
        },
      },
    });

    const performance = staffUsers.map((staff) => {
      const paidOrders = staff.orders;
      const totalSales = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));
      
      let lastActive = staff.lastLoginAt || staff.createdAt;
      if (paidOrders.length > 0) {
        const lastOrderDate = new Date(Math.max(...paidOrders.map((o) => new Date(o.createdAt).getTime())));
        if (lastOrderDate > lastActive) {
          lastActive = lastOrderDate;
        }
      }

      return {
        staffId: staff.id,
        staffName: staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: lastActive,
      };
    });

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

    const performance = staffUsers.map((staff) => {
      const paidOrders = staff.orders;
      const totalSales = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));

      return {
        staffId: staff.id,
        staffName: staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: staff.lastLoginAt || staff.createdAt,
      };
    });

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

// Get staff by ID
export const getStaffById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffId = typeof id === 'string' ? id : id?.[0];

    if (!staffId) {
      return res.status(400).json({ success: false, error: 'Staff ID required' });
    }

    const staff = await prisma.user.findUnique({
      where: { id: staffId },
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
          include: {
            items: true,
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    const paidOrders = staff.orders;
    const totalSales = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));

    return res.status(200).json({
      success: true,
      data: {
        staffId: staff.id,
        staffName: staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
        staffEmail: staff.email,
        staffPhone: staff.phoneNumber || staff.phone || 'N/A',
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: staff.lastLoginAt || staff.createdAt,
        orders: paidOrders.map((order) => ({
          id: order.id,
          orderIdDisplay: order.id.slice(0, 8),
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          status: order.paymentStatus,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get staff by ID error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get staff performance by ID
export const getStaffPerformanceById = async (req: Request, res: Response) => {
  try {
    const { staffId } = req.params;
    const id = typeof staffId === 'string' ? staffId : staffId?.[0];

    if (!id) {
      return res.status(400).json({ success: false, error: 'Staff ID required' });
    }

    const staff = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          where: {
            paymentStatus: 'PAID',
          },
          include: {
            items: true,
          },
        },
      },
    });

    if (!staff) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    const paidOrders = staff.orders;
    const totalSales = paidOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const uniqueCustomers = new Set(paidOrders.map((order) => order.userId));

    return res.status(200).json({
      success: true,
      data: {
        staffId: staff.id,
        staffName: staff.name || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email,
        staffEmail: staff.email,
        staffPhone: staff.phoneNumber || staff.phone || 'N/A',
        ordersProcessed: paidOrders.length,
        totalSales: totalSales,
        customersServed: uniqueCustomers.size,
        lastActive: staff.lastLoginAt || staff.createdAt,
        orders: paidOrders.map((order) => ({
          id: order.id,
          orderIdDisplay: order.id.slice(0, 8),
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          status: order.paymentStatus,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get staff performance by ID error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Update staff status
export const updateStaffStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const staffId = typeof id === 'string' ? id : id?.[0];

    if (!staffId) {
      return res.status(400).json({ success: false, error: 'Staff ID required' });
    }

    const updatedStaff = await prisma.user.update({
      where: { id: staffId },
      data: { status: status.toUpperCase() },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Staff status updated successfully',
      data: updatedStaff,
    });
  } catch (error: any) {
    console.error('Update staff status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete staff
export const deleteStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const staffId = typeof id === 'string' ? id : id?.[0];

    if (!staffId) {
      return res.status(400).json({ success: false, error: 'Staff ID required' });
    }

    await prisma.user.delete({
      where: { id: staffId },
    });

    return res.status(200).json({
      success: true,
      message: 'Staff deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete staff error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Create staff (admin only)
export const createStaff = async (req: Request, res: Response) => {
  try {
    const { email, firstName, lastName, phone, role, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User with this email already exists' });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        name: `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
        passwordHash: hashedPassword,
        phoneNumber: phone || '',
        role: role?.toUpperCase() || 'STAFF',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: newStaff,
    });
  } catch (error: any) {
    console.error('Create staff error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
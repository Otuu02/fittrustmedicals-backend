import { Request, Response } from 'express';
import { PrismaClient, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to convert string to NotificationType enum
const getNotificationType = (type: string): NotificationType => {
  switch (type?.toUpperCase()) {
    case 'ORDER_UPDATE':
      return NotificationType.ORDER_UPDATE;
    case 'PAYMENT_CONFIRMATION':
      return NotificationType.PAYMENT_CONFIRMATION;
    case 'SHIPPING_UPDATE':
      return NotificationType.SHIPPING_UPDATE;
    case 'PROMOTIONAL':
      return NotificationType.PROMOTIONAL;
    case 'SYSTEM':
      return NotificationType.SYSTEM;
    default:
      return NotificationType.GENERAL;
  }
};

// GET /api/notifications - Fetch all notifications for a user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.query.userId;
    
    const notifications = await prisma.notification.findMany({
      where: userId ? { userId: userId as string } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    
    return res.status(200).json(notifications);
  } catch (error: any) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/notifications - Create a new notification
export const createNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, message, type, actionUrl, metadata } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'userId, title, and message are required' 
      });
    }
    
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: getNotificationType(type),
        actionUrl: actionUrl || null,
        metadata: metadata || {},
        isRead: false,
      },
    });
    
    return res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification created successfully',
    });
  } catch (error: any) {
    console.error('Create notification error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PATCH /api/notifications/:id/read - Mark a single notification as read
export const markNotificationAsRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Notification ID required' });
    }
    
    const notification = await prisma.notification.update({
      where: { id: id as string },
      data: { isRead: true },
    });
    
    return res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/notifications/read-all - Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }
    
    await prisma.notification.updateMany({
      where: { 
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
    
    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/notifications/:id - Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Notification ID required' });
    }
    
    await prisma.notification.delete({
      where: { id: id as string },
    });
    
    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/notifications/unread-count - Get unread count for a user
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || req.query.userId;
    
    if (!userId) {
      return res.status(200).json({ unreadCount: 0 });
    }
    
    const count = await prisma.notification.count({
      where: { 
        userId: userId as string,
        isRead: false,
      },
    });
    
    return res.status(200).json({ unreadCount: count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Helper function to send order notification (can be called from other controllers)
export const sendOrderNotification = async (userId: string, orderId: string, status: string) => {
  try {
    let title = '';
    let message = '';
    let type: NotificationType = NotificationType.ORDER_UPDATE;
    
    switch (status) {
      case 'PAID':
        title = 'Payment Confirmed';
        message = `Your payment for order #${orderId.slice(0, 8)} has been confirmed. Your order is being processed.`;
        type = NotificationType.PAYMENT_CONFIRMATION;
        break;
      case 'PROCESSING':
        title = 'Order Processing';
        message = `Your order #${orderId.slice(0, 8)} is now being processed and will be shipped soon.`;
        type = NotificationType.ORDER_UPDATE;
        break;
      case 'SHIPPED':
        title = 'Order Shipped';
        message = `Great news! Your order #${orderId.slice(0, 8)} has been shipped and is on its way.`;
        type = NotificationType.SHIPPING_UPDATE;
        break;
      case 'DELIVERED':
        title = 'Order Delivered';
        message = `Your order #${orderId.slice(0, 8)} has been delivered. Thank you for shopping with us!`;
        type = NotificationType.ORDER_UPDATE;
        break;
      default:
        title = 'Order Update';
        message = `Your order #${orderId.slice(0, 8)} has been updated to ${status}.`;
    }
    
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        actionUrl: `/orders/${orderId}`,
        isRead: false,
      },
    });
    
    console.log(`📧 Notification created for user ${userId}: ${title}`);
  } catch (error) {
    console.error('Error creating order notification:', error);
  }
};
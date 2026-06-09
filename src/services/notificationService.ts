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

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: string;
  actionUrl?: string;
  metadata?: any;
}

export const sendNotification = async (data: NotificationData) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: getNotificationType(data.type || 'SYSTEM'),
        actionUrl: data.actionUrl,
        metadata: data.metadata || {},
        isRead: false,
      },
    });
    
    console.log(`📧 Notification sent to ${data.userId}: ${data.title}`);
    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error);
    return null;
  }
};

// Send notification when order is confirmed
export const notifyOrderConfirmed = async (userId: string, orderId: string) => {
  return sendNotification({
    userId,
    title: 'Order Confirmed 🎉',
    message: `Your order #${orderId.slice(0, 8)} has been confirmed and is being processed.`,
    type: 'ORDER_UPDATE',
    actionUrl: `/orders/${orderId}`,
  });
};

// Send notification when payment is received
export const notifyPaymentReceived = async (userId: string, orderId: string, amount: number) => {
  return sendNotification({
    userId,
    title: 'Payment Received 💰',
    message: `We have received your payment of ₦${amount.toLocaleString()} for order #${orderId.slice(0, 8)}.`,
    type: 'PAYMENT_CONFIRMATION',
    actionUrl: `/orders/${orderId}`,
  });
};

// Send notification when order is shipped
export const notifyOrderShipped = async (userId: string, orderId: string, trackingNumber?: string) => {
  return sendNotification({
    userId,
    title: 'Order Shipped 🚚',
    message: trackingNumber 
      ? `Your order #${orderId.slice(0, 8)} has been shipped. Tracking number: ${trackingNumber}`
      : `Your order #${orderId.slice(0, 8)} has been shipped and is on its way!`,
    type: 'SHIPPING_UPDATE',
    actionUrl: `/orders/${orderId}`,
  });
};

// Send notification for promotional offer
export const notifyPromotionalOffer = async (userId: string, title: string, message: string, actionUrl?: string) => {
  return sendNotification({
    userId,
    title,
    message,
    type: 'PROMOTIONAL',
    actionUrl,
  });
};
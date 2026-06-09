import { Router } from 'express';
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController';

const router = Router();

// Get all notifications
router.get('/notifications', getNotifications);

// Get unread count
router.get('/notifications/unread-count', getUnreadCount);

// Create new notification
router.post('/notifications', createNotification);

// Mark all as read
router.post('/notifications/read-all', markAllNotificationsAsRead);

// Mark single as read
router.patch('/notifications/:id/read', markNotificationAsRead);

// Delete notification
router.delete('/notifications/:id', deleteNotification);

export default router;
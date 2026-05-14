import { Router } from 'express';
import {
  createOrder,
  getOrders,
  confirmPayment,
  getWallet,
  withdrawFunds,
} from '../controllers/paymentController';

const router = Router();

// Order routes
router.post('/orders', createOrder);
router.get('/orders', getOrders);

// Admin - Payment confirmation
router.post('/admin/confirm-payment', confirmPayment);

// Admin - Wallet management
router.get('/admin/wallet', getWallet);
router.post('/admin/withdraw', withdrawFunds);

export default router;
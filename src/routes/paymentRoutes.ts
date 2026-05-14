import { Router } from 'express';
import {
  createOrder,
  getOrders,
  confirmPayment,
  getWallet,
  withdrawFunds,
} from '../controllers/paymentController';
import { sendReceiptEmail, sendBulkReceipts } from '../controllers/receiptController';

const router = Router();

// ============================================
// ORDER ROUTES
// ============================================
router.post('/orders', createOrder);
router.get('/orders', getOrders);

// ============================================
// ADMIN - PAYMENT CONFIRMATION
// ============================================
router.post('/admin/confirm-payment', confirmPayment);

// ============================================
// ADMIN - WALLET MANAGEMENT
// ============================================
router.get('/admin/wallet', getWallet);
router.post('/admin/withdraw', withdrawFunds);

// ============================================
// RECEIPT ROUTES (Send email receipts to customers)
// ============================================
router.post('/orders/:orderId/send-receipt', sendReceiptEmail);
router.post('/orders/bulk-send-receipts', sendBulkReceipts);

export default router;
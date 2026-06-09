import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  getOrdersByCustomerEmail,
  getOrderStatistics
} from '../controllers/orderController';
import {
  getBankAccounts,
  addBankAccount,
  removeBankAccount,
} from '../controllers/bankAccountController';
import {
  getPendingWithdrawals,
  requestWithdrawal,
  processWithdrawal,
} from '../controllers/withdrawalController';
import { getWallet, withdrawFunds } from '../controllers/paymentController';

const router = Router();

// ============================================
// ORDER ROUTES
// ============================================

// Create new order (with automatic stock deduction)
router.post('/orders', createOrder);

// Get all orders
router.get('/orders', getAllOrders);

// Get order statistics
router.get('/orders/statistics', getOrderStatistics);

// Get orders by customer email
router.get('/orders/customer/:email', getOrdersByCustomerEmail);

// Get single order by ID
router.get('/orders/:id', getOrderById);

// Update order status
router.put('/orders/:id', updateOrderStatus);

// Delete order (with stock restoration)
router.delete('/orders/:id', deleteOrder);

// ============================================
// BANK ACCOUNT ROUTES
// ============================================
router.get('/admin/bank-accounts', getBankAccounts);
router.post('/admin/bank-accounts', addBankAccount);
router.delete('/admin/bank-accounts/:id', removeBankAccount);

// ============================================
// WITHDRAWAL ROUTES
// ============================================
router.get('/admin/withdrawals/pending', getPendingWithdrawals);
router.post('/admin/withdrawals', requestWithdrawal);
router.post('/admin/withdrawals/:id/process', processWithdrawal);

// ============================================
// WALLET ROUTES
// ============================================
router.get('/admin/wallet', getWallet);
router.post('/admin/withdraw', withdrawFunds);

export default router;
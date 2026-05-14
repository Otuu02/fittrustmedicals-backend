import { Router } from 'express';
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
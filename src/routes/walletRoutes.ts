import { Router } from 'express';
import {
  getBankAccounts,
  getPendingWithdrawals,
  recordWithdrawal,
} from '../controllers/walletController';
import { getWallet } from '../controllers/paymentController';

const router = Router();

// Wallet routes
router.get('/admin/wallet', getWallet);
router.get('/admin/bank-accounts', getBankAccounts);
router.get('/admin/withdrawals/pending', getPendingWithdrawals);
router.post('/admin/withdraw', recordWithdrawal);

export default router;
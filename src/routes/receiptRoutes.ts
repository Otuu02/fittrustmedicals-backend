import { Router } from 'express';
import { 
  sendReceiptEmail, 
  sendBulkReceipts, 
  testEmailConfig,
  generateReceiptHTMLDownload
} from '../controllers/receiptController';

const router = Router();

// Send single receipt
router.post('/receipts/send/:orderId', sendReceiptEmail);

// Send bulk receipts
router.post('/receipts/send-bulk', sendBulkReceipts);

// Test email configuration
router.get('/receipts/test-email', testEmailConfig);

// Download HTML receipt (user can print to PDF)
router.get('/receipts/download/:orderId', generateReceiptHTMLDownload);

export default router;
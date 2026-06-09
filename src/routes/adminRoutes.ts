import { Router } from 'express';
import { PrismaClient, PaymentStatus, OrderStatus } from '@prisma/client';
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

const prisma = new PrismaClient();
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

// ============================================
// INVENTORY & STOCK MANAGEMENT ROUTES
// ============================================

// Get all products with stock information
router.get('/admin/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get low stock products (≤5 units)
router.get('/admin/products/low-stock', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        stockQuantity: {
          lte: 5
        },
        isActive: true
      },
      orderBy: { stockQuantity: 'asc' }
    });
    res.json(products);
  } catch (error: any) {
    console.error('Error fetching low stock products:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Adjust stock manually
router.post('/admin/products/:productId/stock', async (req, res) => {
  try {
    const { productId } = req.params;
    const { adjustment, reason } = req.body;
    
    if (!adjustment || adjustment === 0) {
      return res.status(400).json({ success: false, error: 'Adjustment amount is required and cannot be zero' });
    }
    
    const product = await prisma.$transaction(async (prisma) => {
      const currentProduct = await prisma.product.findUnique({
        where: { id: productId }
      });
      
      if (!currentProduct) {
        throw new Error('Product not found');
      }
      
      const newStock = currentProduct.stockQuantity + adjustment;
      
      if (newStock < 0) {
        throw new Error(`Cannot reduce stock below 0. Current stock: ${currentProduct.stockQuantity}`);
      }
      
      const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newStock
        }
      });
      
      // Log stock adjustment in inventory ledger
      await prisma.inventoryLedger.create({
        data: {
          productId: productId,
          type: adjustment > 0 ? 'STOCK_IN' : 'STOCK_OUT',
          quantity: Math.abs(adjustment),
          reference: 'Admin adjustment',
          notes: reason || `Manual stock adjustment by admin (${adjustment > 0 ? '+' : ''}${adjustment})`
        }
      });
      
      return updatedProduct;
    });
    
    console.log(`✅ Stock adjusted for product ${productId}: ${adjustment > 0 ? '+' : ''}${adjustment}`);
    
    res.json({ 
      success: true, 
      product,
      message: `Stock ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)} units`
    });
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get stock logs for a product
router.get('/admin/products/:productId/stock-logs', async (req, res) => {
  try {
    const { productId } = req.params;
    
    const logs = await prisma.inventoryLedger.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching stock logs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ORDER MANAGEMENT ROUTES
// ============================================

// Admin: Confirm payment and update order
router.post('/admin/confirm-payment', async (req, res) => {
  try {
    const { orderId, transactionReference, confirmedBy } = req.body;
    
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }
    
    const order = await prisma.$transaction(async (prisma) => {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true, items: true }
      });
      
      if (!existingOrder) {
        throw new Error('Order not found');
      }
      
      if (existingOrder.paymentStatus === PaymentStatus.PAID) {
        throw new Error('Order already paid');
      }
      
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.PAYMENT_CONFIRMED,
          transactionReference: transactionReference || existingOrder.transactionReference,
          paidAt: new Date(),
          paymentConfirmedBy: confirmedBy || 'admin'
        },
        include: { user: true, items: true }
      });
      
      return updatedOrder;
    });
    
    console.log(`✅ Payment confirmed for order ${orderId}`);
    
    res.json({ 
      success: true, 
      order,
      message: `Payment confirmed successfully`
    });
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Cancel order and restore stock
router.post('/admin/orders/:orderId/cancel', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
    const result = await prisma.$transaction(async (prisma) => {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });
      
      if (!order) {
        throw new Error('Order not found');
      }
      
      if (order.paymentStatus === PaymentStatus.PAID && order.status !== OrderStatus.CANCELLED) {
        // Restore stock for each item
        for (const item of order.items) {
          if (item.productId) {
            await prisma.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: {
                  increment: item.quantity
                }
              }
            });
            
            // Log stock restoration
            await prisma.inventoryLedger.create({
              data: {
                productId: item.productId,
                type: 'STOCK_IN',
                quantity: item.quantity,
                reference: `Order ${orderId} cancelled`,
                notes: reason || `Stock restored due to order cancellation`
              }
            });
          }
        }
      }
      
      // Fix: Use 'FAILED' instead of 'CANCELLED' for payment status
      const cancelledOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: order.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
          adminNotes: reason || `Order cancelled by admin`
        }
      });
      
      return cancelledOrder;
    });
    
    console.log(`✅ Order ${orderId} cancelled and stock restored`);
    
    res.json({ 
      success: true, 
      order: result,
      message: 'Order cancelled and stock restored successfully'
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Get inventory summary
router.get('/admin/inventory/summary', async (req, res) => {
  try {
    const totalProducts = await prisma.product.count();
    const outOfStock = await prisma.product.count({
      where: { stockQuantity: 0, isActive: true }
    });
    const lowStock = await prisma.product.count({
      where: { 
        stockQuantity: { gt: 0, lte: 5 },
        isActive: true
      }
    });
    const inStock = await prisma.product.count({
      where: { stockQuantity: { gt: 5 }, isActive: true }
    });
    const totalUnits = await prisma.product.aggregate({
      where: { isActive: true },
      _sum: { stockQuantity: true }
    });
    
    res.json({
      success: true,
      summary: {
        totalProducts,
        outOfStock,
        lowStock,
        inStock,
        totalUnits: totalUnits._sum.stockQuantity || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching inventory summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin: Bulk stock update
router.post('/admin/products/bulk-stock', async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: 'Updates array is required' });
    }
    
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const product = await prisma.$transaction(async (prisma) => {
          const currentProduct = await prisma.product.findUnique({
            where: { id: update.productId }
          });
          
          if (!currentProduct) {
            throw new Error(`Product ${update.productId} not found`);
          }
          
          const newStock = currentProduct.stockQuantity + update.adjustment;
          
          if (newStock < 0) {
            throw new Error(`Cannot reduce stock below 0 for ${currentProduct.name}`);
          }
          
          const updatedProduct = await prisma.product.update({
            where: { id: update.productId },
            data: { stockQuantity: newStock }
          });
          
          await prisma.inventoryLedger.create({
            data: {
              productId: update.productId,
              type: update.adjustment > 0 ? 'STOCK_IN' : 'STOCK_OUT',
              quantity: Math.abs(update.adjustment),
              reference: 'Bulk admin adjustment',
              notes: update.reason || `Bulk stock adjustment (${update.adjustment > 0 ? '+' : ''}${update.adjustment})`
            }
          });
          
          return updatedProduct;
        });
        
        results.push({ productId: update.productId, success: true });
      } catch (error: any) {
        errors.push({ productId: update.productId, error: error.message });
      }
    }
    
    res.json({
      success: true,
      results,
      errors,
      message: `Updated ${results.length} products, ${errors.length} failed`
    });
  } catch (error: any) {
    console.error('Error in bulk stock update:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
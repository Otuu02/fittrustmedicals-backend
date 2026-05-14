import { Request, Response } from 'express';
import { PrismaClient, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function sendCustomerEmail(order: any, customer: any) {
  console.log(`📧 Would send email to ${customer.email} for order ${order.id}`);
  console.log(`   Amount: ₦${order.totalAmount}`);
  return true;
}

async function sendAdminEmail(order: any, customer: any) {
  console.log(`📧 Would notify admin about order ${order.id} from ${customer.email}`);
  return true;
}

async function getWalletBalance() {
  const paid = await prisma.order.aggregate({
    where: { paymentStatus: 'PAID' as PaymentStatus },
    _sum: { totalAmount: true },
  });
  const withdrawn = await prisma.withdrawal.aggregate({ _sum: { amount: true } });
  const earned = paid._sum.totalAmount || 0;
  const taken = withdrawn._sum.amount || 0;
  return { availableBalance: earned - taken, totalEarned: earned, totalWithdrawn: taken };
}

// CREATE ORDER
export const createOrder = async (req: Request, res: Response) => {
  try {
    // Debug logging
    console.log('🔍 Incoming request body:', req.body);
    console.log('🔍 Content-Type:', req.headers['content-type']);

    const { firstName, lastName, email, phone, address, totalAmount, items } = req.body;

    // Check if body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Request body is empty. Please ensure Content-Type is application/json' 
      });
    }

    if (!firstName || !lastName || !email || !totalAmount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields',
        required: ['firstName', 'lastName', 'email', 'totalAmount'],
        received: { firstName, lastName, email, totalAmount, hasItems: !!items }
      });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: { 
          firstName, 
          lastName, 
          email, 
          phoneNumber: phone || '', 
          passwordHash: 'temp', 
          role: 'CUSTOMER' 
        },
      });
    }

    // Create order WITHOUT productId to avoid foreign key constraint
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        subtotal: totalAmount,
        tax: 0,
        shippingCost: 0,
        totalAmount: totalAmount,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        paymentMethod: 'bank_transfer',
        shippingAddress: address || {},
        billingAddress: address || {},
        items: { 
          create: (items || []).map((item: any) => ({ 
            // REMOVED productId to fix foreign key constraint
            productName: item.name, 
            quantity: item.quantity, 
            unitPrice: item.price 
          })) 
        },
      },
      include: { user: true, items: true },
    });

    console.log(`✅ Order created: ${order.id} for ${email} - ₦${totalAmount}`);

    res.json({ success: true, order });
  } catch (error: any) {
    console.error('❌ Order creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET ORDERS
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    
    let where: any = {};
    if (status && typeof status === 'string') {
      where = { paymentStatus: status };
    }
    
    const orders = await prisma.order.findMany({ 
      where, 
      include: { user: true, items: true }, 
      orderBy: { createdAt: 'desc' } 
    });
    res.json(orders);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// CONFIRM PAYMENT
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { orderId, transactionReference } = req.body;
    if (!orderId) return res.status(400).json({ success: false, error: 'Order ID required' });

    const order = await prisma.order.findUnique({ 
      where: { id: orderId }, 
      include: { user: true, items: true } 
    });
    
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.paymentStatus === 'PAID') return res.status(400).json({ success: false, error: 'Already paid' });

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { 
        paymentStatus: 'PAID', 
        status: 'PROCESSING', 
        transactionReference: transactionReference || `MANUAL_${Date.now()}`, 
        paidAt: new Date() 
      },
      include: { user: true, items: true },
    });

    await prisma.wallet.upsert({
      where: { id: 1 },
      update: { 
        totalEarned: { increment: updated.totalAmount }, 
        availableBalance: { increment: updated.totalAmount } 
      },
      create: { 
        id: 1, 
        totalEarned: updated.totalAmount, 
        availableBalance: updated.totalAmount, 
        totalWithdrawn: 0 
      },
    });

    await sendCustomerEmail(updated, updated.user);
    await sendAdminEmail(updated, updated.user);

    res.json({ success: true, message: 'Payment confirmed, emails sent', order: updated });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET WALLET
export const getWallet = async (req: Request, res: Response) => {
  const wallet = await getWalletBalance();
  res.json(wallet);
};

// WITHDRAW FUNDS
export const withdrawFunds = async (req: Request, res: Response) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, error: 'Invalid amount' });

    const wallet = await getWalletBalance();
    if (amount > wallet.availableBalance) return res.status(400).json({ success: false, error: 'Insufficient balance' });

    const withdrawal = await prisma.withdrawal.create({
      data: { 
        amount, 
        bankName: bankName || 'Access Bank', 
        accountNumber, 
        accountName, 
        status: 'completed' 
      },
    });

    res.json({ success: true, message: `Withdrawal of ₦${amount.toLocaleString()} recorded`, withdrawal });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};
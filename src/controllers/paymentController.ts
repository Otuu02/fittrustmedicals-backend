import { Request, Response } from 'express';
import { PrismaClient, PaymentStatus } from '@prisma/client';

// ✅ FIXED: Use require for nodemailer (CommonJS compatibility for Render)
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

// ============================================
// EMAIL CONFIGURATION
// ============================================

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
});

transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready');
  }
});

// ============================================
// EMAIL FUNCTIONS
// ============================================

// Email sent to CUSTOMER when admin confirms payment
async function sendCustomerPaymentConfirmation(order: any, customer: any) {
  try {
    const items = (order.items || []).map((item: any) => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.unitPrice,
    }));
    
    const itemsHtml = items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">₦${Number(item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    const customerName = `${customer.firstName} ${customer.lastName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2c7da0; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">FitTrust Medicals</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>✓ Payment Confirmed, ${customerName}!</h2>
          <p>Your payment has been successfully verified. Your order is now being processed.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order #${order.id}</h3>
            <p><strong>Transaction Reference:</strong> ${order.transactionReference || 'N/A'}</p>
            <p><strong>Amount Paid:</strong> ₦${Number(order.totalAmount).toLocaleString()}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
              <tr style="background: #2c7da0; color: white;">
                <th style="padding: 10px; text-align: left;">Product</th>
                <th style="padding: 10px; text-align: left;">Qty</th>
                <th style="padding: 10px; text-align: left;">Price</th>
              </tr>
              ${itemsHtml}
              <tr style="background: #eee;">
                <td colspan="2" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
                <td style="padding: 10px;"><strong>₦${Number(order.totalAmount).toLocaleString()}</strong></td>
              </tr>
            </table>
          </div>
          
          <p>Your order will be delivered within 3-5 business days.</p>
          <p>Thank you for shopping with FitTrust Medicals!</p>
        </div>
        
        <div style="background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>FitTrust Medicals – Your trusted health partner</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
      to: customer.email,
      subject: `✅ Payment Confirmed - Order #${order.id}`,
      html,
    });
    console.log(`📧 Payment confirmation email sent to customer: ${customer.email}`);
  } catch (err) {
    console.error('Failed to send customer confirmation email:', err);
  }
}

// Email sent to ADMIN when customer clicks "I Have Paid"
async function sendAdminPaymentNotification(orderId: string, customerName: string, customerEmail: string, totalAmount: number) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2 style="color: #2c7da0;">💰 Payment Notification</h2>
        <p><strong>Customer:</strong> ${customerName}</p>
        <p><strong>Email:</strong> ${customerEmail}</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Amount:</strong> ₦${totalAmount.toLocaleString()}</p>
        <p><strong>Status:</strong> Payment made, awaiting verification</p>
        <hr />
        <p>Please log in to the admin dashboard to verify this payment.</p>
        <p><a href="${process.env.FRONTEND_URL}/admin/dashboard" style="background: #2c7da0; color: white; padding: 10px 20px; text-decoration: none;">View Dashboard</a></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
      to: process.env.ADMIN_EMAIL || 'fittrustsurgical56@gmail.com',
      subject: `💰 Payment Notification - ${orderId}`,
      html,
    });
    console.log(`📧 Admin notification email sent`);
  } catch (err) {
    console.error('Failed to send admin notification:', err);
  }
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

// ============================================
// CREATE ORDER (No email sent here)
// ============================================

export const createOrder = async (req: Request, res: Response) => {
  try {
    console.log('🔍 Incoming request body:', req.body);

    const { firstName, lastName, email, phone, address, totalAmount, items } = req.body;

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
        received: { firstName, lastName, email, totalAmount }
      });
    }

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

// ============================================
// GET ORDERS
// ============================================

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

// ============================================
// ADMIN CONFIRMS PAYMENT - Email sent to CUSTOMER here
// ============================================

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

    // ✅ Send email to CUSTOMER when admin confirms payment
    await sendCustomerPaymentConfirmation(updated, updated.user);

    console.log(`✅ Payment confirmed for order ${orderId}, customer notified`);

    res.json({ success: true, message: 'Payment confirmed, customer notified by email', order: updated });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// GET WALLET
// ============================================

export const getWallet = async (req: Request, res: Response) => {
  const wallet = await getWalletBalance();
  res.json(wallet);
};

// ============================================
// WITHDRAW FUNDS
// ============================================

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
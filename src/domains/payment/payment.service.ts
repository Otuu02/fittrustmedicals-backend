import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as nodemailer from 'nodemailer';

const prisma = new PrismaClient();

// Email transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Helper function to format order items for email
function formatOrderItemsForEmail(items: any[]) {
  return items.map(item => ({
    name: item.productName,
    quantity: item.quantity,
    price: item.unitPrice,
  }));
}

@Injectable()
export class PaymentService {
  constructor() {
    transporter.verify((error, success) => {
      if (error) {
        console.error('Email transporter error:', error);
      } else {
        console.log('✅ Email server is ready');
      }
    });
  }

  async createOrder(data: any) {
    const { firstName, lastName, email, phone, address, totalAmount, items } = data;

    // Create or get user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phoneNumber: phone || '',
          passwordHash: 'temp', // Handle properly in production
          role: 'CUSTOMER',
        },
      });
    }

    // Create order using correct schema field names
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
          create: items.map((item: any) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price,
          })),
        },
      },
      include: { user: true, items: true },
    });

    return { success: true, order };
  }

  async getOrders(status?: string) {
    const where: any = {};
    if (status) {
      where.paymentStatus = status;
    }
    
    return await prisma.order.findMany({
      where,
      include: { user: true, items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmPayment(orderId: string, transactionReference?: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });

    if (!order) throw new Error('Order not found');
    if (order.paymentStatus === 'PAID') throw new Error('Order already paid');

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'PAID',
        status: 'PROCESSING',
        paidAt: new Date(),
        transactionReference: transactionReference || `MANUAL_${Date.now()}`,
      },
      include: { user: true, items: true },
    });

    // Update wallet using totalAmount
    await prisma.wallet.upsert({
      where: { id: 1 },
      update: {
        totalEarned: { increment: updatedOrder.totalAmount },
        availableBalance: { increment: updatedOrder.totalAmount },
      },
      create: {
        id: 1,
        totalEarned: updatedOrder.totalAmount,
        availableBalance: updatedOrder.totalAmount,
        totalWithdrawn: 0,
      },
    });

    // Send emails
    await this.sendEmails(updatedOrder, updatedOrder.user);

    return { success: true, message: 'Payment confirmed, emails sent', order: updatedOrder };
  }

  async getWallet() {
    const totalEarnedResult = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    });

    const totalWithdrawnResult = await prisma.withdrawal.aggregate({
      _sum: { amount: true },
    });

    const totalEarned = (totalEarnedResult._sum.totalAmount as number) || 0;
    const totalWithdrawn = (totalWithdrawnResult._sum.amount as number) || 0;

    return {
      availableBalance: Number(totalEarned) - Number(totalWithdrawn),
      totalEarned: Number(totalEarned),
      totalWithdrawn: Number(totalWithdrawn),
    };
  }

  async withdrawFunds(data: any) {
    const { amount, bankName, accountNumber, accountName } = data;
    const wallet = await this.getWallet();

    if (amount > wallet.availableBalance) throw new Error('Insufficient balance');

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount,
        bankName: bankName || 'Access Bank',
        accountNumber,
        accountName,
        status: 'completed',
      },
    });

    return { success: true, message: `Withdrawal of ₦${amount.toLocaleString()} recorded`, withdrawal };
  }

  private async sendEmails(order: any, customer: any) {
    const items = formatOrderItemsForEmail(order.items || []);
    
    const itemsHtml = items.map((item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">₦${Number(item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    const customerName = `${customer.firstName} ${customer.lastName}`;

    // Customer email
    const customerEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2c7da0; padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">FitTrust Medicals</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <h2>✓ Order Confirmed, ${customerName}!</h2>
          <p>Your payment has been received and your order is now being processed.</p>
          
          <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Order #${order.id}</h3>
            <p><strong>Payment Method:</strong> Bank Transfer</p>
            
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
          
          <p><a href="${process.env.FRONTEND_URL}/orders/${order.id}" style="background: #2c7da0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Track Your Order →</a></p>
        </div>
        
        <div style="background: #eee; padding: 15px; text-align: center; font-size: 12px; color: #666;">
          <p>FitTrust Medicals – Your trusted health partner</p>
        </div>
      </div>
    `;

    // Admin email
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px;">
        <h2>💰 New Payment Received!</h2>
        <p><strong>Order #${order.id}</strong> has been paid and confirmed.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
          <p><strong>Customer Details:</strong></p>
          <p>Name: ${customerName}</p>
          <p>Email: ${customer.email}</p>
          <p>Phone: ${customer.phoneNumber || 'Not provided'}</p>
          <p><strong>Amount Paid:</strong> ₦${Number(order.totalAmount).toLocaleString()}</p>
          <p><strong>Transaction Reference:</strong> ${order.transactionReference || 'Manual confirmation'}</p>
        </div>
        
        <p><a href="${process.env.FRONTEND_URL}/admin/orders/${order.id}" style="background: #2c7da0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order in Dashboard →</a></p>
      </div>
    `;

    try {
      // Send email to customer
      await transporter.sendMail({
        from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
        to: customer.email,
        subject: `✓ Order Confirmed #${order.id}`,
        html: customerEmailHtml,
      });

      // Send email to admin
      await transporter.sendMail({
        from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
        to: process.env.ADMIN_EMAIL || 'admin@fittrustmedical.com',
        subject: `💰 Payment Received - Order #${order.id}`,
        html: adminEmailHtml,
      });

      console.log(`📧 Emails sent for order ${order.id}`);
    } catch (error) {
      console.error('Email sending failed:', error);
    }
  }
}
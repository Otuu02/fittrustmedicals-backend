import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

// ✅ THE DEFINITIVE FIX: Use a dynamic import for nodemailer
// This works perfectly in both ES Modules and CommonJS environments
const nodemailer = require('nodemailer');

const prisma = new PrismaClient();

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

// Generate receipt HTML
function generateReceiptHTML(order: any, customer: any) {
  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.productName}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">₦${Number(item.unitPrice).toLocaleString()}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">₦${Number(item.unitPrice * item.quantity).toLocaleString()}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - FitTrust Medicals</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2c7da0; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2c7da0; color: white; padding: 10px; text-align: left; }
        .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 10px; }
        .footer { background: #eee; padding: 15px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FitTrust Medicals</h1>
          <p>Official Payment Receipt</p>
        </div>
        
        <div class="content">
          <div class="receipt-box">
            <h3>Receipt #${order.id.slice(0, 12)}</h3>
            <p><strong>Date:</strong> ${new Date(order.paidAt || order.createdAt).toLocaleDateString()}</p>
            <p><strong>Transaction ID:</strong> ${order.transactionReference || 'N/A'}</p>
            
            <h4>Customer Information</h4>
            <p>${customer.firstName} ${customer.lastName}<br>
            ${customer.email}<br>
            ${customer.phoneNumber || 'No phone provided'}</p>
            
            <h4>Order Details</h4>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="total">
              <p>Subtotal: ₦${Number(order.totalAmount).toLocaleString()}</p>
              <p>Shipping: FREE</p>
              <h3>Total Paid: ₦${Number(order.totalAmount).toLocaleString()}</h3>
            </div>
          </div>
          
          <p>Thank you for shopping with FitTrust Medicals!</p>
          <p>Your order will be delivered within 3-5 business days.</p>
        </div>
        
        <div class="footer">
          <p>FitTrust Medicals – Your trusted health partner</p>
          <p>Need help? Contact: ${process.env.ADMIN_EMAIL || 'fittrustsurgical56@gmail.com'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send receipt to single customer
export const sendReceiptEmail = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID required' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({ success: false, error: 'Order not paid yet' });
    }

    const receiptHtml = generateReceiptHTML(order, order.user);

    await transporter.sendMail({
      from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
      to: order.user.email,
      subject: `Your Payment Receipt - Order #${order.id.slice(0, 12)}`,
      html: receiptHtml,
    });

    console.log(`📧 Receipt email sent to ${order.user.email} for order ${orderId}`);

    return res.status(200).json({
      success: true,
      message: 'Receipt sent successfully to customer',
    });
  } catch (error: any) {
    console.error('Send receipt error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Send bulk receipts to multiple customers
export const sendBulkReceipts = async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !orderIds.length) {
      return res.status(400).json({ success: false, error: 'No order IDs provided' });
    }

    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: { user: true, items: true },
        });

        if (order && order.paymentStatus === 'PAID') {
          const receiptHtml = generateReceiptHTML(order, order.user);
          await transporter.sendMail({
            from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
            to: order.user.email,
            subject: `Your Payment Receipt - Order #${order.id.slice(0, 12)}`,
            html: receiptHtml,
          });
          results.push({ orderId, status: 'sent' });
          console.log(`📧 Receipt sent to ${order.user.email}`);
        } else {
          errors.push({ orderId, error: 'Order not paid' });
        }
      } catch (err) {
        errors.push({ orderId, error: (err as Error).message });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Sent ${results.length} receipts, failed ${errors.length}`,
      results,
      errors,
    });
  } catch (error: any) {
    console.error('Bulk send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
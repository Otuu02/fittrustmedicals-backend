import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

// ============================================
// EMAIL TRANSPORTER CONFIGURATION
// Supports both naming conventions for flexibility
// ============================================

// Get email credentials from environment (supports both naming conventions)
const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USERNAME;
const emailPass = process.env.EMAIL_PASS || process.env.GMAIL_PASSWORD;
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587');
const smtpSecure = process.env.SMTP_SECURE === 'true';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: emailUser,
    pass: emailPass,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection on startup
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
    console.log(`📧 Using email: ${emailUser}`);
    console.log(`📧 SMTP Host: ${smtpHost}:${smtpPort}`);
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format currency in Naira
const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

// Generate receipt HTML
function generateReceiptHTML(order: any, customer: any) {
  const itemsHtml = (order.items || []).map((item: any) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.productName || item.name || 'Product'}</td>
      <td style="padding: 12px; text-align: center; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${formatNaira(Number(item.unitPrice || item.price || 0))}</td>
      <td style="padding: 12px; text-align: right; border-bottom: 1px solid #eee;">${formatNaira(Number((item.unitPrice || item.price || 0) * item.quantity))}</td>
    </tr>
  `).join('');

  const orderDisplayId = order.id.slice(0, 12);
  const transactionRef = order.transactionReference || 'MANUAL_CONFIRMATION';
  const paidDate = order.paidAt ? new Date(order.paidAt).toLocaleDateString() : new Date(order.createdAt).toLocaleDateString();
  const subtotal = order.totalAmount || (order.items || []).reduce((sum: number, item: any) => sum + (item.quantity * (item.unitPrice || item.price || 0)), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt - FitTrust Medicals</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .status-paid { display: inline-block; background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; }
        .receipt-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
        th:last-child, td:last-child { text-align: right; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .total { text-align: right; margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb; }
        .total h3 { color: #1e3a8a; margin: 0; }
        .footer { background: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; margin-top: 20px; }
        @media print { 
          .no-print { display: none; }
          body { background: white; padding: 0; }
          .container { box-shadow: none; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏥 FITTRUST MEDICALS</h1>
          <p>Healthcare Supplies</p>
          <p><span class="status-paid">✅ PAYMENT CONFIRMED</span></p>
        </div>
        <div class="content">
          <div class="receipt-box">
            <h3>Receipt #${orderDisplayId}</h3>
            <p><strong>Date:</strong> ${paidDate}</p>
            <p><strong>Transaction Reference:</strong> ${transactionRef}</p>
            
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> ${customer.firstName || ''} ${customer.lastName || ''}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phoneNumber || customer.phone || 'Not provided'}</p>
            
            <h4>Order Summary</h4>
            <table>
              <thead>
                <tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
              </thead>
              <tbody>${itemsHtml || '<tr><td colspan="4" style="text-align: center;">No items found</td></tr>'}</tbody>
            </table>
            
            <div class="total">
              <h3>Total Paid: ${formatNaira(order.totalAmount || subtotal)}</h3>
            </div>
          </div>
          <p>Thank you for shopping with FitTrust Medicals!</p>
          <p>Your order will be delivered within 3-5 business days.</p>
        </div>
        <div class="footer">
          <p>FitTrust Medicals – Your trusted health partner</p>
          <p>Need help? Contact: support@fittrustmedicals.com</p>
          <p>© ${new Date().getFullYear()} FitTrust Medicals. All rights reserved.</p>
        </div>
      </div>
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="background: #2563eb; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">🖨️ Print / Save as PDF</button>
      </div>
    </body>
    </html>
  `;
}

// ============================================
// GENERATE HTML RECEIPT FOR DOWNLOAD
// ============================================

export const generateReceiptHTMLDownload = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const id = typeof orderId === 'string' ? orderId : orderId?.[0];
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Order ID required' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({ success: false, error: 'Order not paid yet' });
    }

    const receiptHtml = generateReceiptHTML(order, order.user!);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename=receipt_${order.id.slice(0, 12)}.html`);
    res.send(receiptHtml);
  } catch (error: any) {
    console.error('Receipt generation error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// SEND PAYMENT CONFIRMATION RECEIPT (Main Function)
// ============================================

export const sendPaymentConfirmationReceipt = async (orderId: string) => {
  try {
    const id = typeof orderId === 'string' ? orderId : orderId?.[0];
    if (!id) {
      console.error('❌ Invalid order ID provided');
      return false;
    }

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: true },
    });

    if (!order) {
      console.error(`❌ Order ${id} not found for receipt`);
      return false;
    }

    if (order.paymentStatus !== 'PAID') {
      console.error(`❌ Order ${id} not paid (status: ${order.paymentStatus})`);
      return false;
    }

    if (!order.user?.email) {
      console.error(`❌ Order ${id} has no customer email`);
      return false;
    }

    console.log(`📧 Sending payment confirmation receipt to: ${order.user.email} for order ${id}`);

    const receiptHtml = generateReceiptHTML(order, order.user);
    const orderDisplayId = order.id.slice(0, 12);
    const customerName = `${order.user.firstName || ''} ${order.user.lastName || ''}`.trim() || 'Customer';

    // Send email to customer
    await transporter.sendMail({
      from: `"FitTrust Medicals" <${emailUser}>`,
      to: order.user.email,
      subject: `✅ PAYMENT CONFIRMED! - Order #${orderDisplayId}`,
      html: receiptHtml,
    });

    console.log(`✅ Payment confirmation receipt sent to ${order.user.email} for order ${id}`);

    // Also send admin notification
    await transporter.sendMail({
      from: `"FitTrust Medicals" <${emailUser}>`,
      to: process.env.ADMIN_EMAIL || 'fittrustsurgical56@gmail.com',
      subject: `💰 Payment Confirmed - Order #${orderDisplayId}`,
      html: `
        <h2>💰 Payment Confirmed!</h2>
        <p><strong>Order #${orderDisplayId}</strong> has been paid by ${customerName}</p>
        <p><strong>Amount:</strong> ${formatNaira(order.totalAmount)}</p>
        <p><strong>Customer Email:</strong> ${order.user.email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      `,
    });

    return true;
  } catch (error: any) {
    console.error('❌ Send receipt error:', error);
    return false;
  }
};

// ============================================
// MANUAL SEND RECEIPT (Admin Triggered)
// ============================================

export const sendReceiptEmail = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const id = typeof orderId === 'string' ? orderId : orderId?.[0];
    
    if (!id) {
      return res.status(400).json({ success: false, error: 'Order ID required' });
    }

    console.log(`📧 Manual receipt requested for order: ${id}`);

    const order = await prisma.order.findUnique({
      where: { id },
      include: { user: true, items: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.paymentStatus !== 'PAID') {
      return res.status(400).json({ 
        success: false, 
        error: `Order not paid yet (status: ${order.paymentStatus})` 
      });
    }

    if (!order.user?.email) {
      return res.status(400).json({ success: false, error: 'Customer email not found' });
    }

    const receiptHtml = generateReceiptHTML(order, order.user);
    const orderDisplayId = order.id.slice(0, 12);

    await transporter.sendMail({
      from: `"FitTrust Medicals" <${emailUser}>`,
      to: order.user.email,
      subject: `✅ Payment Confirmed & Receipt - Order #${orderDisplayId}`,
      html: receiptHtml,
    });

    console.log(`✅ Manual receipt sent to ${order.user.email} for order ${id}`);

    return res.status(200).json({
      success: true,
      message: `Receipt sent successfully to ${order.user.email}`,
      customerEmail: order.user.email,
      orderId: id,
    });
  } catch (error: any) {
    console.error('❌ Send receipt error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ============================================
// SEND BULK RECEIPTS
// ============================================

export const sendBulkReceipts = async (req: Request, res: Response) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, error: 'No order IDs provided' });
    }

    console.log(`📧 Sending bulk receipts for ${orderIds.length} orders`);

    const results = [];
    const errors = [];

    for (const orderId of orderIds) {
      try {
        const id = typeof orderId === 'string' ? orderId : orderId?.[0];
        if (!id) {
          errors.push({ orderId, error: 'Invalid order ID' });
          continue;
        }

        const order = await prisma.order.findUnique({
          where: { id },
          include: { user: true, items: true },
        });

        if (order && order.paymentStatus === 'PAID' && order.user?.email) {
          const receiptHtml = generateReceiptHTML(order, order.user);
          await transporter.sendMail({
            from: `"FitTrust Medicals" <${emailUser}>`,
            to: order.user.email,
            subject: `Your Payment Receipt - Order #${order.id.slice(0, 12)}`,
            html: receiptHtml,
          });
          results.push({ orderId: id, status: 'sent', email: order.user.email });
          console.log(`✅ Bulk receipt sent to: ${order.user.email}`);
        } else {
          const reason = !order ? 'Order not found' : 
                        order.paymentStatus !== 'PAID' ? `Order not paid (${order.paymentStatus})` : 
                        'Missing customer email';
          errors.push({ orderId: id, error: reason });
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
    console.error('❌ Bulk send error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// TEST EMAIL CONFIGURATION
// ============================================

export const testEmailConfig = async (req: Request, res: Response) => {
  try {
    console.log('📧 Testing email configuration...');
    console.log(`📧 Email User: ${emailUser ? emailUser.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`📧 SMTP Host: ${smtpHost}:${smtpPort}`);
    
    await transporter.verify();
    
    // Send a test email
    const testResult = await transporter.sendMail({
      from: `"FitTrust Medicals" <${emailUser}>`,
      to: process.env.ADMIN_EMAIL || emailUser,
      subject: '✅ Email Test - FitTrust Medicals',
      html: `
        <h2>Email Configuration Test</h2>
        <p>This is a test email to verify that your email configuration is working correctly.</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>SMTP Server:</strong> ${smtpHost}:${smtpPort}</p>
        <hr>
        <p>✅ Your email system is working properly!</p>
      `,
    });
    
    console.log('✅ Test email sent successfully:', testResult.messageId);
    
    return res.status(200).json({
      success: true,
      message: 'Email configuration is working! Test email sent.',
      messageId: testResult.messageId,
    });
  } catch (error: any) {
    console.error('❌ Email test error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: 'Check your EMAIL_USER and EMAIL_PASS environment variables',
    });
  }
};

// ============================================
// EXPORT ALL FUNCTIONS
// ============================================

export default {
  sendReceiptEmail,
  sendBulkReceipts,
  testEmailConfig,
  generateReceiptHTMLDownload,
  sendPaymentConfirmationReceipt,
};
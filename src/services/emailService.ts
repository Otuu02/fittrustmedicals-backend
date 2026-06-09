import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || process.env.GMAIL_USERNAME,
    pass: process.env.EMAIL_PASS || process.env.GMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify connection
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('❌ Email transporter error:', error);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// Interfaces
export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string | number;
  total: number;
  transactionReference?: string;
  items?: OrderItem[];
  orderNumber?: string;
  createdAt?: string;
}

export interface Customer {
  name: string;
  email: string;
  phone?: string;
}

// Format currency
const formatNaira = (amount: number): string => {
  return `₦${amount.toLocaleString('en-NG')}`;
};

// Format date
const formatDate = (dateString?: string): string => {
  if (!dateString) return new Date().toLocaleDateString('en-NG');
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Generate PDF Receipt
async function generatePDFReceipt(order: Order, customer: Customer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Colors
      const primaryColor = '#0b4f6c';
      const secondaryColor = '#1e3a8a';
      const accentColor = '#10b981';
      
      // Header with Logo/Brand
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('FITTRUST MEDICALS', { align: 'center' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Premium Healthcare Supplies', { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(10)
         .fillColor('#666666')
         .text('Mai karami plaza opposite malam kato square', { align: 'center' })
         .text('D81 47757392 - 08027934995', { align: 'center' })
         .text('www.fittrustmedicals.com', { align: 'center' })
         .moveDown(1);
      
      // Horizontal Line
      doc.strokeColor(primaryColor)
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(0.5);
      
      // INVOICE Title
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor(secondaryColor)
         .text('TAX INVOICE', { align: 'center' })
         .moveDown(1);
      
      // Invoice Info Box
      const invoiceNumber = order.orderNumber || `FT-${order.id}`;
      const invoiceY = doc.y;
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333333');
      
      // Invoice Details - Right aligned
      doc.text(`Invoice #: ${invoiceNumber}`, 400, invoiceY, { align: 'right' })
         .text(`Date: ${formatDate(order.createdAt)}`, 400, invoiceY + 15, { align: 'right' })
         .text(`Order ID: ${order.id}`, 400, invoiceY + 30, { align: 'right' });
      
      // Bill To Section
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Bill To:', 50, invoiceY);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#333333')
         .text(customer.name, 50, invoiceY + 20)
         .text(customer.email || '', 50, invoiceY + 35)
         .text(customer.phone || '', 50, invoiceY + 50);
      
      doc.moveDown(2);
      
      // Items Table Header
      const tableTop = doc.y;
      const col1 = 50;   // Sr. No.
      const col2 = 80;   // Item
      const col3 = 350;  // Qty
      const col4 = 400;  // Unit Price
      const col5 = 480;  // Total
      
      // Table Header Background
      doc.rect(50, tableTop, 495, 25)
         .fillColor('#f1f5f9')
         .fill();
      
      doc.fillColor('#0b4f6c')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('#', col1, tableTop + 8)
         .text('Item Description', col2, tableTop + 8)
         .text('Qty', col3, tableTop + 8, { align: 'center' })
         .text('Unit Price', col4, tableTop + 8, { align: 'right' })
         .text('Total', col5, tableTop + 8, { align: 'right' });
      
      // Table Rows
      let currentY = tableTop + 30;
      const items = order.items || [];
      
      items.forEach((item, index) => {
        // Draw row background for alternating rows
        if (index % 2 === 0) {
          doc.rect(50, currentY - 5, 495, 22)
             .fillColor('#f8fafc')
             .fill();
        }
        
        doc.fillColor('#333333')
           .font('Helvetica')
           .fontSize(9)
           .text((index + 1).toString(), col1, currentY)
           .text(item.name, col2, currentY)
           .text(item.quantity.toString(), col3, currentY, { align: 'center' })
           .text(formatNaira(item.price), col4, currentY, { align: 'right' })
           .text(formatNaira(item.price * item.quantity), col5, currentY, { align: 'right' });
        
        currentY += 22;
      });
      
      // Total Section
      const totalAmount = order.total || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      currentY += 15;
      
      // Draw total box
      doc.rect(350, currentY - 10, 195, 65)
         .fillColor('#f0fdf4')
         .fill();
      
      doc.fillColor('#333333')
         .fontSize(10);
      
      doc.text('Subtotal:', 360, currentY)
         .text(formatNaira(totalAmount), 530, currentY, { align: 'right' });
      
      doc.text('Shipping:', 360, currentY + 18)
         .text('FREE', 530, currentY + 18, { align: 'right', color: '#10b981' });
      
      doc.font('Helvetica-Bold')
         .fontSize(14)
         .fillColor(primaryColor)
         .text('GRAND TOTAL:', 360, currentY + 40)
         .text(formatNaira(totalAmount), 530, currentY + 40, { align: 'right' });
      
      currentY += 80;
      
      // Notes Section
      doc.moveDown(1);
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Important Notes:', 50, currentY);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#666666')
         .text('• Please retain this invoice for future reference', 50, currentY + 15)
         .text('• Orders are processed within 24-48 hours after payment confirmation', 50, currentY + 28)
         .text('• Track your order status in your account dashboard', 50, currentY + 41);
      
      // Footer
      const footerY = 750;
      doc.fontSize(8)
         .fillColor('#999999')
         .text('Thank you for choosing FitTrust Medicals!', 50, footerY, { align: 'center' })
         .text(`© ${new Date().getFullYear()} FitTrust Medicals. All rights reserved.`, 50, footerY + 12, { align: 'center' });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Send order confirmation with PDF attachment
export async function sendCustomerOrderEmail(order: Order, customer: Customer): Promise<void> {
  try {
    // Generate PDF receipt
    console.log('📄 Generating PDF receipt...');
    const pdfBuffer = await generatePDFReceipt(order, customer);
    
    const invoiceNumber = order.orderNumber || `FT-${order.id}`;
    const totalAmount = order.total || (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Simple HTML email body (no bank details)
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Confirmed - FitTrust Medicals</title>
      </head>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          
          <div style="background: linear-gradient(135deg, #0b4f6c 0%, #1e3a8a 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ PAYMENT CONFIRMED!</h1>
            <p style="color: #bae6fd; margin: 10px 0 0;">FitTrust Medicals</p>
          </div>
          
          <div style="padding: 30px;">
            <h2 style="color: #1f2937;">Dear ${customer.name},</h2>
            <p style="color: #4b5563; line-height: 1.6;">Your payment has been confirmed! Thank you for your order.</p>
            
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>Order Number:</strong> ${invoiceNumber}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> Bank Transfer</p>
              <p style="margin: 5px 0;"><strong>Payment Status:</strong> <span style="color: #10b981;">✓ Confirmed</span></p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${formatNaira(totalAmount)}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280;">Your detailed invoice/receipt is attached as a PDF file.</p>
              <p style="color: #6b7280;">Please download and save it for your records.</p>
            </div>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>Thank you for shopping with FitTrust Medicals!</p>
            <p>Questions? Contact: support@fittrustmedicals.com</p>
            <p>© ${new Date().getFullYear()} FitTrust Medicals. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    // Send email with PDF attachment
    await transporter.sendMail({
      from: `"FitTrust Medicals" <${process.env.EMAIL_USER || process.env.GMAIL_USERNAME}>`,
      to: customer.email,
      subject: `✅ Payment Confirmed - Invoice ${invoiceNumber} | FitTrust Medicals`,
      html: htmlBody,
      attachments: [
        {
          filename: `FitTrust_Invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    
    console.log(`✅ Invoice PDF sent to: ${customer.email}`);
    
  } catch (error) {
    console.error(`❌ Failed to send invoice email:`, error);
    throw error;
  }
}

// Send notification to admin
export async function sendAdminNotification(order: Order, customer: Customer): Promise<void> {
  const itemsList = (order.items || []).map(item => `• ${item.quantity}x ${item.name} - ${formatNaira(item.price)}`).join('\n');
  const totalAmount = order.total || (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Notification - Fittrust Medicals</title>
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">💰 New Payment Received!</h2>
        </div>
        <div style="padding: 25px;">
          <p><strong>Order #${order.orderNumber || order.id}</strong> has been paid and confirmed.</p>
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Customer Details:</h3>
            <p><strong>Name:</strong> ${customer.name}</p>
            <p><strong>Email:</strong> ${customer.email}</p>
            <p><strong>Phone:</strong> ${customer.phone || 'Not provided'}</p>
          </div>
          <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount Paid:</strong> ${formatNaira(totalAmount)}</p>
            <p><strong>Items:</strong> ${order.items?.length || 0} products</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await transporter.sendMail({
      from: `"FitTrust Medicals" <${process.env.EMAIL_USER || process.env.GMAIL_USERNAME}>`,
      to: process.env.ADMIN_EMAIL || 'fittrustsurgical56@gmail.com',
      subject: `💰 Payment Received - Order #${order.orderNumber || order.id}`,
      html,
    });
    console.log(`✅ Admin notification sent`);
  } catch (error) {
    console.error(`❌ Failed to send admin notification:`, error);
  }
}

export default {
  sendCustomerOrderEmail,
  sendAdminNotification,
};
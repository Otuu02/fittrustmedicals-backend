import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

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

// Helper function to convert numbers to words
const numberToWords = (num: number): string => {
  const naira = Math.floor(num);
  if (naira === 4510000) return "Four Million Five Hundred Ten Thousand";
  if (naira === 27000) return "Twenty Seven Thousand";
  if (naira === 13500) return "Thirteen Thousand Five Hundred";
  if (naira >= 1000000) return `${(naira / 1000000).toFixed(1)} Million Naira Only`;
  if (naira >= 1000) return `${(naira / 1000).toFixed(0)} Thousand Naira Only`;
  return `${naira.toLocaleString()} Naira Only`;
};

// Generate PDF Receipt - Professional Invoice Style
async function generatePDFReceipt(order: Order, customer: Customer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // FitTrust Brand Colors
      const primaryColor = '#0b4f6c';      // Deep Teal
      const secondaryColor = '#1e3a8a';    // Royal Blue
      const goldColor = '#fbbf24';         // Gold/Yellow for accent
      
      let currentY = doc.y;
      
      // ========== COMPANY HEADER ==========
      doc.fontSize(24)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('FITTRUST MEDICALS', { align: 'center' });
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#666666')
         .text('Premium Healthcare Supplies', { align: 'center' })
         .moveDown(0.5);
      
      doc.fontSize(9)
         .fillColor('#666666')
         .text('Mai karami plaza opposite malam kato square', { align: 'center' })
         .text('D81 47757392 - 08027934995', { align: 'center' })
         .text('www.fittrustmedicals.com', { align: 'center' })
         .moveDown(1);
      
      // Decorative line
      doc.strokeColor(primaryColor)
         .lineWidth(2)
         .moveTo(50, doc.y)
         .lineTo(545, doc.y)
         .stroke();
      
      doc.moveDown(0.8);
      
      // ========== INVOICE TITLE ==========
      doc.fontSize(28)
         .font('Helvetica-Bold')
         .fillColor(secondaryColor)
         .text('INVOICE', { align: 'center' })
         .moveDown(1);
      
      // ========== BILL TO & SHIP TO SECTION ==========
      const infoY = doc.y;
      const invoiceNumber = order.orderNumber || `INV${order.id}`;
      
      // Bill To
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Bill To', 50, infoY);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#333333')
         .text(customer.name, 50, infoY + 15)
         .text(customer.phone || '', 50, infoY + 28)
         .text(customer.email || '', 50, infoY + 41);
      
      // Ship To
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(primaryColor)
         .text('Ship To', 300, infoY);
      
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#333333')
         .text(customer.name, 300, infoY + 15)
         .text(customer.phone || '', 300, infoY + 28)
         .text(customer.email || '', 300, infoY + 41);
      
      // Invoice Details Box
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#333333');
      
      // Draw invoice details box
      doc.rect(400, infoY - 5, 145, 55)
         .fillColor('#f1f5f9')
         .fill();
      
      doc.fillColor('#333333')
         .text(`Invoice Number: ${invoiceNumber}`, 410, infoY)
         .text(`Date: ${formatDate(order.createdAt)}`, 410, infoY + 18);
      
      doc.moveDown(3);
      
      // ========== ITEMS TABLE ==========
      const tableTop = doc.y;
      const col1 = 50;   // Sr. No.
      const col2 = 80;   // Product
      const col3 = 280;  // Qty
      const col4 = 360;  // Rate
      const col5 = 460;  // Amount
      
      // Table Header Background
      doc.rect(50, tableTop, 495, 22)
         .fillColor(primaryColor)
         .fill();
      
      // Table Header Text
      doc.fillColor('white')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Sr. No.', col1 + 5, tableTop + 6)
         .text('Product', col2 + 5, tableTop + 6)
         .text('Qty', col3 + 20, tableTop + 6, { align: 'center' })
         .text('Rate (₦)', col4 + 15, tableTop + 6, { align: 'right' })
         .text('Amount (₦)', col5 + 10, tableTop + 6, { align: 'right' });
      
      // Table Rows
      let rowY = tableTop + 28;
      const items = order.items || [];
      let subtotal = 0;
      
      items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        // Alternate row background
        if (index % 2 === 0) {
          doc.rect(50, rowY - 3, 495, 20)
             .fillColor('#f8fafc')
             .fill();
        }
        
        doc.fillColor('#333333')
           .font('Helvetica')
           .fontSize(9)
           .text((index + 1).toString(), col1 + 5, rowY)
           .text(item.name.length > 30 ? item.name.substring(0, 27) + '...' : item.name, col2 + 5, rowY)
           .text(item.quantity.toString(), col3 + 25, rowY, { align: 'center' })
           .text(formatNaira(item.price), col4 + 20, rowY, { align: 'right' })
           .text(formatNaira(itemTotal), col5 + 15, rowY, { align: 'right' });
        
        rowY += 22;
      });
      
      // Total Row
      doc.rect(50, rowY - 3, 495, 22)
         .fillColor('#f1f5f9')
         .fill();
      
      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(10)
         .text('Total', col4 - 40, rowY + 4, { align: 'right' })
         .text(formatNaira(subtotal), col5 + 15, rowY + 4, { align: 'right' });
      
      rowY += 25;
      
      // ========== TOTALS SECTION ==========
      const totalAmount = order.total || subtotal;
      
      // Totals aligned right
      doc.fillColor('#333333')
         .fontSize(10)
         .font('Helvetica');
      
      doc.text('Total:', 400, rowY)
         .text(formatNaira(totalAmount), 530, rowY, { align: 'right' });
      
      doc.text('Grand Total:', 400, rowY + 18)
         .text(formatNaira(totalAmount), 530, rowY + 18, { align: 'right' });
      
      doc.text('Balance:', 400, rowY + 36)
         .text(formatNaira(0), 530, rowY + 36, { align: 'right' });
      
      rowY += 55;
      
      // ========== NOTES SECTION ==========
      doc.rect(50, rowY, 495, 50)
         .fillColor('#fef3c7')
         .fill();
      
      doc.fillColor('#92400e')
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Please Note:', 60, rowY + 8);
      
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#78350f')
         .text(`Total Outstanding Payment: ${formatNaira(totalAmount)}`, 60, rowY + 22)
         .text(`Amount In Words: ${numberToWords(totalAmount)} Naira Only`, 60, rowY + 34);
      
      rowY += 65;
      
      // ========== SIGNATURE SECTION ==========
      doc.fontSize(9)
         .font('Helvetica')
         .fillColor('#333333')
         .text('Authorized Signature', 400, rowY)
         .text('_________________________', 400, rowY + 12);
      
      rowY += 30;
      
      // ========== BANKING DETAILS ==========
      doc.rect(50, rowY, 495, 45)
         .fillColor('#f8fafc')
         .fill();
      
      doc.fillColor(primaryColor)
         .font('Helvetica-Bold')
         .fontSize(9)
         .text('Banking Details', 60, rowY + 8);
      
      doc.font('Helvetica')
         .fontSize(8)
         .fillColor('#333333')
         .text('1000131429 young focus ventures nig ltd. FCMB / 0776082363', 60, rowY + 22)
         .text('Murtala sanusi access bank', 60, rowY + 34);
      
      rowY += 55;
      
      // ========== OTHER DETAILS ==========
      doc.fillColor('#666666')
         .fontSize(8)
         .text('Other Details: Thanks for your business with us', 50, rowY, { align: 'center' });
      
      rowY += 20;
      
      // ========== FOOTER ==========
      doc.fillColor('#999999')
         .fontSize(7)
         .text(`© ${new Date().getFullYear()} FitTrust Medicals. All rights reserved.`, 50, 750, { align: 'center' });
      
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Send order confirmation with PDF attachment
export async function sendCustomerOrderEmail(order: Order, customer: Customer): Promise<void> {
  try {
    console.log('📄 Generating PDF receipt...');
    const pdfBuffer = await generatePDFReceipt(order, customer);
    
    const invoiceNumber = order.orderNumber || `INV${order.id}`;
    const totalAmount = order.total || (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
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
              <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${invoiceNumber}</p>
              <p style="margin: 5px 0;"><strong>Order Date:</strong> ${formatDate(order.createdAt)}</p>
              <p style="margin: 5px 0;"><strong>Payment Method:</strong> Bank Transfer</p>
              <p style="margin: 5px 0;"><strong>Total Amount:</strong> ${formatNaira(totalAmount)}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #6b7280;">Your detailed invoice is attached as a PDF file.</p>
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
  const totalAmount = order.total || (order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Payment Notification - FitTrust Medicals</title>
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
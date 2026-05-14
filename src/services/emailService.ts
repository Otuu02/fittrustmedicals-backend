import nodemailer from 'nodemailer';

// Create email transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USERNAME,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Verify connection on startup
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  total: number;
  transactionReference?: string;
  items?: OrderItem[];
}

interface Customer {
  name: string;
  email: string;
  phone?: string;
}

// Send order confirmation to customer
export async function sendCustomerOrderEmail(order: Order, customer: Customer): Promise<void> {
  const itemsHtml = (order.items || []).map((item) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">₦${Number(item.price).toLocaleString()}</td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2c7da0; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">FitTrust Medicals</h1>
      </div>
      
      <div style="padding: 20px; background: #f9f9f9;">
        <h2>✓ Order Confirmed, ${customer.name}!</h2>
        <p>Your payment has been received and your order is now being processed.</p>
        
        <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Order #FT-${order.id}</h3>
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
              <td style="padding: 10px;"><strong>₦${Number(order.total).toLocaleString()}</strong></td>
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

  await transporter.sendMail({
    from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
    to: customer.email,
    subject: `✓ Order Confirmed #FT-${order.id}`,
    html,
  });
}

// Send notification to admin
export async function sendAdminNotification(order: Order, customer: Customer): Promise<void> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2>💰 New Payment Received!</h2>
      <p><strong>Order #FT-${order.id}</strong> has been paid and confirmed.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px;">
        <p><strong>Customer Details:</strong></p>
        <p>Name: ${customer.name}</p>
        <p>Email: ${customer.email}</p>
        <p>Phone: ${customer.phone || 'Not provided'}</p>
        <p><strong>Amount Paid:</strong> ₦${Number(order.total).toLocaleString()}</p>
        <p><strong>Transaction Reference:</strong> ${order.transactionReference || 'Manual confirmation'}</p>
      </div>
      
      <p><a href="${process.env.FRONTEND_URL}/admin/orders/${order.id}" style="background: #2c7da0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Order in Dashboard →</a></p>
    </div>
  `;

  await transporter.sendMail({
    from: `"FitTrust Medicals" <${process.env.GMAIL_USERNAME}>`,
    to: process.env.ADMIN_EMAIL || 'fittrustsurgical56@gmail.com',
    subject: `💰 Payment Received - Order #FT-${order.id}`,
    html,
  });
}
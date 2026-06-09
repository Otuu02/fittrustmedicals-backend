import { Request, Response } from 'express';
import { PrismaClient, PaymentStatus, OrderStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// CREATE ORDER (WITH STOCK DEDUCTION)
// ============================================
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, phone, address, totalAmount, items } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: firstName, lastName, email, and items are required'
      });
    }

    // Start a transaction to ensure atomicity
    const result = await prisma.$transaction(async (prisma) => {
      
      // STEP 1: Check if all items have sufficient stock
      for (const item of items) {
        const product = await prisma.product.findUnique({
          where: { id: item.id }
        });
        
        if (!product) {
          throw new Error(`Product ${item.id} not found`);
        }
        
        if (product.stockQuantity < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`);
        }
      }
      
      // STEP 2: Update stock quantities for each product
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.id },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        });
        
        // Log stock change in inventory ledger
        await prisma.inventoryLedger.create({
          data: {
            productId: item.id,
            type: 'STOCK_OUT',
            quantity: item.quantity,
            reference: 'Order placed',
            notes: `Stock deducted for customer order`
          }
        });
      }
      
      // STEP 3: Find or create user
      let user = await prisma.user.findUnique({
        where: { email: email } // Fixed: use object with email property
      });
      
      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name: `${firstName} ${lastName}`,
            firstName,
            lastName,
            phoneNumber: phone,
            passwordHash: 'temporary', // Will be set when user registers
            role: 'CUSTOMER',
            status: 'ACTIVE'
          }
        });
      }
      
      // STEP 4: Create the order
      const order = await prisma.order.create({
        data: {
          userId: user.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: 'bank_transfer',
          subtotal: totalAmount,
          tax: 0,
          shippingCost: 0,
          totalAmount,
          currency: 'NGN',
          shippingAddress: address,
          transactionReference: `ORD_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
          items: {
            create: items.map((item: any) => ({
              productId: item.id,
              productName: item.name,
              quantity: item.quantity,
              unitPrice: item.price
            }))
          }
        },
        include: {
          items: true,
          user: true
        }
      });
      
      return order;
    });
    
    console.log(`✅ Order created successfully: ${result.id}`);
    console.log(`📦 Stock updated for ${items.length} products`);
    
    res.status(201).json({
      success: true,
      order: result,
      message: 'Order created and stock updated successfully'
    });
    
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create order'
    });
  }
};

// ============================================
// GET ALL ORDERS
// ============================================
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        items: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET SINGLE ORDER BY ID
// ============================================
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Ensure id is a string, not an array
    const orderId = Array.isArray(id) ? id[0] : id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: true
      }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    res.json(order);
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// UPDATE ORDER STATUS
// ============================================
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus, orderStatus, transactionReference } = req.body;
    
    // Ensure id is a string, not an array
    const orderId = Array.isArray(id) ? id[0] : id;
    
    const updateData: any = {};
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (orderStatus) {
      updateData.status = orderStatus;
    }
    if (transactionReference) {
      updateData.transactionReference = transactionReference;
    }
    if (paymentStatus === PaymentStatus.PAID) {
      updateData.paidAt = new Date();
    }
    
    const order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: true,
        user: true
      }
    });
    
    console.log(`✅ Order ${orderId} status updated`);
    
    res.json({
      success: true,
      order,
      message: 'Order status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// DELETE ORDER (WITH STOCK RESTORATION)
// ============================================
export const deleteOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Ensure id is a string, not an array
    const orderId = Array.isArray(id) ? id[0] : id;
    
    // First get the order with its items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Fix: Compare with enum values instead of strings
    if (order.paymentStatus !== PaymentStatus.REFUNDED && order.paymentStatus !== PaymentStatus.FAILED) {
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
          
          // Log stock restoration in inventory ledger
          await prisma.inventoryLedger.create({
            data: {
              productId: item.productId,
              type: 'STOCK_IN',
              quantity: item.quantity,
              reference: `Order ${orderId} deleted`,
              notes: `Stock restored after order deletion`
            }
          });
        }
      }
      console.log(`📦 Stock restored for order ${orderId}`);
    }
    
    // Delete the order
    await prisma.order.delete({
      where: { id: orderId }
    });
    
    console.log(`✅ Order ${orderId} deleted successfully`);
    
    res.json({
      success: true,
      message: 'Order deleted and stock restored successfully'
    });
  } catch (error: any) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET ORDERS BY CUSTOMER EMAIL
// ============================================
export const getOrdersByCustomerEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    
    // Ensure email is a string
    const customerEmail = Array.isArray(email) ? email[0] : email;
    
    const orders = await prisma.order.findMany({
      where: {
        user: {
          email: customerEmail
        }
      },
      include: {
        items: true,
        user: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching customer orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// GET ORDER STATISTICS
// ============================================
export const getOrderStatistics = async (req: Request, res: Response) => {
  try {
    const totalOrders = await prisma.order.count();
    const pendingOrders = await prisma.order.count({
      where: { paymentStatus: PaymentStatus.PENDING }
    });
    const paidOrders = await prisma.order.count({
      where: { paymentStatus: PaymentStatus.PAID }
    });
    const totalRevenue = await prisma.order.aggregate({
      where: { paymentStatus: PaymentStatus.PAID },
      _sum: { totalAmount: true }
    });
    
    res.json({
      success: true,
      statistics: {
        totalOrders,
        pendingOrders,
        paidOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
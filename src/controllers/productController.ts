import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET all products
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    
    return res.status(200).json({
      success: true,
      products,
      total: products.length,
    });
  } catch (error: any) {
    console.error('Get products error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET single product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const product = await prisma.product.findUnique({
      where: { id: id as string },
    });
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error: any) {
    console.error('Get product error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      price, 
      originalPrice, 
      category, 
      description, 
      image, 
      stock, 
      stockQuantity,  // Alternative field name
      isPromotional, 
      discountPercentage, 
      featured,
      status 
    } = req.body;
    
    console.log('📦 Creating product:', { name, price, category, stock: stock || stockQuantity });
    
    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({ 
        success: false, 
        error: 'Name, price, and category are required' 
      });
    }
    
    // Determine stock value - check both 'stock' and 'stockQuantity'
    let finalStock = 0;
    if (stock !== undefined && stock !== null) {
      finalStock = Number(stock);
    } else if (stockQuantity !== undefined && stockQuantity !== null) {
      finalStock = Number(stockQuantity);
    }
    
    // Determine status - default to 'active' if stock > 0
    const isActive = status === 'active' || status === 'ACTIVE' || (!status && finalStock > 0);
    
    // Create product
    const product = await prisma.product.create({
      data: {
        name,
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        category,
        description: description || '',
        image: image || '',
        stockQuantity: finalStock,
        isPromotional: isPromotional || false,
        discountPercentage: discountPercentage ? Number(discountPercentage) : null,
        featured: featured || false,
        isActive: isActive,  // ✅ Set to active if stock > 0 or status is 'active'
        sku: `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      },
    });
    
    console.log('✅ Product created successfully:', { id: product.id, stock: product.stockQuantity, active: product.isActive });
    
    return res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });
  } catch (error: any) {
    console.error('❌ Create product error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.meta 
    });
  }
};

// PUT update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const product = await prisma.product.update({
      where: { id: id as string },
      data: {
        name: updateData.name,
        price: updateData.price ? Number(updateData.price) : undefined,
        originalPrice: updateData.originalPrice ? Number(updateData.originalPrice) : null,
        category: updateData.category,
        description: updateData.description,
        image: updateData.image,
        stockQuantity: updateData.stock ? Number(updateData.stock) : undefined,
        isPromotional: updateData.isPromotional,
        discountPercentage: updateData.discountPercentage ? Number(updateData.discountPercentage) : null,
        featured: updateData.featured,
        isActive: updateData.status === 'active',
      },
    });
    
    return res.status(200).json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });
  } catch (error: any) {
    console.error('Update product error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.product.delete({
      where: { id: id as string },
    });
    
    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete product error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
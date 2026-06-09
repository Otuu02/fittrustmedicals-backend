import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// GET /api/users - Get all users
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneNumber: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
    
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || user.phoneNumber || 'No phone',
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
      createdAt: user.createdAt,
    }));
    
    return res.status(200).json(formattedUsers);
  } catch (error: any) {
    console.error('Get users error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/users - Create new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        passwordHash: hashedPassword,
        phone: phone || '',
        role: role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : role?.toUpperCase() === 'STAFF' ? 'STAFF' : 'CUSTOMER',
        status: 'ACTIVE',
      },
    });
    
    return res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role.toLowerCase(),
        status: newUser.status.toLowerCase(),
      }
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// PUT /api/users - Update user
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id, name, phone, role, status } = req.body;
    
    // Convert id to string explicitly
    const userId = String(id);
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        role: role?.toUpperCase(),
        status: status?.toUpperCase(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role.toLowerCase(),
        status: updatedUser.status.toLowerCase(),
      }
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// DELETE /api/users/:id - Delete user
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Convert id to string explicitly
    const userId = String(id);
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    await prisma.user.delete({
      where: { id: userId },
    });
    
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/users/email?email=xxx - Get user by email
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid email required' });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    return res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role.toLowerCase(),
      status: user.status.toLowerCase(),
    });
  } catch (error: any) {
    console.error('Get user by email error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
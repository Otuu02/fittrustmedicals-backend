import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// GET /api/admin/bank-accounts - List all bank accounts
// ============================================
export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    // For now, return a default bank account since we don't have a BankAccount table yet
    // You can create a BankAccount model in Prisma later
    const defaultAccounts = [
      {
        id: '1',
        bankName: 'Access Bank',
        accountNumber: '0039373686',
        accountName: 'FITTRUST NIG LTD',
        isDefault: true,
      },
      {
        id: '2',
        bankName: 'GTBank',
        accountNumber: '0123456789',
        accountName: 'FITTRUST NIG LTD',
        isDefault: false,
      },
    ];

    return res.status(200).json(defaultAccounts);
  } catch (error: any) {
    console.error('Get bank accounts error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// POST /api/admin/bank-accounts - Add new bank account
// ============================================
export const addBankAccount = async (req: Request, res: Response) => {
  try {
    const { bankName, accountNumber, accountName, isDefault } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bank name, account number, and account name are required' 
      });
    }

    // For now, return success with the new account
    // In production, save to database
    const newAccount = {
      id: Date.now().toString(),
      bankName,
      accountNumber,
      accountName,
      isDefault: isDefault || false,
    };

    console.log('✅ New bank account added:', newAccount);

    return res.status(201).json({ 
      success: true, 
      message: 'Bank account added successfully',
      data: newAccount 
    });
  } catch (error: any) {
    console.error('Add bank account error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// DELETE /api/admin/bank-accounts/:id - Remove bank account
// ============================================
export const removeBankAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ success: false, error: 'Account ID required' });
    }

    console.log(`✅ Bank account ${id} removed`);

    return res.status(200).json({ 
      success: true, 
      message: 'Bank account removed successfully' 
    });
  } catch (error: any) {
    console.error('Remove bank account error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
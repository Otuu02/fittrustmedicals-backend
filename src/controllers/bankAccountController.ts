import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// GET /api/admin/bank-accounts - List all bank accounts
// ============================================
export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    // Fetch from actual database
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // If no accounts exist, return default
    if (bankAccounts.length === 0) {
      const defaultAccounts = [
        {
          id: '1',
          bankName: 'Access Bank',
          accountNumber: '0039373686',
          accountName: 'FITTRUST NIG LTD',
          isDefault: true,
        },
      ];
      return res.status(200).json(defaultAccounts);
    }

    return res.status(200).json(bankAccounts);
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

    // Save to database
    const newAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        accountNumber,
        accountName,
        isDefault: isDefault || false,
      },
    });

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

    await prisma.bankAccount.delete({
      where: { id: id as string },
    });

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
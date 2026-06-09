import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/wallet - Get wallet balance
export const getWallet = async (req: Request, res: Response) => {
  try {
    const totalEarnedResult = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    });

    const totalWithdrawnResult = await prisma.withdrawal.aggregate({
      _sum: { amount: true },
    });

    const totalEarned = totalEarnedResult._sum.totalAmount || 0;
    const totalWithdrawn = totalWithdrawnResult._sum.amount || 0;

    return res.status(200).json({
      availableBalance: Number(totalEarned) - Number(totalWithdrawn),
      totalEarned: Number(totalEarned),
      totalWithdrawn: Number(totalWithdrawn),
    });
  } catch (error: any) {
    console.error('Get wallet error:', error);
    return res.status(500).json({ 
      availableBalance: 0, 
      totalEarned: 0, 
      totalWithdrawn: 0 
    });
  }
};

// GET /api/admin/bank-accounts - List bank accounts
export const getBankAccounts = async (req: Request, res: Response) => {
  try {
    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (bankAccounts.length > 0) {
      return res.status(200).json(bankAccounts);
    }

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
  } catch (error: any) {
    console.error('Get bank accounts error:', error);
    return res.status(200).json([
      {
        id: '1',
        bankName: 'Access Bank',
        accountNumber: '0039373686',
        accountName: 'FITTRUST NIG LTD',
        isDefault: true,
      },
    ]);
  }
};

// POST /api/admin/bank-accounts - Add bank account
export const addBankAccount = async (req: Request, res: Response) => {
  try {
    const { bankName, accountNumber, accountName, isDefault } = req.body;

    if (!bankName || !accountNumber || !accountName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Bank name, account number, and account name are required' 
      });
    }

    const existingAccounts = await prisma.bankAccount.count();
    const shouldBeDefault = isDefault || existingAccounts === 0;

    const newAccount = await prisma.bankAccount.create({
      data: {
        bankName,
        accountNumber,
        accountName,
        isDefault: shouldBeDefault,
      },
    });

    if (shouldBeDefault) {
      await prisma.bankAccount.updateMany({
        where: { id: { not: newAccount.id } },
        data: { isDefault: false },
      });
    }

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

// DELETE /api/admin/bank-accounts/:id - Remove bank account
export const removeBankAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = String(id);

    await prisma.bankAccount.delete({
      where: { id: accountId },
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Bank account removed successfully' 
    });
  } catch (error: any) {
    console.error('Remove bank account error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/admin/withdrawals/pending - Get pending withdrawals
export const getPendingWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(withdrawals);
  } catch (error: any) {
    console.error('Get pending withdrawals error:', error);
    return res.status(200).json([]);
  }
};

// POST /api/admin/withdraw - Record withdrawal (ADD THIS EXPORT)
export const recordWithdrawal = async (req: Request, res: Response) => {
  try {
    const { amount, bankName, accountNumber, accountName } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount,
        bankName: bankName || 'Access Bank',
        accountNumber,
        accountName,
        status: 'completed',
      },
    });

    console.log(`💰 Withdrawal recorded: ₦${amount.toLocaleString()} to ${accountName}`);

    return res.status(200).json({
      success: true,
      message: `Withdrawal of ₦${amount.toLocaleString()} recorded`,
      withdrawal,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/admin/withdraw - Request withdrawal (alias for recordWithdrawal)
export const requestWithdrawal = recordWithdrawal;
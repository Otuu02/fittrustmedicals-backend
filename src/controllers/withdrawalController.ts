import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get pending withdrawals
export const getPendingWithdrawals = async (req: Request, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(withdrawals);
  } catch (error: any) {
    console.error('Get pending withdrawals error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Request withdrawal
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    const { amount, bankAccountId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    // Get current wallet balance
    const totalEarned = await prisma.order.aggregate({
      where: { paymentStatus: 'PAID' },
      _sum: { totalAmount: true },
    });

    const totalWithdrawn = await prisma.withdrawal.aggregate({
      _sum: { amount: true },
    });

    const availableBalance = (totalEarned._sum.totalAmount || 0) - (totalWithdrawn._sum.amount || 0);

    if (amount > availableBalance) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    const withdrawal = await prisma.withdrawal.create({
      data: {
        amount,
        bankName: 'Access Bank',
        accountNumber: '0039373686',
        accountName: 'FITTRUST NIG LTD',
        status: 'pending',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully',
      data: withdrawal,
    });
  } catch (error: any) {
    console.error('Withdrawal request error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Process withdrawal
export const processWithdrawal = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const updated = await prisma.withdrawal.update({
      where: { id: id as string },
      data: {
        status: 'completed',
        processedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Withdrawal processed successfully',
      data: updated,
    });
  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
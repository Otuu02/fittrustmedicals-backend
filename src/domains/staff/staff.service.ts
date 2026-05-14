import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface RecordStaffActionDto {
  staffId: string;
  action: string;
  value?: number;
  metadata?: Record<string, any>;
}

export interface StaffPerformanceData {
  staffId: string;
  month: number;
  year: number;
  ordersProcessed: number;
  totalSalesValue: number;
  productsCreated: number;
  productsUpdated: number;
  inventoryUpdates: number;
  customerSupportTickets: number;
  performanceScore: number;
}

@Injectable()
export class StaffService {
  private performances: StaffPerformanceData[] = [];

  constructor(private prisma: PrismaService) {}

  async recordAction(recordDto: RecordStaffActionDto): Promise<void> {
    // ✅ TODO: Implement with Prisma StaffMetrics model when added to schema
    console.log('Recording staff action:', recordDto);
  }

  async getStaffPerformance(staffId: string, month: number, year: number): Promise<StaffPerformanceData | null> {
    // ✅ TODO: Query from Prisma when StaffPerformance model added
    return this.performances.find(
      p => p.staffId === staffId && p.month === month && p.year === year
    ) || null;
  }

  async getAllStaffPerformance(month: number, year: number): Promise<StaffPerformanceData[]> {
    // ✅ TODO: Query from Prisma when StaffPerformance model added
    return this.performances.filter(
      p => p.month === month && p.year === year
    );
  }

  async getTopPerformers(month: number, year: number, limit: number = 5): Promise<StaffPerformanceData[]> {
    // ✅ TODO: Query from Prisma when StaffPerformance model added
    return this.performances
      .filter(p => p.month === month && p.year === year)
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  }

  async getDashboardStats(): Promise<any> {
    const now = new Date();
    
    // ✅ FIX: Use Prisma to count staff users
    const staffCount = await this.prisma.user.count({
      where: { role: 'STAFF' }
    });

    return {
      currentMonth: `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`,
      totalStaff: staffCount,
      totalOrdersProcessed: 0,
      totalSalesValue: 0,
      averagePerformanceScore: 0,
    };
  }
}
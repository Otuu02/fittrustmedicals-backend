import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { StaffService, RecordStaffActionDto } from './staff.service';

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('action')
  async recordAction(@Body() recordDto: RecordStaffActionDto) {
    await this.staffService.recordAction(recordDto);
    return { message: 'Action recorded successfully' };
  }

  @Get('performance/:staffId')
  getStaffPerformance(
    @Param('staffId') staffId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.staffService.getStaffPerformance(staffId, month, year);
  }

  @Get('performance')
  getAllPerformance(
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.staffService.getAllStaffPerformance(month, year);
  }

  @Get('top-performers')
  getTopPerformers(
    @Query('month') month: number,
    @Query('year') year: number,
    @Query('limit') limit: number = 5,
  ) {
    return this.staffService.getTopPerformers(month, year, limit);
  }

  @Get('dashboard')
  getDashboardStats() {
    return this.staffService.getDashboardStats();
  }
}
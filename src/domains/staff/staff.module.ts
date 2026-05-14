import { Module } from '@nestjs/common';
// ✅ FIX: Remove TypeOrmModule
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule], // ✅ FIX: Use PrismaModule
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
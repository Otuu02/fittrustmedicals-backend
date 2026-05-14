import { Module } from '@nestjs/common';
import { ReferralController } from './referral.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ReferralController],
})
export class ReferralModule {}
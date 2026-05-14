import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './domains/auth/auth.module';
import { UsersModule } from './domains/users/users.module';
import { HealthModule } from './health/health.module';

// Note: PaymentModule will be added later - create it if needed
// For now, we'll use Express routes in the main.ts file

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    // PaymentModule, // Uncomment when you create this module
  ],
})
export class AppModule {}
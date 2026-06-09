import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import paymentRoutes from './routes/paymentRoutes';
import staffRoutes from './routes/staffRoutes';
import productRoutes from './routes/productRoutes';
import adminRoutes from './routes/adminRoutes';
import walletRoutes from './routes/walletRoutes';
import userRoutes from './routes/userRoutes';
import receiptRoutes from './routes/receiptRoutes';
import orderRoutes from './routes/orders'; // ✅ ADD THIS - Import order routes

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.fittrustmedicals.com',
      'https://fittrustmedicals.com',
      'https://api.fittrustmedicals.com',
      'https://fittrustmedicals-backend.onrender.com',
      'https://fittrustmedical.vercel.app',
      'https://fittrustmedicals-frontend.vercel.app',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.setGlobalPrefix('api');

  // REGISTER ALL ROUTES
  expressApp.use('/api', paymentRoutes);
  expressApp.use('/api', staffRoutes);
  expressApp.use('/api', productRoutes);
  expressApp.use('/api', adminRoutes);
  expressApp.use('/api', walletRoutes);
  expressApp.use('/api', userRoutes);
  expressApp.use('/api', receiptRoutes);
  expressApp.use('/api', orderRoutes); // ✅ ADD THIS - Register order routes

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 Server running on http://0.0.0.0:${port}/api`);
  console.log(`✅ CORS enabled`);
  console.log(`📦 Routes registered:`);
  console.log(`   - Payment routes`);
  console.log(`   - Staff routes`);
  console.log(`   - Product routes`);
  console.log(`   - Admin routes`);
  console.log(`   - Wallet routes`);
  console.log(`   - User routes (CRUD operations)`);
  console.log(`   - Receipt routes (Email receipts)`);
  console.log(`   - Order routes (With automatic stock deduction)`); // ✅ Updated log
}

bootstrap();
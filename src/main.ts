import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import paymentRoutes from './routes/paymentRoutes';
import staffRoutes from './routes/staffRoutes';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get the underlying Express instance
  const expressApp = app.getHttpAdapter().getInstance();

  // Body parser MUST be registered BEFORE routes
  expressApp.use(express.json({ limit: '10mb' }));
  expressApp.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HARDCODED CORS - This WILL work
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://www.fittrustmedicals.com',
      'https://fittrustmedicals.com',
      'https://api.fittrustmedicals.com',
      'https://fittrustmedicals-backend.onrender.com',
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Set global prefix for NestJS routes
  app.setGlobalPrefix('api');

  // MANUAL BANK TRANSFER ROUTES
  expressApp.use('/api', paymentRoutes);
  
  // STAFF PERFORMANCE ROUTES
  expressApp.use('/api', staffRoutes);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`🚀 Server running on http://localhost:${port}/api`);
  console.log(`✅ CORS enabled for: https://www.fittrustmedicals.com`);
  console.log(`📊 Staff performance routes registered`);
}

bootstrap();
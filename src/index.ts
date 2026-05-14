import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import paymentRoutes from './routes/paymentRoutes';

dotenv.config();

const app: Application = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
async function connectDB() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully to AWS RDS PostgreSQL');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Database connection failed:', errorMessage);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    database: 'connected',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Test database endpoint - FIXED
app.get('/db-test', async (req: Request, res: Response) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`;
    res.json({ 
      success: true, 
      message: 'Database connected successfully!',
      data: result 
    });
  } catch (error) {
    // Fixed: Properly handle unknown error type
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      success: false, 
      error: errorMessage 
    });
  }
});

// Root endpoint - added for convenience
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: process.env.APP_NAME,
    version: process.env.APP_VERSION,
    status: 'running',
    endpoints: ['/health', '/db-test', '/api/payment']
  });
});

// ============================================
// PAYMENT ROUTES
// ============================================
app.use('/api/payment', paymentRoutes);

// Start server
app.listen(port, async () => {
  await connectDB();
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📡 Health check: http://localhost:${port}/health`);
  console.log(`🔍 Database test: http://localhost:${port}/db-test`);
  console.log(`💳 Payment endpoint: http://localhost:${port}/api/payment`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Disconnected from database');
  process.exit(0);
});
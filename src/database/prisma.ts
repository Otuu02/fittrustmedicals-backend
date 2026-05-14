// backend/src/database/prisma.ts

import { PrismaClient } from '@prisma/client';

// Ensure only one instance of PrismaClient is created to avoid connection exhaustion
declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  // Optionally add logging for debugging during development
  // log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : [],
});

// During development, set the global Prisma instance to avoid multiple instances
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;
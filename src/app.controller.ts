import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return 'Backend is running successfully! 🚀';
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'fittrustmedicals-backend',
      message: 'Backend is healthy and ready!',
      uptime: process.uptime()
    };
  }

  @Get('health/simple') 
  getHealthSimple() {
    return {
      status: 'ok',
      message: 'Backend is running!'
    };
  }

  @Get('api')
  getApiInfo() {
    return {
      message: 'FitTrust Medicals API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        products: '/api/products',
        upload: '/api/upload'
      }
    };
  }
}
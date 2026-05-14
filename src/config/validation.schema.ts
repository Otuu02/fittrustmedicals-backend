import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Application
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3001),
  APP_NAME: Joi.string().default('FitTrust Medicals API'),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis (optional)
  REDIS_HOST: Joi.string().optional().default('localhost'),
  REDIS_PORT: Joi.number().port().optional().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_TTL: Joi.number().optional().default(3600),

  // File Upload
  UPLOAD_DESTINATION: Joi.string().optional().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().optional().default(10485760),

  // Paystack
  PAYSTACK_SECRET_KEY: Joi.string().required(),
  PAYSTACK_PUBLIC_KEY: Joi.string().required(),
  PAYSTACK_BASE_URL: Joi.string().uri().optional().default('https://api.paystack.co'),

  // CORS
  CORS_ORIGIN: Joi.string().optional().default('http://localhost:3000'),

  // Frontend URL
  FRONTEND_URL: Joi.string().uri().optional().default('http://localhost:3000'),
  
  // API URL
  API_URL: Joi.string().uri().optional().default('http://localhost:3001'),
});
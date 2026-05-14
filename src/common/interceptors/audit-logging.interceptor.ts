import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, headers, body, query, params } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = request.ip || request.connection.remoteAddress;
    const startTime = Date.now();

    // Extract user information if available
    const user = (request as any).user;
    const userId = user?.id || 'anonymous';
    const userRole = user?.role || 'guest';

    // Log request
    this.logger.log(
      `🚀 ${method} ${url} - User: ${userId} (${userRole}) - IP: ${ip}`,
    );

    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`📝 Request details:`, {
        headers: this.sanitizeHeaders(headers),
        body: this.sanitizeBody(body),
        query,
        params,
        userAgent,
      });
    }

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const duration = Date.now() - startTime;
          const { statusCode } = response;

          this.logger.log(
            `✅ ${method} ${url} - ${statusCode} - ${duration}ms - User: ${userId}`,
          );

          // Log response data in development
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`📤 Response:`, {
              statusCode,
              duration,
              dataSize: JSON.stringify(responseData).length,
            });
          }

          // Audit log for sensitive operations
          if (this.isSensitiveOperation(method, url)) {
            this.logger.warn(
              `🔒 AUDIT: ${method} ${url} - User: ${userId} (${userRole}) - IP: ${ip} - Status: ${statusCode}`,
            );
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          this.logger.error(
            `❌ ${method} ${url} - Error after ${duration}ms - User: ${userId} - ${error.message}`,
          );

          // Always audit failed operations
          this.logger.error(
            `🚨 AUDIT ERROR: ${method} ${url} - User: ${userId} (${userRole}) - IP: ${ip} - Error: ${error.message}`,
          );
        },
      }),
    );
  }

  private sanitizeHeaders(headers: any): any {
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    const sanitized = { ...headers };
    
    sensitiveHeaders.forEach((header) => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach((field) => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private isSensitiveOperation(method: string, url: string): boolean {
    const sensitivePatterns = [
      /\/auth\/(login|register)/,
      /\/users\/\w+/,
      /\/admin\//,
      /\/payments\//,
      /\/orders\//,
    ];

    const isSensitiveMethod = ['POST', 'PUT', 'DELETE'].includes(method);
    const isSensitiveUrl = sensitivePatterns.some((pattern) => pattern.test(url));
    
    return isSensitiveMethod && isSensitiveUrl;
  }
}
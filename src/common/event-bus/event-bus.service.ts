import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  version: number;
  occurredOn: Date;
  data: any;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
}

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  async publish(event: DomainEvent): Promise<void> {
    try {
      this.logger.log(
        `📡 Publishing event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`,
      );

      await Promise.all([
        this.eventEmitter.emitAsync(event.eventType, event),
        this.eventEmitter.emitAsync('*', event),
      ]);

      this.logger.debug(`✅ Event published successfully: ${event.eventId}`);
    } catch (error) {
      this.logger.error(
        `❌ Failed to publish event: ${event.eventId}`,
        error.stack,
      );
      throw error;
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    this.logger.log(`📡 Publishing ${events.length} events in batch`);

    try {
      await Promise.all(events.map((event) => this.publish(event)));
      this.logger.log(`✅ Batch of ${events.length} events published successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to publish batch of events`, error.stack);
      throw error;
    }
  }

  createEvent<T = any>(
    eventType: string,
    aggregateId: string,
    aggregateType: string,
    data: T,
    metadata?: DomainEvent['metadata'],
  ): DomainEvent {
    return {
      eventId: this.generateEventId(),
      eventType,
      aggregateId,
      aggregateType,
      version: 1,
      occurredOn: new Date(),
      data,
      metadata: {
        correlationId: this.generateCorrelationId(),
        ...metadata,
      },
    };
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export type BusinessEventType =
  | 'message.received'
  | 'message.replied'
  | 'customer.created'
  | 'customer.updated'
  | 'lead.created'
  | 'lead.qualified'
  | 'cart.created'
  | 'cart.abandoned'
  | 'order.created'
  | 'order.completed'
  | 'campaign.completed'
  | 'inventory.low';

export interface BusinessEvent<T = any> {
  id: string;
  type: BusinessEventType;
  shopId: string;
  contactId?: string;
  payload: T;
  timestamp: string;
  idempotencyKey: string;
}

@Injectable()
export class BusinessEventBus {
  private readonly logger = new Logger(BusinessEventBus.name);
  private readonly event$ = new Subject<BusinessEvent>();

  publish<T>(type: BusinessEventType, shopId: string, payload: T, contactId?: string): BusinessEvent<T> {
    const event: BusinessEvent<T> = {
      id: `evt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      type,
      shopId,
      contactId,
      payload,
      timestamp: new Date().toISOString(),
      idempotencyKey: `${type}:${shopId}:${contactId || 'shop'}:${Date.now()}`,
    };

    this.logger.log(`[EventBus] Published event ${event.type} for shop ${shopId}`);
    this.event$.next(event);
    return event;
  }

  on<T>(type: BusinessEventType, shopId?: string): Observable<BusinessEvent<T>> {
    return this.event$.asObservable().pipe(
      filter(event => event.type === type && (!shopId || event.shopId === shopId))
    ) as Observable<BusinessEvent<T>>;
  }

  ofShop(shopId: string): Observable<BusinessEvent> {
    return this.event$.asObservable().pipe(
      filter(event => event.shopId === shopId)
    );
  }
}

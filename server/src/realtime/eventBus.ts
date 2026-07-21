import { EventEmitter } from 'events';

/**
 * Service-to-service event bus using Node's EventEmitter
 * Used for decoupling services (e.g., Workflow → Notification)
 * In production, this can be replaced with Redis pub/sub or message queue
 */

class EventBus extends EventEmitter {
  private static instance: EventBus;

  private constructor() {
    super();
    this.setMaxListeners(100); // Avoid warnings for typical enterprise usage
  }

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Publish an event
   */
  publish<T = unknown>(eventName: string, payload: T): void {
    this.emit(eventName, payload);
  }

  /**
   * Subscribe to an event
   */
  subscribe<T = unknown>(
    eventName: string,
    handler: (payload: T) => void | Promise<void>
  ): () => void {
    // Wrap handler to handle both sync and async
    const wrappedHandler = async (payload: T) => {
      try {
        await handler(payload);
      } catch (error) {
        // Log but don't rethrow to avoid crashing event bus
        console.error(`Error in event handler for ${eventName}:`, error);
      }
    };

    this.on(eventName, wrappedHandler);

    // Return unsubscribe function
    return () => {
      this.off(eventName, wrappedHandler);
    };
  }

  /**
   * Subscribe to an event once
   */
  subscribeOnce<T = unknown>(
    eventName: string,
    handler: (payload: T) => void | Promise<void>
  ): Promise<T> {
    return new Promise((resolve) => {
      this.once(eventName, (payload: T) => {
        handler(payload);
        resolve(payload);
      });
    });
  }

  /**
   * Get listener count for debugging
   */
  getListenerCount(eventName: string): number {
    return this.listenerCount(eventName);
  }

  /**
   * Get all event names
   */
  getEventNames(): string[] {
    return Array.from(this.eventNames()).map((name) => String(name));
  }
}

/**
 * Global event bus instance
 */
export const eventBus = EventBus.getInstance();

/**
 * Type-safe event publishing
 */
export function publishEvent<T = unknown>(eventName: string, payload: T): void {
  eventBus.publish(eventName, payload);
}

/**
 * Type-safe event subscription
 */
export function subscribeEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void | Promise<void>
): () => void {
  return eventBus.subscribe(eventName, handler);
}

/**
 * Type-safe one-time event subscription
 */
export function subscribeOnceEvent<T = unknown>(
  eventName: string,
  handler: (payload: T) => void | Promise<void>
): Promise<T> {
  return eventBus.subscribeOnce(eventName, handler);
}

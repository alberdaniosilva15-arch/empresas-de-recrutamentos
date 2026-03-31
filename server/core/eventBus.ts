/**
 * Simple Event Bus for decoupled communication between modules.
 */
type Listener = (data: any) => void;

class EventBus {
  private listeners: { [event: string]: Listener[] } = {};

  on(event: string, fn: Listener) {
    this.listeners[event] = this.listeners[event] || [];
    this.listeners[event].push(fn);
  }

  emit(event: string, data: any) {
    console.log(`[EventBus] Emitting event: ${event}`, data);
    (this.listeners[event] || []).forEach(fn => {
      try {
        fn(data);
      } catch (error) {
        console.error(`[EventBus] Error in listener for event ${event}:`, error);
      }
    });
  }
}

export const eventBus = new EventBus();

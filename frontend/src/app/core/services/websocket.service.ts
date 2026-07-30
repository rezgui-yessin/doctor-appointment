import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messageSubject = new Subject<any>();
  private connected = false;

  constructor() {
    this.connect();
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const wsUrl = `ws://${window.location.hostname}:8083/ws/websocket`;
    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.connected = true;
        // Send STOMP CONNECT frame
        const connectFrame = "CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\0";
        this.socket?.send(connectFrame);

        // Subscribe to appointments topic
        const subscribeFrame = "SUBSCRIBE\nid:sub-0\ndestination:/topic/appointments\n\n\0";
        this.socket?.send(subscribeFrame);
      };

      this.socket.onmessage = (event) => {
        const data = event.data;
        if (data.includes('MESSAGE')) {
          try {
            const bodyStart = data.indexOf('\n\n') + 2;
            const bodyEnd = data.lastIndexOf('\0');
            const bodyStr = data.substring(bodyStart, bodyEnd > bodyStart ? bodyEnd : data.length);
            if (bodyStr.trim()) {
              const parsed = JSON.parse(bodyStr.trim());
              this.messageSubject.next(parsed);
            }
          } catch (err) {
            // Fallback for raw JSON messages
            try {
              const parsed = JSON.parse(data);
              this.messageSubject.next(parsed);
            } catch (e) {}
          }
        }
      };

      this.socket.onclose = () => {
        this.connected = false;
        // Auto-reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };

      this.socket.onerror = (error) => {
        console.warn('WebSocket connection error', error);
      };
    } catch (e) {
      console.warn('Could not establish WebSocket connection', e);
    }
  }

  public onMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }
}

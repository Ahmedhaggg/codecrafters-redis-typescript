import { randomUUID } from "crypto";
import { Socket } from "net";

type Subscribe = Socket & { subscribeId?: string };

export class SubscriberManager {
  private subscribers: Map<
    string,
    {
      conn: Socket;
      channels: string[];
    }
  > = new Map();

  public addSubscriber(conn: Subscribe, channel: string) {
    if (conn.subscribeId && this.subscribers.has(conn.subscribeId)) {
      const subscriber = this.subscribers.get(conn.subscribeId)!;
      this.subscribers.set(conn.subscribeId, {
        ...subscriber,
        channels: [...subscriber.channels, channel],
      });

      return subscriber.channels.length + 1;
    } else {
      const subscribeId = randomUUID();
      (conn as any).subscribeId = subscribeId;

      this.subscribers.set(subscribeId, { channels: [channel], conn });
      return 1;
    }
  }

  public isConnectionSubscribed(conn: Subscribe) {
    return conn.subscribeId ? true :false
  }

  public publish(targetChannel: string, message: string) {
    let notifiedChannels = 0;
    for (const { conn, channels } of this.subscribers.values()) {
      if (channels.includes(targetChannel)) {
        notifiedChannels++;
        conn.write(message);
      }
    }  
    return notifiedChannels; 
  }
}

export const subscriberManager = new SubscriberManager();

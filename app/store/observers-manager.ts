import { randomBytes } from "crypto";
import type { Socket } from "net";

type Observer = {
  key: string;
  connection: Socket;
  timeout: number;
  id: string;
};

export class ObserverManager {
  private observers: Observer[] = [];

  add(observer: Omit<Observer, "id">) {
    const id = randomBytes(8).toString("hex");

    this.observers.push({ ...observer, id });

    return id;
  }

  remove(id: string) {
    const observer = this.observers.find((observer) => observer.id == id);

    if (observer) {
      this.observers = this.observers.filter((observer) => observer.id !== id);
    }

    return observer ? true : false;
  }

  notifyFirst(key: string, value: string) {
    const observer = this.observers.find((ob) => ob.key == key);

    if (!observer) return;

    observer.connection.write(value);
    observer.connection.end();
  }
}

export const observerManager = new ObserverManager();

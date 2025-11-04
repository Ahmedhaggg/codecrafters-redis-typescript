import type { Socket } from "net";

export class Replica {
  constructor(private _conn: Socket) {}

  get conn() {
    return this._conn;
  }

  send(data: string) {
    this._conn.write(data);
  }
}

export class ReplicasManager {
  private _replicas: Replica[] = [];
  private _replicasCount: number = 0;

  get replicas() {
    return this._replicas;
  }

  addReplica(replica: Replica) {
    this._replicas.push(replica);
    this._replicasCount++;
  }

  get replicasCount() {
    return this._replicasCount;
  }
}

export const replicasManager = new ReplicasManager();

import type { Socket } from "net";

export class Replica {
  constructor(private _conn: Socket) {}

  get conn() {
    return this._conn;
  }

  send(data: string) {
    this._conn.write(data);
  }

  isSameConnection(otherConn: Socket): boolean {
    const currentAddr = this._conn.remoteAddress;
    const currentPort = this._conn.remotePort;
    const otherAddr = otherConn.remoteAddress;
    const otherPort = otherConn.remotePort;

    console.log("---------------------------------------------------");
    console.log("[Replica::isSameConnection] 🔍 Comparing sockets...");
    console.log(`[Replica::isSameConnection] Current replica socket:`);
    console.log(`  🖥️  remoteAddress: ${currentAddr}`);
    console.log(`  🔌 remotePort:     ${currentPort}`);
    console.log(`[Replica::isSameConnection] Incoming socket:`);
    console.log(`  🖥️  remoteAddress: ${otherAddr}`);
    console.log(`  🔌 remotePort:     ${otherPort}`);

    // Perform the actual comparison
    const isSame = currentAddr === otherAddr && currentPort === otherPort;

    if (isSame) {
      console.log("[Replica::isSameConnection] ✅ Connections MATCH — same client reconnected or already registered.");
    } else {
      console.log("[Replica::isSameConnection] ❌ Connections DIFFER — new or different replica detected.");
    }

    console.log("---------------------------------------------------");
    return isSame;
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

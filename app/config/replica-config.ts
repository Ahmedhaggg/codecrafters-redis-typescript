import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";
import { handleCommand } from "../commandsHandlers";
import { RespCommand } from "../resp/objects";
import { RespDecoder } from "../resp/decoder";

export const connectReplicaToMaster = () => {
  const { host, port } = config.replicaOf!;

  console.log(" config.replicaOf ", config.replicaOf);

  let currentHandShakeStep = 0;

  const sendPing = () => {
    client.write(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
  };

  const sendListeningPort = () => {
    client.write(
      RespEncoder.encodeArray([
        RespEncoder.encodeString("REPLCONF"),
        RespEncoder.encodeString("listening-port"),
        RespEncoder.encodeString(config.port.toString()),
      ])
    );
  };

  const sendCapa = () => {
    client.write(
      RespEncoder.encodeArray([
        RespEncoder.encodeString("REPLCONF"),
        RespEncoder.encodeString("capa"),
        RespEncoder.encodeString("psync2"),
      ])
    );
  };

  const sendPsync = () => {
    client.write(
      RespEncoder.encodeArray([
        RespEncoder.encodeString("PSYNC"),
        RespEncoder.encodeString("?"),
        RespEncoder.encodeString("-1"),
      ])
    );
  };

  const client = net.createConnection(port, host, () => {
    console.log("Connected to master");
    sendPing();
    currentHandShakeStep++;
  });

  let rdbBytesRemaining: number | null = null;
  let rdbBuffer = Buffer.alloc(0);

  client.on("data", (data) => {
    // If we are inside RDB transfer mode
    if (rdbBytesRemaining !== null) {
      rdbBuffer = Buffer.concat([rdbBuffer, data]);

      if (rdbBuffer.length >= rdbBytesRemaining) {
        const rdbFile = rdbBuffer.subarray(0, rdbBytesRemaining);
        console.log(`✅ Received full RDB (${rdbBytesRemaining} bytes)`);
        handleRDB(rdbFile); // optional – save or ignore it

        // Remove consumed bytes and reset state
        const rest = rdbBuffer.subarray(rdbBytesRemaining);
        rdbBytesRemaining = null;
        rdbBuffer = Buffer.alloc(0);

        // Continue parsing any leftover RESP data
        if (rest.length > 0) client.emit("data", rest);
      }
      return;
    }

    // Normal handshake logic
    if (currentHandShakeStep === 1) {
      sendListeningPort();
      currentHandShakeStep++;
      return;
    }
    if (currentHandShakeStep === 2) {
      sendCapa();
      currentHandShakeStep++;
      return;
    }
    if (currentHandShakeStep === 3) {
      sendPsync();
      currentHandShakeStep++;
      return;
    }

    // Text decode only for small lines
    const str = data.toString("utf8");

    // Check for FULLRESYNC line
    if (str.startsWith("+FULLRESYNC")) {
      console.log("→ Master requested FULLRESYNC");
      const lines = str.split("\r\n");
      const bulkLine = lines.find((l) => l.startsWith("$"));
      if (bulkLine) {
        rdbBytesRemaining = parseInt(bulkLine.slice(1));
        console.log(`→ Expecting ${rdbBytesRemaining} RDB bytes`);
      }
      return;
    }

    // Regular command stream after RDB
    const commands = str
      .split(/\*(?=\d+)/)
      .filter(Boolean)
      .map((chunk) => "*" + chunk.trim());

    for (const cmdStr of commands) {
      try {
        const respDecoder = new RespDecoder(Buffer.from(cmdStr));
        const command = respDecoder.decode();
        if (!(command instanceof RespCommand)) continue;
        handleCommand(command, client);
      } catch (err) {
        console.log("error decoding command:", err);
      }
    }
  });
};

// console.log(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
// client.write(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));

const handleRDB = (data: Buffer) => {
  // store or discard RDB snapshot
  console.log("Received RDB data chunk:", data.length, "bytes");
};

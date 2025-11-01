import * as net from "net";
import { RespDecoder } from "./resp/decoder";
import { RespCommand } from "./resp/objects";
import { handleCommand } from "./commandsHandlers";
import { config } from "./config/config";
import { connectReplicaToMaster } from "./config/replica-config";
import { handleReplicaSync } from "./commandsHandlers/handlers/replication/replica-sync.handler";

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    console.log("new Request", data.toString());
    try {
      const decoder = new RespDecoder(data);

      const command = decoder.decode();

      console.log("command", command);
      if (command instanceof RespCommand !== true) {
        console.log("unknown command");
        connection.write("-ERR unknown command\r\n");
        return;
      }
      console.log("before handle command", command);
      handleCommand(command, connection);
      handleReplicaSync(command);
    } catch (error) {
      console.log("Error ", error);
    }
  });
});

if (config.role === "slave") {
  console.log("debug mode is on");
  connectReplicaToMaster();
}

server.listen(config.port, "127.0.0.1");

// import * as net from "net";
// import { RespDecoder } from "./resp/decoder";
// import { RespCommand } from "./resp/objects";
// import { handleCommand } from "./commandsHandlers";
// import { config } from "./config/config";
// import { connectReplicaToMaster } from "./config/replica-config";
// import { handleReplicaSync } from "./commandsHandlers/handlers/replication/replica-sync.handler";

// const server = net.createServer((connection) => {
//   console.log(`🟢 New connection from ${connection.remoteAddress}:${connection.remotePort}`);

//   // 🧱 Buffer to accumulate partial TCP data for this specific connection
//   let buffer = Buffer.alloc(0);

//   connection.on("data", (chunk) => {
//     console.log(`📩 Received ${chunk.length} bytes from ${connection.remoteAddress}`);
//     buffer = Buffer.concat([buffer, chunk]);
//     console.log("🧩 Current buffer content:", buffer.toString());

//     try {
//       // Try decoding whatever we have accumulated so far
//       const decoder = new RespDecoder(buffer);
//       const command = decoder.decode();

//       if (!command || !(command instanceof RespCommand)) {
//         console.warn("⚠️ Received invalid or incomplete RESP command, waiting for more data...");
//         return; // wait for next data chunk
//       }

//       console.log("✅ Decoded command:", command);

//       // Clear buffer after successful command decode
//       buffer = Buffer.alloc(0);

//       // Handle command (PING, SET, PSYNC, etc.)
//       handleCommand(command, connection);

//       // If it's a write command and we have replicas, propagate it
//       handleReplicaSync(command);
//     } catch (err) {
//       console.error("❌ Error while decoding or handling command:", err);
//       connection.write("-ERR invalid command\r\n");
//       // Optionally clear buffer to recover
//       buffer = Buffer.alloc(0);
//     }
//   });

//   connection.on("end", () => {
//     console.log(`🔴 Connection closed from ${connection.remoteAddress}:${connection.remotePort}`);
//   });

//   connection.on("error", (err) => {
//     console.error(`💥 Connection error: ${err.message}`);
//   });
// });

// if (config.role === "slave") {
//   console.log("🧠 Replica mode enabled — connecting to master...");
//   connectReplicaToMaster();
// }

// server.listen(config.port, "127.0.0.1", () => {
//   console.log(`🚀 Redis-like server listening on port ${config.port}`);
// });

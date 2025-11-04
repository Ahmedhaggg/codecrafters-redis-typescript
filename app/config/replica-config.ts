import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";
import { RespDecoder } from "../resp/decoder";
import { RespCommand } from "../resp/objects";
import { handleCommand } from "../commandsHandlers";

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

  client.on("data", (data) => {
    if (currentHandShakeStep === 1) {
      sendListeningPort();
      currentHandShakeStep++;
    } else if (currentHandShakeStep === 2) {
      sendCapa();
      currentHandShakeStep++;
    } else if (currentHandShakeStep === 3) {
      sendPsync();
      currentHandShakeStep++;
    } else {
      console.log("data from master", data.toString());
      const str = data.toString();
      console.log("replica received ", str);
      const commands = str
        .split(/\*(?=\d+)/)
        .filter(Boolean)
        .map((chunk) => "*" + chunk.trim());

      for (const cmdStr of commands) {
        console.log("cmdStr: ", cmdStr);

        const cmdBuffer = Buffer.from(cmdStr);
        if (!cmdStr.startsWith("*")) {
          console.log("is not set command ", cmdStr);
          continue;
        }

        try {
          const respDecoder = new RespDecoder(cmdBuffer);
          const command = respDecoder.decode();

          // Must be a valid RespCommand
          if (!(command instanceof RespCommand)) continue;

          // Only process SET commands
          if (command.command?.toUpperCase() !== "SET") continue;

          console.log("SET command received:", command.args);

          // Handle or store the SET command
          handleCommand(command, client);
        } catch {
          // Ignore invalid / partial RESP data (like binary RDB dump)
          continue;
        }
      }
    }
  });
};

// console.log(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
// client.write(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));

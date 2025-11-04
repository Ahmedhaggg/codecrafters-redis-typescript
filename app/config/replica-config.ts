import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";

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
      const commands = str
        .split(/\*(?=\d+)/) // split on "*<number>" that starts a RESP array
        .filter(Boolean)
        .map((chunk) => "*" + chunk.trim());

      console.log("replica received commands: ", commands);
    }
  });
};

// console.log(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
// client.write(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));

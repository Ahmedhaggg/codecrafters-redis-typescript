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

  const client = net.createConnection(port, host, () => {
    console.log("Connected to master");
    sendPing();
    currentHandShakeStep++;
  });

  client.on("data", (data) => {
    console.log("data from master", data.toString());
    if (currentHandShakeStep === 1) {
      sendListeningPort();
      currentHandShakeStep++;
    } else if (currentHandShakeStep === 2) {
      sendCapa();
      currentHandShakeStep++;
    }
  });
};

// console.log(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
// client.write(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));

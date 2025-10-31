import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";

export const connectReplicaToMaster = () => {
  const { host, port } = config.replicaOf!;

  console.log(" config.replicaOf ", config.replicaOf);
  const client = net.createConnection(port, host, () => {
    console.log("Connected to master");
    console.log(RespEncoder.encodeArray([RespEncoder.encodeString("PING")]));
    const commands = [["PING"], ["REPLCONF", "listening-port", config.port.toString()], ["REPLCONF", "capa", "psync2"]];

    commands.forEach((command) => {
      client.write(RespEncoder.encodeArray(command.map((str) => RespEncoder.encodeString(str))));
    });
  });

  client.on("data", (data) => {
    console.log("Received: " + data);
  });
};

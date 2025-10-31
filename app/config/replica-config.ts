import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";

export const connectReplicaToMaster = () => {
  const { host, port } = config.replicaOf!;

  console.log(" config.replicaOf ", config.replicaOf);
  const client = net.createConnection(port, host, () => {
    console.log("Connected to master");
    console.log(RespEncoder.encodeArray(["PING"]));
    client.write(RespEncoder.encodeArray(["PING"]));
  });

  client.on("data", (data) => {
    console.log("Received: " + data);
  });
};

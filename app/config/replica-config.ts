import * as net from "net";
import { config } from "./config";
import { RespEncoder } from "../resp/encoder";

export const connectToMaster = () => {
  const { host, port } = config.replicaOf!;

  const client = net.createConnection(port, host, () => {
    console.log("Connected to master");
    console.log(RespEncoder.encodeArray(["PING"]));
    client.write(RespEncoder.encodeArray(["PING"]));
  });
};

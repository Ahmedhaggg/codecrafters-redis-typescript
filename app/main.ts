import * as net from "net";
import { RespDecoder } from "./resp/decoder";
import { RespCommand } from "./resp/objects";
import { handleCommand } from "./commandsHandlers";

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    console.log("new Request");
    const decoder = new RespDecoder(data);

    const command = decoder.decode();

    console.log("command", command);
    if (command instanceof RespCommand !== true) {
      connection.write("-ERR unknown command\r\n");
      return;
    }

    handleCommand(command, connection);
  });
});

console.log(process.argv);
const portArg = process.argv.find((arg) => arg.startsWith("--port="));
const port = portArg ? Number(portArg.split("=")[1]) : 6379;

server.listen(port, "127.0.0.1");

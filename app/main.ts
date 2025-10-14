import * as net from "net";

const server: net.Server = net.createServer((connection: net.Socket) => {
  // Handle connection
  connection.on("data", (data: Buffer) => {
    const [command, ...args] = data.toString().split(" ");

    let commandSensitive = command.toUpperCase().trim();

    if (commandSensitive === "PING") {
      connection.write("+PONG\r\n");
    } else if (commandSensitive === "ECHO") {
      connection.write(`$${args[0].length}\r\n${args[0]}\r\n`);
    } else {
      connection.write("-ERR unknown command\r\n");
    }
  });
});

server.listen(6379, "127.0.0.1");

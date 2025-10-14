import * as net from "net";

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    const message = data.toString();

    // Example input: *2\r\n$4\r\nECHO\r\n$9\r\npineapple\r\n
    const parts = message.split("\r\n");

    // parts = ["*2", "$4", "ECHO", "$9", "pineapple", ""]
    const command = parts[2]?.toUpperCase();
    const argument = parts[4];

    if (command === "ECHO") {
      // RESP bulk string: $<length>\r\n<value>\r\n
      const response = `$${argument.length}\r\n${argument}\r\n`;
      connection.write(response);
    } else if (command === "PING") {
      connection.write("+PONG\r\n");
    } else {
      connection.write("-ERR unknown command\r\n");
    }
  });
});

server.listen(6379, "127.0.0.1");

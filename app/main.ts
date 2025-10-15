import * as net from "net";

const store = new Map<string, string>();

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
    } else if (command === "SET") {
      const expirySeconds = parseInt(parts[8]);
      if (expirySeconds) {
        setTimeout(() => {
          store.delete(argument);
        }, expirySeconds * 1000);
      }
      store.set(argument, parts[6]);

      connection.write("+OK\r\n");
    } else if (command === "GET") {
      const value = store.get(argument);
      if (value) {
        const response = `$${value.length}\r\n${value}\r\n`;
        connection.write(response);
      } else {
        connection.write("$-1\r\n");
      }
    } else {
      connection.write("-ERR unknown command\r\n");
    }
  });
});

server.listen(6379, "127.0.0.1");

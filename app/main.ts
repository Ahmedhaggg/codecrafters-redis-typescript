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
      const expiryCommand = parts.find((part) => part.toUpperCase() === "EX" || part.toUpperCase() === "PX");
      const expirySeconds = parseInt(parts[parts.length - 1]) || null;

      if (expiryCommand && expirySeconds) {
        setTimeout(() => {
          store.delete(argument);
        }, expirySeconds * 1000);
      }

      store.set(argument, parts[6]);

      connection.write("+OK\r\n");
    } else if (command === "GET") {
      if (store.has(argument)) {
        const val = store.get(argument)!;
        connection.write(`$${val.length}\r\n${val}\r\n`);
      } else {
        connection.write("$-1\r\n");
      }
    } else {
      connection.write("-ERR unknown command\r\n");
    }
  });
});

server.listen(6379, "127.0.0.1");

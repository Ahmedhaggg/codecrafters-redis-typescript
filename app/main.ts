import * as net from "net";
import { RespDecoder } from "./resp/decoder";
import { RespCommand } from "./resp/objects";
import { handleCommand } from "./commandsHandlers";

const server = net.createServer((connection) => {
  connection.on("data", (data) => {
    console.log("new Request");
    const decoder = new RespDecoder(data);

    const command = decoder.decode();

    console.log(command);
    if (command instanceof RespCommand !== true) {
      connection.write("-ERR unknown command\r\n");
      return;
    }

    const res = handleCommand(command);
    return connection.write(res);
  });
});

server.listen(6379, "127.0.0.1");

// import * as net from "net";

// let store = new Map<string, string | number>();

// const server = net.createServer((connection) => {
//   connection.on("data", (data) => {
//     const message = data.toString().trim();

//     // The fix: Filter out empty strings which are created by the trailing \r\n
//     const parts = message.split("\r\n").filter((p) => p.length > 0);
//     console.log("Received parts:", parts);
//     // parts for PING: ["*1", "$4", "PING"]
//     // parts for ECHO: ["*2", "$4", "ECHO", "$9", "pineapple"]

//     // Command is always at index 2
//     const command = parts[2]?.toUpperCase();
//     // Argument is at index 4 for a command with one argument (like ECHO)
//     const argument = parts[4];

//     if (command === "ECHO") {
//       // RESP bulk string: $<length>\r\n<value>\r\n
//       // NOTE: Argument could be undefined if the command array was malformed
//       if (argument) {
//         const response = `$${argument.length}\r\n${argument}\r\n`;
//         connection.write(response);
//       } else {
//         connection.write("-ERR wrong number of arguments for 'echo' command\r\n");
//       }
//     } else if (command === "PING") {
//       // This will now execute for the test case
//       connection.write("+PONG\r\n");
//     } else if (command == "GET") {
//       const value = store.get(argument || "");
//       if (value !== undefined) {
//         const stringValue = value.toString();
//         connection.write(`$${stringValue.length}\r\n${stringValue}\r\n`);
//       } else {
//         connection.write("$-1\r\n");
//       }
//     } else {
//       connection.write("-ERR unknown command\r\n");
//     }
//   });
// });

// server.listen(6379, "127.0.0.1");

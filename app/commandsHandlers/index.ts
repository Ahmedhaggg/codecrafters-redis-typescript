import type { Socket } from "net";
import { RespEncoder } from "../resp/encoder";
import type { RespCommand } from "../resp/objects";
import { transactionManager } from "../store/transaction-manager";
import { handleTransaction } from "./handlers/transactions/transactions-commands-handlers";
import { getCommandHandler } from "./handlers.factory";

export const handleCommand = (command: RespCommand, connection: Socket) => {
  const cmd = command.command;

  if (transactionManager.get(connection) || cmd === "MULTI") {
    return handleTransaction(command, connection);
  }

  const handler = getCommandHandler(command);

  if (handler.type == "OBSERVER") {
    const obsRes = handler.handler(command, connection);
    if (obsRes) return connection.write(obsRes);
    return;
  }

  if (handler.type == "REQ_RES") return connection.write(handler.handler(command));

  connection.write(RespEncoder.encodeError("INVALID"));
};

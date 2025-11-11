import type { Socket } from "net";
import { RespEncoder } from "../resp/encoder";
import type { RespCommand } from "../resp/objects";
import { handleTransaction, isTransactionCommand } from "./handlers/transactions/transactions-commands-handlers";
import { ALLOWED_COMMANDS_FOR_SUBSCRIBERS, getCommandHandler } from "./handlers.factory";
import { subscriberManager } from "../store/subscribe-manager";

export const handleCommand = (command: RespCommand, connection: Socket) => {
  if (isTransactionCommand(command, connection)) return handleTransaction(command, connection);

  if (subscriberManager.isConnectionSubscribed(connection) && !ALLOWED_COMMANDS_FOR_SUBSCRIBERS.includes(command.command)) {
    return connection.write(RespEncoder.encodeError(`Can't execute '${command.command.toLowerCase()}'.`));
  }

  const handler = getCommandHandler(command);

  if (handler.type == "OBSERVER") {
    const obsRes = handler.handler(command, connection);

    if (obsRes) return connection.write(obsRes);

    return RespEncoder.encodeNil();
  }

  if (handler.type == "REQ_RES") {
    const res = handler.handler(command);

    return connection.write(res);
  }

  connection.write(RespEncoder.encodeError("INVALID"));
};

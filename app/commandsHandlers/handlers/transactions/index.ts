import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import { transactionManager } from "../../../store/transaction-manager";
import { getCommandHandler } from "../../handlers.factory";

export const multi = (connection: Socket) => {
  transactionManager.start(connection);
  return RespEncoder.encodeSimpleString("OK");
};

export const exec = (connection: Socket) => {
  if (!transactionManager.haveOpenedTransaction(connection)) {
    return RespEncoder.encodeError("EXEC without MULTI");
  }

  const transaction = transactionManager.get(connection);
  if (!transaction) {
    return RespEncoder.encodeError("EXEC without MULTI");
  }

  const results = transaction.queue.map((cmd) => {
    try {
      const { handler } = getCommandHandler(cmd);
      const result = handler(cmd, connection);

      return result ?? RespEncoder.encodeNil();
    } catch (err) {
      return RespEncoder.encodeError("EXEC command failed");
    }
  });

  transactionManager.remove(connection);

  return RespEncoder.encodeArray(results as string[]);
};

import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import { transactionManager } from "../../../store/transaction-manager";
import { getCommandHandler } from "../../handlers.factory";

export const multi = (connection: Socket) => {
  transactionManager.start(connection);
  return RespEncoder.encodeSimpleString("OK");
};

export const exec = (connection: Socket) => {
  if (transactionManager.haveOpenedTransaction(connection)) {
    const transaction = transactionManager.get(connection);

    const cmdRes = transaction?.queue
      .map((c) => {
        let { handler } = getCommandHandler(c);
        return handler(c, connection);
      })
      .filter((r) => r !== undefined || typeof r == "string") as string[];

    transactionManager.remove(connection);

    return RespEncoder.encodeArray(cmdRes);
  }

  return RespEncoder.encodeError("EXEC without MULTI");
};

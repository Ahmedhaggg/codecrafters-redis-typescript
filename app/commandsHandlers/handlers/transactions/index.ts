import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";
import { transactionManager } from "../../../store/transaction-manager";
import { getCommandHandler } from "../../handlers.factory";

export const incr = (command: RespCommand) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;
  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const keyName = args[0].value;

  const currentValue = StoreManager.get().get(keyName);

  const newValue = (currentValue ? parseInt(currentValue) : 0) + 1;

  if (Number.isNaN(newValue)) return RespEncoder.encodeError("value is not an integer or out of range");

  StoreManager.get().set(keyName, newValue);

  return RespEncoder.encodeInteger(newValue);
};

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

import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import type { RespBulkString, RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";
import { randomUUID } from "crypto";

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

export const multi = (command: RespCommand, connection: Socket) => {
  return RespEncoder.encodeSimpleString("OK");
};

export const exec = (command: RespCommand, connection: Socket) => {
  if (transactionManager.exec(connection)) return RespEncoder.encodeArray([]);

  return RespEncoder.encodeError("EXEC without MULTI");
};

type Transaction = {
  queue: [];
};

type SocketWithId = Socket & {
  id: string;
};

export class TransactionsManager {
  private openedTransactions: Map<string, Transaction> = new Map<string, Transaction>();

  start(connection: Socket) {
    const id = randomUUID();
    (connection as any).id = id;
    this.openedTransactions.set(id, { queue: [] });
  }

  exec(connection: Socket) {
    const transactionId = (connection as SocketWithId).id;

    if (!transactionId || !this.openedTransactions.get(transactionId)) return false;

    this.openedTransactions.delete(transactionId);

    return true;
  }
}

export const transactionManager = new TransactionsManager();

import { RespEncoder } from "../../../resp/encoder";
import type { RespBulkString, RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";

export const xAdd = (command: RespCommand) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;

  // Narrow to RespBulkString[]
  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [listName, id, ...newValues] = args.map((a) => (a as RespBulkString).value);

  const formattedValues = newValues.reduce((acc, val, i) => {
    if (i % 2 == 0) acc[val] = acc[val + 1];
    return acc;
  }, {} as Record<string, string>);

  let xAddList = StoreManager.get().get(listName) as Map<string, Record<string, string>>;

  if (!xAddList) {
    xAddList = new Map<string, Record<string, string>>();
    xAddList.set(id, formattedValues);
  } else {
    xAddList.set(id, formattedValues);
  }

  StoreManager.get().set(listName, xAddList);
  return RespEncoder.encodeString(id);
};

import { RespEncoder } from "../../../resp/encoder";
import { RespBulkString, type RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";

export const rpush = (command: RespCommand) => {
  // Check that command has args
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;

  // Narrow to RespBulkString[]
  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [listName, ...listValues] = args.map((a) => (a as RespBulkString).value);

  let list = StoreManager.get().get(listName) ?? [];

  list.push(...listValues);
  console.log(list);
  StoreManager.get().set(listName, list);

  return RespEncoder.encodeInteger(list.length);
};

export const lRange = (command: RespCommand) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;

  // Narrow to RespBulkString[]
  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [listName, startArgString, endArgString] = args.map((a) => (a as RespBulkString).value);

  const startIndex = parseInt(startArgString);

  const endIndex = parseInt(endArgString);

  if (typeof startIndex !== "number" || typeof endIndex !== "number") {
    return RespEncoder.encodeError("Invalid index keys");
  }

  const list = StoreManager.get().get(listName) ?? [];

  return RespEncoder.encodeArray(list.slice(startIndex, endIndex + 1));
};

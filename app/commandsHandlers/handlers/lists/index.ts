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

  const startIndex = parseInt(startArgString, 10);
  const endIndex = parseInt(endArgString, 10);

  if (isNaN(startIndex) || isNaN(endIndex)) {
    return RespEncoder.encodeError("Invalid index keys");
  }

  const list = StoreManager.get().get(listName) ?? [];

  const listLength = list.length;

  let start = startIndex < 0 ? listLength + startIndex : startIndex;
  let end = endIndex < 0 ? listLength + endIndex : endIndex;

  if (start < 0) start = 0;
  if (end < 0) end = 0;

  end = Math.min(end + 1, listLength);

  if (start > end) return RespEncoder.encodeArray([]);

  const result = list.slice(start, end);
  return RespEncoder.encodeArray(result);
};

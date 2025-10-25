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

  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [listName, id, ...newValues] = args.map((a) => (a as RespBulkString).value);

  // Fix key-value parsing
  const formattedValues: Record<string, string> = {};
  for (let i = 0; i < newValues.length; i += 2) {
    formattedValues[newValues[i]] = newValues[i + 1];
  }

  let xAddList = StoreManager.get().get(listName) as Map<string, Record<string, string>> | undefined;

  const ID = makeId(xAddList, id);

  // Validate ID properly
  const validation = validateId(xAddList, ID);

  if (!validation.valid) {
    return RespEncoder.encodeError(validation.error!);
  }

  if (!xAddList) {
    xAddList = new Map<string, Record<string, string>>();
  }

  xAddList.set(ID, formattedValues);
  StoreManager.get().set(listName, xAddList);

  return RespEncoder.encodeString(ID);
};

const validateId = (
  xAddList: Map<string, Record<string, string>> | undefined,
  newId: string
): { valid: boolean; error?: string } => {
  const parts = newId.split("-");

  if (parts.length !== 2) {
    return { valid: false, error: "Invalid ID format" };
  }

  const [timestamp, sequence] = parts.map((part) => parseInt(part, 10));

  if (Number.isNaN(timestamp) || Number.isNaN(sequence)) {
    return { valid: false, error: "Invalid ID format" };
  }

  // Rule: cannot be 0-0
  if (timestamp === 0 && sequence === 0) {
    return { valid: false, error: "The ID specified in XADD must be greater than 0-0" };
  }

  // If the stream is empty → only needs to be > 0-0
  if (!xAddList || xAddList.size === 0) {
    if (timestamp === 0 && sequence <= 0) {
      return { valid: false, error: "The ID specified in XADD must be greater than 0-0" };
    }
    return { valid: true };
  }

  // Get the last ID in the stream
  const lastKey = Array.from(xAddList.keys()).pop()!;
  const [lastTimestamp, lastSequence] = lastKey.split("-").map((part) => parseInt(part, 10));

  // Must be strictly greater
  if (timestamp < lastTimestamp) {
    return {
      valid: false,
      error: "The ID specified in XADD is equal or smaller than the target stream top item",
    };
  }

  if (timestamp === lastTimestamp && sequence <= lastSequence) {
    return {
      valid: false,
      error: "The ID specified in XADD is equal or smaller than the target stream top item",
    };
  }

  return { valid: true };
};

const makeId = (xAddList: Map<string, Record<string, string>> | undefined, id: string) => {
  const [timestamp, sequence] = id.split("-");

  if (timestamp !== "*" && sequence !== "*") return id;

  if (timestamp == "*" && sequence == "*") {
    const lastKey = Array.from(xAddList?.keys() ?? []).pop();

    if (!lastKey) {
      return "0-1";
    }

    const [lastKeyTimestamp, lastKeySequence] = lastKey.split("-");

    return `${lastKeyTimestamp}-${parseInt(lastKeySequence) + 1}`;
  }

  if (timestamp == "*") {
    const lastKey = Array.from(xAddList?.keys() ?? []).pop();

    if (!lastKey) {
      return `0-${sequence}`;
    }

    return `${parseInt(lastKey.split("-")[0]) + 1}-${sequence}`;
  }

  const lastKey = Array.from(xAddList?.keys() ?? []).pop();

  if (!lastKey) {
    return `${timestamp}-${1}`;
  }

  return `${timestamp}-${parseInt(lastKey.split("-")[1]) + 1}`;
};

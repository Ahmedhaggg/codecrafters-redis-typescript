import { RespEncoder } from "../../../resp/encoder";
import type { RespBulkString, RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";

type Stream = Map<string, Record<string, string>>;

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
  if (id == "*") {
    const unixTimestamp = Math.floor(Date.now());

    return `${unixTimestamp}-0`;
  }

  const [timestamp, sequence] = id.split("-");

  if (timestamp !== "*" && sequence !== "*") return id;

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

  const [lastKeyTimestamp, lastKeySequence] = lastKey.split("-");

  if (timestamp == lastKeyTimestamp) {
    return `${timestamp}-${parseInt(lastKey.split("-")[1]) + 1}`;
  }

  return `${timestamp}-0`;
};

export const xRange = (command: RespCommand) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;

  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [key, start, end] = args.map((arg) => (arg as RespBulkString).value);

  const stream = StoreManager.get().get(key) as Stream;

  if (!stream) {
    return RespEncoder.encodeNullArray();
  }

  const cond = end == "+" ? (id: string) => id >= start : (id: string) => id >= start && id <= end;

  const values = Array.from(stream.entries()).filter(([id]) => cond(id));

  let resp = `*${values.length}\r\n`;

  for (const [id, fields] of values) {
    const fieldPairs = Object.entries(fields).flatMap(([field, value]) => [field, value]);

    // Outer array = 2 elements: id + fields array
    resp += `*2\r\n`;
    resp += RespEncoder.encodeString(id);
    resp += RespEncoder.encodeArray(fieldPairs);
  }

  return resp;
};

export const xRead = (command: RespCommand) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;

  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const [_, ...params] = args.map((arg) => (arg as RespBulkString).value);

  let resp = `*1\r\n`;

  const keys = params.slice(0, params.length / 2);
  const ids = params.slice(params.length / 2);
  console.log("keys.length ", keys.length);
  console.log("ids.length ", ids.length);
  keys.forEach((key, i) => {
    const start = ids[i];
    console.log("start ", start);
    const stream = StoreManager.get().get(key) as Stream;

    console.log("stream ", stream);
    if (!stream) return RespEncoder.encodeNullArray();

    const values = Array.from(stream.entries()).filter(([id]) => id > start);

    console.log("values ", values);
    resp += RespEncoder.encodeString(key);
    resp += `*${values.length}\r\n`;

    console.log("resp ", resp);
    for (const [id, fields] of values) {
      const fieldPairs = Object.entries(fields).flatMap(([field, value]) => [field, value]);

      // Outer array = 2 elements: id + fields array
      resp += `*2\r\n`;
      resp += RespEncoder.encodeString(id);
      resp += RespEncoder.encodeArray(fieldPairs);
    }
  });

  return resp;
};

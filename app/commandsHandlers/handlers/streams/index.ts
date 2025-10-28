import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import type { RespBulkString, RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";
import { observerManager } from "../../../store/observers-manager";

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

  const formattedValues: Record<string, string> = {};
  for (let i = 0; i < newValues.length; i += 2) {
    formattedValues[newValues[i]] = newValues[i + 1];
  }

  let stream = StoreManager.get().get(listName) as Map<string, Record<string, string>> | undefined;
  const ID = makeId(stream, id);

  const validation = validateId(stream, ID);
  if (!validation.valid) {
    return RespEncoder.encodeError(validation.error!);
  }

  if (!stream) {
    stream = new Map<string, Record<string, string>>();
  }

  stream.set(ID, formattedValues);
  StoreManager.get().set(listName, stream);

  // 🟢 Notify blocked readers using reusable encoder

  const resp = encodeStreamResponse(listName, [[ID, formattedValues]]);

  observerManager.notifyFirst(listName, resp);

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

  const encodedEntries = values.map(([id, fields]) => encodeStreamEntry(id, fields));
  return RespEncoder.encodeArray(encodedEntries);
};

export const xRead = (command: RespCommand, connection: Socket) => {
  if (!isContainsArgs(command)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const args = command.args;
  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  const values = args.map((a) => (a as RespBulkString).value);
  const blockIndex = values.indexOf("BLOCK");

  let timeout = 0;
  if (blockIndex !== -1) {
    timeout = parseFloat(values[blockIndex + 1]) / 1000 || 0; // convert ms → sec
    values.splice(blockIndex, 2);
  }

  const streamsIndex = values.indexOf("STREAMS");
  const keys = values.slice(streamsIndex + 1, streamsIndex + 1 + (values.length - streamsIndex - 1) / 2);
  const ids = values.slice(streamsIndex + 1 + keys.length);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const startId = ids[i];
    const stream = StoreManager.get().get(key) as Map<string, Record<string, string>>;

    if (stream) {
      const newEntries = Array.from(stream.entries()).filter(([id]) => id > startId);
      if (newEntries.length) {
        return encodeStreamResponse(key, newEntries);
      }
    }

    // 🟡 No new messages → register blocking read
    if (timeout >= 0) {
      const observerId = observerManager.add({
        connection,
        key,
        timeout,
      });

      if (timeout) {
        setTimeout(() => {
          const result = observerManager.remove(observerId);
          if (result) connection.write(RespEncoder.encodeNullArray());
        }, timeout * 1000);
      }

      return; // block until notified
    }
  }

  // non-blocking and no data
  return RespEncoder.encodeNullArray();
};

const encodeStreamEntry = (id: string, fields: Record<string, string>): string => {
  const flatFields = Object.entries(fields).flatMap(([k, v]) => [
    RespEncoder.encodeString(k),
    RespEncoder.encodeString(v),
  ]);

  const fieldsArray = RespEncoder.encodeArray(flatFields);
  const entry = RespEncoder.encodeArray([RespEncoder.encodeString(id), fieldsArray]);

  return entry;
};

const encodeStreamResponse = (streamName: string, entries: [string, Record<string, string>][]): string => {
  const encodedEntries = entries.map(([id, fields]) => encodeStreamEntry(id, fields));
  const entriesArray = RespEncoder.encodeArray(encodedEntries);

  const streamArray = RespEncoder.encodeArray([RespEncoder.encodeString(streamName), entriesArray]);

  // outer array (list of streams) — only one stream for now
  return RespEncoder.encodeArray([streamArray]);
};

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

  // Notify the first blocked reader (if any) for this stream key
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

  // original values (case preserved) and uppercase map for keyword lookup
  const values = args.map((a) => (a as RespBulkString).value);
  const valuesUpper = values.map((v) => v.toUpperCase());

  // find BLOCK (case-insensitive)
  const blockIndex = valuesUpper.indexOf("BLOCK");

  // If BLOCK exists, parse timeout (milliseconds) and remove both tokens from values
  let timeoutSeconds: number | null = null; // null => no blocking requested
  if (blockIndex !== -1) {
    const rawTimeout = values[blockIndex + 1];
    // if no explicit value provided, Redis would treat it as syntax error; here we tolerate it as 0
    const timeoutMs = parseFloat(rawTimeout || "0") || 0;
    timeoutSeconds = timeoutMs / 1000;
    // remove the BLOCK and its value from both arrays
    values.splice(blockIndex, 2);
    valuesUpper.splice(blockIndex, 2);
  }

  // find STREAMS (case-insensitive) after removal
  const streamsIndex = valuesUpper.indexOf("STREAMS");
  if (streamsIndex === -1) {
    return RespEncoder.encodeError("Invalid XREAD syntax: STREAMS expected");
  }

  // The remaining tokens after STREAMS are: <key1> <key2> ... <id1> <id2> ...
  const afterStreams = values.slice(streamsIndex + 1);
  const half = afterStreams.length / 2;
  if (!Number.isInteger(half) || half <= 0) {
    return RespEncoder.encodeError("Invalid XREAD syntax: keys and ids mismatch");
  }

  const keys = afterStreams.slice(0, half);
  const ids = afterStreams.slice(half);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const startId = ids[i];
    const stream = StoreManager.get().get(key) as Map<string, Record<string, string>> | undefined;

    if (stream) {
      const newEntries = Array.from(stream.entries()).filter(([id]) => id > startId);
      if (newEntries.length) {
        return encodeStreamResponse(key, newEntries);
      }
    }

    // no new entries for this key
    // Register blocking only if BLOCK was explicitly requested
    if (timeoutSeconds !== null) {
      const observerId = observerManager.add({
        connection,
        key,
        timeout: timeoutSeconds,
      });

      // schedule the timeout only if it's > 0; if 0 => immediate timeout (client expects immediate return?)
      if (timeoutSeconds > 0) {
        setTimeout(() => {
          const removed = observerManager.remove(observerId);
          if (removed) {
            try {
              connection.write(RespEncoder.encodeNullArray());
            } catch (err) {
              // ignore write errors
            }
          }
        }, timeoutSeconds * 1000);
      } else if (timeoutSeconds === 0) {
        // BLOCK 0 means wait forever in Redis; but if you intended 0ms timeout, handle accordingly.
        // Here, we treat 0 as "no wait" — but if you want infinite wait, don't schedule removal.
        // To emulate Redis BLOCK 0 semantics, comment out the else-if and don't schedule a timeout.
      }

      return; // client is blocked — return without writing anything now
    }
  }

  // non-blocking and no data -> return null array
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

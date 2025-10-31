import { config } from "../../../config/config";
import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";

export const info = (command: RespCommand) => {
  if (!isContainsArgs(command)) return RespEncoder.encodeError("Invalid key or value");

  const args = command.args;

  if (!isBulkStringArray(args)) {
    return RespEncoder.encodeError("Invalid key or value");
  }

  console.log(args.map((arg) => (arg as any).value));
  const infoVar = args[0].value;

  if (infoVar === "replication") {
    return RespEncoder.encodeString(
      `role:${config.role}\r\nmaster_replid:${config.id}\r\nmaster_repl_offset:${config.offset}`
    );
  }

  return RespEncoder.encodeString("role:master");
};

export const replconf = (command: RespCommand) => {
  const args = command.args;

  if (!isBulkStringArray(args)) return RespEncoder.encodeError("ERR wrong number of arguments");

  const [firstArg, secondArg] = args.map((arg) => arg.value);

  if (firstArg == "capa" && secondArg == "psync2") {
    return RespEncoder.encodeSimpleString("OK");
  }

  if (firstArg == "listening-port" && typeof parseInt(secondArg) == "number") {
    return RespEncoder.encodeSimpleString("OK");
  }

  return RespEncoder.encodeError("ERR unknown REPLCONF option");
};

export const psync = (command: RespCommand) => {
  const args = command.args;
  if (!isBulkStringArray(args)) return RespEncoder.encodeError("ERR wrong number of arguments");

  const [firstArg, secondArg] = args.map((arg) => arg.value);

  if (firstArg == "?" && secondArg == "-1") {
    return RespEncoder.encodeString(config.id);
  }

  return RespEncoder.encodeError("ERR unknown REPLCONF option");
};

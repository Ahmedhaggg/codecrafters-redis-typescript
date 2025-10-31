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
  const role = args[0].value;

  if (role === "replication") {
    return RespEncoder.encodeString("role:" + config.getRole());
  }

  return RespEncoder.encodeString("role:master");
};

import type { Socket } from "net";
import { config } from "../../../config/config";
import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";
import { isContainsArgs } from "../../validation/contains-args.validator";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";
import { Replica, replicasManager } from "../../../store/replicas";

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

const EMPTY_RDB_HEX =
  "524544495330303031fa0972656469732d76657205372e302e30fa0a6372656174652d74696d65c09f845d6400ff9e4a7c0a4d0a";

const EMPTY_RDB_BUFFER = Buffer.from(EMPTY_RDB_HEX, "hex");

export const psync = (command: RespCommand, connection: Socket) => {
  const args = command.args;
  if (!isBulkStringArray(args)) return RespEncoder.encodeError("ERR wrong number of arguments");

  const [firstArg, secondArg] = args.map((arg) => arg.value);

  if (firstArg == "?" && secondArg == "-1") {
    connection.write(RespEncoder.encodeString(`FULLRESYNC ${config.id} 0`));

    connection.write(`$${EMPTY_RDB_BUFFER.length}\r\n`);
    connection.write(EMPTY_RDB_BUFFER);
    console.log("replicasManager.replicas : ", replicasManager.replicas);

    replicasManager.addReplica(new Replica(connection));

    console.log("Replica added.");

    connection.write(
      RespEncoder.encodeArray([
        RespEncoder.encodeString("REPLCONF"),
        RespEncoder.encodeString("GETACK"),
        RespEncoder.encodeString("*"),
      ])
    );
  }

  return RespEncoder.encodeError("ERR unknown REPLCONF option");
};

import { RespEncoder } from "../../../resp/encoder";
import type { CommandName, RespBulkString, RespCommand } from "../../../resp/objects";
import { replicasManager } from "../../../store/replicas";
import { set } from "../set";

const REPLICA_SYNC_COMMANDS: CommandName[] = ["SET", "DEL", "DEL"];

export const handleReplicaSync = (command: RespCommand) => {
  if (REPLICA_SYNC_COMMANDS.includes(command.command)) {
    const encodedCommand = RespEncoder.encodeArray([
      command.command,
      ...(command.args?.map((c) => (c as RespBulkString).value) ?? []),
    ]);
    replicasManager.replicas.forEach((replica) => {
      replica.send(encodedCommand);
    });
  }
};

// RespEncoder.encodeArray([command.command, ...(command.args?.map((c) => (c as RespBulkString).value) ?? [])])

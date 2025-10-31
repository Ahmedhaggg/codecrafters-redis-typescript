import type { CommandName, RespCommand } from "../../../resp/objects";
import { replicasManager } from "../../../store/replicas";
import { set } from "../set";

const REPLICA_SYNC_COMMANDS: CommandName[] = ["SET", "DEL", "DEL"];

export const handleReplicaSync = (command: RespCommand) => {
  if (REPLICA_SYNC_COMMANDS.includes(command.command)) {
    const cmdResult = set(command);
    replicasManager.replicas.forEach((replica) => {
      replica.send(cmdResult);
    });
  }
};

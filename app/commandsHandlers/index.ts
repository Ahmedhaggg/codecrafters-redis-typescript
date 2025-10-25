import type { Socket } from "net";
import { RespEncoder } from "../resp/encoder";
import type { CommandName, RespCommand } from "../resp/objects";
import { del } from "./handlers/del";
import { echo } from "./handlers/echo";
import { get } from "./handlers/get";
import { lRange, rPush, lPush, lLen, lPop, pLPop } from "./handlers/lists";
import { ping } from "./handlers/ping";
import { set } from "./handlers/set";

type ReqResCommands = Exclude<CommandName, "BLPOP">;
type ObserversCommands = Extract<CommandName, "BLPOP">;

const commandHandlers = {
  ECHO: echo,
  PING: ping,
  DEL: del,
  GET: get,
  SET: set,
  RPUSH: rPush,
  LRANGE: lRange,
  LPUSH: lPush,
  LLEN: lLen,
  LPOP: lPop,
} as const satisfies Record<ReqResCommands, (cmd: RespCommand) => string | Buffer>;

const observersCommandHandlers = {
  BLPOP: pLPop,
} as const satisfies Record<ObserversCommands, (cmd: RespCommand, conn: Socket) => string | Buffer | void>;

export const handleCommand = (command: RespCommand, connection: Socket) => {
  const cmd = command.command;

  if (cmd in observersCommandHandlers) {
    const handler = observersCommandHandlers[cmd as ObserversCommands];
    return connection.write(handler(command, connection));
  }

  if (cmd in commandHandlers) {
    const handler = commandHandlers[cmd as ReqResCommands];
    return connection.write(handler(command));
  }

  connection.write(RespEncoder.encodeError("INVALID"));
};

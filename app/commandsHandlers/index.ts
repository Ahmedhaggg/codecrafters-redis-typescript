import type { Socket } from "net";
import { RespEncoder } from "../resp/encoder";
import type { CommandName, RespCommand } from "../resp/objects";
import { del } from "./handlers/del";
import { echo } from "./handlers/echo";
import { get } from "./handlers/get";
import { lRange, rPush, lPush, lLen, lPop, pLPop } from "./handlers/lists";
import { ping } from "./handlers/ping";
import { set } from "./handlers/set";
import { typeKey } from "./handlers/type-item";
import { xAdd, xRange, xRead } from "./handlers/streams";

type ReqResCommands = Exclude<CommandName, "BLPOP" | "XREAD">;
type ObserversCommands = Extract<CommandName, "BLPOP" | "XREAD">;

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
  TYPE: typeKey,
  XADD: xAdd,
  XRANGE: xRange,
} as const satisfies Record<ReqResCommands, (cmd: RespCommand) => string | Buffer>;

const observersCommandHandlers = {
  BLPOP: pLPop,
  XREAD: xRead,
} as const satisfies Record<ObserversCommands, (cmd: RespCommand, conn: Socket) => string | Buffer | void>;

export const handleCommand = (command: RespCommand, connection: Socket) => {
  const cmd = command.command;

  if (cmd in observersCommandHandlers) {
    const handler = observersCommandHandlers[cmd as ObserversCommands];
    const result = handler(command, connection);
    if (result) return connection.write(result);
    return;
  }

  if (cmd in commandHandlers) {
    const handler = commandHandlers[cmd as ReqResCommands];
    return connection.write(handler(command));
  }

  connection.write(RespEncoder.encodeError("INVALID"));
};

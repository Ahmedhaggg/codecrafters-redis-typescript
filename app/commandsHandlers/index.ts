import { RespEncoder } from "../resp/encoder";
import type { CommandName, RespCommand } from "../resp/objects";
import { del } from "./handlers/del";
import { echo } from "./handlers/echo";
import { get } from "./handlers/get";
import { lRange, rpush } from "./handlers/lists";
import { ping } from "./handlers/ping";
import { set } from "./handlers/set";

export const handleCommand = (command: RespCommand) => {
  const commandHandler = commandHandlers[command.command];

  if (!commandHandler) {
    return RespEncoder.encodeError("INVALID");
  }
  return commandHandler(command);
};

// Central command registry
export const commandHandlers: Record<CommandName, (cmd: RespCommand) => string | Buffer> = {
  ECHO: echo,
  PING: ping,
  DEL: del,
  GET: get,
  SET: set,
  RPUSH: rpush,
  LRANGE: lRange,
  // You can add RPUSH, LRANGE, etc here later
};

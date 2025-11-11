import type { CommandName, RespCommand } from "../resp/objects";
import { del } from "./handlers/del";
import { echo } from "./handlers/echo";
import { get } from "./handlers/get";
import { lRange, rPush, lPush, lLen, lPop, pLPop } from "./handlers/lists";
import { ping } from "./handlers/ping";
import { set } from "./handlers/set";
import { typeKey } from "./handlers/type-item";
import { xAdd, xRange, xRead } from "./handlers/streams";
import { type Socket } from "net";
import { incr } from "./handlers/incr";
import { info, psync, replconf, wait } from "./handlers/replication";
import { getConfig } from "./handlers/getConfig";
import { getKeys } from "./handlers/rdb";
import { publish, subscribe, unSubscribe } from "./handlers/pubsub";

type ReqResCommands = Exclude<
  CommandName,
  | "BLPOP"
  | "XREAD"
  | "MULTI"
  | "EXEC"
  | "MULTI"
  | "EXEC"
  | "DISCARD"
  | "PSYNC"
  | "WAIT"
  | "REPLCONF"
  | "SUBSCRIBE"
  | "PING"
  | "UNSUBSCRIBE"
>;
type ObserversCommands = Extract<
  CommandName,
  "BLPOP" | "XREAD" | "PSYNC" | "WAIT" | "REPLCONF" | "SUBSCRIBE" | "PING" | "UNSUBSCRIBE"
>;

const commandHandlers = {
  ECHO: echo,
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
  INCR: incr,
  INFO: info,
  CONFIG: getConfig,
  KEYS: getKeys,
  PUBLISH: publish,
} as const satisfies Record<ReqResCommands, (cmd: RespCommand) => string | Buffer>;

const observersCommandHandlers = {
  BLPOP: pLPop,
  XREAD: xRead,
  PSYNC: psync,
  WAIT: wait,
  REPLCONF: replconf,
  SUBSCRIBE: subscribe,
  PING: ping,
  UNSUBSCRIBE: unSubscribe,
} as const satisfies Record<ObserversCommands, (cmd: RespCommand, conn: Socket) => string | Buffer | void>;

type GetCommandHandler =
  | { type: "REQ_RES"; handler: (cmd: RespCommand) => string | Buffer }
  | { type: "OBSERVER"; handler: (cmd: RespCommand, conn: Socket) => string | Buffer | void };

export const getCommandHandler = (cmd: RespCommand): GetCommandHandler => {
  const handler = commandHandlers[cmd.command as ReqResCommands];
  if (handler) {
    return { type: "REQ_RES", handler: handler };
  }
  const observerHandler = observersCommandHandlers[cmd.command as ObserversCommands];
  if (observerHandler) {
    return { type: "OBSERVER", handler: observerHandler };
  }

  throw null;
};

export const ALLOWED_COMMANDS_FOR_SUBSCRIBERS: CommandName[] = ["SUBSCRIBE", "PING", "UNSUBSCRIBE"];

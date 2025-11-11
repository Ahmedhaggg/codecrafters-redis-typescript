import type { Socket } from "net";
import { RespEncoder } from "../../resp/encoder";
import type { RespCommand } from "../../resp/objects";
import { subscriberManager } from "../../store/subscribe-manager";

export const ping = (command: RespCommand, conn: Socket): string => {
  if (subscriberManager.isConnectionSubscribed(conn)) 
    return RespEncoder.encodeArrayOfStrings(["pong", ""])
  return RespEncoder.encodeSimpleString("PONG");
};
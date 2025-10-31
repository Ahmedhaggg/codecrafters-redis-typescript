import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";

export const info = (command: RespCommand) => {
  return RespEncoder.encodeString("role:master");
};

import { RespEncoder } from "../../../resp/encoder";
import { RespBulkString, type RespCommand } from "../../../resp/objects";
import { StoreManager } from "../../../store/store-manager";

export const rpush = (command: RespCommand) => {
  const listName = command.args?.[0];
  const listValue = command.args?.[1];

  if (listName instanceof RespBulkString == false || listValue instanceof RespBulkString == false) {
    return RespEncoder.encodeError("Invalid key Or Value");
  }

  let list = StoreManager.get().get(listName.value) ?? [];

  if (!Array.isArray(list)) {
    return RespEncoder.encodeError("key Not Reference To List");
  }

  list.push(listValue.value);

  StoreManager.get().set(listName.value, list);

  return RespEncoder.encodeInteger(list.length);
};

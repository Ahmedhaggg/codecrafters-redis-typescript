import type { Socket } from "net";
import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";
import { subscriberManager } from "../../../store/subscribe-manager";
import { isBulkStringArray } from "../../validation/isBulkStringList.validator";

export const subscribe = (command: RespCommand, conn: Socket) => {
  const args = command.args;
  if (!isBulkStringArray(args)) return RespEncoder.encodeError("Invalid Args");

  const channel = args[0].value;

  const channelsNum = subscriberManager.addSubscriber(conn, channel);

  return RespEncoder.encodeArray([
    RespEncoder.encodeString("subscribe"),
    RespEncoder.encodeString(channel),
    RespEncoder.encodeInteger(channelsNum),
  ]);
};

export const publish = (command: RespCommand) => {
  const args = command.args;

  if (!isBulkStringArray(args)) return RespEncoder.encodeError("Invalid Args");

  const channel = args[0].value;
  const message = args[1].value;

  const messageFormatted = RespEncoder.encodeArrayOfStrings(["message", channel, message]);

  const notifiedSubscribers = subscriberManager.publish(channel, messageFormatted);

  return RespEncoder.encodeInteger(notifiedSubscribers);
};

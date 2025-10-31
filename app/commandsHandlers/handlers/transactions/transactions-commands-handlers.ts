import type { RespCommand } from "../../../resp/objects";
import type { Socket } from "net";
import { transactionManager } from "../../../store/transaction-manager";
import { RespEncoder } from "../../../resp/encoder";
import { exec, multi } from ".";

export const handleTransaction = (command: RespCommand, conn: Socket) => {
  if (command.command == "MULTI") return conn.write(multi(conn));

  if (command.command == "EXEC") return conn.write(exec(conn));

  const transaction = transactionManager.get(conn)!;

  transaction.queue.push(command);

  transactionManager.update(conn, transaction);

  conn.write(RespEncoder.encodeSimpleString("QUEUED"));
};

import type { RespObject } from "./objects";

export class RespDecoder {
  // Implementation of the RESP decoder would go here
  public decode(buffer: Buffer): RespObject | null {
    // Decode the buffer into a RESP object

    let { command, args } = this.extract(buffer) || { command: "", args: [] };
    throw new Error("Method not implemented.");
  }

  public extract(buffer: Buffer): { command: string; args: string[] } | null {
    const bufferString = buffer.toString();
    const [command, ...args] = bufferString.split(" ");

    return { command, args };
  }
}

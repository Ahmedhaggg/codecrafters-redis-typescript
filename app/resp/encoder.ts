export class RespEncoder {
  public static encodeNil(): Buffer {
    return Buffer.from(`$-1\r\n`);
  }
  public static encodeSimpleString(data: string): string {
    return `+${data}\r\n`;
  }

  public static encodeString(data: string): string {
    return `$${data.length}\r\n${data}\r\n`;
  }

  public static encodeError(data: string): string {
    return `-ERR ${data.length}\r\n${data}\r\n`;
  }

  public static encodeInteger(data: number): string {
    return `:${data}\r\n`;
  }
}

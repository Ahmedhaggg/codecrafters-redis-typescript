export class RespEncoder {
  public static encodeSimpleString(data: string): string {
    return `+${data}\r\n`;
  }

  public static encodeString(data: string): string {
    return `$${data.length}\r\n${data}\r\n`;
  }

  public static encodeError(data: string): string {
    return `-ERR ${data.length}\r\n${data}\r\n`;
  }
}

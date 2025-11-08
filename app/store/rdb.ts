import fs from "fs";
import path from "path";
import { config } from "../config/config";

export class RDBFile {
  private offset = 0;
  private fileBuffer: Buffer;
  private content: Buffer;

  constructor() {
    this.fileBuffer = this.readRdbFile();

    this.content = this.readContent();
  }

  private readRdbFile() {
    return fs.readFileSync(path.join(config.rdb!.dir, config.rdb!.fileName));
  }

  public readContent() {
    const start = this.fileBuffer.indexOf(0xfb) + 3;
    const end = this.fileBuffer.indexOf(0xff);

    return this.fileBuffer.slice(start, end);
  }

  public readLine() {
    let typeFlag = this.content[this.offset];
    if (typeFlag === 0xff || this.offset >= this.content.length) {
      console.log("end");
      return null;
    }

    console.log("typeFlag: ", typeFlag);
    this.offset++;

    let keyLength = this.content[this.offset];
    console.log("keyLength: ", keyLength);

    this.offset++;

    const key = this.content.slice(this.offset, this.offset + keyLength).toString("utf-8");

    console.log("key ", key);
    this.offset += keyLength;

    const valueLen = this.content[this.offset];
    console.log("valueLength ", valueLen);

    this.offset++;

    const value = this.content.slice(this.offset, this.offset + valueLen).toString("utf-8");

    console.log("value ", value);

    this.offset += valueLen;

    return { key, value };
  }
}

export class RdbManager {
  searchByKey(key: string) {
    if (!config.rdb) return null;

    const file = new RDBFile();

    while (true) {
      const line = file.readLine();

      if (line == null) return null;

      if (line?.key == key) return line.value;
    }
  }

  getAllKeys() {
    if (!config.rdb) return [];

    const file = new RDBFile();

    let keys = [];

    while (true) {
      const line = file.readLine();

      if (line == null) break;

      keys.push(line.key);
    }

    return keys;
  }

  getAllValues() {
    if (!config.rdb) return [];

    const file = new RDBFile();

    let values = [];

    while (true) {
      const line = file.readLine();
      if (line == null) break;

      values.push(line?.value);
    }

    return values;
  }
}

export const rdbManager = new RdbManager();

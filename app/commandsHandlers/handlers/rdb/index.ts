import { config } from "../../../config/config";
import { RespEncoder } from "../../../resp/encoder";
import type { RespCommand } from "../../../resp/objects";
import fs from "fs";
import path from "path";

export const getKeys = (command: RespCommand) => {
  console.log("getting command: ", command);
  console.log("config.rdb: ", config.rdb);

  let keys: string[] = [];

  if (config.rdb) {
    const fileBuffer = fs.readFileSync(path.join(config.rdb.dir, config.rdb.fileName));

    const start = fileBuffer.indexOf(0xfb) + 3;
    const end = fileBuffer.indexOf(0xff);

    const databaseContent = fileBuffer.slice(start, end);

    let offset = 0;

    while (offset < databaseContent.length) {
      let typeFlag = databaseContent[offset];
      if (typeFlag === 0xff) {
        console.log("end");
        break;
      }
      console.log("typeFlag: ", typeFlag);
      offset++;

      let keyLength = databaseContent[offset];
      console.log("keyLength: ", keyLength);

      offset++;

      const key = databaseContent.slice(offset, offset + keyLength);

      console.log("key ", key.toString("utf-8"));
      keys.push(key.toString("utf-8"));
      offset += keyLength;

      const valueLen = databaseContent[offset];
      console.log("valueLength ", valueLen);

      offset++;

      const value = databaseContent.slice(offset, offset + valueLen);

      console.log("value ", value.toString("utf-8"));

      offset += valueLen;
    }

    console.log("keys: ", keys);
  }

  return RespEncoder.encodeArrayOfStrings(keys);
};

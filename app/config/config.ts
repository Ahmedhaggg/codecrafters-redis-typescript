export class Config {
  getPort() {
    console.log("args", process.argv);
    const portArgIndex = process.argv.findIndex((arg) => arg == "--port");
    const port = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1]) : 6379;
    return port;
  }

  getRole() {
    console.log("args", process.argv);
    const args = process.argv;
    const roleArgIndex = args.findIndex((arg) => arg == "--replicaof");
    const role = roleArgIndex !== -1 ? "master" : "slave";
    return role;
  }
}

export const config = new Config();

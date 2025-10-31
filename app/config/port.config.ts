export const getPort = () => {
  console.log("args", process.argv);
  const portArgIndex = process.argv.findIndex((arg) => arg == "--port");
  const port = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1]) : 6379;
  return port;
};

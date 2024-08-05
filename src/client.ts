#!/usr/bin/env bun

// all config will be push to remote by server in ~/.call-me-back/${hostName}
// include credential, port
// and this client should be in ~/.call-me-back/${hostName}/client.ts

const configPath = new URL('./', import.meta.url).pathname

let credential: string
let port: string
try {
  credential = await Bun.file(configPath + 'credential').text()
  port = await Bun.file(configPath + 'port').text()
} catch (err) {
  console.error('❗️ read config file failed:', (err as Error).message)
  process.exit(1)  
}

// validate the credential and port
if (!credential || !port) {
  console.error('❗️ credential and port is required, make sure server running and config file is correct')
  process.exit(1)
}

// find hostname from configPath 
const hostName = configPath.split('/').at(-2)

// the tunneled http server port
const remoteTunnelPort = Number(port)
// the remote host define in ssh config in the host
const sshHost  = hostName

const args = process.argv.slice(2)
 
// define the main command
const mainCmd = 'code'
// define the args that will be intercepted to what this command's args
const interceptArgs = [
  "--remote",
  `ssh-remote+${sshHost}`,
  "-r",
  "-g"
]

// the last tow vscode args will be the file row and column
// need to convert the file path to ${file}:${row}:${column}
function argsConvert(): string[] {
  const CHARACTER = args.pop()
  const LINE = args.pop()
  const FILE  = args.pop()
  return [`${FILE}:${LINE}:${CHARACTER}`]
}

const command = {
  command: mainCmd,
  args: interceptArgs.concat(argsConvert()),
}

// do http post request to localhost:${remoteTunnelPort}

const request = new Request(`http://localhost:${remoteTunnelPort}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${credential}`
  },
  body: JSON.stringify(command),
})

try {
  const response = await fetch(request);
  const res = await response.json();
  if(res.success) {
    const out = `${res.stdout || res.stderr}`
    if(out){
      console.log()
    }
  }else{
    console.error(res.stderr)
    process.exit(1)
  }
} catch (err) {
  console.error(err)
}

export {}
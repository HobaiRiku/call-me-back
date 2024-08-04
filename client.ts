#!/usr/bin/env bun

// the tunneled http server port
const remoteTunnelPort = Bun.env.CALL_ME_BACK_TUNNEL_POST || 6654
// the remote host define in ssh config in the host
const sshHost  = Bun.env.CALL_ME_BACK_SSH_HOST || 'my-remote-coding-host'

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
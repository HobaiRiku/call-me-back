#!/usr/bin/env bun
const remoteTunnelPort = Bun.env.CALL_ME_BACK_TUNNEL_POST || 6654

const args = process.argv.slice(2)

// define the main command
const mainCmd = 'code'

// define the args that will be intercepted to what this command's args
const interceptArgs = [
  "--remote",
  "ssh-remote+hy-coding",
]

const command = {
  command: mainCmd,
  args: interceptArgs.concat(args),
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
#!/usr/bin/env bun
const remoteTunnelPort = Bun.env.CALL_ME_BACK_TUNNEL_POST || 6654

const args = process.argv.slice(2)

const mainCmd = 'code'

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
  console.log(response)
} catch (err) {
  console.error(err)
}

export {}
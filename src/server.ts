#!/usr/bin/env bun

import { Server, Subprocess } from 'bun'
// define main server port
const serverPost = Bun.env.CALL_ME_BACK_SERVER_POST || 6654
// the remote tunnel ssh host, can be apply by fist argument
const sshHost = Bun.env.CALL_ME_BACK_SSH_HOST || process.argv[2] || ''
const remoteTunnelPort = Bun.env.CALL_ME_BACK_TUNNEL_POST || process.argv[3] || serverPost
// random credential
const credential = Math.random().toString(36).substring(2)

// sshHost must required
if (!sshHost) {
  console.error('❗️ ssh hostname is required')
  process.exit(1)
}

// main http server
const server = Bun.serve({
  port: serverPost,
  hostname: 'localhost',
  fetch: onFetch,
  error(error) {
    return new Response(`${error}\n${error.stack}`, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  },
})

console.info(`😺 call-me-back is running on http://localhost:${serverPost}`)

// main http handler, only handel post
async function onFetch(req: Request, _: Server) {
  // validate credential
  const credentialHeader = req.headers.get('Authorization')
  if (credentialHeader !== `Bearer ${credential}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (req.method === 'POST') {
    const body = await req.json()
    const [command, err] = makeCommand(body)
    if (err || !command) {
      return new Response(err!.message, { status: 400 })
    }
    const result = await handleCommand(command)
    if (result.success) {
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return new Response('404')
}

// use bunJs spawn to handle the command, return command output
async function handleCommand(command: Command) {
  const { command: cmd, args } = command
  const shellScript = [cmd, ...(args || [])]
  const result = {
    cmd: shellScript,
    stdout: '',
    stderr: '',
    success: false,
  }
  console.debug('exec command:', shellScript.join(' '))
  try {
    const proc = Bun.spawn({
      cmd: shellScript,
      env: command.env,
    })

    const execResult = await Promise.allSettled([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    result.stdout =
      execResult[0].status === 'fulfilled' ? execResult[0].value : ''
    result.stderr =
      execResult[1].status === 'fulfilled' ? execResult[1].value : ''
    const exitCode =
      execResult[2].status === 'fulfilled' ? execResult[2].value : 0
    result.success = exitCode === 0

    if (!result.success && !result.stderr) {
      result.stderr = `Non-zero exit code ${exitCode}`
    }
  } catch (err) {
    result.stderr = (err as Error).message
  }
  if (!result.success) {
    console.debug('exec command failed:', result.stderr)
  }
  return result
}

// the command body json type
type Command = {
  command: string
  args?: string[]
  env?: Record<string, string>
}

// validate convert json body to command data
function makeCommand(json: Record<string, any>) {
  let err: Error | null = null
  if (!json.command) {
    err = new Error('Command is required')
  }
  if (json.args && !Array.isArray(json.args)) {
    err = new Error('Args should be an array')
  }
  if (json.env && typeof json.env !== 'object') {
    err = new Error('Env should be an object')
  }
  const command = {
    command: json.command,
    args: json.args,
    env: json.env,
  } as Command
  return [err ? null : command, err] as const
}


// auto push to remote ~/.call-me-back/${hostName}client.ts
const clientFilePath = new URL('./client.ts', import.meta.url).pathname

// mkdir -p ~/.call-me-back$/{hostName} in remote
const mkdir = await Bun.spawn({
  cmd: ['ssh', sshHost, 'mkdir', '-p', `~/.call-me-back/${sshHost}`],
}).exited

// push credential and port to remote use ssh, located at ~/.call-me-back/${hostName}/
const pushCredential = await Bun.spawn({
  cmd: [
    'ssh',
    sshHost,
    'echo',
    credential,
    '>',
    `~/.call-me-back/${sshHost}/credential`,
  ],
}).exited

const pushPort = await Bun.spawn({
  cmd: [
    'ssh',
    sshHost,
    'echo',
    remoteTunnelPort.toString(),
    '>',
    `~/.call-me-back/${sshHost}/port`,
  ],
}).exited

// make ~/.call-me-back/${hostName} 700
const chmod = await Bun.spawn({
  cmd: ['ssh', sshHost, 'chmod', '-R', '700', `~/.call-me-back/${sshHost}`],
}).exited

// push client.ts to remote
const pushClient = await Bun.spawn({
  cmd: [
    'scp',
    clientFilePath,
    `${sshHost}:~/.call-me-back/${sshHost}/client.ts`,
  ],
}).exited

// make client.ts +x
const chmodClient = await Bun.spawn({
  cmd: ['ssh', sshHost, 'chmod', '+x', `~/.call-me-back/${sshHost}/client.ts`],
}).exited

// get remote user home
const remoteUserHome = Bun.spawn({
  cmd: ['ssh', sshHost, 'echo', '$HOME'],
})
let remoteUserHomePath = await new Response(remoteUserHome.stdout).text()
await remoteUserHome.exited
// remove \r\n
remoteUserHomePath = remoteUserHomePath.replace(/[\r\n]/g, '')

// validate all ssh exec success
const exitCodes = [
  mkdir,
  pushCredential,
  pushPort,
  chmod,
  pushClient,
  chmodClient,
]
exitCodes.forEach((code: number) => {
  if (code !== 0) {
    console.error('❗️ push config to remote failed')
    server.stop()
    process.exit(1)
  }
})

console.info('✅ setting client on remote success')


// example: ssh -N -R localhost:xxxx:localhost:xxxx -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -o ServerAliveCountMax=3 xxxx
let connectRemoteTunnel:Subprocess 
try {
  connectRemoteTunnel = Bun.spawn({
    cmd: [
      'ssh',
      '-N',
      '-R',
      `localhost:${remoteTunnelPort}:localhost:${serverPost}`,
      '-o',
      'ExitOnForwardFailure=yes',
      '-o',
      'ServerAliveInterval=15',
      '-o',
      'ServerAliveCountMax=3',
      sshHost,
    ],
  })
  console.info('✅ connect remote tunnel success')
} catch (err) {
  console.error('❗️ connect remote tunnel failed:', (err as Error).message)
  // exit process
  server.stop()
  process.exit(1)
}


console.info(
  '🛠️ configure your launch-editor to:',
  `${remoteUserHomePath}/.call-me-back/${sshHost}/client.ts`
)

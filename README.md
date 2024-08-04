# Call Me Back

A simple solution for [launch-editor](https://github.com/yyx990803/launch-editor) (which is the fundamental part of [vite-plugin-vue-inspector](https://github.com/webfansplz/vite-plugin-vue-inspector) and [vite-plugin-vue-devtools](https://devtools-next.vuejs.org/guide/vite-plugin))  working in vscode remote environment.

## Usage

1. install [bunjs](https://bun.sh/)
2. clone this repo in your `host`(your local computer) and `remote`(your remote coding server)
3. open your code project or workspace in vscode remote environment
4. running the `server.ts` in a terminal (assume the remote hostname is my-remote-coding-host):
   ```bash
    // with bun
    bun ./src/server.ts my-remote-coding-host
    // or shebang 
    chmod +x ./src/server.ts
    ./src/server.ts my-remote-coding-host
   ```
5. set the `CALL_ME_BACK_SSH_HOST` env in your `remote` to the same as in step 4 (assume to be my-remote-coding-host).   
5. configure the `launch-editor` in your project, some like this:
   ```ts
   // vue.config.ts// https://vitejs.dev/config/ 
    export default defineConfig(({mode, command}) => {
      // ...
      plugins: [
      // ...
      VueDevTools({
        launchEditor:'/home/xxx/path-to/call-me-back/src/client.ts'
      }),
      // ...
      ]
      // ...
    }
   
   ```
6. run your project and should work.

## Why
1. `launch-editor` is assume all things run in the same machine environment, but in vscode remote environment, the `run dev` and the `launch-editor` are run in different remote, so the `code` (vscode cli) will not effect the local vscode client.
2. even you run `run dev` in the so call `vscode integrated terminal`, the subprocess spawn by `launch-editor` still can not get the `code` in env (which should located in like ~/.vscode-server/cli/servers/xxx/server/bin/remote-cli/code) i think.
   
## How
1. `call-me-back` start a http server ready to execute all command from a client which assume to be our remote coding server, then the remote can call the host to open the file in vscode by calling `code`.
2. both `server.ts` and `client.ts` are communicate by a ssh tunnel and identify by configured `sshHost` in ssh config file.

## About WSL
the wsl environment is a little different, when everything is default, the [`/etc/wsl.conf`](https://learn.microsoft.com/en-us/windows/wsl/wsl-config#wslconf) should has config like (it should be default even th conf file not exist): 
```
[interop]
enabled = true
appendWindowsPath = true
```
which mean we can interact with windows environment, so the `code` command should work in wsl environment, it will launch vscode in windows i think (as long as vscode cli install in windows). so there should not be a problem with where the `code` should run.


## Related
* [Remote support · Issue #72 · yyx990803/launch-editor ](https://github.com/yyx990803/launch-editor/issues/72)
* [WSL Support · Issue #16 · yyx990803/launch-editor](https://github.com/yyx990803/launch-editor/issues/16#issuecomment-1435775182)
* [Support for docker containers · Issue #64 · webfansplz/vite-plugin-vue-inspector](https://github.com/webfansplz/vite-plugin-vue-inspector/issues/64)
* [Windows vscode remote usage · Issue #52 · webfansplz/vite-plugin-vue-inspector](https://github.com/webfansplz/vite-plugin-vue-inspector/issues/52)


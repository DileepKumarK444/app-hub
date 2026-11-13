# App Hub

A personal dashboard that lists all my local apps as tiles. From each tile I can see how the app runs, start and stop it on a chosen port, read its logs, and open it in the browser.

## Run

```bash
npm install
npm run dev      # http://127.0.0.1:4747
```

The dashboard only listens on `127.0.0.1` and rejects requests from other hosts or other websites, because it can start processes.

## How it works

- **Tiles**: one per app in `data/projects.json` (created from `data/projects.seed.json` on first run, then yours to change).
- **Start / Stop**: runs the app's command in its folder in its own process group, so Stop ends the whole tree. Output goes to `data/logs/<id>.log`. Apps keep running if the dashboard restarts; it finds them again through `data/runtime.json`.
- **Ports**: each app has a port. `{port}` in its run command is replaced, and the app also gets `PORT`. The dashboard refuses to start an app whose port is busy and refuses two enabled apps on the same port. If something already listens on an app's port, the tile shows "In use" with an Open button, but Stop is not offered because the dashboard did not start it.
- **Disable**: stops the app and moves it to the Disabled list. Enable brings it back.
- **Remove**: deletes only the tile, never the project folder.
- **Add app**: enter a folder (or pick one found next to your other apps). It reads `package.json` and the README to suggest the name, stack, command and a free port.

## Run command examples

| App type | Command |
|---|---|
| Next.js | `npx next dev -p {port}` |
| Vite | `npm run dev -- --port {port}` |
| Node / Express | `PORT={port} npm start` |
| Django | `.venv/bin/python manage.py runserver {port}` |

## Files

`src/lib/procs.ts` process manager · `src/lib/store.ts` config file · `src/lib/detect.ts` folder detection · `src/middleware.ts` local-only guard · `src/components/` UI.

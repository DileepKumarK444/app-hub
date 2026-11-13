import { DASHBOARD_PORT } from './paths';
import { HttpError } from './procs';
import { readAll } from './store';

/** Throws when the port is out of range or already claimed by another enabled app. */
export function validatePort(port: unknown, selfId: string | null) {
  if (port === null || port === undefined || port === '') return;
  if (typeof port !== 'number' || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new HttpError(400, 'Port must be a whole number between 1024 and 65535.');
  }
  if (port === DASHBOARD_PORT) throw new HttpError(409, `Port ${port} is used by this dashboard.`);
  const clash = readAll().find((p) => p.id !== selfId && p.enabled && p.port === port);
  if (clash) throw new HttpError(409, `Port ${port} is already assigned to ${clash.name}.`);
}

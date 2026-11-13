'use client';

import { useSyncExternalStore } from 'react';

export type Connection = 'cellular' | 'wifi' | 'unknown';

type NetInfo = EventTarget & { type?: string };

const netInfo = (): NetInfo | undefined =>
  typeof navigator === 'undefined' ? undefined : (navigator as Navigator & { connection?: NetInfo }).connection;

function subscribeConnection(onChange: () => void) {
  const c = netInfo();
  c?.addEventListener?.('change', onChange);
  return () => c?.removeEventListener?.('change', onChange);
}

function connectionSnapshot(): Connection {
  const t = netInfo()?.type;
  return t === 'cellular' ? 'cellular' : t === 'wifi' ? 'wifi' : 'unknown';
}

/** Live connection type where the browser exposes it (Chrome on Android); 'unknown' elsewhere. */
export function useConnection(): Connection {
  return useSyncExternalStore(subscribeConnection, connectionSnapshot, () => 'unknown');
}

function subscribeSeconds(onTick: () => void) {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
}
const noSubscription = () => () => {};
const currentSecond = () => Math.floor(Date.now() / 1000);

/** The current time in whole seconds, ticking only while `active`. */
export function useSeconds(active: boolean): number {
  return useSyncExternalStore(active ? subscribeSeconds : noSubscription, currentSecond, () => 0);
}

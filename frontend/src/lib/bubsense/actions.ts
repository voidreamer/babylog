/* eslint-disable @typescript-eslint/no-explicit-any */
import { api } from '../../api/client';

/**
 * Execute a parsed Bubsense action against the REST API.
 *
 * Retroactive logging ("120ml 20 min ago") arrives as a server-resolved
 * `time` in params — the server owns "now", coerces/clamps the LLM's
 * minutes_ago, and never emits it for sleep tools. The minutes_ago handling
 * below is a defensive fallback for responses from older backends only.
 */
export async function executeBubsenseAction(
  babyId: number,
  action: string,
  params: Record<string, any>,
): Promise<void> {
  const { minutes_ago, time: resolvedTime, ...rest } = params;
  const legacyMinutes = Math.max(0, Number(minutes_ago) || 0);
  const time =
    typeof resolvedTime === 'string' && resolvedTime
      ? resolvedTime
      : new Date(Date.now() - legacyMinutes * 60_000).toISOString();

  switch (action) {
    case 'createFeeding':
      await api.createFeeding({ baby_id: babyId, time, ...rest });
      break;
    case 'createDiaper':
      await api.createDiaper({ baby_id: babyId, time, ...rest });
      break;
    case 'startSleep':
      await api.createSleep({ baby_id: babyId, start_time: time, ...rest });
      break;
    case 'endSleep': {
      const active = await api.getCurrentSleep(babyId);
      if (active?.id) {
        await api.endSleep(active.id);
      }
      break;
    }
    case 'createPumping':
      await api.createPumping({ baby_id: babyId, time, ...rest });
      break;
    case 'createTummyTime':
      await api.createTummyTime({ baby_id: babyId, start_time: time, ...rest });
      break;
    case 'createBath':
      await api.createBath({ baby_id: babyId, time, ...rest });
      break;
    case 'createSupplement':
      await api.createSupplement({ baby_id: babyId, time, ...rest });
      break;
    case 'createSolid':
      await api.createSolid({ baby_id: babyId, time, ...rest });
      break;
    case 'createPotty':
      await api.createPottyLog({ baby_id: babyId, time, ...rest });
      break;
    default:
      throw new Error(`Unknown Bubsense action: ${action}`);
  }
}

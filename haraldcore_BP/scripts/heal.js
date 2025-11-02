import { world, system } from "@minecraft/server";

export function registerDailyHeal() {
  const playerData = new Map();
  const TICKS_PER_DAY = 24000;

  world.afterEvents.playerSpawn.subscribe(event => {
    playerData.set(event.player.name, {
      lastHealDay: Math.floor(system.currentTick / TICKS_PER_DAY)
    });
  });

  function healPlayerBy(player, hp) {
    try {
      const health = player.getComponent("minecraft:health");
      const cur = health.currentValue ?? health.current ?? 0;
      const max = health.effectiveMax ?? health.maxValue ?? 20;
      const next = Math.min(cur + hp, max);
      if (health.setCurrentValue) health.setCurrentValue(next);
      else if (health.current !== undefined) health.current = next;
    } catch {
      player.runCommand(`effect @s regeneration 1 1 true`);
    }
  }

  system.runInterval(() => {
    const totalTicks = system.currentTick;
    const currentDay = Math.floor(totalTicks / TICKS_PER_DAY);

    for (const player of world.getAllPlayers()) {
      const dim = player.dimension;
      const state = playerData.get(player.name) ?? { lastHealDay: currentDay };

      if (state.lastHealDay !== currentDay) {
        state.lastHealDay = currentDay;
        healPlayerBy(player, 2);
        player.sendMessage("§aNew day, New luck.");
      dim.runCommand(`playsound note.pling @a`);
      }

      playerData.set(player.name, state);
    }
  }, 100);
}

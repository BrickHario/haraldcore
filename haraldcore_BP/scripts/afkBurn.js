import { world, system } from "@minecraft/server";

export function registerAfkBurn() {
  const playerData = new Map();
  const maxIdleTime = 30;

  world.afterEvents.playerSpawn.subscribe(event => {
    playerData.set(event.player.name, {
      lastPos: event.player.location,
      idleTicks: 0,
      justSpawned: true
    });
  });

  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const state = playerData.get(player.name) ?? {
        lastPos: player.location,
        idleTicks: 0,
        justSpawned: true
      };

      if (state.justSpawned) {
        state.lastPos = player.location;
        state.idleTicks = 0;
        state.justSpawned = false;
      } else if (
        ["x", "y", "z"].some(axis =>
          Math.floor(state.lastPos[axis]) !== Math.floor(player.location[axis])
        )
      ) {
        state.lastPos = player.location;
        state.idleTicks = 0;
      } else {
        state.idleTicks++;
      }

      const progress = Math.min(state.idleTicks, maxIdleTime);
      const bar = "§c" + "█".repeat(progress) + "§7" + "█".repeat(maxIdleTime - progress);
      player.onScreenDisplay.setActionBar(`Move or Burn ${bar} (${progress}/${maxIdleTime})`);

      if (state.idleTicks >= maxIdleTime) player.setOnFire(1, true);

      playerData.set(player.name, state);
    }
  }, 20);
}

import { world, system } from "@minecraft/server";

export function registerAfkBurn() {
  const playerData = new Map();

  const maxIdleTime = 30;

  world.afterEvents.playerSpawn.subscribe(event => {
    playerData.set(event.player.name, {
      lastPos: event.player.location,
      idleTicks: 0,
      justSpawned: true,
      afkPunishment: false,
    });
  });

  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const state =
        playerData.get(player.name) ?? {
          lastPos: player.location,
          idleTicks: 0,
          justSpawned: true,
          afkPunishment: false,
        };

      if (state.justSpawned) {
        state.lastPos = player.location;
        state.idleTicks = 0;
        state.justSpawned = false;
        state.afkPunishment = false;
      } else {
        const moved =
          ["x", "y", "z"].some(axis =>
            Math.floor(state.lastPos[axis]) !==
            Math.floor(player.location[axis])
          );

        if (moved) {
          state.lastPos = player.location;
          state.idleTicks = 0;
          state.afkPunishment = false;
        } else {
          state.idleTicks++;
        }
      }

      if (state.idleTicks >= maxIdleTime) {
        state.afkPunishment = true;
      }

      const progress =
        Math.min(
          state.idleTicks,
          maxIdleTime
        );

      const bar =
        "§c" +
        "█".repeat(progress) +
        "§7" +
        "█".repeat(
          maxIdleTime - progress
        );

      player.onScreenDisplay.setActionBar(
        `Move or Die ${bar} (${progress}/${maxIdleTime})`
      );

      playerData.set(
        player.name,
        state
      );
    }
  }, 20);

  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const state =
        playerData.get(player.name);

      if (!state) continue;
      if (!state.afkPunishment) continue;

      try {
        player.addEffect(
          "fatal_poison",
          60,
          {
            amplifier: 1,
            showParticles: true,
          }
        );

        player.applyDamage(1);

      } catch (_) {}
    }
  }, 20);
}
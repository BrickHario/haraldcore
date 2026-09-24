import {
  world,
  system,
} from "@minecraft/server";


const WON_KEY =
  "haraldcore:challengeWon";


export function registerAfkBurn() {

  const playerData =
    new Map();

  const maxIdleTime = 30;

  function isChallengeWon() {
    return (
      world.getDynamicProperty(
        WON_KEY
      ) === true
    );
  }

  world.afterEvents.playerSpawn.subscribe(
    event => {

      const player =
        event.player;

      playerData.set(
        player.name,
        {
          lastPos: {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
          },

          idleTicks: 0,

          justSpawned: true,

          afkPunishment: false,
        }
      );

    }
  );

  world.afterEvents.playerLeave.subscribe(
    event => {

      playerData.delete(
        event.playerName
      );

    }
  );

  system.runInterval(() => {

    if (isChallengeWon()) {

      for (
        const player
        of world.getAllPlayers()
      ) {

        try {

          player.onScreenDisplay
            .setActionBar("");

        } catch (_) {}

        try {

          player.removeEffect(
            "fatal_poison"
          );

        } catch (_) {}

        const state =
          playerData.get(
            player.name
          );

        if (state) {

          state.idleTicks = 0;

          state.afkPunishment =
            false;

          state.lastPos = {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
          };

          playerData.set(
            player.name,
            state
          );
        }
      }

      return;
    }

    for (
      const player
      of world.getAllPlayers()
    ) {

      const state =
        playerData.get(
          player.name
        ) ?? {
          lastPos: {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
          },

          idleTicks: 0,

          justSpawned: true,

          afkPunishment: false,
        };

      if (state.justSpawned) {

        state.lastPos = {
          x: player.location.x,
          y: player.location.y,
          z: player.location.z,
        };

        state.idleTicks = 0;

        state.justSpawned =
          false;

        state.afkPunishment =
          false;

      } else {

        const moved =
          ["x", "y", "z"].some(
            axis =>
              Math.floor(
                state.lastPos[
                  axis
                ]
              ) !==
              Math.floor(
                player.location[
                  axis
                ]
              )
          );

        if (moved) {

          state.lastPos = {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
          };

          state.idleTicks = 0;

          state.afkPunishment =
            false;

        } else {

          state.idleTicks++;

        }
      }

      if (
        state.idleTicks >=
        maxIdleTime
      ) {

        state.afkPunishment =
          true;

      }

      const progress =
        Math.min(
          state.idleTicks,
          maxIdleTime
        );

      const bar =
        "§c" +
        "█".repeat(
          progress
        ) +
        "§7" +
        "█".repeat(
          maxIdleTime -
          progress
        );


      try {

        player.onScreenDisplay
          .setActionBar(
            `Move or Die ${bar} (${progress}/${maxIdleTime})`
          );

      } catch (_) {}

      playerData.set(
        player.name,
        state
      );
    }

  }, 20);

  system.runInterval(() => {

    if (isChallengeWon()) {
      return;
    }


    for (
      const player
      of world.getAllPlayers()
    ) {

      const state =
        playerData.get(
          player.name
        );

      if (!state) {
        continue;
      }

      if (
        !state.afkPunishment
      ) {
        continue;
      }


      try {

        player.addEffect(
          "fatal_poison",
          60,
          {
            amplifier: 1,
            showParticles: true,
          }
        );

        player.applyDamage(
          1
        );

      } catch (_) {}
    }

  }, 20);
}
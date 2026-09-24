import {
  world,
  system,
} from "@minecraft/server";


const WON_KEY =
  "haraldcore:challengeWon";


function isChallengeWon() {
  return (
    world.getDynamicProperty(
      WON_KEY
    ) === true
  );
}


function healPlayer(player) {
  if (!isChallengeWon()) {
    return;
  }

  try {
    player.removeEffect(
      "fatal_poison"
    );
  } catch (_) {}

  try {
    player.removeEffect(
      "poison"
    );
  } catch (_) {}

  try {
    player.removeEffect(
      "wither"
    );
  } catch (_) {}

  try {

    const health =
      player.getComponent(
        "minecraft:health"
      );

    if (health) {
      health.resetToMaxValue();
    }

  } catch (_) {}
}


function giveProtection(player) {
  if (!isChallengeWon()) {
    return;
  }

  try {
    player.addEffect(
      "resistance",
      40,
      {
        amplifier: 255,
        showParticles: false,
      }
    );
  } catch (_) {}

  try {
    player.addEffect(
      "fire_resistance",
      40,
      {
        amplifier: 0,
        showParticles: false,
      }
    );
  } catch (_) {}

  try {
    player.addEffect(
      "water_breathing",
      40,
      {
        amplifier: 0,
        showParticles: false,
      }
    );
  } catch (_) {}

  try {
    player.addEffect(
      "saturation",
      40,
      {
        amplifier: 255,
        showParticles: false,
      }
    );
  } catch (_) {}
}


export function registerImmortality() {

  system.runInterval(() => {

    if (!isChallengeWon()) {
      return;
    }

    for (
      const player
      of world.getAllPlayers()
    ) {

      healPlayer(player);

    }

  }, 1);

  system.runInterval(() => {

    if (!isChallengeWon()) {
      return;
    }

    for (
      const player
      of world.getAllPlayers()
    ) {

      giveProtection(player);

    }

  }, 20);

  world.afterEvents.playerSpawn.subscribe(
    event => {

      if (!isChallengeWon()) {
        return;
      }

      system.run(() => {

        healPlayer(
          event.player
        );

        giveProtection(
          event.player
        );

      });

    }
  );
}
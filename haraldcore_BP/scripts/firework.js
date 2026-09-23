import { world, system } from "@minecraft/server";

export function registerFirework() {
  const WON_KEY = "haraldcore:challengeWon";
  const BURN_KEY = "haraldcore:burnStarted";
  const FIREWORK_KEY = "haraldcore:fireworkDone";

  const ALL_TASKS = [
    "Find wood",
    "Craft a boat",
    "Iron bars",
    "Kill a zombie",
    "Kill a spider",
    "Get a sword",
    "Kill a cow",
    "Get Emeralds",
    "Get a Golden Apple",
    "Get to nether",
  ];

  function allTasksCompleted() {
    const todo = world.scoreboard.getObjective("todo");

    if (!todo) return false;

    for (const task of ALL_TASKS) {
      try {
        if (!todo.hasParticipant(`§a✔ ${task}`)) {
          return false;
        }
      } catch (_) {
        return false;
      }
    }

    return true;
  }

  function spawnFireworks(player) {
    const dim = player.dimension;
    const { x, y, z } = player.location;

    for (let i = 0; i < 10; i++) {
      system.runTimeout(() => {
        if (!player.isValid) return;

        const offsetX = (Math.random() - 0.5) * 6;
        const offsetZ = (Math.random() - 0.5) * 6;
        const height = 1 + Math.floor(Math.random() * 3);

        try {
          dim.runCommand(
            `summon minecraft:fireworks_rocket ${x + offsetX} ${y + height} ${z + offsetZ}`
          );
        } catch (_) {}
      }, i * 10);
    }
  }

  system.runInterval(() => {
    const burnStarted =
      world.getDynamicProperty(BURN_KEY) === true;

    if (burnStarted) {
      return;
    }

    const fireworkDone =
      world.getDynamicProperty(FIREWORK_KEY) === true;

    if (fireworkDone) {
      return;
    }

    if (!allTasksCompleted()) {
      return;
    }

    world.setDynamicProperty(WON_KEY, true);
    world.setDynamicProperty(FIREWORK_KEY, true);

    world.sendMessage(
      "§aYou all completed HaraldCore!"
    );

    for (const player of world.getPlayers()) {
      player.sendMessage(
        "§bWell done! Fireworks for you!"
      );

      player.playSound("note.flute");

      spawnFireworks(player);
    }

  }, 200);
}
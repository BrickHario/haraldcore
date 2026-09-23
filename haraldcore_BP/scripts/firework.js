import { world, system } from "@minecraft/server";

export function registerFirework() {
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

  const completedPlayers = new Set();

  system.runInterval(() => {
    const dim = world.getDimension("overworld");

    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (completedPlayers.has(pid)) continue;

      let allDone = true;

      for (const task of ALL_TASKS) {
        try {
          const result = dim.runCommand(
            `scoreboard players test "${task}" todo 1 *`
          );

          if (result.successCount > 0) {
            allDone = false;
            break;
          }
        } catch {
          allDone = false;
          break;
        }
      }

      if (allDone) {
        completedPlayers.add(pid);

        system.run(() => {
          player.sendMessage("§bWell done! Fireworks for you!");
          world.sendMessage("§aYou all completed HaraldCore!");

          player.playSound("note.flute");

          const { x, y, z } = player.location;

          for (let i = 0; i < 10; i++) {
            system.runTimeout(() => {
              const offsetX = (Math.random() - 0.5) * 6;
              const offsetZ = (Math.random() - 0.5) * 6;
              const height = 1 + Math.floor(Math.random() * 3);

              dim.runCommand(
                `summon minecraft:fireworks_rocket ${x + offsetX} ${y + height} ${z + offsetZ}`
              );
            }, i * 10);
          }
        });
      }
    }
  }, 200);
}
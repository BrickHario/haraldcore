import { world, system } from "@minecraft/server";

export function registerGoNether() {
  const TASK_NETHER = "Get to nether";

  const netherDoneFor = new Set();

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (netherDoneFor.has(pid)) continue;

      if (player.dimension.id === "minecraft:nether") {
        netherDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_NETHER}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_NETHER}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_NETHER}! Looks scary..`);
          player.playSound("random.orb");
        });
      }
    }
  }, 80);
}

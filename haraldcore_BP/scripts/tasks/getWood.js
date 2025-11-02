import { world, system } from "@minecraft/server";

export function registerFindWood() {
  const TASK_WOOD = "Find wood";

  const WOOD_TYPES = [
    "minecraft:oak_planks",
    "minecraft:spruce_planks",
    "minecraft:birch_planks",
    "minecraft:jungle_planks",
    "minecraft:acacia_planks",
    "minecraft:dark_oak_planks",
  ];

  const woodDoneFor = new Set();

  function playerHasWood(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && WOOD_TYPES.includes(item.typeId)) return true;
    }
    return false;
  }

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (woodDoneFor.has(pid)) continue;
      if (playerHasWood(player)) {
        woodDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_WOOD}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_WOOD}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_WOOD}! Took a lot for the first step..`);
          dim.runCommand(`playsound random.orb @a`);
        });
      }
    }
  }, 80);
}

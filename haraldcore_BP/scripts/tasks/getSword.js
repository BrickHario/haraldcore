import { world, system } from "@minecraft/server";

export function registerGetSword() {
  const TASK_SWORD = "Get a sword";

  const SWORD_TYPES = [
  "minecraft:wooden_sword",
  "minecraft:stone_sword",
  "minecraft:iron_sword",
  "minecraft:golden_sword",
  "minecraft:diamond_sword",
  "minecraft:netherite_sword",
  ];

  const swordDoneFor = new Set();

  function playerHasSword(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && SWORD_TYPES.includes(item.typeId)) return true;
    }
    return false;
  }

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (swordDoneFor.has(pid)) continue;
      if (playerHasSword(player)) {
        swordDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_SWORD}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_SWORD}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_SWORD}! Kill them all!`);
          player.playSound("random.orb");
        });
      }
    }
  }, 80);
}

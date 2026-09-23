import { world, system } from "@minecraft/server";

export function registerGetEmeralds() {
  const TASK_EMERALDS = "Get Emeralds";

  const ITEM_EMERALDS = "minecraft:emerald";

  const emeraldsDoneFor = new Set();

  function playerHasEmeralds(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === ITEM_EMERALDS) return true;
    }
    return false;
  }

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (emeraldsDoneFor.has(pid)) continue;
      if (playerHasEmeralds(player)) {
        emeraldsDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_EMERALDS}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_EMERALDS}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_EMERALDS}!`);
          player.playSound("random.orb");
        });
      }
    }
  }, 80);
}

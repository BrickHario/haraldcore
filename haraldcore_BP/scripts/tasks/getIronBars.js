import { world, system } from "@minecraft/server";

export function registerGetIronBars() {
  const TASK_IRON_BARS = "Iron bars";

  const ITEM_IRON_BARS = "minecraft:iron_bars";

  const ironBarsDoneFor = new Set();

  function playerHasIronBars(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === ITEM_IRON_BARS) return true;
    }
    return false;
  }

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (ironBarsDoneFor.has(pid)) continue;
      if (playerHasIronBars(player)) {
        ironBarsDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_IRON_BARS}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_IRON_BARS}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_IRON_BARS}!`);
          player.playSound("random.orb");
        });
      }
    }
  }, 80);
}

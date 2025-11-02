import { world, system } from "@minecraft/server";

export function registerGetBoat() {
  const TASK_BOAT = "Craft a boat";

  const BOAT_TYPES = [
    "minecraft:oak_boat",
    "minecraft:spruce_boat",
    "minecraft:birch_boat",
    "minecraft:jungle_boat",
    "minecraft:acacia_boat",
    "minecraft:dark_oak_boat",
  ];

  const boatDoneFor = new Set();

  function playerHasBoat(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;
    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && BOAT_TYPES.includes(item.typeId)) return true;
    }
    return false;
  }

  system.runInterval(() => {
    const dim = world.getDimension("overworld");
    for (const player of world.getPlayers()) {
      const pid = player.id ?? player.name;
      if (boatDoneFor.has(pid)) continue;
      if (playerHasBoat(player)) {
        boatDoneFor.add(pid);
        system.run(() => {
          dim.runCommand(`scoreboard players reset "${TASK_BOAT}" todo`);
          dim.runCommand(`scoreboard players set "§a✔ ${TASK_BOAT}" todo 0`);
          player.sendMessage(`§aTask done: ${TASK_BOAT}!`);
          dim.runCommand(`playsound random.orb @a`);
        });
      }
    }
  }, 80);
}

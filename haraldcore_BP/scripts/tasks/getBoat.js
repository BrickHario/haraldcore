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

  let completionQueued = false;

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

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_BOAT}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasBoat(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_BOAT}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_BOAT}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_BOAT}!`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

import { world, system } from "@minecraft/server";

export function registerFindWood() {
  const TASK_WOOD = "Find wood";

const CHEST_BOAT_TYPES = [
  "minecraft:oak_chest_boat",
  "minecraft:spruce_chest_boat",
  "minecraft:birch_chest_boat",
  "minecraft:jungle_chest_boat",
  "minecraft:acacia_chest_boat",
  "minecraft:dark_oak_chest_boat",
  "minecraft:mangrove_chest_boat",
  "minecraft:cherry_chest_boat",
  "minecraft:pale_oak_chest_boat",
  "minecraft:bamboo_chest_raft",
];

  let completionQueued = false;

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

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_WOOD}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasWood(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_WOOD}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_WOOD}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_WOOD}! Took a lot for the first step..`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

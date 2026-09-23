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

import { world, system } from "@minecraft/server";

export function registerGetEmeralds() {
  const TASK_EMERALDS = "Get Emeralds";
  const ITEM_EMERALDS = "minecraft:emerald";

  let completionQueued = false;

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

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_EMERALDS}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasEmeralds(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_EMERALDS}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_EMERALDS}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_EMERALDS}!`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

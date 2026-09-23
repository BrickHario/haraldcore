import { world, system } from "@minecraft/server";

export function registerGetIronBars() {
  const TASK_IRON_BARS = "Iron bars";
  const ITEM_IRON_BARS = "minecraft:iron_bars";

  let completionQueued = false;

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

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_IRON_BARS}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasIronBars(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_IRON_BARS}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_IRON_BARS}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_IRON_BARS}!`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

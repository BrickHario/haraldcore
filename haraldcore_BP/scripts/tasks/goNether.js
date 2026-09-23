import { world, system } from "@minecraft/server";

export function registerGoNether() {
  const TASK_NETHER = "Get to nether";

  let completionQueued = false;

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_NETHER}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (player.dimension.id !== "minecraft:nether") continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_NETHER}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_NETHER}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_NETHER}! Looks scary..`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

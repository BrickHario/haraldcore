import { world, system } from "@minecraft/server";

export function registerKillZombie() {
  const TASK_ZOMBIE = "Kill a zombie";

  let completionQueued = false;

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_ZOMBIE}`);
    } catch (_) {
      return false;
    }
  }

  world.afterEvents.entityDie.subscribe(event => {
    if (event.deadEntity?.typeId !== "minecraft:zombie") return;

    const killer = event.damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player") return;

    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    completionQueued = true;

    system.run(() => {
      const dim = world.getDimension("overworld");

      if (taskAlreadyDone()) {
        completionQueued = false;
        return;
      }

      dim.runCommand(`scoreboard players reset "${TASK_ZOMBIE}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_ZOMBIE}" todo 0`);

      killer.sendMessage(`§aTask done: ${TASK_ZOMBIE}! Zombie VS Plants?`);
      killer.playSound("random.orb");

      completionQueued = false;
    });
  });
}

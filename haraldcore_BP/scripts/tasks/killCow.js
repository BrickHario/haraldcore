
import { world, system } from "@minecraft/server";

export function registerKillCow() {
  const TASK_COW = "Kill a cow";

  const COW_TYPES = [
    "minecraft:cow",
    "minecraft:mooshroom",
  ];

  let completionQueued = false;

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_COW}`);
    } catch (_) {
      return false;
    }
  }

  world.afterEvents.entityDie.subscribe(event => {
    const deadType = event.deadEntity?.typeId;
    if (!deadType || !COW_TYPES.includes(deadType)) return;

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

      dim.runCommand(`scoreboard players reset "${TASK_COW}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_COW}" todo 0`);

      const personalTasks = killer.getDynamicProperty("haraldcore:personalTasks") ?? 0;
      killer.setDynamicProperty("haraldcore:personalTasks", personalTasks + 1);

      for (const onlinePlayer of world.getPlayers()) {
        if (onlinePlayer.id === killer.id) {
          onlinePlayer.sendMessage(`§aTask done by you: ${TASK_COW}! Who needs milk?`);
        } else {
          onlinePlayer.sendMessage(`§aTask done by ${killer.name}: ${TASK_COW}! Who needs milk?`);
        }

        onlinePlayer.playSound("random.orb");
      }

      completionQueued = false;
    });
  });
}

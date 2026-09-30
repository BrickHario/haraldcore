import { world, system } from "@minecraft/server";

export function registerKillZombie() {
  const TASK_ZOMBIE = "Kill a zombie";

  const ZOMBIE_TYPES = [
    "minecraft:zombie",
    "minecraft:husk",
    "minecraft:drowned",
    "minecraft:zombie_villager",
    "minecraft:zombie_villager_v2",
    "minecraft:zombie_pigman",
    "minecraft:zombie_horse",
    "minecraft:zombie_nautilus",
  ];

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
    const deadType = event.deadEntity?.typeId;
    if (!deadType || !ZOMBIE_TYPES.includes(deadType)) return;

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

      world.sendMessage(`§aTask done: ${TASK_ZOMBIE}! Zombie VS Plants?`);

      for (const onlinePlayer of world.getPlayers()) {
        onlinePlayer.playSound("random.orb");
      }

      completionQueued = false;
    });
  });
}
import { world, system } from "@minecraft/server";

export function registerKillZombie() {
  const TASK_ZOMBIE = "Kill a zombie";
  world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity?.typeId !== "minecraft:zombie") return;
    const killer = event.damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player") return;

    const dim = world.getDimension("overworld");
    system.run(() => {
      dim.runCommand(`scoreboard players reset "${TASK_ZOMBIE}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_ZOMBIE}" todo 0`);
      killer.sendMessage(`§aTask done: ${TASK_ZOMBIE}! Zombie VS Plants?`);
      player.playSound("random.orb");
    });
  });
};
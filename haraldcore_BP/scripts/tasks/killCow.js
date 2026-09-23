import { world, system } from "@minecraft/server";

export function registerKillCow() {
  const TASK_COW = "Kill a cow";
  world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity?.typeId !== "minecraft:cow") return;
    const killer = event.damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player") return;

    const dim = world.getDimension("overworld");
    system.run(() => {
      dim.runCommand(`scoreboard players reset "${TASK_COW}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_COW}" todo 0`);
      killer.sendMessage(`§aTask done: ${TASK_COW}! Who needs milk?`);
      player.playSound("random.orb");
    });
  });
};
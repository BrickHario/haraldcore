import { world, system } from "@minecraft/server";

export function registerKillSpieder() {
  const TASK_SPIDER = "Kill a spider";
  world.afterEvents.entityDie.subscribe((event) => {
    if (event.deadEntity?.typeId !== "minecraft:spider") return;
    const killer = event.damageSource?.damagingEntity;
    if (!killer || killer.typeId !== "minecraft:player") return;

    const dim = world.getDimension("overworld");
    system.run(() => {
      dim.runCommand(`scoreboard players reset "${TASK_SPIDER}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_SPIDER}" todo 0`);
      killer.sendMessage(`§aTask done: ${TASK_SPIDER}! I hate spiders!`);
      player.playSound("random.orb");
    });
  });
};
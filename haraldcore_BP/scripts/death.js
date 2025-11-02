import { world, system } from "@minecraft/server";
import dayCounter from "../scripts/util/dayCounter";

export function registerDeath() {
  const startTick = system.currentTick;
  let notifiedHalf = false;
  let notifiedNine = false;
  let burnStarted = false;

  world.afterEvents.entityDie.subscribe(event => {
    const dead = event.deadEntity;
    if (!dead || dead.typeId !== "minecraft:player") return;

    const playedTicks = system.currentTick - startTick;
    const playedDays = Math.floor(playedTicks / 24000);

    system.run(() => {
      dead.runCommand(`title @s title §cYou survived ${dayCounter(playedDays)} day(s)!`);
      world.sendMessage(`§e${dead.name} survived ${dayCounter(playedDays)} day(s)!`);
    });
  });

  system.runInterval(() => {
    const playedTicks = system.currentTick - startTick;
    const playedDays = Math.floor(playedTicks / 24000);
    const dim = world.getDimension

    if (playedDays >= 4 && !notifiedHalf) {
      notifiedHalf = true;
      world.sendMessage("§eHalftime. HURRY UP!");
      dim.runCommand(`playsound note.bass @a`);
    }

    if (playedDays >= 7 && !notifiedNine) {
      notifiedNine = true;
      world.sendMessage("§cFinal day. Prepare to DIE!");
    }

    if (playedDays >= 8 && !burnStarted) {
      burnStarted = true;
      world.sendMessage("§4Time is up. Now BURN!");

      system.runInterval(() => {
        for (const player of world.getPlayers()) {
          player.setOnFire(10, true);
        }
      }, 20);
    }
  }, 200);
}

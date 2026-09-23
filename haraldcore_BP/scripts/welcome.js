import { world, system } from "@minecraft/server";

export const registerWelcome = () => {
world.afterEvents.playerSpawn.subscribe(event => {
  const player = event.player;

  if (event.initialSpawn) {
    system.runTimeout(() => {
      player.sendMessage("§aWelcome to HaraldCore!");
      player.runCommand(`playsound note.pling @a`);

      system.runTimeout(() => {
        player.sendMessage("§aHow HARALD likes to play Minecraft..");
      }, 60);

      system.runTimeout(() => {
        player.sendMessage("§aSurvive with the HARDCORE RULES!");
      }, 120);

      system.runTimeout(() => {
        player.sendMessage("§aAnd finish all TASKS from the Task Book!");
      }, 180);

      system.runTimeout(() => {
        player.sendMessage("§a8 DAYS. Your time starts now.");
      }, 240);

      system.runTimeout(() => {
        player.sendMessage("§aGOOD LUCK..");
      }, 300);

    }, 260);
  }
});
};
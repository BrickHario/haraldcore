import { world, system } from "@minecraft/server";

const WELCOME_KEY = "haraldcore:welcomed";

export const registerWelcome = () => {
  world.afterEvents.playerSpawn.subscribe(event => {
    const player = event.player;

    if (!event.initialSpawn) return;

    const alreadyWelcomed =
      player.getDynamicProperty(WELCOME_KEY) === true;

    if (alreadyWelcomed) return;

    system.runTimeout(() => {
      if (!player.isValid) return;

      player.sendMessage("§aWelcome to HaraldCore!");
      player.playSound("note.pling");

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§aHow HARALD likes to play Minecraft..");
        }
      }, 60);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§aSurvive with the HARDCORE RULES!");
        }
      }, 120);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§aAnd finish all TASKS from the Task Book!");
        }
      }, 180);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§a8 DAYS. Your time starts now.");
        }
      }, 240);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§aGOOD LUCK..");

          // Erst NACH erfolgreicher Welcome-Sequenz speichern.
          player.setDynamicProperty(WELCOME_KEY, true);
        }
      }, 300);

    }, 260);
  });
};
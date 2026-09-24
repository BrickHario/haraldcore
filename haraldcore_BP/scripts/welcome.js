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

      player.sendMessage("§4You have been cursed by HaraldCore!");
      player.playSound("note.pling");

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§cNo drops. No sleep. No mercy.");
        }
      }, 60);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§cNo regeneration. Keep moving.");
        }
      }, 120);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§6Complete every TASK in the Task Book to survive.");
        }
      }, 180);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§6You have 8 DAYS before the curse kills you.");
        }
      }, 240);

      system.runTimeout(() => {
        if (player.isValid) {
          player.sendMessage("§aEscape HaraldCore... if you can. GOOD LUCK.");

          // Erst NACH erfolgreicher Welcome-Sequenz speichern.
          player.setDynamicProperty(WELCOME_KEY, true);
        }
      }, 300);

    }, 260);
  });
};
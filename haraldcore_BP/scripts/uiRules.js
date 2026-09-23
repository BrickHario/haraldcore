import { world, system } from "@minecraft/server";

export function registerRules() {
  system.runTimeout(() => {
    const dim = world.getDimension("overworld");

    try {
      dim.runCommand("scoreboard objectives add rules dummy Rules");
    } catch (_) {}

    try { dim.runCommand('scoreboard players set "Hardcore Mode" rules 5'); } catch (_) {}
    try { dim.runCommand('scoreboard players set "No regeneration" rules 4'); } catch (_) {}
    try { dim.runCommand('scoreboard players set "No drops" rules 3'); } catch (_) {}
    try { dim.runCommand('scoreboard players set "No sleep" rules 2'); } catch (_) {}
    try { dim.runCommand('scoreboard players set "Move or Die" rules 1'); } catch (_) {}

    try {
      dim.runCommand("scoreboard objectives setdisplay sidebar rules descending");
    } catch (_) {}
  }, 60);
}

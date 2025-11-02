import { world, system } from "@minecraft/server";

export function registerRules() {
  system.runTimeout(() => {
    const dim = world.getDimension("overworld");
    dim.runCommand("scoreboard objectives add rules dummy Rules");
    dim.runCommand("scoreboard objectives setdisplay sidebar rules");
    dim.runCommand('scoreboard players set "Hardcore Mode" rules 5');
    dim.runCommand('scoreboard players set "No regeneration" rules 4');
    dim.runCommand('scoreboard players set "No drops" rules 3');
    dim.runCommand('scoreboard players set "No sleep" rules 2');
    dim.runCommand('scoreboard players set "Move or Burn" rules 1');
  }, 60);
}

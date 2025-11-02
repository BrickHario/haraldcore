import { world, system } from "@minecraft/server";

export function registerUITasks() {
  system.runTimeout(() => {
    const dim = world.getDimension("overworld");

try {
      dim.runCommand("scoreboard objectives add todo dummy To-Do");
    dim.runCommand("scoreboard objectives setdisplay list todo");

    dim.runCommand('scoreboard players set "Find wood" todo 1');
    dim.runCommand('scoreboard players set "Craft a boat" todo 2');
    dim.runCommand('scoreboard players set "Iron bars" todo 3');
    dim.runCommand('scoreboard players set "Kill a zombie" todo 4');
    dim.runCommand('scoreboard players set "Kill a spider" todo 5');
    dim.runCommand('scoreboard players set "Get a sword" todo 6');
    dim.runCommand('scoreboard players set "Kill a cow" todo 7');
    dim.runCommand('scoreboard players set "Get Emeralds" todo 8');
    dim.runCommand('scoreboard players set "Get a Golden Apple" todo 9');
    dim.runCommand('scoreboard players set "Get to nether" todo 10');
} catch (e) {}
  }, 60);
}

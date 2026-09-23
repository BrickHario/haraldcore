import { world, system } from "@minecraft/server";

export function registerHeal() {
  const TASK_HEAL = "Get a Golden Apple";

  const HEAL_ITEMS = [
    "minecraft:golden_apple",
    "minecraft:enchanted_golden_apple",
    "minecraft:honey_bottle",
    "minecraft:potion",
  ];

  let completionQueued = false;

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_HEAL}`);
    } catch (_) {
      return false;
    }
  }

  world.afterEvents.itemUse.subscribe(event => {
    const player = event.source;
    if (!player || player.typeId !== "minecraft:player") return;

    const item = event.itemStack;
    if (!item || !HEAL_ITEMS.includes(item.typeId)) return;

    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    completionQueued = true;

    system.run(() => {
      const dim = world.getDimension("overworld");

      if (taskAlreadyDone()) {
        completionQueued = false;
        return;
      }

      dim.runCommand(`scoreboard players reset "${TASK_HEAL}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_HEAL}" todo 0`);

      player.sendMessage(`§aTask done: ${TASK_HEAL}! Maybe it can heal you?`);
      player.playSound("random.orb");

      completionQueued = false;
    });
  });
}

import { world, system } from "@minecraft/server";

export function registerGetSword() {
  const TASK_SWORD = "Get a sword";

  const SWORD_TYPES = [
    "minecraft:wooden_sword",
    "minecraft:stone_sword",
    "minecraft:iron_sword",
    "minecraft:golden_sword",
    "minecraft:diamond_sword",
    "minecraft:netherite_sword",
  ];

  let completionQueued = false;

  function playerHasSword(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;

    const inv = invComp.container;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && SWORD_TYPES.includes(item.typeId)) return true;
    }

    return false;
  }

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_SWORD}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasSword(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_SWORD}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_SWORD}" todo 0`);

        player.sendMessage(`§aTask done: ${TASK_SWORD}! Kill them all!`);
        player.playSound("random.orb");

        completionQueued = false;
      });

      break;
    }
  }, 80);
}

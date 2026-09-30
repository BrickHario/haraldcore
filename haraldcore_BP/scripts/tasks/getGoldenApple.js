import { world, system } from "@minecraft/server";

export function registerHeal() {
  const TASK_HEAL = "Get a Golden Apple";

  const HEAL_ITEMS = [
    "minecraft:golden_apple",
    "minecraft:enchanted_golden_apple",
  ];

  let completionQueued = false;

  function playerHasGoldenApple(player) {
    const invComp = player.getComponent("minecraft:inventory");
    if (!invComp) return false;

    const inv = invComp.container;
    if (!inv) return false;

    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && HEAL_ITEMS.includes(item.typeId)) return true;
    }

    return false;
  }

  function taskAlreadyDone() {
    const todo = world.scoreboard.getObjective("todo");
    if (!todo) return false;

    try {
      return todo.hasParticipant(`§a✔ ${TASK_HEAL}`);
    } catch (_) {
      return false;
    }
  }

  system.runInterval(() => {
    if (!world.scoreboard.getObjective("todo")) return;
    if (taskAlreadyDone() || completionQueued) return;

    for (const player of world.getPlayers()) {
      if (!playerHasGoldenApple(player)) continue;

      completionQueued = true;

      system.run(() => {
        const dim = world.getDimension("overworld");

        if (taskAlreadyDone()) {
          completionQueued = false;
          return;
        }

        dim.runCommand(`scoreboard players reset "${TASK_HEAL}" todo`);
        dim.runCommand(`scoreboard players set "§a✔ ${TASK_HEAL}" todo 0`);

        const personalTasks = player.getDynamicProperty("haraldcore:personalTasks") ?? 0;
        player.setDynamicProperty("haraldcore:personalTasks", personalTasks + 1);

        for (const onlinePlayer of world.getPlayers()) {
          if (onlinePlayer.id === player.id) {
            onlinePlayer.sendMessage(`§aTask done by you: ${TASK_HEAL}! Maybe it can heal you?`);
          } else {
            onlinePlayer.sendMessage(`§aTask done by ${player.name}: ${TASK_HEAL}! Maybe it can heal you?`);
          }

          onlinePlayer.playSound("random.orb");
        }

        completionQueued = false;
      });

      break;
    }
  }, 80);
}
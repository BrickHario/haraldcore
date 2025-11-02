import { world, system } from "@minecraft/server";

export function registerHeal() {
  const TASK_HEAL = "Get a Golden Apple";

  const healDoneFor = new Set();

  const HEAL_ITEMS = [
    "minecraft:golden_apple",
    "minecraft:enchanted_golden_apple",
    "minecraft:honey_bottle",
    "minecraft:potion"
  ];

  world.afterEvents.itemUse.subscribe(event => {
    const player = event.source;
    if (!player || player.typeId !== "minecraft:player") return;

    const item = event.itemStack;
    if (!item || !HEAL_ITEMS.includes(item.typeId)) return;

    const pid = player.id ?? player.name;
    if (healDoneFor.has(pid)) return;

    healDoneFor.add(pid);

    const dim = world.getDimension("overworld");
    system.run(() => {
      dim.runCommand(`scoreboard players reset "${TASK_HEAL}" todo`);
      dim.runCommand(`scoreboard players set "§a✔ ${TASK_HEAL}" todo 0`);
      player.sendMessage(`§aTask done: ${TASK_HEAL}! Maybe it can heal you?`);
      dim.runCommand(`playsound random.orb @a`);
    });
  });
}

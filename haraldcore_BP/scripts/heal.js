import { world, system } from "@minecraft/server";

export function registerDailyHeal() {
  const TICKS_PER_DAY = 240;

  const TIMER_KEY = "haraldcore:playedTicks";
  const LAST_HEAL_KEY = "haraldcore:lastHealDay";

  function getCurrentChallengeDay() {
    const savedTicks =
      world.getDynamicProperty(TIMER_KEY);

    const totalTicks =
      typeof savedTicks === "number"
        ? savedTicks
        : 0;

    return Math.floor(
      totalTicks / TICKS_PER_DAY
    );
  }

  function healPlayerBy(player, hp) {
    try {
      const health =
        player.getComponent("minecraft:health");

      if (!health) return;

      const cur =
        health.currentValue ??
        health.current ??
        0;

      const max =
        health.effectiveMax ??
        health.maxValue ??
        20;

      const next =
        Math.min(cur + hp, max);

      if (health.setCurrentValue) {
        health.setCurrentValue(next);
      } else if (health.current !== undefined) {
        health.current = next;
      }

    } catch (_) {
      try {
        player.runCommand(
          `effect @s regeneration 1 1 true`
        );
      } catch (_) {}
    }
  }

  world.afterEvents.playerSpawn.subscribe(event => {
    const player = event.player;

    if (!event.initialSpawn) return;

    system.run(() => {
      const lastHealDay =
        player.getDynamicProperty(LAST_HEAL_KEY);

      if (typeof lastHealDay !== "number") {
        player.setDynamicProperty(
          LAST_HEAL_KEY,
          getCurrentChallengeDay()
        );
      }
    });
  });

  system.runInterval(() => {
    const currentDay =
      getCurrentChallengeDay();

    for (const player of world.getAllPlayers()) {
      let lastHealDay =
        player.getDynamicProperty(LAST_HEAL_KEY);

      if (typeof lastHealDay !== "number") {
        lastHealDay = currentDay;

        player.setDynamicProperty(
          LAST_HEAL_KEY,
          currentDay
        );

        continue;
      }

      if (lastHealDay < currentDay) {
        player.setDynamicProperty(
          LAST_HEAL_KEY,
          currentDay
        );

        healPlayerBy(player, 2);

        player.sendMessage(
          "§aNew day, New luck."
        );

        player.playSound("note.pling");
      }
    }
  }, 100);
}
import { world, system } from "@minecraft/server";

export function registerDeath() {
  const TICKS_PER_DAY = 240;

  const TIMER_KEY = "haraldcore:playedTicks";
  const HALF_KEY = "haraldcore:halfNotified";
  const FINAL_KEY = "haraldcore:finalNotified";

  const POISON_KEY = "haraldcore:poisonStarted";

  const LEGACY_BURN_KEY = "haraldcore:burnStarted";

  const WON_KEY = "haraldcore:challengeWon";

  const ALL_TASKS = [
    "Find wood",
    "Craft a boat",
    "Iron bars",
    "Kill a zombie",
    "Kill a spider",
    "Get a sword",
    "Kill a cow",
    "Get Emeralds",
    "Get a Golden Apple",
    "Get to nether",
  ];

  let totalPlayedTicks = 0;
  let lastSystemTick = 0;

  let notifiedHalf = false;
  let notifiedFinal = false;

  let poisonStarted = false;
  let challengeWon = false;

  let initialized = false;
  let poisonLoopStarted = false;

  function getCompletedTaskCount() {
    const todo =
      world.scoreboard.getObjective("todo");

    if (!todo) {
      return 0;
    }

    let completed = 0;

    for (const task of ALL_TASKS) {
      try {
        if (
          todo.hasParticipant(
            `§a✔ ${task}`
          )
        ) {
          completed++;
        }
      } catch (_) {}
    }

    return completed;
  }

  function allTasksCompleted() {
    return (
      getCompletedTaskCount() >=
      ALL_TASKS.length
    );
  }

  function getPlayedTicks() {
    if (!initialized) {
      const saved =
        world.getDynamicProperty(
          TIMER_KEY
        );

      return typeof saved === "number"
        ? saved
        : 0;
    }

    const currentDelta =
      system.currentTick -
      lastSystemTick;

    return (
      totalPlayedTicks +
      Math.max(0, currentDelta)
    );
  }

  function getPlayedDaysPrecise() {
    return (
      Math.round(
        (
          getPlayedTicks() /
          TICKS_PER_DAY
        ) * 100
      ) / 100
    );
  }

  function startPoisonLoop() {
    if (poisonLoopStarted) {
      return;
    }

    poisonLoopStarted = true;

    system.runInterval(() => {
      for (
        const player of
        world.getPlayers()
      ) {
        try {
          player.addEffect(
            "fatal_poison",
            60,
            {
              amplifier: 1,
              showParticles: true,
            }
          );
        } catch (_) {}
      }
    }, 5);
  }

  function checkChallengeTime() {
    const playedDays =
      Math.floor(
        totalPlayedTicks /
        TICKS_PER_DAY
      );

    if (
      playedDays >= 4 &&
      !notifiedHalf
    ) {
      notifiedHalf = true;

      world.setDynamicProperty(
        HALF_KEY,
        true
      );

      world.sendMessage(
        "§eHalftime. HURRY UP!"
      );

      for (
        const player of
        world.getPlayers()
      ) {
        player.playSound(
          "note.bass"
        );
      }
    }

    if (
      playedDays >= 7 &&
      !notifiedFinal
    ) {
      notifiedFinal = true;

      world.setDynamicProperty(
        FINAL_KEY,
        true
      );

      world.sendMessage(
        "§cFinal day. Prepare to DIE!"
      );
    }

    if (
      playedDays >= 8 &&
      !poisonStarted &&
      !challengeWon
    ) {

      if (allTasksCompleted()) {
        challengeWon = true;

        world.setDynamicProperty(
          WON_KEY,
          true
        );

        return;
      }

      poisonStarted = true;

      world.setDynamicProperty(
        POISON_KEY,
        true
      );

      world.setDynamicProperty(
        LEGACY_BURN_KEY,
        true
      );

      world.sendMessage(
        "§4Time is up. Now DIE!"
      );

      startPoisonLoop();
    }
  }

  world.afterEvents.entityDie.subscribe(
    event => {

      const dead =
        event.deadEntity;

      if (
        !dead ||
        dead.typeId !==
          "minecraft:player"
      ) {
        return;
      }

      const playedDays =
        getPlayedDaysPrecise();

      const completedTasks =
        getCompletedTaskCount();

      system.run(() => {

        dead.runCommand(
          `title @s title §c${playedDays} Days`
        );

        dead.runCommand(
          `title @s subtitle §e${completedTasks}/10 Tasks`
        );

        dead.sendMessage(
          `§cYou survived §f${playedDays} §cdays and completed §e${completedTasks}/10 §ctasks.`
        );

        world.sendMessage(
          `§e${dead.name} survived ${playedDays} day(s) with ${completedTasks}/10 tasks completed!`
        );
      });
    }
  );

  system.run(() => {

    const savedTicks =
      world.getDynamicProperty(
        TIMER_KEY
      );

    totalPlayedTicks =
      typeof savedTicks === "number"
        ? savedTicks
        : 0;

    notifiedHalf =
      world.getDynamicProperty(
        HALF_KEY
      ) === true;

    notifiedFinal =
      world.getDynamicProperty(
        FINAL_KEY
      ) === true;

    const savedPoison =
      world.getDynamicProperty(
        POISON_KEY
      ) === true;

    const oldBurn =
      world.getDynamicProperty(
        LEGACY_BURN_KEY
      ) === true;

    poisonStarted =
      savedPoison || oldBurn;

    challengeWon =
      world.getDynamicProperty(
        WON_KEY
      ) === true;

    lastSystemTick =
      system.currentTick;

    initialized = true;

    if (
      poisonStarted &&
      !challengeWon
    ) {
      world.setDynamicProperty(
        POISON_KEY,
        true
      );

      startPoisonLoop();
    }

system.runInterval(() => {

  challengeWon =
    world.getDynamicProperty(
      WON_KEY
    ) === true;

  if (challengeWon) {

    lastSystemTick =
      system.currentTick;

    return;
  }


  const now =
    system.currentTick;


  const delta =
    now -
    lastSystemTick;


  if (delta > 0) {

    totalPlayedTicks +=
      delta;


    lastSystemTick =
      now;


    world.setDynamicProperty(
      TIMER_KEY,
      totalPlayedTicks
    );

  }


  checkChallengeTime();

}, 20);
  });
}
import { world, system } from "@minecraft/server";

export function registerDeath() {
  const TICKS_PER_DAY = 24000;

  const TIMER_KEY = "haraldcore:playedTicks";
  const HALF_KEY = "haraldcore:halfNotified";
  const FINAL_KEY = "haraldcore:finalNotified";

  const POISON_KEY = "haraldcore:poisonStarted";

  const LEGACY_BURN_KEY = "haraldcore:burnStarted";

  const WON_KEY = "haraldcore:challengeWon";

  const DAMAGE_KEY = "haraldcore:damageTaken";

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

  let winStatsAnnounced = false;

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

  function getHeartsLost(player) {
    try {
      const damage =
        player.getDynamicProperty(
          DAMAGE_KEY
        );

      const totalDamage =
        typeof damage === "number"
          ? damage
          : 0;

      return (
        Math.round(
          (
            totalDamage /
            2
          ) * 10
        ) / 10
      );

    } catch (_) {
      return 0;
    }
  }

  /*
   * 10/10 = 7000 + Speed bis 2000 + Health bis 1000 = max 9999
   * 0-9/10 = Tasks + Survival + Health = max 6499
   */
  function calculateHaraldScore(
    completedTasks,
    playedDays,
    heartsLost
  ) {

    if (completedTasks >= 10) {

      const speedScore =
        Math.max(
          0,
          Math.min(
            2000,
            (
              8 -
              playedDays
            ) * 250
          )
        );

      const healthScore =
        Math.max(
          0,
          Math.min(
            1000,
            1000 -
            heartsLost * 20
          )
        );

      return Math.min(
        9999,
        Math.max(
          7000,
          Math.round(
            7000 +
            speedScore +
            healthScore
          )
        )
      );
    }

    const taskScore =
      completedTasks * 350;

    const survivalScore =
      Math.max(
        0,
        Math.min(
          2400,
          playedDays * 300
        )
      );

    const healthScore =
      Math.max(
        0,
        Math.min(
          1000,
          playedDays * 125 -
          heartsLost * 10
        )
      );

    return Math.min(
      6499,
      Math.max(
        0,
        Math.round(
          taskScore +
          survivalScore +
          healthScore
        )
      )
    );
  }

  function formatHaraldScore(
    score
  ) {
    return Math.max(
      0,
      Math.min(
        9999,
        Math.round(score)
      )
    )
      .toString()
      .padStart(
        4,
        "0"
      );
  }

  function getScoreStars(
    score,
    completedTasks
  ) {
    if (
      completedTasks < 10
    ) {
      return "";
    }

    const bronze =
      "§4§l★";

    const silver =
      score >= 8500
        ? "§f§l★"
        : "§8§l☆";

    const gold =
      score >= 9250
        ? "§e§l★"
        : "§8§l☆";

    return (
      `${bronze}${silver}${gold}`
    );
  }

  function announceWinStats() {
    if (winStatsAnnounced) {
      return;
    }

    winStatsAnnounced = true;

    const playedDays =
      getPlayedDaysPrecise();

    const completedTasks =
      getCompletedTaskCount();

    const players = [
      ...world.getPlayers()
    ];

    for (const winner of players) {
      const heartsLost =
        getHeartsLost(
          winner
        );

      const haraldScore =
        calculateHaraldScore(
          completedTasks,
          playedDays,
          heartsLost
        );

      const formattedScore =
        formatHaraldScore(
          haraldScore
        );

      const scoreStars =
        getScoreStars(
          haraldScore,
          completedTasks
        );

      const scoreText =
        `§6§lScore: §e${formattedScore} §r${scoreStars}`;

      try {
        winner.sendMessage(
          `§aYou completed HaraldCore in §f${playedDays} §adays with §e${completedTasks}/10 §atasks!`
        );

        winner.sendMessage(
          scoreText
        );
      } catch (_) {}

      for (
        const player of players
      ) {
        if (
          player.id ===
          winner.id
        ) {
          continue;
        }

        try {
          player.sendMessage(
            `§e${winner.name} §acompleted HaraldCore in §f${playedDays} §adays with §e${completedTasks}/10 §atasks!`
          );

          player.sendMessage(
            scoreText
          );
        } catch (_) {}
      }
    }
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

        announceWinStats();

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

world.afterEvents.entityDie.subscribe(event => {
  const dead = event.deadEntity;

  if (
    !dead ||
    dead.typeId !== "minecraft:player"
  ) {
    return;
  }

  const playedDays =
    getPlayedDaysPrecise();

  const completedTasks =
    getCompletedTaskCount();

  const heartsLost =
    getHeartsLost(dead);

  const haraldScore =
    calculateHaraldScore(
      completedTasks,
      playedDays,
      heartsLost
    );

  const formattedScore =
    formatHaraldScore(
      haraldScore
    );

  const scoreStars =
    getScoreStars(
      haraldScore,
      completedTasks
    );

  const scoreText =
    scoreStars
      ? `§6§lScore: §e${formattedScore} §r${scoreStars}`
      : `§6§lScore: §e${formattedScore}`;

  function showDeathStats() {
    try {
      dead.runCommand(
        "title @s times 0 6000 0"
      );

      dead.runCommand(
        `title @s title §c${playedDays} Days`
      );

      dead.runCommand(
        `title @s subtitle §e${completedTasks}/10 Tasks §8| §6Score: §e${formattedScore}`
      );
    } catch (_) {}
  }

  showDeathStats();

  system.run(() => {
    showDeathStats();

    try {
      dead.sendMessage(
        `§cYou died! You survived §f${playedDays} §cdays and completed §e${completedTasks}/10 §ctasks.`
      );

      dead.sendMessage(
        scoreText
      );
    } catch (_) {}

    for (const player of world.getPlayers()) {
      if (player.id === dead.id) {
        continue;
      }

      try {
        player.sendMessage(
          `§e${dead.name} §cdied after §f${playedDays} §cdays with §e${completedTasks}/10 §ctasks completed!`
        );

        player.sendMessage(
          scoreText
        );
      } catch (_) {}
    }
  });
});

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
      challengeWon
    ) {
      winStatsAnnounced = true;
    }

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
      const wonNow =
        world.getDynamicProperty(
          WON_KEY
        ) === true;

      if (
        wonNow &&
        !challengeWon
      ) {
        challengeWon = true;

        announceWinStats();
      } else {
        challengeWon =
          wonNow;
      }

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
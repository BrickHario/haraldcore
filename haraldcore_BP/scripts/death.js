import {
  world,
  system,
} from "@minecraft/server";

import {
  recordDeathResult,
  recordWinnerResult,
} from "./uiRanklist.js";


function getPersonalTaskCount(player) {
  const tasks =
    player.getDynamicProperty(
      "haraldcore:personalTasks"
    );

  return typeof tasks === "number"
    ? tasks
    : 0;
}


export function registerDeath() {

  const TICKS_PER_DAY = 24000;

  const TIMER_KEY =
    "haraldcore:playedTicks";

  const HALF_KEY =
    "haraldcore:halfNotified";

  const FINAL_KEY =
    "haraldcore:finalNotified";

  const POISON_KEY =
    "haraldcore:poisonStarted";

  const LEGACY_BURN_KEY =
    "haraldcore:burnStarted";

  const WON_KEY =
    "haraldcore:challengeWon";

  const DAMAGE_KEY =
    "haraldcore:damageTaken";

  const PERSONAL_TICKS_KEY =
    "haraldcore:personalPlayedTicks";

  const PERSONAL_TIME_MIGRATION_KEY =
    "haraldcore:personalTimeTrackingV1";


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

  const personalLastTick =
    new Map();

  let notifiedHalf = false;
  let notifiedFinal = false;

  let poisonStarted = false;
  let challengeWon = false;

  let initialized = false;
  let poisonLoopStarted = false;

  let winStatsAnnounced = false;


  function getCompletedTaskCount() {

    const todo =
      world.scoreboard.getObjective(
        "todo"
      );

    if (!todo) {
      return 0;
    }

    let completed = 0;

    for (
      const task of
      ALL_TASKS
    ) {

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

      return (
        typeof saved === "number"
          ? saved
          : 0
      );
    }


    const currentDelta =
      system.currentTick -
      lastSystemTick;


    return (
      totalPlayedTicks +
      Math.max(
        0,
        currentDelta
      )
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


  function getStoredPersonalTicks(
    player
  ) {

    try {

      const ticks =
        player.getDynamicProperty(
          PERSONAL_TICKS_KEY
        );

      return (
        typeof ticks === "number"
          ? Math.max(
              0,
              ticks
            )
          : 0
      );

    } catch (_) {

      return 0;
    }
  }


  function setStoredPersonalTicks(
    player,
    ticks
  ) {

    try {

      player.setDynamicProperty(
        PERSONAL_TICKS_KEY,
        Math.max(
          0,
          Math.round(
            ticks
          )
        )
      );

    } catch (_) {}
  }


  function beginTrackingPlayer(
    player,
    now = system.currentTick
  ) {

    if (!player) {
      return;
    }


    try {

      const existing =
        player.getDynamicProperty(
          PERSONAL_TICKS_KEY
        );

      if (
        typeof existing !==
        "number"
      ) {

        setStoredPersonalTicks(
          player,
          0
        );
      }

    } catch (_) {}


    personalLastTick.set(
      player.id,
      now
    );
  }


  function updatePersonalPlaytimeForPlayer(
    player,
    now = system.currentTick
  ) {

    if (!player) {
      return 0;
    }


    const last =
      personalLastTick.get(
        player.id
      );


    if (
      typeof last !==
      "number"
    ) {

      beginTrackingPlayer(
        player,
        now
      );

      return (
        getStoredPersonalTicks(
          player
        )
      );
    }


    const delta =
      Math.max(
        0,
        now - last
      );


    let total =
      getStoredPersonalTicks(
        player
      );


    if (
      delta > 0
    ) {

      total += delta;

      setStoredPersonalTicks(
        player,
        total
      );
    }


    personalLastTick.set(
      player.id,
      now
    );


    return total;
  }


  function updateAllPersonalPlaytime() {

    const now =
      system.currentTick;

    const onlineIds =
      new Set();


    for (
      const player of
      world.getPlayers()
    ) {

      onlineIds.add(
        player.id
      );

      updatePersonalPlaytimeForPlayer(
        player,
        now
      );
    }


    for (
      const id of
      personalLastTick.keys()
    ) {

      if (
        !onlineIds.has(
          id
        )
      ) {

        personalLastTick.delete(
          id
        );
      }
    }
  }


  function getPersonalPlayedDaysPrecise(
    player
  ) {

    const ticks =
      updatePersonalPlaytimeForPlayer(
        player
      );


    return (
      Math.round(
        (
          ticks /
          TICKS_PER_DAY
        ) * 100
      ) / 100
    );
  }


  function getHeartsLost(
    player
  ) {

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


  function calculateHaraldScore(
    completedTasks,
    playedDays,
    heartsLost,
    won = false
  ) {

    if (won) {

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


      const rawScore =
        Math.round(
          completedTasks * 700 +
          speedScore +
          healthScore
        );


      return Math.min(
        9999,
        Math.max(
          6500,
          rawScore
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

    return (
      Math.max(
        0,
        Math.min(
          9999,
          Math.round(
            score
          )
        )
      )
        .toString()
        .padStart(
          4,
          "0"
        )
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

    if (
      winStatsAnnounced
    ) {

      return;
    }


    winStatsAnnounced =
      true;


    updateAllPersonalPlaytime();


    const globalPlayedDays =
      getPlayedDaysPrecise();


    const completedTasks =
      getCompletedTaskCount();


    const players = [
      ...world.getPlayers()
    ];


    for (
      const winner of
      players
    ) {

      const heartsLost =
        getHeartsLost(
          winner
        );


      const personalTasks =
        getPersonalTaskCount(
          winner
        );


      const haraldScore =
        calculateHaraldScore(
          personalTasks,
          globalPlayedDays,
          heartsLost,
          true
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


      recordWinnerResult(
        winner,
        haraldScore,
        scoreStars
      );


      try {

        winner.sendMessage(
          `§aYou completed HaraldCore in §f${globalPlayedDays} §adays with §e${completedTasks}/10 §atasks!`
        );


        winner.sendMessage(
          scoreText
        );

      } catch (_) {}


      for (
        const player of
        players
      ) {

        if (
          player.id ===
          winner.id
        ) {

          continue;
        }


        try {

          player.sendMessage(
            `§e${winner.name} §acompleted HaraldCore in §f${globalPlayedDays} §adays with §e${completedTasks}/10 §atasks!`
          );


          player.sendMessage(
            scoreText
          );

        } catch (_) {}
      }
    }
  }


  function startPoisonLoop() {

    if (
      poisonLoopStarted
    ) {

      return;
    }


    poisonLoopStarted =
      true;


    system.runInterval(
      () => {

        if (
          world.getDynamicProperty(
            WON_KEY
          ) === true
        ) {

          return;
        }


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


          try {

            player.addEffect(
              "nausea",
              60,
              {
                amplifier: 1,
                showParticles: true,
              }
            );

          } catch (_) {}


          try {

            player.addEffect(
              "darkness",
              60,
              {
                amplifier: 0,
                showParticles: true,
              }
            );

          } catch (_) {}


          try {

            player.addEffect(
              "slowness",
              60,
              {
                amplifier: 2,
                showParticles: true,
              }
            );

          } catch (_) {}
        }

      },
      5
    );
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

      notifiedHalf =
        true;


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

        try {

          player.playSound(
            "note.bass"
          );

        } catch (_) {}
      }
    }


    if (
      playedDays >= 7 &&
      !notifiedFinal
    ) {

      notifiedFinal =
        true;


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

      if (
        allTasksCompleted()
      ) {

        challengeWon =
          true;


        world.setDynamicProperty(
          WON_KEY,
          true
        );


        announceWinStats();


        return;
      }


      poisonStarted =
        true;


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


  world.afterEvents
    .playerSpawn
    .subscribe(
      event => {

        const player =
          event.player;


        if (!player) {
          return;
        }


        system.run(
          () => {

            const existing =
              player.getDynamicProperty(
                PERSONAL_TICKS_KEY
              );


            if (
              typeof existing !==
              "number"
            ) {

              setStoredPersonalTicks(
                player,
                0
              );
            }


            personalLastTick.set(
              player.id,
              system.currentTick
            );

          }
        );
      }
    );


  world.afterEvents
    .entityDie
    .subscribe(
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


        const personalPlayedDays =
          getPersonalPlayedDaysPrecise(
            dead
          );


        const completedTasks =
          getCompletedTaskCount();


        const personalTasks =
          getPersonalTaskCount(
            dead
          );


        const heartsLost =
          getHeartsLost(
            dead
          );


        const haraldScore =
          calculateHaraldScore(
            personalTasks,
            personalPlayedDays,
            heartsLost,
            false
          );


        const formattedScore =
          formatHaraldScore(
            haraldScore
          );


        const scoreText =
          `§6§lScore: §e${formattedScore}`;


        recordDeathResult(
          dead,
          haraldScore
        );


        function showDeathStats() {

          try {

            dead.runCommand(
              "title @s times 0 6000 0"
            );


            dead.runCommand(
              `title @s title §c${personalPlayedDays} Days`
            );


            dead.runCommand(
              `title @s subtitle §e${completedTasks}/10 Tasks §8| §6Score: §e${formattedScore}`
            );

          } catch (_) {}
        }


        showDeathStats();


        system.run(
          () => {

            showDeathStats();


            try {

              dead.sendMessage(
                `§cYou died! You survived §f${personalPlayedDays} §cdays and completed §e${completedTasks}/10 §ctasks.`
              );


              dead.sendMessage(
                scoreText
              );

            } catch (_) {}


            for (
              const player of
              world.getPlayers()
            ) {

              if (
                player.id ===
                dead.id
              ) {

                continue;
              }


              try {

                player.sendMessage(
                  `§e${dead.name} §cdied after §f${personalPlayedDays} §cdays with §e${completedTasks}/10 §ctasks completed!`
                );


                player.sendMessage(
                  scoreText
                );

              } catch (_) {}
            }

          }
        );
      }
    );


  system.run(
    () => {

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
        savedPoison ||
        oldBurn;


      challengeWon =
        world.getDynamicProperty(
          WON_KEY
        ) === true;


      lastSystemTick =
        system.currentTick;


      initialized =
        true;


      const migrationDone =
        world.getDynamicProperty(
          PERSONAL_TIME_MIGRATION_KEY
        ) === true;


      const now =
        system.currentTick;


      for (
        const player of
        world.getPlayers()
      ) {

        const existing =
          player.getDynamicProperty(
            PERSONAL_TICKS_KEY
          );


        if (
          typeof existing !==
          "number"
        ) {

          if (
            !migrationDone
          ) {

            setStoredPersonalTicks(
              player,
              totalPlayedTicks
            );

          } else {

            setStoredPersonalTicks(
              player,
              0
            );
          }
        }


        personalLastTick.set(
          player.id,
          now
        );
      }


      if (
        !migrationDone
      ) {

        world.setDynamicProperty(
          PERSONAL_TIME_MIGRATION_KEY,
          true
        );
      }


      if (
        challengeWon
      ) {

        winStatsAnnounced =
          true;
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


      system.runInterval(
        () => {

          updateAllPersonalPlaytime();


          const wonNow =
            world.getDynamicProperty(
              WON_KEY
            ) === true;


          if (
            wonNow &&
            !challengeWon
          ) {

            challengeWon =
              true;


            announceWinStats();

          } else {

            challengeWon =
              wonNow;
          }


          if (
            challengeWon
          ) {

            lastSystemTick =
              system.currentTick;


            return;
          }


          const now =
            system.currentTick;


          const delta =
            now -
            lastSystemTick;


          if (
            delta > 0
          ) {

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

        },
        20
      );

    }
  );
}
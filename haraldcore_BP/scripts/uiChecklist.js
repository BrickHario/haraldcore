import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandStatus,
} from "@minecraft/server";

import {
  ActionFormData
} from "@minecraft/server-ui";


function getPersonalTaskCount(player) {
  const tasks = player.getDynamicProperty("haraldcore:personalTasks");
  return typeof tasks === "number" ? tasks : 0;
}


const TASKS = [
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


const TICKS_PER_DAY = 24000;

const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const DAMAGE_KEY =
  "haraldcore:damageTaken";

const VILLAGE_COUNT_KEY =
  "haraldcore:villageCount";


const openChecklistPlayers =
  new Set();


function taskIsDone(
  todo,
  taskName
) {

  if (!todo) {
    return false;
  }

  try {

    return todo.hasParticipant(
      `§a✔ ${taskName}`
    );

  } catch (_) {

    return false;

  }
}


function buildTaskText() {

  const todo =
    world.scoreboard
      .getObjective(
        "todo"
      );

  let doneCount = 0;

  const lines = [];


  for (
    const task of TASKS
  ) {

    const done =
      taskIsDone(
        todo,
        task
      );


    if (done) {
      doneCount++;
    }


    lines.push(
      done
        ? `§a✔ ${task}`
        : `§7☐ ${task}`
    );
  }


  return {
    doneCount,
    text:
      lines.join("\n"),
  };
}


function getPlayedTicks() {

  const savedTicks =
    world.getDynamicProperty(
      TIMER_KEY
    );


  return (
    typeof savedTicks ===
    "number"
      ? savedTicks
      : 0
  );
}


function getPlayedDaysPrecise() {

  const ticks =
    getPlayedTicks();


  return (
    Math.round(
      (
        ticks /
        TICKS_PER_DAY
      ) * 100
    ) / 100
  );
}


function getCurrentDay() {

  const totalTicks =
    getPlayedTicks();


  const day =
    Math.floor(
      totalTicks /
      TICKS_PER_DAY
    ) + 1;


  return Math.min(
    day,
    8
  );
}


function getDayColor(day) {

  if (day <= 4) {
    return "§a";
  }


  if (day <= 7) {
    return "§6";
  }


  return "§c";
}


function getHeartsLost(player) {

  const damage =
    player.getDynamicProperty(
      DAMAGE_KEY
    );


  const totalDamage =
    typeof damage === "number"
      ? damage
      : 0;


  const hearts =
    totalDamage / 2;


  return (
    Math.round(
      hearts * 10
    ) / 10
  );
}


function getVillageCount() {

  const count =
    world.getDynamicProperty(
      VILLAGE_COUNT_KEY
    );


  return (
    typeof count === "number"
      ? count
      : 0
  );
}


/*
 * 10/10 = 7000 + Speed bis 2000 + Health bis 1000 = max 9999
 * 0-9/10 = Tasks + Survival + Health = max 6499
 */
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


    return Math.min(
      9999,
      Math.max(
        0,
        Math.round(
          completedTasks * 700 +
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
  score
) {

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


function challengeWon() {

  return (
    world.getDynamicProperty(
      WON_KEY
    ) === true
  );
}


export function isChecklistOpen(
  player
) {

  return openChecklistPlayers.has(
    player.id
  );
}


export async function showHaraldChecklist(
  player
) {

  if (
    !player ||
    isChecklistOpen(
      player
    )
  ) {
    return;
  }


  openChecklistPlayers.add(
    player.id
  );


  try {

    const {
      doneCount,
      text,
    } =
      buildTaskText();


    const won =
      challengeWon();


    if (won) {

      const playedDays =
        getPlayedDaysPrecise();


      const heartsLost =
        getHeartsLost(
          player
        );


      const villageCount =
        getVillageCount();


      const haraldScore =
        calculateHaraldScore(
          getPersonalTaskCount(player),
          playedDays,
          heartsLost,
          won
        );


      const formattedScore =
        formatHaraldScore(
          haraldScore
        );


      const scoreStars =
        getScoreStars(
          haraldScore
        );


      const form =
        new ActionFormData()

          .title(
            "§8§lHARALDCORE TASKS"
          )

          .header(
            "§a§lCONGRATS!"
          )

          .label(
            "§fYou completed HaraldCore!"
          )

          .divider()

          .header(
            "§d§lYOUR STATS"
          )

          .label(
            `§7Time: §f${playedDays} Days`
          )

          .label(
            `§7Hearts lost: §c${heartsLost} ❤`
          )

          .label(
            `§7Village Count: §f${villageCount}`
          )

          .header(
            `§7SCORE: §6§l${formattedScore} §r${scoreStars}`
          )

          .divider()

          .header(
            `§a§lTASKS §7(${doneCount}/${TASKS.length})`
          )

          .label(
            text
          )

          .divider()

          .label(
            "§a§lThanks for playing!"
          )

          .label(
            "§e§l- BY BRICKHARIO"
          );


      await form.show(
        player
      );


      return;
    }


    const currentDay =
      getCurrentDay();


    const dayColor =
      getDayColor(
        currentDay
      );


    const form =
      new ActionFormData()

        .title(
          "§8§lHARALDCORE TASKS"
        )

        .header(
          `${dayColor}§lDAY ${currentDay}/8`
        )

        .header(
          `§6§lTASKS §7(${doneCount}/${TASKS.length})`
        )

        .label(
          text
        )

        .divider()

        .label(
          "§6HaraldCore has cursed you: no drops, no sleep, no natural regeneration, and if you stop moving for too long, the curse will poison you while you fight to survive in Hardcore Mode. §4You have only 8 days to complete every task before the curse kills you, while each night grows darker and more terrifying. Can you survive HaraldCore?"
        )

        .divider()

        .label(
          "§eTip: Finding chests might help.. STOP READING NOW, YOU WILL DIE!"
        );


    await form.show(
      player
    );


  } catch (_) {


  } finally {

    openChecklistPlayers.delete(
      player.id
    );

  }
}


export function registerChecklistUI() {

  system.beforeEvents.startup.subscribe(
    event => {

      event.customCommandRegistry
        .registerCommand(

          {
            name:
              "harald:tasks",

            description:
              "Open the HaraldCore task checklist",

            permissionLevel:
              CommandPermissionLevel.Any,

            cheatsRequired:
              false,
          },


          origin => {

            const player =
              origin.sourceEntity;


            if (
              !player ||
              player.typeId !==
                "minecraft:player"
            ) {

              return {

                status:
                  CustomCommandStatus
                    .Failure,

                message:
                  "This command can only be used by a player.",

              };
            }


            system.run(
              () =>
                showHaraldChecklist(
                  player
                )
            );


            return {

              status:
                CustomCommandStatus
                  .Success,

            };

          }
        );
    }
  );
}
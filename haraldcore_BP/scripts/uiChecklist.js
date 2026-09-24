import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandStatus,
} from "@minecraft/server";

import {
  ActionFormData
} from "@minecraft/server-ui";


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


const TICKS_PER_DAY = 240;

const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const DAMAGE_KEY =
  "haraldcore:damageTaken";


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


      const form =
        new ActionFormData()

          .title(
            "§8§lHARALDCORE TASKS"
          )

          .header(
            "§a§lCONGRATULATION!"
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
          "§eTip: Finding chests might help.."
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
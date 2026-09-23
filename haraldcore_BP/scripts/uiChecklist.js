import {
  world,
  system,
  CommandPermissionLevel,
  CustomCommandStatus,
} from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

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

const TIMER_KEY = "haraldcore:playedTicks";

const openChecklistPlayers = new Set();

function taskIsDone(todo, taskName) {
  if (!todo) return false;

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
    world.scoreboard.getObjective("todo");

  let doneCount = 0;

  const lines = [];

  for (const task of TASKS) {
    const done =
      taskIsDone(todo, task);

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
    text: lines.join("\n"),
  };
}

function getCurrentDay() {
  const savedTicks =
    world.getDynamicProperty(
      TIMER_KEY
    );

  const totalTicks =
    typeof savedTicks === "number"
      ? savedTicks
      : 0;

  const day =
    Math.floor(
      totalTicks / TICKS_PER_DAY
    ) + 1;

  return Math.min(day, 8);
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

export function isChecklistOpen(player) {
  return openChecklistPlayers.has(
    player.id
  );
}

export async function showHaraldChecklist(
  player
) {
  if (
    !player ||
    isChecklistOpen(player)
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
    } = buildTaskText();

    const currentDay =
      getCurrentDay();

    const dayColor =
      getDayColor(currentDay);

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

        .label(text)

        .divider()

        .label(
          "§eTip: Finding chests might help.."
        );

    await form.show(player);

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
            name: "harald:tasks",

            description:
              "Open the HaraldCore task checklist",

            permissionLevel:
              CommandPermissionLevel.Any,

            cheatsRequired: false,
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
                  CustomCommandStatus.Failure,

                message:
                  "This command can only be used by a player.",
              };
            }

            system.run(() =>
              showHaraldChecklist(
                player
              )
            );

            return {
              status:
                CustomCommandStatus.Success,
            };
          }
        );
    }
  );
}
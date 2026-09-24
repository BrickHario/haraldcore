import {
  world,
  system
} from "@minecraft/server";


const TASK_WOOD = "Find wood";


const WOOD_TYPES = [

  "minecraft:oak_log",
  "minecraft:stripped_oak_log",
  "minecraft:oak_planks",

  "minecraft:spruce_log",
  "minecraft:stripped_spruce_log",
  "minecraft:spruce_planks",

  "minecraft:birch_log",
  "minecraft:stripped_birch_log",
  "minecraft:birch_planks",

  "minecraft:jungle_log",
  "minecraft:stripped_jungle_log",
  "minecraft:jungle_planks",

  "minecraft:acacia_log",
  "minecraft:stripped_acacia_log",
  "minecraft:acacia_planks",

  "minecraft:dark_oak_log",
  "minecraft:stripped_dark_oak_log",
  "minecraft:dark_oak_planks",

  "minecraft:mangrove_log",
  "minecraft:stripped_mangrove_log",
  "minecraft:mangrove_planks",

  "minecraft:cherry_log",
  "minecraft:stripped_cherry_log",
  "minecraft:cherry_planks",

  "minecraft:pale_oak_log",
  "minecraft:stripped_pale_oak_log",
  "minecraft:pale_oak_planks",

  "minecraft:bamboo_block",
  "minecraft:stripped_bamboo_block",
  "minecraft:bamboo_planks",

  "minecraft:crimson_stem",
  "minecraft:stripped_crimson_stem",
  "minecraft:crimson_planks",

  "minecraft:warped_stem",
  "minecraft:stripped_warped_stem",
  "minecraft:warped_planks",
];


export function registerFindWood() {

  let completionQueued = false;


  function playerHasWood(player) {

    const invComp =
      player.getComponent(
        "minecraft:inventory"
      );

    if (!invComp) {
      return false;
    }


    const inv =
      invComp.container;

    if (!inv) {
      return false;
    }


    for (
      let i = 0;
      i < inv.size;
      i++
    ) {

      const item =
        inv.getItem(i);

      if (
        item &&
        WOOD_TYPES.includes(
          item.typeId
        )
      ) {
        return true;
      }
    }


    return false;
  }


  function taskAlreadyDone() {

    const todo =
      world.scoreboard.getObjective(
        "todo"
      );

    if (!todo) {
      return false;
    }


    try {

      return todo.hasParticipant(
        `§a✔ ${TASK_WOOD}`
      );

    } catch (_) {

      return false;

    }
  }


  system.runInterval(() => {

    if (
      !world.scoreboard.getObjective(
        "todo"
      )
    ) {
      return;
    }


    if (
      taskAlreadyDone() ||
      completionQueued
    ) {
      return;
    }


    for (
      const player
      of world.getPlayers()
    ) {

      if (
        !playerHasWood(player)
      ) {
        continue;
      }


      completionQueued = true;


      system.run(() => {

        try {

          const dim =
            world.getDimension(
              "overworld"
            );


          if (
            taskAlreadyDone()
          ) {
            completionQueued = false;
            return;
          }


          dim.runCommand(
            `scoreboard players reset "${TASK_WOOD}" todo`
          );


          dim.runCommand(
            `scoreboard players set "§a✔ ${TASK_WOOD}" todo 0`
          );


          player.sendMessage(
            `§aTask done: ${TASK_WOOD}! Took a lot for the first step..`
          );


          player.playSound(
            "random.orb"
          );


        } catch (error) {

          console.warn(
            `[HaraldCore] Find wood task error: ${error}`
          );

        } finally {

          completionQueued = false;

        }

      });


      break;
    }

  }, 80);
}
import {
  world,
  system,
  MolangVariableMap,
} from "@minecraft/server";


const WON_KEY =
  "haraldcore:challengeWon";

const BURN_KEY =
  "haraldcore:burnStarted";

const FIREWORK_KEY =
  "haraldcore:fireworkDone";


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


const FIREWORK_COLORS = [
  { red: 1.0, green: 0.1, blue: 0.1 },
  { red: 0.1, green: 0.4, blue: 1.0 },
  { red: 0.2, green: 1.0, blue: 0.2 },
  { red: 1.0, green: 0.85, blue: 0.1 },
  { red: 1.0, green: 0.2, blue: 0.8 },
  { red: 0.6, green: 0.2, blue: 1.0 },
  { red: 0.1, green: 1.0, blue: 1.0 },
  { red: 1.0, green: 0.45, blue: 0.05 },
];


function randomFrom(array) {
  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];
}


function createColorMap(color) {

  const molang =
    new MolangVariableMap();

  molang.setColorRGB(
    "variable.color",
    color
  );

  return molang;
}


function allTasksCompleted() {

  const todo =
    world.scoreboard.getObjective(
      "todo"
    );

  if (!todo) {
    return false;
  }


  for (const task of ALL_TASKS) {

    try {

      if (
        !todo.hasParticipant(
          `§a✔ ${task}`
        )
      ) {
        return false;
      }

    } catch (_) {

      return false;
    }
  }


  return true;
}


function createDirections(amount) {

  const directions = [];


  for (
    let i = 0;
    i < amount;
    i++
  ) {

    const theta =
      Math.random() *
      Math.PI *
      2;


    const phi =
      Math.acos(
        2 * Math.random() - 1
      );


    directions.push({

      x:
        Math.sin(phi) *
        Math.cos(theta),

      y:
        Math.cos(phi),

      z:
        Math.sin(phi) *
        Math.sin(theta),

    });
  }


  return directions;
}


function createFireworkBurst(
  dimension,
  center
) {

  const color1 =
    randomFrom(
      FIREWORK_COLORS
    );


  let color2 =
    randomFrom(
      FIREWORK_COLORS
    );


  while (
    color2 === color1 &&
    FIREWORK_COLORS.length > 1
  ) {

    color2 =
      randomFrom(
        FIREWORK_COLORS
      );
  }


  const map1 =
    createColorMap(
      color1
    );


  const map2 =
    createColorMap(
      color2
    );


  const whiteMap =
    createColorMap({
      red: 1,
      green: 1,
      blue: 1,
    });

  try {

    const big =
      Math.random() < 0.35;


    dimension.playSound(
      big
        ? "firework.large_blast"
        : "firework.blast",
      center,
      {
        volume: 1.2,

        pitch:
          0.9 +
          Math.random() *
          0.2,
      }
    );

  } catch (_) {}

  const directions =
    createDirections(
      36
    );


  for (
    let step = 1;
    step <= 7;
    step++
  ) {

    system.runTimeout(() => {

      const radius =
        step * 0.65;


      const drop =
        step > 3
          ? (step - 3) *
            (step - 3) *
            0.035
          : 0;


      for (
        let i = 0;
        i < directions.length;
        i++
      ) {

        const dir =
          directions[i];


        const location = {

          x:
            center.x +
            dir.x *
            radius,

          y:
            center.y +
            dir.y *
            radius -
            drop,

          z:
            center.z +
            dir.z *
            radius,

        };


        const map =
          i % 2 === 0
            ? map1
            : map2;


        try {

          dimension.spawnParticle(
            "minecraft:colored_flame_particle",
            location,
            map
          );

        } catch (_) {}

        if (
          step >= 4 &&
          i % 4 === 0
        ) {

          try {

            dimension.spawnParticle(
              "minecraft:colored_flame_particle",
              {
                x:
                  location.x +
                  (
                    Math.random() -
                    0.5
                  ) *
                  0.3,

                y:
                  location.y +
                  (
                    Math.random() -
                    0.5
                  ) *
                  0.3,

                z:
                  location.z +
                  (
                    Math.random() -
                    0.5
                  ) *
                  0.3,
              },
              whiteMap
            );

          } catch (_) {}
        }
      }

    }, step * 2);
  }

  system.runTimeout(() => {

    try {

      dimension.playSound(
        "firework.twinkle",
        center,
        {
          volume: 0.9,

          pitch:
            0.95 +
            Math.random() *
            0.15,
        }
      );

    } catch (_) {}


    for (
      let i = 0;
      i < 24;
      i++
    ) {

      const angle =
        Math.random() *
        Math.PI *
        2;


      const distance =
        1 +
        Math.random() *
        4;


      const location = {

        x:
          center.x +
          Math.cos(angle) *
          distance,

        y:
          center.y +
          (
            Math.random() -
            0.5
          ) *
          5 -
          Math.random(),

        z:
          center.z +
          Math.sin(angle) *
          distance,

      };


      try {

        dimension.spawnParticle(
          "minecraft:colored_flame_particle",
          location,
          Math.random() < 0.5
            ? map1
            : map2
        );

      } catch (_) {}
    }

  }, 18);
}


function launchFirework(player) {

  if (!player.isValid) {
    return;
  }


  const dimension =
    player.dimension;


  const base =
    player.location;

  const start = {

    x:
      base.x +
      (
        Math.random() -
        0.5
      ) *
      8,

    y:
      base.y + 1,

    z:
      base.z +
      (
        Math.random() -
        0.5
      ) *
      8,

  };

  const burstHeight =
    8 +
    Math.random() *
    7;


  const burstLocation = {

    x:
      start.x +
      (
        Math.random() -
        0.5
      ) *
      2,

    y:
      start.y +
      burstHeight,

    z:
      start.z +
      (
        Math.random() -
        0.5
      ) *
      2,

  };

  try {

    dimension.spawnEntity(
      "minecraft:fireworks_rocket",
      start
    );

  } catch (_) {}

  try {

    dimension.playSound(
      "firework.launch",
      start,
      {
        volume: 0.8,

        pitch:
          0.95 +
          Math.random() *
          0.1,
      }
    );

  } catch (_) {}

  const flightTicks =
    22 +
    Math.floor(
      Math.random() *
      8
    );


  system.runTimeout(() => {

    createFireworkBurst(
      dimension,
      burstLocation
    );

  }, flightTicks);
}

function spawnVictoryFireworks(
  player
) {

  for (
    let i = 0;
    i < 10;
    i++
  ) {

    system.runTimeout(() => {

      if (!player.isValid) {
        return;
      }


      launchFirework(
        player
      );

    }, i * 10);
  }
}


export function registerFirework() {

  system.runInterval(() => {

    const burnStarted =
      world.getDynamicProperty(
        BURN_KEY
      ) === true;


    if (burnStarted) {
      return;
    }


    const fireworkDone =
      world.getDynamicProperty(
        FIREWORK_KEY
      ) === true;

    if (fireworkDone) {
      return;
    }

    if (
      !allTasksCompleted()
    ) {
      return;
    }

    world.setDynamicProperty(
      WON_KEY,
      true
    );

    world.setDynamicProperty(
      FIREWORK_KEY,
      true
    );


    world.sendMessage(
      "§aTHE CURSE IS BROKEN."
    );


    world.sendMessage(
      "§dYou escaped HaraldCore."
    );


    for (
      const player
      of world.getAllPlayers()
    ) {

      player.sendMessage(
        "§bYou are free. You are IMMORTAL."
      );


      try {

        player.playSound(
          "note.flute"
        );

      } catch (_) {}

      spawnVictoryFireworks(
        player
      );
    }

  }, 200);

  system.runInterval(() => {

    const won =
      world.getDynamicProperty(
        WON_KEY
      ) === true;


    if (!won) {
      return;
    }


    for (
      const player
      of world.getAllPlayers()
    ) {

      launchFirework(
        player
      );

    }

  }, 200);
}
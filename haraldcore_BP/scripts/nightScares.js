
import {
  world,
  system,
} from "@minecraft/server";

const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const FAILED_KEY =
  "haraldcore:burnStarted";

const VILLAGES_KEY =
  "haraldcore:villages";

const TICKS_PER_DAY =
  24000;

const VILLAGE_RADIUS =
  60;

const VILLAGE_VERTICAL_RADIUS =
  32;

const DEBUG =
  false;

const playerTimers =
  new Map();

const OVERWORLD_SOUNDS = {

  1: [],

  2: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",
  ],

  3: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",
  ],

  4: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.phantom.idle",
  ],

  5: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.phantom.idle",
  ],

  6: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.phantom.idle",
    "mob.phantom.swoop",
  ],

  7: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.phantom.idle",
    "mob.phantom.swoop",
  ],

  8: [
    "mob.zombie.say",
    "mob.zombie.step",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.phantom.idle",
    "mob.phantom.swoop",
  ],
};

const NETHER_SOUNDS = {

  1: [],

  2: [
    "mob.ghast.moan",
  ],

  3: [
    "mob.ghast.moan",
    "mob.ghast.scream",
  ],

  4: [
    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",
  ],

  5: [
    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.wither.ambient",
  ],

  6: [
    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.wither.ambient",
    "mob.wither.shoot",
  ],

  7: [
    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.wither.ambient",
    "mob.wither.shoot",
  ],

  8: [
    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.wither.ambient",
    "mob.wither.shoot",
    "mob.wither.spawn",
  ],
};

const END_SOUNDS = {

  1: [],

  2: [
    "mob.endermen.idle",
  ],

  3: [
    "mob.endermen.idle",
    "mob.endermen.stare",
  ],

  4: [
    "mob.endermen.idle",
    "mob.endermen.stare",
  ],

  5: [
    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",
  ],

  6: [
    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",
  ],

  7: [
    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",
  ],

  8: [
    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",
  ],
};

const VILLAGE_SOUNDS = {

  1: [],

  2: [
    "mob.zombie.say",
    "mob.zombie.step",
  ],

  3: [
    "mob.zombie.say",
    "mob.zombie.step",
    "mob.zombie.wood",
  ],

  4: [
    "mob.zombie.say",
    "mob.zombie.step",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",
  ],

  5: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.witch.ambient",
  ],

  6: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",
    "mob.zombie.woodbreak",

    "mob.witch.ambient",
  ],

  7: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",
    "mob.zombie.woodbreak",

    "mob.witch.ambient",
  ],

  8: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",
    "mob.zombie.woodbreak",
    "mob.zombie.woodbreak",

    "mob.witch.ambient",
  ],
};

function randomInt(min, max) {

  return (
    Math.floor(
      Math.random() *
      (max - min + 1)
    ) + min
  );
}

function randomFrom(array) {

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];
}

function getChallengeDay() {

  const value =
    world.getDynamicProperty(
      TIMER_KEY
    );

  const ticks =
    typeof value === "number"
      ? value
      : 0;

  const day =
    Math.floor(
      ticks /
      TICKS_PER_DAY
    ) + 1;

  return Math.min(
    Math.max(
      day,
      1
    ),
    8
  );
}

function isNight() {

  const time =
    world.getTimeOfDay();

  return (
    time >= 13000 &&
    time < 23000
  );
}

function shouldScarePlayer(player) {

  if (
    player.dimension.id ===
    "minecraft:overworld"
  ) {

    return isNight();
  }

  return true;
}

function challengeIsActive() {

  const won =
    world.getDynamicProperty(
      WON_KEY
    ) === true;

  const failed =
    world.getDynamicProperty(
      FAILED_KEY
    ) === true;

  return (
    !won &&
    !failed
  );
}

function playerIsInVillage(player) {

  if (
    player.dimension.id !==
    "minecraft:overworld"
  ) {
    return false;
  }

  const saved =
    world.getDynamicProperty(
      VILLAGES_KEY
    );

  if (
    typeof saved !== "string" ||
    !saved
  ) {
    return false;
  }

  try {

    const villages =
      JSON.parse(
        saved
      );

    if (
      !Array.isArray(
        villages
      )
    ) {
      return false;
    }

    for (
      const village of villages
    ) {

      if (
        village.dimension !==
        player.dimension.id
      ) {
        continue;
      }

      const dx =
        player.location.x -
        village.x;

      const dz =
        player.location.z -
        village.z;

      const dy =
        Math.abs(
          player.location.y -
          village.y
        );

      if (
        dx * dx +
        dz * dz <=
        VILLAGE_RADIUS *
        VILLAGE_RADIUS &&
        dy <=
        VILLAGE_VERTICAL_RADIUS
      ) {

        return true;
      }
    }

  } catch (_) {}

  return false;
}

function getSoundsForPlayer(
  player,
  day
) {

  const dimension =
    player.dimension.id;

  if (
    dimension ===
    "minecraft:overworld"
  ) {

    const sounds = [
      ...OVERWORLD_SOUNDS[day]
    ];

    if (
      playerIsInVillage(
        player
      )
    ) {

      sounds.push(
        ...VILLAGE_SOUNDS[day]
      );
    }

    return sounds;
  }

  if (
    dimension ===
    "minecraft:nether"
  ) {

    return NETHER_SOUNDS[day];
  }

  if (
    dimension ===
    "minecraft:the_end"
  ) {

    return END_SOUNDS[day];
  }

  return [];
}

function getNextDelay(day) {

  switch (day) {

    case 1:
      return 999999;

    case 2:
      return randomInt(
        170,
        230
      );

    case 3:
      return randomInt(
        145,
        195
      );

    case 4:
      return randomInt(
        120,
        160
      );

    case 5:
      return randomInt(
        95,
        125
      );

    case 6:
      return randomInt(
        70,
        90
      );

    case 7:
      return randomInt(
        43,
        57
      );

    case 8:
      return randomInt(
        17,
        23
      );

    default:
      return 200;
  }
}

function getSoundDistance(day) {

  if (
    day <= 3
  ) {

    return randomInt(
      5,
      10
    );
  }

  if (
    day <= 6
  ) {

    return randomInt(
      3,
      8
    );
  }

  return randomInt(
    2,
    6
  );
}

function playScarySound(
  player,
  day
) {

  const sounds =
    getSoundsForPlayer(
      player,
      day
    );

  if (
    !sounds ||
    sounds.length === 0
  ) {

    return;
  }

  const sound =
    randomFrom(
      sounds
    );

  const angle =
    Math.random() *
    Math.PI *
    2;

  const distance =
    getSoundDistance(
      day
    );

  const location = {

    x:
      player.location.x +
      Math.cos(
        angle
      ) *
      distance,

    y:
      player.location.y +
      randomInt(
        -2,
        3
      ),

    z:
      player.location.z +
      Math.sin(
        angle
      ) *
      distance,
  };

  let pitch =
    0.90 +
    Math.random() *
    0.20;

  if (
    day >= 6
  ) {

    pitch =
      0.80 +
      Math.random() *
      0.35;
  }

  let volume =
    1.0;

  if (
    day >= 6
  ) {

    volume =
      1.15;
  }

  if (
    day === 8
  ) {

    volume =
      1.3;
  }

  try {

    player.dimension.playSound(
      sound,
      location,
      {
        volume,
        pitch,
      }
    );

    if (DEBUG) {

      player.sendMessage(
        `§8[Fake Sound] §7${sound}`
      );
    }

  } catch (error) {

    console.warn(
      `[HaraldCore] Night sound failed: ${sound} / ${error}`
    );
  }
}

function getBurstCount(day) {

  if (day <= 5) {
    return 1;
  }

  if (day === 6) {
    return Math.random() < 0.20
      ? 2
      : 1;
  }

  if (day === 7) {
    return Math.random() < 0.35
      ? 2
      : 1;
  }

  if (day === 8) {
    return randomInt(1, 2);
  }

  return 1;
}

function playScareEvent(
  player,
  day
) {

  const amount =
    getBurstCount(
      day
    );

  for (
    let i = 0;
    i < amount;
    i++
  ) {

    const delay =
      i === 0
        ? 0
        : randomInt(
            8,
            35
          );

    system.runTimeout(
      () => {

        if (
          !player.isValid
        ) {

          return;
        }

        if (
          !challengeIsActive()
        ) {

          return;
        }

        if (
          !shouldScarePlayer(
            player
          )
        ) {

          return;
        }

        playScarySound(
          player,
          getChallengeDay()
        );

      },

      delay
    );
  }
}

export function registerNightScares() {

  system.runInterval(
    () => {

      if (
        !challengeIsActive()
      ) {

        playerTimers.clear();

        return;
      }

      const day =
        getChallengeDay();

      if (
        day === 1
      ) {

        playerTimers.clear();

        return;
      }

      for (
        const player
        of world.getAllPlayers()
      ) {

        if (
          !shouldScarePlayer(
            player
          )
        ) {

          playerTimers.delete(
            player.id
          );

          continue;
        }

        let state =
          playerTimers.get(
            player.id
          );

        if (!state) {

          state = {

            day,

            dimension:
              player.dimension.id,

            secondsLeft:
              getNextDelay(
                day
              ),
          };

          playerTimers.set(
            player.id,
            state
          );

          continue;
        }

        if (
          state.dimension !==
          player.dimension.id
        ) {

          state.dimension =
            player.dimension.id;

          state.day =
            day;

          state.secondsLeft =
            getNextDelay(
              day
            );

          playerTimers.set(
            player.id,
            state
          );

          continue;
        }

        if (
          state.day !== day
        ) {

          state.day =
            day;

          state.secondsLeft =
            getNextDelay(
              day
            );

          playerTimers.set(
            player.id,
            state
          );

          continue;
        }

        state.secondsLeft--;

        if (
          state.secondsLeft > 0
        ) {

          playerTimers.set(
            player.id,
            state
          );

          continue;
        }

        playScareEvent(
          player,
          day
        );

        state.secondsLeft =
          getNextDelay(
            day
          );

        playerTimers.set(
          player.id,
          state
        );
      }

    },

    20
  );

  world.afterEvents
    .playerLeave
    .subscribe(
      () => {

        playerTimers.clear();
      }
    );
}

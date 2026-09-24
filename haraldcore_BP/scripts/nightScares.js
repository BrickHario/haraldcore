import {
  world,
  system,
} from "@minecraft/server";


/*
 * =========================================================
 * HARALDCORE NIGHT SCARES
 * =========================================================
 *
 * Es werden KEINE Mobs gespawnt.
 * Das Pack spielt nur Fake-Mobgeräusche
 * rund um die Spieler ab.
 *
 * OVERWORLD:
 * Nur nachts.
 *
 * NETHER / END / ANDERE DIMENSIONEN:
 * Immer aktiv.
 *
 * Eskalation:
 *
 * Day 1 -> komplett ruhig
 * Day 2 -> selten normale Mobs
 * Day 3 -> regelmäßiger
 * Day 4 -> erste komische Sounds
 * Day 5 -> Horror beginnt
 * Day 6 -> häufig
 * Day 7 -> sehr häufig
 * Day 8 -> komplette Paranoia
 */

const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const FAILED_KEY =
  "haraldcore:burnStarted";


const TICKS_PER_DAY =
  24000;


const DEBUG =
  false;

const playerTimers =
  new Map();

const SOUNDS_BY_DAY = {

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
    "mob.zombie.wood",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.drowned.say",
    "mob.witch.ambient",
  ],

  4: [
    "mob.zombie.say",
    "mob.zombie.step",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.drowned.say",
    "mob.witch.ambient",

    "mob.endermen.idle",
    "mob.phantom.idle",
  ],

  5: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.drowned.say",
    "mob.witch.ambient",

    "mob.endermen.idle",
    "mob.endermen.stare",

    "mob.phantom.idle",

    "mob.ghast.moan",

    "mob.warden.heartbeat",
  ],

  6: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",

    "mob.ghast.moan",
    "mob.ghast.scream",

    "mob.phantom.idle",
    "mob.phantom.swoop",

    "mob.wither.ambient",

    "mob.warden.heartbeat",
    "mob.warden.listening",
  ],

  7: [
    "mob.zombie.say",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",

    "mob.creeper.say",
    "mob.witch.ambient",

    "mob.endermen.stare",
    "mob.endermen.scream",

    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.phantom.idle",
    "mob.phantom.swoop",

    "mob.wither.ambient",
    "mob.wither.shoot",

    "mob.warden.heartbeat",
    "mob.warden.listening",
    "mob.warden.listening_angry",
    "mob.warden.nearby_close",
    "mob.warden.nearby_closer",
  ],

  8: [
    "mob.zombie.say",
    "mob.zombie.step",
    "mob.zombie.wood",
    "mob.zombie.woodbreak",

    "mob.skeleton.say",
    "mob.skeleton.step",

    "mob.spider.say",
    "mob.spider.step",

    "mob.creeper.say",
    "mob.drowned.say",
    "mob.witch.ambient",

    "mob.endermen.idle",
    "mob.endermen.stare",
    "mob.endermen.scream",

    "mob.ghast.moan",
    "mob.ghast.scream",
    "mob.ghast.charge",

    "mob.phantom.idle",
    "mob.phantom.swoop",

    "mob.wither.ambient",
    "mob.wither.shoot",
    "mob.wither.spawn",

    "mob.warden.heartbeat",
    "mob.warden.listening",
    "mob.warden.listening_angry",
    "mob.warden.nearby_close",
    "mob.warden.nearby_closer",
    "mob.warden.nearby_closest",
    "mob.warden.roar",
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

function getNextDelay(day) {

  switch (day) {

    case 1:
      return 999999;

    case 2:
      return randomInt(
        35,
        60
      );

    case 3:
      return randomInt(
        20,
        35
      );

    case 4:
      return randomInt(
        12,
        22
      );

    case 5:
      return randomInt(
        8,
        14
      );

    case 6:
      return randomInt(
        5,
        9
      );

    case 7:
      return randomInt(
        3,
        6
      );

    case 8:
      return randomInt(
        1,
        3
      );

    default:
      return 30;
  }
}

function getBurstCount(day) {

  if (
    day <= 4
  ) {

    return 1;
  }


  if (
    day === 5
  ) {

    return (
      Math.random() < 0.25
        ? 2
        : 1
    );
  }


  if (
    day === 6
  ) {

    return randomInt(
      1,
      2
    );
  }


  if (
    day === 7
  ) {

    return randomInt(
      1,
      3
    );
  }


  return randomInt(
    2,
    4
  );
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
    SOUNDS_BY_DAY[
      day
    ];


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
          day
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

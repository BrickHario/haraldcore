import {
  world,
  system,
} from "@minecraft/server";


const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const BURN_KEY =
  "haraldcore:burnStarted";


const TICKS_PER_DAY =
  24000;

const NIGHT_6_START =
  TICKS_PER_DAY * 5;

const NIGHT_7_START =
  TICKS_PER_DAY * 6;

const NIGHT_8_START =
  TICKS_PER_DAY * 7;

const CHALLENGE_END =
  TICKS_PER_DAY * 8;

let weatherState =
  "none";

let lightningCountdown =
  5;

function randomInt(
  min,
  max
) {
  return (
    Math.floor(
      Math.random() *
      (max - min + 1)
    ) + min
  );
}

function getPlayedTicks() {
  const ticks =
    world.getDynamicProperty(
      TIMER_KEY
    );

  return (
    typeof ticks === "number"
      ? ticks
      : 0
  );
}

function challengeIsActive() {
  const won =
    world.getDynamicProperty(
      WON_KEY
    ) === true;

  const failed =
    world.getDynamicProperty(
      BURN_KEY
    ) === true;

  return (
    !won &&
    !failed
  );
}

function isMinecraftNight() {
  try {
    const time =
      world.getTimeOfDay();

    return (
      time >= 13000 &&
      time < 23000
    );
  } catch (_) {
    return false;
  }
}

function getStormNight() {
  if (
    !challengeIsActive()
  ) {
    return 0;
  }

  if (
    !isMinecraftNight()
  ) {
    return 0;
  }

  const ticks =
    getPlayedTicks();


  /*
   * Nacht 8
   */
  if (
    ticks >= NIGHT_8_START &&
    ticks < CHALLENGE_END
  ) {
    return 8;
  }


  /*
   * Nacht 7
   */
  if (
    ticks >= NIGHT_7_START &&
    ticks < NIGHT_8_START
  ) {
    return 7;
  }


  /*
   * Nacht 6
   */
  if (
    ticks >= NIGHT_6_START &&
    ticks < NIGHT_7_START
  ) {
    return 6;
  }


  return 0;
}


function startRain() {
  try {
    const overworld =
      world.getDimension(
        "overworld"
      );

    overworld.runCommand(
      "weather rain 1200"
    );
  } catch (error) {
    console.warn(
      `[HaraldCore] Could not start rain: ${error}`
    );
  }
}


function startThunderstorm() {
  try {
    const overworld =
      world.getDimension(
        "overworld"
      );

    overworld.runCommand(
      "weather thunder 1200"
    );
  } catch (error) {
    console.warn(
      `[HaraldCore] Could not start thunderstorm: ${error}`
    );
  }
}


function clearWeather() {
  try {
    const overworld =
      world.getDimension(
        "overworld"
      );

    overworld.runCommand(
      "weather clear 200"
    );
  } catch (_) {}
}


/*
 * Nacht 6:
 * Nur Regen.
 */
function announceNight6() {
  for (
    const player of
    world.getAllPlayers()
  ) {
    try {
      player.onScreenDisplay
        .setTitle(
          "§8§lNIGHT 6",
          {
            subtitle:
              "§7THE SKY IS TURNING DARK.",
            fadeInDuration: 10,
            stayDuration: 40,
            fadeOutDuration: 20,
          }
        );
    } catch (_) {}
  }

  world.sendMessage(
    "§8§lNIGHT 6 §r§7The sky is turning dark."
  );
}


/*
 * Nacht 7:
 * Normales Minecraft-Gewitter.
 *
 * Noch KEINE künstlichen HaraldCore-Blitze.
 */
function announceNight7() {
  for (
    const player of
    world.getAllPlayers()
  ) {
    try {
      player.onScreenDisplay
        .setTitle(
          "§c§lNIGHT 7",
          {
            subtitle:
              "§7THE STORM IS GETTING WORSE.",
            fadeInDuration: 10,
            stayDuration: 40,
            fadeOutDuration: 20,
          }
        );
    } catch (_) {}

    try {
      player.playSound(
        "ambient.weather.thunder"
      );
    } catch (_) {}
  }

  world.sendMessage(
    "§c§lNIGHT 7 §r§7The storm is getting worse."
  );
}


/*
 * Nacht 8:
 * Finales Gewitter.
 *
 * Ab hier kommen zusätzlich
 * die künstlichen Blitze nahe Spielern.
 */
function announceFinalStorm() {
  for (
    const player of
    world.getAllPlayers()
  ) {
    try {
      player.onScreenDisplay
        .setTitle(
          "§4§lFINAL NIGHT",
          {
            subtitle:
              "§cTHE STORM HAS BEGUN.",
            fadeInDuration: 10,
            stayDuration: 50,
            fadeOutDuration: 20,
          }
        );
    } catch (_) {}

    try {
      player.playSound(
        "ambient.weather.thunder"
      );
    } catch (_) {}
  }

  world.sendMessage(
    "§4§lFINAL NIGHT §r§cThe storm has begun."
  );
}


function strikeNearPlayer(
  player
) {
  /*
   * Extra-Blitze nur im Overworld.
   */
  if (
    player.dimension.id !==
    "minecraft:overworld"
  ) {
    return;
  }

  const location =
    player.location;

  const angle =
    Math.random() *
    Math.PI *
    2;

  const distance =
    7 +
    Math.random() *
    9;

  const strikeLocation = {
    x:
      location.x +
      Math.cos(angle) *
      distance,

    y:
      location.y,

    z:
      location.z +
      Math.sin(angle) *
      distance,
  };

  try {
    player.dimension.spawnEntity(
      "minecraft:lightning_bolt",
      strikeLocation
    );
  } catch (error) {
    console.warn(
      `[HaraldCore] Lightning error: ${error}`
    );
  }
}


export function registerFinalStorm() {

  system.runInterval(() => {

    const stormNight =
      getStormNight();

    if (
      stormNight === 8
    ) {
      if (
        weatherState !==
        "final"
      ) {
        weatherState =
          "final";

        lightningCountdown =
          randomInt(
            5,
            10
          );

        startThunderstorm();

        announceFinalStorm();

        return;
      }

      startThunderstorm();

      return;
    }

    if (
      stormNight === 7
    ) {
      if (
        weatherState !==
        "thunder"
      ) {
        weatherState =
          "thunder";

        startThunderstorm();

        announceNight7();

        return;
      }

      startThunderstorm();

      return;
    }

    if (
      stormNight === 6
    ) {
      if (
        weatherState !==
        "rain"
      ) {
        weatherState =
          "rain";

        startRain();

        announceNight6();

        return;
      }

      startRain();

      return;
    }

    if (
      weatherState !==
      "none"
    ) {
      weatherState =
        "none";

      clearWeather();
    }

  }, 200);

  system.runInterval(() => {

    if (
      weatherState !==
      "final"
    ) {
      return;
    }


    if (
      getStormNight() !== 8
    ) {
      return;
    }


    lightningCountdown--;


    if (
      lightningCountdown > 0
    ) {
      return;
    }


    /*
     * Nächster Extra-Blitz
     * nach 5–12 Sekunden.
     */
    lightningCountdown =
      randomInt(
        5,
        12
      );


    const players =
      world.getAllPlayers();


    if (
      players.length === 0
    ) {
      return;
    }


    const player =
      players[
        Math.floor(
          Math.random() *
          players.length
        )
      ];


    strikeNearPlayer(
      player
    );

  }, 20);
}
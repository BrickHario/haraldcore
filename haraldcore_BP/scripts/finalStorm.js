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

const RAIN_DAY_START =
  TICKS_PER_DAY * 6;

const FINAL_DAY_START =
  TICKS_PER_DAY * 7;

const FINAL_DAY_END =
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

function isRainDay() {

  if (
    !challengeIsActive()
  ) {
    return false;
  }


  const ticks =
    getPlayedTicks();


  return (
    ticks >= RAIN_DAY_START &&
    ticks < FINAL_DAY_START
  );

}

function isFinalDay() {

  if (
    !challengeIsActive()
  ) {
    return false;
  }


  const ticks =
    getPlayedTicks();


  return (
    ticks >= FINAL_DAY_START &&
    ticks < FINAL_DAY_END
  );

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
      `[HaraldCore] Could not start final storm: ${error}`
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

function announceRainDay() {

  for (
    const player
    of world.getAllPlayers()
  ) {

    try {

      player.onScreenDisplay
        .setTitle(
          "§8§lDAY 7",
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
    "§8§lDAY 7 §r§7The sky is turning dark."
  );

}

function announceFinalStorm() {

  for (
    const player
    of world.getAllPlayers()
  ) {

    try {

      player.onScreenDisplay
        .setTitle(
          "§4§lFINAL DAY",
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
    "§4§lFINAL DAY §r§cThe storm has begun."
  );

}

function strikeNearPlayer(
  player
) {
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

    if (
      isFinalDay()
    ) {

      if (
        weatherState !==
        "storm"
      ) {

        weatherState =
          "storm";


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
      isRainDay()
    ) {

      if (
        weatherState !==
        "rain"
      ) {

        weatherState =
          "rain";


        startRain();


        announceRainDay();


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
        "storm" ||
      !isFinalDay()
    ) {

      return;

    }


    lightningCountdown--;

    if (
      lightningCountdown > 0
    ) {

      return;

    }

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
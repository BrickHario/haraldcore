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


const TICKS_PER_DAY = 240;

const FINAL_DAY_START =
  TICKS_PER_DAY * 7;

const FINAL_DAY_END =
  TICKS_PER_DAY * 8;


let stormActive = false;

/*
 * Countdown bis zum nächsten
 * extra Blitz.
 *
 * Wird beim Start neu gesetzt.
 */
let lightningCountdown = 5;


/*
 * Zufällige ganze Zahl.
 */
function randomInt(min, max) {
  return (
    Math.floor(
      Math.random() *
      (max - min + 1)
    ) + min
  );
}


/*
 * Prüft, ob wir uns aktuell
 * am achten / letzten Tag befinden.
 */
function isFinalDay() {

  const ticks =
    world.getDynamicProperty(
      TIMER_KEY
    );

  const playedTicks =
    typeof ticks === "number"
      ? ticks
      : 0;


  const won =
    world.getDynamicProperty(
      WON_KEY
    ) === true;


  const failed =
    world.getDynamicProperty(
      BURN_KEY
    ) === true;


  /*
   * Nach Sieg oder Ablauf
   * kein Final-Day-Sturm mehr.
   */
  if (
    won ||
    failed
  ) {
    return false;
  }


  return (
    playedTicks >= FINAL_DAY_START &&
    playedTicks < FINAL_DAY_END
  );
}


/*
 * Gewitter starten / auffrischen.
 */
function startThunderstorm() {

  try {

    const overworld =
      world.getDimension(
        "overworld"
      );


    /*
     * 1200 Ticks = 60 Sekunden.
     *
     * Wird regelmäßig erneuert,
     * damit der Sturm garantiert
     * bestehen bleibt.
     */
    overworld.runCommand(
      "weather thunder 1200"
    );

  } catch (error) {

    console.warn(
      `[HaraldCore] Could not start final storm: ${error}`
    );

  }
}


/*
 * Sturm nach Ende wieder entfernen.
 */
function stopThunderstorm() {

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
 * Extra Blitz in der Nähe
 * eines Spielers.
 */
function strikeNearPlayer(player) {

  /*
   * Wetter funktioniert nur sinnvoll
   * in der Overworld.
   */
  if (
    player.dimension.id !==
    "minecraft:overworld"
  ) {
    return;
  }


  const location =
    player.location;


  /*
   * Blitz soll NICHT direkt
   * auf dem Spieler einschlagen.
   *
   * Entfernung:
   * ungefähr 7–16 Blöcke.
   */
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


/*
 * Optionaler Start-Effekt,
 * wenn Tag 8 erreicht wird.
 */
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


/*
 * ======================================================
 * REGISTER
 * ======================================================
 */

export function registerFinalStorm() {

  /*
   * --------------------------------------------------
   * STORM CONTROL
   * --------------------------------------------------
   *
   * Alle 10 Sekunden kontrollieren.
   */
  system.runInterval(() => {

    const finalDay =
      isFinalDay();


    /*
     * Final Day beginnt.
     */
    if (
      finalDay &&
      !stormActive
    ) {

      stormActive = true;

      lightningCountdown =
        randomInt(
          5,
          10
        );


      startThunderstorm();

      announceFinalStorm();

      return;
    }


    /*
     * Sturm während Tag 8
     * regelmäßig erneuern.
     */
    if (
      finalDay &&
      stormActive
    ) {

      startThunderstorm();

      return;
    }


    /*
     * Final Day vorbei
     * oder Challenge gewonnen.
     */
    if (
      !finalDay &&
      stormActive
    ) {

      stormActive = false;

      stopThunderstorm();

    }

  }, 200);



  /*
   * --------------------------------------------------
   * EXTRA LIGHTNING
   * --------------------------------------------------
   *
   * Jede Sekunde prüfen.
   */
  system.runInterval(() => {

    if (
      !stormActive ||
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


    /*
     * Nächster Blitz wieder
     * in 5–12 Sekunden.
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


    /*
     * Einen zufälligen Spieler auswählen.
     *
     * Dadurch gibt es nicht bei 10 Spielern
     * gleichzeitig 10 Blitze.
     */
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
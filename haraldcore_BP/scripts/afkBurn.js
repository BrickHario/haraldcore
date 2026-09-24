import {
  world,
  system,
} from "@minecraft/server";


const WON_KEY =
  "haraldcore:challengeWon";

const TIMER_KEY =
  "haraldcore:playedTicks";

const TICKS_PER_DAY =
  240;


/*
 * ============================================
 * AKTUELLES AFK-LIMIT
 * ============================================
 *
 * Tag 1–4 = 30 Sekunden
 * Tag 5–7 = 20 Sekunden
 * Tag 8   = 10 Sekunden
 */
function getAfkLimit() {

  const savedTicks =
    world.getDynamicProperty(
      TIMER_KEY
    );

  const ticks =
    typeof savedTicks === "number"
      ? savedTicks
      : 0;


  /*
   * Tag 8 beginnt nach
   * 7 abgeschlossenen Tagen.
   */
  if (
    ticks >=
    TICKS_PER_DAY * 7
  ) {
    return 10;
  }


  /*
   * Tag 5 beginnt nach
   * 4 abgeschlossenen Tagen.
   */
  if (
    ticks >=
    TICKS_PER_DAY * 4
  ) {
    return 20;
  }


  /*
   * Tag 1–4
   */
  return 30;
}


/*
 * ============================================
 * AKTUELLER TAG
 * ============================================
 */
function getCurrentDay() {

  const savedTicks =
    world.getDynamicProperty(
      TIMER_KEY
    );

  const ticks =
    typeof savedTicks === "number"
      ? savedTicks
      : 0;


  const day =
    Math.floor(
      ticks /
      TICKS_PER_DAY
    ) + 1;


  return Math.min(
    Math.max(day, 1),
    8
  );
}


/*
 * ============================================
 * CHALLENGE GEWONNEN?
 * ============================================
 */
function isChallengeWon() {

  return (
    world.getDynamicProperty(
      WON_KEY
    ) === true
  );

}


/*
 * ============================================
 * REGISTER
 * ============================================
 */
export function registerAfkBurn() {

  const playerData =
    new Map();


  /*
   * ==========================================
   * PLAYER SPAWN
   * ==========================================
   */
  world.afterEvents.playerSpawn.subscribe(
    event => {

      const player =
        event.player;


      playerData.set(
        player.name,
        {

          lastPos: {
            x: player.location.x,
            y: player.location.y,
            z: player.location.z,
          },

          idleSeconds: 0,

          justSpawned: true,

          afkPunishment: false,

        }
      );

    }
  );


  /*
   * ==========================================
   * PLAYER LEAVE
   * ==========================================
   */
  world.afterEvents.playerLeave.subscribe(
    event => {

      playerData.delete(
        event.playerName
      );

    }
  );


  /*
   * ==========================================
   * MOVEMENT CHECK
   * ==========================================
   *
   * 20 Ticks = 1 Sekunde
   */
  system.runInterval(() => {

    /*
     * ----------------------------------------
     * NACH SIEG:
     * AFK komplett deaktivieren
     * ----------------------------------------
     */
    if (
      isChallengeWon()
    ) {

      for (
        const player
        of world.getAllPlayers()
      ) {

        try {

          player.onScreenDisplay
            .setActionBar("");

        } catch (_) {}


        try {

          player.removeEffect(
            "fatal_poison"
          );

        } catch (_) {}


        const state =
          playerData.get(
            player.name
          );


        if (state) {

          state.idleSeconds = 0;

          state.afkPunishment =
            false;


          state.lastPos = {

            x: player.location.x,
            y: player.location.y,
            z: player.location.z,

          };


          playerData.set(
            player.name,
            state
          );
        }

      }


      return;
    }


    /*
     * WICHTIG:
     *
     * Das Limit wird JEDE SEKUNDE
     * neu aus playedTicks gelesen.
     *
     * Dadurch ändert sich:
     *
     * 30 -> 20 -> 10
     *
     * automatisch.
     */
    const maxIdleTime =
      getAfkLimit();


    const currentDay =
      getCurrentDay();


    for (
      const player
      of world.getAllPlayers()
    ) {

      let state =
        playerData.get(
          player.name
        );


      /*
       * Falls Spieler noch nicht
       * im Speicher vorhanden ist.
       */
      if (!state) {

        state = {

          lastPos: {

            x: player.location.x,
            y: player.location.y,
            z: player.location.z,

          },

          idleSeconds: 0,

          justSpawned: true,

          afkPunishment: false,

        };

      }


      /*
       * ----------------------------------------
       * ERSTE SEKUNDE NACH SPAWN
       * ----------------------------------------
       */
      if (
        state.justSpawned
      ) {

        state.lastPos = {

          x: player.location.x,
          y: player.location.y,
          z: player.location.z,

        };


        state.idleSeconds = 0;

        state.justSpawned =
          false;

        state.afkPunishment =
          false;

      }


      /*
       * ----------------------------------------
       * NORMALE BEWEGUNGSPRÜFUNG
       * ----------------------------------------
       */
      else {

        const oldX =
          Math.floor(
            state.lastPos.x
          );

        const oldY =
          Math.floor(
            state.lastPos.y
          );

        const oldZ =
          Math.floor(
            state.lastPos.z
          );


        const newX =
          Math.floor(
            player.location.x
          );

        const newY =
          Math.floor(
            player.location.y
          );

        const newZ =
          Math.floor(
            player.location.z
          );


        /*
         * Mindestens eine
         * Blockkoordinate geändert.
         */
        const moved =
          oldX !== newX ||
          oldY !== newY ||
          oldZ !== newZ;


        /*
         * ------------------------------------
         * BEWEGT
         * ------------------------------------
         */
        if (moved) {

          state.lastPos = {

            x: player.location.x,
            y: player.location.y,
            z: player.location.z,

          };


          state.idleSeconds = 0;

          state.afkPunishment =
            false;

        }


        /*
         * ------------------------------------
         * NICHT BEWEGT
         * ------------------------------------
         */
        else {

          state.idleSeconds++;

        }

      }


      /*
       * ======================================
       * AFK LIMIT ERREICHT?
       * ======================================
       */
      if (
        state.idleSeconds >=
        maxIdleTime
      ) {

        state.afkPunishment =
          true;

      }


      /*
       * ======================================
       * BAR
       * ======================================
       *
       * Diese Länge verändert sich wirklich:
       *
       * Tag 1–4 = 30 Blöcke
       * Tag 5–7 = 20 Blöcke
       * Tag 8   = 10 Blöcke
       */
      const progress =
        Math.min(
          state.idleSeconds,
          maxIdleTime
        );


      const remaining =
        Math.max(
          maxIdleTime -
          progress,
          0
        );


      const bar =
        "§c" +

        "█".repeat(
          progress
        ) +

        "§7" +

        "█".repeat(
          remaining
        );


      /*
       * ======================================
       * FARBE JE NACH TAG
       * ======================================
       */
      let titleColor =
        "§e";


      /*
       * Tag 5–7
       */
      if (
        currentDay >= 5 &&
        currentDay <= 7
      ) {

        titleColor =
          "§6";

      }


      /*
       * Tag 8
       */
      if (
        currentDay === 8
      ) {

        titleColor =
          "§4";

      }


      /*
       * ======================================
       * ACTIONBAR
       * ======================================
       */
      try {

        player.onScreenDisplay
          .setActionBar(

            `${titleColor}Move or Die §r${bar} §f(${progress}/${maxIdleTime})`

          );

      } catch (_) {}


      /*
       * Zustand speichern.
       */
      playerData.set(
        player.name,
        state
      );

    }

  }, 20);



  /*
   * ==========================================
   * AFK STRAFE
   * ==========================================
   */
  system.runInterval(() => {

    /*
     * Nach Sieg keine Strafe.
     */
    if (
      isChallengeWon()
    ) {
      return;
    }


    /*
     * Ebenfalls immer das
     * AKTUELLE Tageslimit benutzen.
     */
    const maxIdleTime =
      getAfkLimit();


    for (
      const player
      of world.getAllPlayers()
    ) {

      const state =
        playerData.get(
          player.name
        );


      if (!state) {
        continue;
      }


      /*
       * Wichtig beim Tageswechsel:
       *
       * Beispiel:
       *
       * Tag 4:
       * Spieler steht schon 23 Sekunden.
       *
       * Tag 5 startet.
       *
       * Neues Limit = 20.
       *
       * -> sofort AFK.
       */
      if (
        state.idleSeconds >=
        maxIdleTime
      ) {

        state.afkPunishment =
          true;

      }


      if (
        !state.afkPunishment
      ) {
        continue;
      }


      /*
       * ======================================
       * FATAL POISON
       * ======================================
       */
      try {

        player.addEffect(
          "fatal_poison",
          60,
          {

            amplifier: 1,

            showParticles: true,

          }
        );


        /*
         * Zusätzlicher Schaden.
         */
        player.applyDamage(
          1
        );


      } catch (_) {}

    }

  }, 20);

}
import {
  world,
  system,
} from "@minecraft/server";


/*
 * =========================================================
 * HARALDCORE NO PROGRESS PUNISHMENT
 * =========================================================
 *
 * 1 Tag ohne neuen Task:
 * -> 10 Sekunden Darkness + Nausea
 *
 * 2 Tage ohne neuen Task:
 * -> 20 Sekunden Darkness + Nausea
 *
 * 3 Tage ohne neuen Task:
 * -> 30 Sekunden Darkness + Nausea
 *
 * usw.
 *
 * Sobald irgendein Task geschafft wird:
 *
 * -> Darkness sofort entfernen
 * -> Nausea sofort entfernen
 * -> No-Progress-Timer zurücksetzen
 * -> No-Progress-Days wieder auf 0
 */


const TIMER_KEY =
  "haraldcore:playedTicks";

const WON_KEY =
  "haraldcore:challengeWon";

const FAILED_KEY =
  "haraldcore:burnStarted";

const LAST_PROGRESS_KEY =
  "haraldcore:lastTaskProgress";

const LAST_DONE_COUNT_KEY =
  "haraldcore:lastDoneCount";

const NO_PROGRESS_DAYS_KEY =
  "haraldcore:noProgressDays";

const TICKS_PER_DAY =
  24000;

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

function getCompletedTaskCount() {

  const todo =
    world.scoreboard.getObjective(
      "todo"
    );


  if (!todo) {
    return 0;
  }


  let completed =
    0;


  for (
    const task
    of TASKS
  ) {

    try {

      if (
        todo.hasParticipant(
          `§a✔ ${task}`
        )
      ) {

        completed++;

      }

    } catch (_) {}

  }


  return completed;
}

function getPlayedTicks() {

  const value =
    world.getDynamicProperty(
      TIMER_KEY
    );


  return (
    typeof value === "number"
      ? value
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
      FAILED_KEY
    ) === true;


  return (
    !won &&
    !failed
  );
}

function stopPunishment() {

  for (
    const player
    of world.getAllPlayers()
  ) {

    try {

      player.removeEffect(
        "darkness"
      );

    } catch (_) {}

    try {

      player.removeEffect(
        "nausea"
      );

    } catch (_) {}

    try {

      player.onScreenDisplay
        .setTitle(
          "",
          {
            subtitle: "",
            fadeInDuration: 0,
            stayDuration: 0,
            fadeOutDuration: 0,
          }
        );

    } catch (_) {}

  }

}

function punishPlayers(
  noProgressDays
) {

  const punishmentSeconds =
    noProgressDays * 10;

  const punishmentTicks =
    punishmentSeconds * 20;

  world.sendMessage(
    "§4§lNO PROGRESS."
  );


  world.sendMessage(
    `§c${noProgressDays} day${noProgressDays === 1 ? "" : "s"} without completing a task.`
  );


  world.sendMessage(
    `§8The curse torments you for ${punishmentSeconds} seconds.`
  );

  for (
    const player
    of world.getAllPlayers()
  ) {

    try {

      player.addEffect(
        "darkness",
        punishmentTicks,
        {
          amplifier: 0,
          showParticles: false,
        }
      );

    } catch (_) {}

    try {

      player.addEffect(
        "nausea",
        punishmentTicks,
        {
          amplifier: 0,
          showParticles: false,
        }
      );

    } catch (_) {}

    try {

      player.onScreenDisplay
        .setTitle(
          "§4§lNO PROGRESS",
          {
            subtitle:
              `§8${noProgressDays} DAY${noProgressDays === 1 ? "" : "S"} WASTED. THE CURSE GROWS STRONGER.`,
            fadeInDuration: 10,
            stayDuration: 50,
            fadeOutDuration: 20,
          }
        );

    } catch (_) {}

    try {

      player.playSound(
        "mob.warden.heartbeat",
        {
          volume: 1.2,
          pitch: 0.8,
        }
      );

    } catch (_) {}

  }

}


export function registerNoProgressPunishment() {

  system.runInterval(() => {

    if (
      !challengeIsActive()
    ) {

      return;

    }


    const playedTicks =
      getPlayedTicks();


    const completedTasks =
      getCompletedTaskCount();

    const savedDoneCount =
      world.getDynamicProperty(
        LAST_DONE_COUNT_KEY
      );


    const lastDoneCount =
      typeof savedDoneCount === "number"
        ? savedDoneCount
        : completedTasks;

    const savedProgress =
      world.getDynamicProperty(
        LAST_PROGRESS_KEY
      );


    if (
      typeof savedProgress !==
      "number"
    ) {

      /*
       * Aktuelle Zeit als Startpunkt.
       */
      world.setDynamicProperty(
        LAST_PROGRESS_KEY,
        playedTicks
      );


      /*
       * Aktuelle Anzahl fertiger Tasks.
       */
      world.setDynamicProperty(
        LAST_DONE_COUNT_KEY,
        completedTasks
      );


      /*
       * Noch kein No-Progress-Tag.
       */
      world.setDynamicProperty(
        NO_PROGRESS_DAYS_KEY,
        0
      );


      return;
    }


    /*
     * =====================================================
     * NEUER TASK GESCHAFFT
     * =====================================================
     */

    if (
      completedTasks >
      lastDoneCount
    ) {

      /*
       * Laufende Darkness +
       * Nausea sofort abbrechen.
       */
      stopPunishment();


      /*
       * Timer ab jetzt neu starten.
       */
      world.setDynamicProperty(
        LAST_PROGRESS_KEY,
        playedTicks
      );


      /*
       * Neuen Task-Stand speichern.
       */
      world.setDynamicProperty(
        LAST_DONE_COUNT_KEY,
        completedTasks
      );


      /*
       * Eskalation zurücksetzen.
       */
      world.setDynamicProperty(
        NO_PROGRESS_DAYS_KEY,
        0
      );


      return;
    }


    /*
     * =====================================================
     * TASKANZAHL ANDERS VERÄNDERT
     * =====================================================
     */

    if (
      completedTasks !==
      lastDoneCount
    ) {

      world.setDynamicProperty(
        LAST_DONE_COUNT_KEY,
        completedTasks
      );

    }


    /*
     * =====================================================
     * WIE LANGE OHNE NEUEN TASK?
     * =====================================================
     */

    const lastProgress =
      world.getDynamicProperty(
        LAST_PROGRESS_KEY
      );


    /*
     * Sicherheitscheck.
     */
    if (
      typeof lastProgress !==
      "number"
    ) {

      world.setDynamicProperty(
        LAST_PROGRESS_KEY,
        playedTicks
      );


      return;
    }


    const noProgressTicks =
      playedTicks -
      lastProgress;


    /*
     * Noch kein kompletter
     * HaraldCore-Tag vergangen.
     */
    if (
      noProgressTicks <
      TICKS_PER_DAY
    ) {

      return;
    }


    /*
     * =====================================================
     * NÄCHSTER TAG OHNE FORTSCHRITT
     * =====================================================
     */

    const savedDays =
      world.getDynamicProperty(
        NO_PROGRESS_DAYS_KEY
      );


    const oldDays =
      typeof savedDays === "number"
        ? savedDays
        : 0;


    const newDays =
      oldDays + 1;


    /*
     * Neue Anzahl Tage speichern.
     */
    world.setDynamicProperty(
      NO_PROGRESS_DAYS_KEY,
      newDays
    );


    /*
     * =========================================
     * STRAFE
     * =========================================
     *
     * Tag 1:
     * 10 Sekunden Darkness + Nausea
     *
     * Tag 2:
     * 20 Sekunden Darkness + Nausea
     *
     * Tag 3:
     * 30 Sekunden Darkness + Nausea
     *
     * usw.
     */
    punishPlayers(
      newDays
    );


    /*
     * Timer für den nächsten
     * kompletten Tag neu starten.
     */
    world.setDynamicProperty(
      LAST_PROGRESS_KEY,
      playedTicks
    );

  }, 20);

}
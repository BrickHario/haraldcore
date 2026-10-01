import {
  world,
  system
} from "@minecraft/server";


const TICKS_PER_DAY =
  24000;


const TIMER_KEY =
  "haraldcore:playedTicks";


const WON_KEY =
  "haraldcore:challengeWon";


const VILLAGES_KEY =
  "haraldcore:villages";


const VILLAGE_COUNT_KEY =
  "haraldcore:villageCount";


const PLAYER_RAID_KEY =
  "haraldcore:villageRaidOmen";


const VISITED_VILLAGES_KEY =
  "haraldcore:visitedVillages";


/*
 * Speichert pro Spieler,
 * bei welchen Dörfern er die
 * VISA EXPIRED Meldung bereits
 * gesehen hat.
 */
const EXPIRED_VISA_SEEN_KEY =
  "haraldcore:expiredVisaSeenVillages";


const VILLAGER_SCAN_RADIUS =
  40;


const BELL_VILLAGER_RADIUS =
  48;


const VILLAGE_ENTER_RADIUS =
  60;


const VILLAGE_VERTICAL_RADIUS =
  32;


const VILLAGE_MERGE_RADIUS =
  128;


const SCAN_INTERVAL =
  100;


const SCAN_MOVE_DISTANCE =
  16;


const SCAN_MAX_WAIT =
  400;


const RAID_REINFORCE_DELAY =
  700;


const RAIDER_CHECK_RADIUS =
  80;


const RAIDER_TARGETS = [
  {
    type:
      "minecraft:pillager",

    amount:
      6,
  },

  {
    type:
      "minecraft:vindicator",

    amount:
      3,
  },

  {
    type:
      "minecraft:witch",

    amount:
      1,
  },

  {
    type:
      "minecraft:ravager",

    amount:
      2,
  },
];


let villages = [];


let initialized =
  false;


const playerScanState =
  new Map();


const playerVillageState =
  new Map();


/*
 * ========================================
 * GLOBALER HARALDCORE TIMER
 * ========================================
 */

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


function challengeWon() {

  return (
    world.getDynamicProperty(
      WON_KEY
    ) === true
  );
}


/*
 * ========================================
 * VILLAGE SPEICHERN / LADEN
 * ========================================
 */

function loadVillages() {

  const saved =
    world.getDynamicProperty(
      VILLAGES_KEY
    );


  if (
    typeof saved !== "string" ||
    !saved
  ) {
    return [];
  }


  try {

    const parsed =
      JSON.parse(
        saved
      );


    if (
      !Array.isArray(
        parsed
      )
    ) {
      return [];
    }


    /*
     * Alte gespeicherte Dörfer
     * kompatibel mit dem neuen
     * raidStarting State machen.
     */
    for (
      const village of
      parsed
    ) {

      if (
        typeof village.cursed !==
        "boolean"
      ) {
        village.cursed =
          false;
      }


      if (
        typeof village.raidStarted !==
        "boolean"
      ) {
        village.raidStarted =
          false;
      }


      /*
       * Nach Welt-Reload niemals
       * in einem alten "starting"
       * Zustand hängen bleiben.
       */
      village.raidStarting =
        false;
    }


    return parsed;

  } catch (_) {

    return [];
  }
}


function saveVillages() {

  try {

    world.setDynamicProperty(
      VILLAGES_KEY,
      JSON.stringify(
        villages
      )
    );


    world.setDynamicProperty(
      VILLAGE_COUNT_KEY,
      villages.length
    );

  } catch (_) {}
}


function getNextVillageId() {

  let highest =
    0;


  for (
    const village of
    villages
  ) {

    if (
      typeof village.id ===
        "number" &&
      village.id > highest
    ) {

      highest =
        village.id;
    }
  }


  return highest + 1;
}


/*
 * ========================================
 * DISTANZ / VILLAGE FINDER
 * ========================================
 */

function distanceSquared(
  a,
  b
) {

  const dx =
    a.x - b.x;


  const dz =
    a.z - b.z;


  return (
    dx * dx +
    dz * dz
  );
}


function findVillageById(
  id
) {

  for (
    const village of
    villages
  ) {

    if (
      village.id === id
    ) {

      return village;
    }
  }


  return undefined;
}


function findKnownVillageNear(
  dimensionId,
  location,
  radius
) {

  const maxDistance =
    radius * radius;


  let result =
    undefined;


  let closest =
    Infinity;


  for (
    const village of
    villages
  ) {

    if (
      village.dimension !==
      dimensionId
    ) {
      continue;
    }


    const distance =
      distanceSquared(
        location,
        village
      );


    if (
      distance <=
        maxDistance &&
      distance <
        closest
    ) {

      closest =
        distance;


      result =
        village;
    }
  }


  return result;
}


function playerInsideVillage(
  player,
  village
) {

  if (
    !player ||
    !village
  ) {
    return false;
  }


  try {

    if (
      player.dimension.id !==
      village.dimension
    ) {
      return false;
    }


    if (
      Math.abs(
        player.location.y -
        village.y
      ) >
      VILLAGE_VERTICAL_RADIUS
    ) {
      return false;
    }


    return (
      distanceSquared(
        player.location,
        village
      ) <=
      VILLAGE_ENTER_RADIUS *
      VILLAGE_ENTER_RADIUS
    );

  } catch (_) {

    return false;
  }
}


/*
 * Gibt den Spieler zurück,
 * der dem Dorfzentrum aktuell
 * am nächsten ist.
 *
 * Es spielt KEINE Rolle,
 * wer das Dorf entdeckt hat.
 */
function findPlayerInsideVillage(
  village
) {

  let result =
    undefined;


  let closest =
    Infinity;


  for (
    const player of
    world.getPlayers()
  ) {

    if (
      !playerInsideVillage(
        player,
        village
      )
    ) {
      continue;
    }


    const distance =
      distanceSquared(
        player.location,
        village
      );


    if (
      distance <
      closest
    ) {

      closest =
        distance;


      result =
        player;
    }
  }


  return result;
}


/*
 * ========================================
 * VILLAGER SCAN
 * ========================================
 */

function getNearbyVillagers(
  dimension,
  location,
  radius
) {

  const result =
    new Map();


  try {

    const villagers =
      dimension.getEntities({
        type:
          "minecraft:villager_v2",

        location,

        maxDistance:
          radius,

        closest:
          4,
      });


    for (
      const villager of
      villagers
    ) {

      result.set(
        villager.id,
        villager
      );
    }

  } catch (_) {}


  try {

    const villagers =
      dimension.getEntities({
        type:
          "minecraft:villager",

        location,

        maxDistance:
          radius,

        closest:
          4,
      });


    for (
      const villager of
      villagers
    ) {

      result.set(
        villager.id,
        villager
      );
    }

  } catch (_) {}


  return [
    ...result.values()
  ];
}


function getVillagerCenter(
  villagers
) {

  if (
    villagers.length === 0
  ) {
    return undefined;
  }


  let x = 0;
  let y = 0;
  let z = 0;


  for (
    const villager of
    villagers
  ) {

    x +=
      villager.location.x;


    y +=
      villager.location.y;


    z +=
      villager.location.z;
  }


  return {

    x:
      x /
      villagers.length,

    y:
      y /
      villagers.length,

    z:
      z /
      villagers.length,

  };
}


/*
 * ========================================
 * VISITED VILLAGES
 * ========================================
 */

function hasVisitedVillage(
  player,
  village
) {

  try {

    const saved =
      player.getDynamicProperty(
        VISITED_VILLAGES_KEY
      );


    const visited =
      typeof saved === "string"
        ? JSON.parse(
            saved
          )
        : [];


    return (
      Array.isArray(
        visited
      ) &&
      visited.includes(
        village.id
      )
    );

  } catch (_) {

    return false;
  }
}


function markVillageVisited(
  player,
  village
) {

  if (
    hasVisitedVillage(
      player,
      village
    )
  ) {
    return;
  }


  try {

    const saved =
      player.getDynamicProperty(
        VISITED_VILLAGES_KEY
      );


    const visited =
      typeof saved === "string"
        ? JSON.parse(
            saved
          )
        : [];


    const list =
      Array.isArray(
        visited
      )
        ? visited
        : [];


    list.push(
      village.id
    );


    player.setDynamicProperty(
      VISITED_VILLAGES_KEY,
      JSON.stringify(
        list
      )
    );

  } catch (_) {}
}


/*
 * ========================================
 * VISA EXPIRED PRO SPIELER
 * ========================================
 */

function hasSeenExpiredVisa(
  player,
  village
) {

  try {

    const saved =
      player.getDynamicProperty(
        EXPIRED_VISA_SEEN_KEY
      );


    const seen =
      typeof saved === "string"
        ? JSON.parse(
            saved
          )
        : [];


    return (
      Array.isArray(
        seen
      ) &&
      seen.includes(
        village.id
      )
    );

  } catch (_) {

    return false;
  }
}


function markExpiredVisaSeen(
  player,
  village
) {

  if (
    hasSeenExpiredVisa(
      player,
      village
    )
  ) {
    return;
  }


  try {

    const saved =
      player.getDynamicProperty(
        EXPIRED_VISA_SEEN_KEY
      );


    const seen =
      typeof saved === "string"
        ? JSON.parse(
            saved
          )
        : [];


    const list =
      Array.isArray(
        seen
      )
        ? seen
        : [];


    list.push(
      village.id
    );


    player.setDynamicProperty(
      EXPIRED_VISA_SEEN_KEY,
      JSON.stringify(
        list
      )
    );

  } catch (_) {}
}


/*
 * VISA EXPIRED wird NICHT
 * mehr global gesendet.
 *
 * Nur dieser Spieler sieht es,
 * wenn er JETZT wirklich in
 * genau diesem Dorf steht.
 */
function announceExpiredVisaToPlayer(
  player,
  village
) {

  if (
    !playerInsideVillage(
      player,
      village
    )
  ) {
    return;
  }


  if (
    hasSeenExpiredVisa(
      player,
      village
    )
  ) {
    return;
  }


  markExpiredVisaSeen(
    player,
    village
  );


  try {

    player.sendMessage(
      "§4§lVISA EXPIRED!"
    );


    player.sendMessage(
      "§4§lRUN! §cVILLAGE POLICE are coming!"
    );


    player.playSound(
      "note.bass"
    );

  } catch (_) {}
}


/*
 * Wird genau in dem Moment benutzt,
 * in dem ein Dorf cursed wird.
 *
 * Nur Spieler, die JETZT dort stehen,
 * bekommen die Nachricht.
 */
function announceExpiredVisaToPlayersInside(
  village
) {

  for (
    const player of
    world.getPlayers()
  ) {

    if (
      !playerInsideVillage(
        player,
        village
      )
    ) {
      continue;
    }


    announceExpiredVisaToPlayer(
      player,
      village
    );
  }
}


/*
 * ========================================
 * VILLAGE REGISTRIEREN
 * ========================================
 */

function registerVillage(
  player,
  location
) {

  const existing =
    findKnownVillageNear(
      player.dimension.id,
      location,
      VILLAGE_MERGE_RADIUS
    );


  if (existing) {

    enterKnownVillage(
      player,
      existing
    );


    return existing;
  }


  const village = {

    id:
      getNextVillageId(),

    dimension:
      player.dimension.id,

    x:
      Math.round(
        location.x
      ),

    y:
      Math.round(
        location.y
      ),

    z:
      Math.round(
        location.z
      ),

    discoveredAt:
      getPlayedTicks(),

    cursed:
      false,

    /*
     * true =
     * Raid wurde erfolgreich
     * durch Vanilla gestartet.
     */
    raidStarted:
      false,

    /*
     * true =
     * gerade läuft ein Versuch,
     * einem Spieler Bad Omen
     * zu geben.
     *
     * Verhindert mehrere
     * gleichzeitige Startversuche.
     */
    raidStarting:
      false,

  };


  villages.push(
    village
  );


  saveVillages();


  playerVillageState.set(
    player.id,
    village.id
  );


  markVillageVisited(
    player,
    village
  );


  try {

    player.sendMessage(
      "§aWelcome to the village. §eYour Visa expires in 1 day."
    );


    player.playSound(
      "random.levelup"
    );

  } catch (_) {}


  return village;
}


/*
 * ========================================
 * DORF BETRETEN
 * ========================================
 */

function enterKnownVillage(
  player,
  village
) {

  if (
    playerVillageState.get(
      player.id
    ) === village.id
  ) {
    return;
  }


  playerVillageState.set(
    player.id,
    village.id
  );


  if (
    !hasVisitedVillage(
      player,
      village
    )
  ) {

    markVillageVisited(
      player,
      village
    );


    if (
      !village.cursed
    ) {

      try {

        player.sendMessage(
          "§eWelcome! This village was already found and your visa expires soon."
        );


        player.playSound(
          "random.levelup"
        );

      } catch (_) {}
    }
  }


  /*
   * Dorf ist bereits abgelaufen.
   *
   * Spieler bekommt erst beim
   * tatsächlichen Betreten
   * VISA EXPIRED.
   */
  if (
    village.cursed
  ) {

    handleVillageEntry(
      player,
      village
    );
  }
}


/*
 * ========================================
 * SCAN MOVEMENT
 * ========================================
 */

function shouldScanPlayer(
  player
) {

  const now =
    system.currentTick;


  const state =
    playerScanState.get(
      player.id
    );


  if (!state) {

    playerScanState.set(
      player.id,
      {

        x:
          player.location.x,

        z:
          player.location.z,

        dimension:
          player.dimension.id,

        tick:
          now,

      }
    );


    return true;
  }


  if (
    state.dimension !==
    player.dimension.id
  ) {

    state.x =
      player.location.x;


    state.z =
      player.location.z;


    state.dimension =
      player.dimension.id;


    state.tick =
      now;


    return true;
  }


  const dx =
    player.location.x -
    state.x;


  const dz =
    player.location.z -
    state.z;


  const movedEnough =
    (
      dx * dx +
      dz * dz
    ) >=
    (
      SCAN_MOVE_DISTANCE *
      SCAN_MOVE_DISTANCE
    );


  const waitedEnough =
    (
      now -
      state.tick
    ) >=
    SCAN_MAX_WAIT;


  if (
    !movedEnough &&
    !waitedEnough
  ) {

    return false;
  }


  state.x =
    player.location.x;


  state.z =
    player.location.z;


  state.tick =
    now;


  return true;
}


/*
 * ========================================
 * RAID OMEN
 * ========================================
 */

function hasRaidOmen(
  player
) {

  try {

    return !!player.getEffect(
      "raid_omen"
    );

  } catch (_) {

    return false;
  }
}


/*
 * ========================================
 * RAIDER COUNT
 * ========================================
 */

function getRaiderCount(
  dimension,
  village,
  type
) {

  try {

    return dimension
      .getEntities({
        type,

        location: {
          x:
            village.x,

          y:
            village.y,

          z:
            village.z,
        },

        maxDistance:
          RAIDER_CHECK_RADIUS,
      })
      .length;

  } catch (_) {

    return 0;
  }
}


function getRaiderSpawnLocation(
  player
) {

  const angle =
    Math.random() *
    Math.PI *
    2;


  const distance =
    10 +
    Math.random() *
    8;


  return {

    x:
      player.location.x +
      Math.cos(
        angle
      ) *
      distance,

    y:
      player.location.y +
      1,

    z:
      player.location.z +
      Math.sin(
        angle
      ) *
      distance,

  };
}


/*
 * ========================================
 * RAID REINFORCEMENT
 * ========================================
 */

function reinforceVillage(
  village,
  player
) {

  if (
    !village ||
    !village.cursed ||
    !player
  ) {

    return;
  }


  if (
    !playerInsideVillage(
      player,
      village
    )
  ) {

    return;
  }


  const dimension =
    player.dimension;


  for (
    const target of
    RAIDER_TARGETS
  ) {

    const existing =
      getRaiderCount(
        dimension,
        village,
        target.type
      );


    const missing =
      Math.max(
        0,
        target.amount -
        existing
      );


    for (
      let i = 0;
      i < missing;
      i++
    ) {

      try {

        const raider =
          dimension.spawnEntity(
            target.type,
            getRaiderSpawnLocation(
              player
            )
          );


        try {

          raider.addTag(
            "haraldcore_village_raider"
          );

        } catch (_) {}

      } catch (_) {}
    }
  }
}


/*
 * ========================================
 * RAID START
 * ========================================
 *
 * Wichtig:
 *
 * Der ursprüngliche Entdecker ist
 * komplett irrelevant.
 *
 * Jeder Spieler, der in diesem
 * cursed Village steht, kann
 * den Raid auslösen.
 */
function startRaidOmen(
  player,
  village
) {

  if (
    !player ||
    !village
  ) {
    return;
  }


  if (
    !village.cursed
  ) {
    return;
  }


  if (
    village.raidStarted
  ) {
    return;
  }


  if (
    village.raidStarting
  ) {
    return;
  }


  /*
   * Spieler muss aktuell
   * wirklich dort stehen.
   */
  if (
    !playerInsideVillage(
      player,
      village
    )
  ) {
    return;
  }


  /*
   * Startversuch sperren.
   */
  village.raidStarting =
    true;


  saveVillages();


  /*
   * Alte Omen entfernen.
   */
  try {

    player.removeEffect(
      "raid_omen"
    );


    player.removeEffect(
      "bad_omen"
    );

  } catch (_) {}


  /*
   * HaraldCore Bad Omen geben.
   */
  try {

    player.addEffect(
      "bad_omen",
      100,
      {
        amplifier:
          0,

        showParticles:
          true,
      }
    );

  } catch (_) {

    /*
     * Hat nicht funktioniert.
     *
     * Dorf wieder freigeben,
     * damit ein anderer Spieler
     * es versuchen kann.
     */
    village.raidStarting =
      false;


    saveVillages();


    return;
  }


  try {

    player.setDynamicProperty(
      PLAYER_RAID_KEY,
      true
    );

  } catch (_) {}


  const villageId =
    village.id;


  /*
   * Vanilla etwas Zeit geben,
   * Bad Omen -> Raid Omen
   * umzuwandeln.
   */
  system.runTimeout(
    () => {

      const savedVillage =
        findVillageById(
          villageId
        );


      if (!savedVillage) {
        return;
      }


      let playerStillInside =
        false;


      try {

        playerStillInside =
          playerInsideVillage(
            player,
            savedVillage
          );

      } catch (_) {

        playerStillInside =
          false;
      }


      let raidOmen =
        false;


      if (
        playerStillInside
      ) {

        try {

          raidOmen =
            !!player.getEffect(
              "raid_omen"
            );

        } catch (_) {

          raidOmen =
            false;
        }
      }


      /*
       * Spieler ist:
       *
       * - gestorben
       * - weggegangen
       * - ausgeloggt
       * - oder Vanilla hat keinen
       *   Raid gestartet
       *
       * Dann wird das Dorf wieder
       * freigegeben.
       *
       * Ein anderer Spieler kann
       * beim nächsten Check übernehmen.
       */
      if (
        !playerStillInside ||
        !raidOmen
      ) {

        try {

          player.removeEffect(
            "bad_omen"
          );

        } catch (_) {}


        try {

          player.setDynamicProperty(
            PLAYER_RAID_KEY,
            false
          );

        } catch (_) {}


        savedVillage.raidStarting =
          false;


        saveVillages();


        return;
      }


      /*
       * Vanilla Raid erfolgreich.
       */
      savedVillage.raidStarting =
        false;


      savedVillage.raidStarted =
        true;


      saveVillages();


      /*
       * Etwas später zusätzliche
       * HaraldCore Raider.
       *
       * Auch hier wird NICHT der
       * ursprüngliche Entdecker benutzt.
       */
      system.runTimeout(
        () => {

          const target =
            findPlayerInsideVillage(
              savedVillage
            );


          if (!target) {
            return;
          }


          reinforceVillage(
            savedVillage,
            target
          );

        },
        RAID_REINFORCE_DELAY
      );

    },
    5
  );
}


/*
 * ========================================
 * CURSED VILLAGE ENTRY
 * ========================================
 */

function handleVillageEntry(
  player,
  village
) {

  if (
    !village.cursed
  ) {
    return;
  }


  /*
   * Nur dieser Spieler sieht
   * die VISA EXPIRED Meldung.
   */
  announceExpiredVisaToPlayer(
    player,
    village
  );


  /*
   * Raid noch nicht gestartet:
   *
   * Dieser Spieler kann den
   * Raid jetzt auslösen.
   */
  if (
    !village.raidStarted
  ) {

    startRaidOmen(
      player,
      village
    );


    return;
  }


  /*
   * Raid läuft bereits.
   */
  if (
    hasRaidOmen(
      player
    )
  ) {

    return;
  }


  reinforceVillage(
    village,
    player
  );
}


/*
 * ========================================
 * PENDING CURSED VILLAGES
 * ========================================
 *
 * Sehr wichtig für:
 *
 * Spieler A entdeckt Dorf
 * Spieler A stirbt
 * Visa läuft ab
 * Spieler B ist dort
 *
 * -> Spieler B bekommt Bad Omen.
 */
function updatePendingVillageRaids() {

  for (
    const village of
    villages
  ) {

    if (
      !village.cursed
    ) {
      continue;
    }


    if (
      village.raidStarted
    ) {
      continue;
    }


    if (
      village.raidStarting
    ) {
      continue;
    }


    /*
     * Irgendeinen Spieler nehmen,
     * der aktuell im Dorf steht.
     */
    const player =
      findPlayerInsideVillage(
        village
      );


    /*
     * Niemand da:
     *
     * Dorf bleibt einfach cursed
     * und wartet.
     */
    if (!player) {
      continue;
    }


    /*
     * Nur der Spieler im Dorf
     * bekommt die Meldung.
     */
    announceExpiredVisaToPlayer(
      player,
      village
    );


    startRaidOmen(
      player,
      village
    );
  }
}


/*
 * ========================================
 * KNOWN VILLAGE ENTRY CHECK
 * ========================================
 */

function updateKnownVillageEntries() {

  for (
    const player of
    world.getPlayers()
  ) {

    if (
      player.dimension.id !==
      "minecraft:overworld"
    ) {

      playerVillageState.delete(
        player.id
      );


      continue;
    }


    const village =
      findKnownVillageNear(
        player.dimension.id,
        player.location,
        VILLAGE_ENTER_RADIUS
      );


    const previousVillage =
      playerVillageState.get(
        player.id
      );


    if (!village) {

      if (
        previousVillage !==
        undefined
      ) {

        playerVillageState.delete(
          player.id
        );
      }


      continue;
    }


    if (
      previousVillage ===
      village.id
    ) {

      /*
       * Wichtig:
       *
       * Wenn der Spieler schon im Dorf
       * stand, während es cursed wurde,
       * wird VISA EXPIRED über
       * updateVillageTimers()
       * bzw. updatePendingVillageRaids()
       * behandelt.
       */

      continue;
    }


    enterKnownVillage(
      player,
      village
    );
  }
}


/*
 * ========================================
 * NEW VILLAGE SCAN
 * ========================================
 */

function scanForNewVillages() {

  for (
    const player of
    world.getPlayers()
  ) {

    if (
      player.dimension.id !==
      "minecraft:overworld"
    ) {

      continue;
    }


    const knownVillage =
      findKnownVillageNear(
        player.dimension.id,
        player.location,
        VILLAGE_ENTER_RADIUS
      );


    if (knownVillage) {
      continue;
    }


    if (
      !shouldScanPlayer(
        player
      )
    ) {

      continue;
    }


    const villagers =
      getNearbyVillagers(
        player.dimension,
        player.location,
        VILLAGER_SCAN_RADIUS
      );


    if (
      villagers.length < 2
    ) {

      continue;
    }


    const center =
      getVillagerCenter(
        villagers
      );


    if (!center) {
      continue;
    }


    registerVillage(
      player,
      center
    );
  }
}


/*
 * ========================================
 * VISA TIMER
 * ========================================
 */

function updateVillageTimers() {

  const playedTicks =
    getPlayedTicks();


  let changed =
    false;


  for (
    const village of
    villages
  ) {

    /*
     * Bereits expired.
     */
    if (
      village.cursed
    ) {

      continue;
    }


    /*
     * Noch kein voller HaraldCore-Tag
     * seit Entdeckung vergangen.
     */
    if (
      playedTicks -
      village.discoveredAt <
      TICKS_PER_DAY
    ) {

      continue;
    }


    /*
     * VISA ABGELAUFEN.
     */
    village.cursed =
      true;


    village.raidStarting =
      false;


    changed =
      true;


    /*
     * KEINE globale Meldung.
     *
     * Nur Spieler, die genau jetzt
     * in diesem Dorf stehen,
     * sehen VISA EXPIRED.
     */
    announceExpiredVisaToPlayersInside(
      village
    );


    /*
     * Irgendeinen Spieler auswählen,
     * der gerade dort ist.
     *
     * Wer das Dorf entdeckt hat,
     * spielt keine Rolle.
     */
    const player =
      findPlayerInsideVillage(
        village
      );


    if (player) {

      startRaidOmen(
        player,
        village
      );
    }
  }


  if (changed) {

    saveVillages();
  }
}


/*
 * ========================================
 * OMEN PROPERTY CLEANUP
 * ========================================
 */

function cleanupRaidOmenPlayers() {

  for (
    const player of
    world.getPlayers()
  ) {

    let ours =
      false;


    try {

      ours =
        player.getDynamicProperty(
          PLAYER_RAID_KEY
        ) === true;

    } catch (_) {}


    if (!ours) {
      continue;
    }


    if (
      hasRaidOmen(
        player
      )
    ) {

      continue;
    }


    try {

      player.setDynamicProperty(
        PLAYER_RAID_KEY,
        false
      );

    } catch (_) {}
  }
}


/*
 * ========================================
 * REGISTER
 * ========================================
 */

export function registerVillageCurse() {

  /*
   * ======================================
   * BELL DETECTION
   * ======================================
   */

  world.afterEvents
    .playerInteractWithBlock
    .subscribe(
      event => {

        if (
          !initialized ||
          challengeWon()
        ) {

          return;
        }


        if (
          !event.isFirstEvent
        ) {

          return;
        }


        const player =
          event.player;


        if (
          player.dimension.id !==
          "minecraft:overworld"
        ) {

          return;
        }


        if (
          event.block.typeId !==
          "minecraft:bell"
        ) {

          return;
        }


        const existing =
          findKnownVillageNear(
            player.dimension.id,
            event.block.location,
            VILLAGE_MERGE_RADIUS
          );


        if (existing) {

          enterKnownVillage(
            player,
            existing
          );


          return;
        }


        const villagers =
          getNearbyVillagers(
            player.dimension,
            event.block.location,
            BELL_VILLAGER_RADIUS
          );


        if (
          villagers.length < 1
        ) {

          return;
        }


        registerVillage(
          player,
          event.block.location
        );
      }
    );


  /*
   * ======================================
   * MILK BLOCK
   * ======================================
   */

  world.beforeEvents
    .itemUse
    .subscribe(
      event => {

        if (
          !event.itemStack ||
          event.itemStack.typeId !==
            "minecraft:milk_bucket"
        ) {

          return;
        }


        const player =
          event.source;


        if (
          !player ||
          player.typeId !==
            "minecraft:player"
        ) {

          return;
        }


        let ourOmen =
          false;


        try {

          ourOmen =
            player.getDynamicProperty(
              PLAYER_RAID_KEY
            ) === true;

        } catch (_) {}


        if (!ourOmen) {
          return;
        }


        if (
          !hasRaidOmen(
            player
          )
        ) {

          return;
        }


        event.cancel =
          true;


        system.run(
          () => {

            try {

              player.sendMessage(
                "§4The omen cannot be washed away."
              );

            } catch (_) {}

          }
        );
      }
    );


  /*
   * ======================================
   * INITIALISIERUNG
   * ======================================
   */

  system.run(
    () => {

      villages =
        loadVillages();


      saveVillages();


      initialized =
        true;


      /*
       * ==================================
       * VILLAGE ENTER CHECK
       *
       * jede Sekunde
       * ==================================
       */
      system.runInterval(
        () => {

          if (
            !initialized ||
            challengeWon()
          ) {

            return;
          }


          updateKnownVillageEntries();

        },
        20
      );


      /*
       * ==================================
       * NEW VILLAGE SCAN
       * ==================================
       */
      system.runInterval(
        () => {

          if (
            !initialized ||
            challengeWon()
          ) {

            return;
          }


          scanForNewVillages();

        },
        SCAN_INTERVAL
      );


      /*
       * ==================================
       * VISA TIMER CHECK
       *
       * jede Sekunde
       * ==================================
       */
      system.runInterval(
        () => {

          if (
            !initialized ||
            challengeWon()
          ) {

            return;
          }


          updateVillageTimers();

        },
        20
      );


      /*
       * ==================================
       * PENDING RAID CHECK
       *
       * jede Sekunde
       *
       * Wenn der ursprüngliche Spieler
       * tot / offline / weg ist,
       * kann irgendein anderer Spieler
       * im Dorf den Raid übernehmen.
       * ==================================
       */
      system.runInterval(
        () => {

          if (
            !initialized ||
            challengeWon()
          ) {

            return;
          }


          updatePendingVillageRaids();

        },
        20
      );


      /*
       * ==================================
       * OMEN CLEANUP
       * ==================================
       */
      system.runInterval(
        () => {

          cleanupRaidOmenPlayers();

        },
        20
      );

    }
  );
}
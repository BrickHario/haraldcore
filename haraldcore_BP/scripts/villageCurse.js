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

const RAID_OMEN_TICKS =
  600;

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

    return (
      Array.isArray(parsed)
        ? parsed
        : []
    );

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
    const village of villages
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
    const village of villages
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
    const village of villages
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
}

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
      const villager of villagers
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
      const villager of villagers
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
    const villager of villagers
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

function hasVisitedVillage(
  player,
  village
) {

  try {

    const saved =
      player.getDynamicProperty(
        "haraldcore:visitedVillages"
      );

    const visited =
      typeof saved === "string"
        ? JSON.parse(saved)
        : [];

    return visited.includes(
      village.id
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
        "haraldcore:visitedVillages"
      );

    const visited =
      typeof saved === "string"
        ? JSON.parse(saved)
        : [];

    visited.push(
      village.id
    );

    player.setDynamicProperty(
      "haraldcore:visitedVillages",
      JSON.stringify(
        visited
      )
    );

  } catch (_) {}
}

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

    raidStarted:
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

    if (!village.cursed) {

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

  if (village.cursed) {

    handleVillageEntry(
      player,
      village
    );
  }
}

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
      Math.cos(angle) *
      distance,

    y:
      player.location.y +
      1,

    z:
      player.location.z +
      Math.sin(angle) *
      distance,

  };
}

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

function announceExpiredVisa() {

  world.sendMessage(
    "§4§lVISA EXPIRED!"
  );

  world.sendMessage(
    "§4§lRUN! §cVILLAGE POLICE are coming!"
  );

  for (
    const onlinePlayer of
    world.getPlayers()
  ) {

    try {

      onlinePlayer.playSound(
        "note.bass"
      );

    } catch (_) {}
  }
}

function startRaidOmen(
  player,
  village
) {

  if (
    village.raidStarted
  ) {
    return;
  }

  try {

    player.removeEffect(
      "raid_omen"
    );

    player.removeEffect(
      "bad_omen"
    );

  } catch (_) {}

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

    return;

  }

  try {

    player.setDynamicProperty(
      PLAYER_RAID_KEY,
      true
    );

  } catch (_) {}

  if (!village.raidAnnounced) {

    village.raidAnnounced =
      true;

    saveVillages();

    announceExpiredVisa();
  }

  const villageId =
    village.id;

  system.runTimeout(
    () => {

      const savedVillage =
        findVillageById(
          villageId
        );

      if (!savedVillage) {
        return;
      }

      let raidOmen =
        false;

      try {

        raidOmen =
          !!player.getEffect(
            "raid_omen"
          );

      } catch (_) {}

      if (!raidOmen) {

        try {

          player.removeEffect(
            "bad_omen"
          );

        } catch (_) {}

        return;
      }

      savedVillage.raidStarted =
        true;

      saveVillages();

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

function handleVillageEntry(
  player,
  village
) {

  if (
    !village.cursed
  ) {
    return;
  }

  if (
    !village.raidStarted
  ) {

    startRaidOmen(
      player,
      village
    );

    return;
  }

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
      distance < closest
    ) {

      closest =
        distance;

      result =
        player;
    }
  }

  return result;
}

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
      continue;
    }

    enterKnownVillage(
      player,
      village
    );
  }
}

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

function updateVillageTimers() {

  const playedTicks =
    getPlayedTicks();

  let changed =
    false;

  for (
    const village of
    villages
  ) {

    if (
      village.cursed
    ) {
      continue;
    }

    if (
      playedTicks -
      village.discoveredAt <
      TICKS_PER_DAY
    ) {
      continue;
    }

    village.cursed =
      true;

    changed =
      true;

    if (!village.raidAnnounced) {

      village.raidAnnounced =
        true;

      announceExpiredVisa();
    }

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

export function registerVillageCurse() {

  world.afterEvents
    .playerInteractWithBlock
    .subscribe(event => {

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

    });

  world.beforeEvents
    .itemUse
    .subscribe(event => {

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

    });

  system.run(
    () => {

      villages =
        loadVillages();

      saveVillages();

      initialized =
        true;

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

      system.runInterval(
        () => {

          cleanupRaidOmenPlayers();

        },
        20
      );

    }
  );
}
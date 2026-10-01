import { world, system } from "@minecraft/server";

const LEADERBOARD_ID = "harald_rank";
const LEADERBOARD_NAME = "Score Ranking";

const ENTRY_PROPERTY =
  "haraldcore:leaderboardEntry";

const DATA_PROPERTY_PREFIX =
  "haraldcore:ranking:";

const WORLD_RANKING_PROPERTY =
  "haraldcore:rankingData";


function clampScore(score) {
  return Math.max(
    0,
    Math.min(
      9999,
      Math.round(
        typeof score === "number"
          ? score
          : 0
      )
    )
  );
}


function getLeaderboardObjective() {
  let objective =
    world.scoreboard.getObjective(
      LEADERBOARD_ID
    );

  if (!objective) {
    try {
      objective =
        world.scoreboard.addObjective(
          LEADERBOARD_ID,
          LEADERBOARD_NAME
        );
    } catch (_) {
      objective =
        world.scoreboard.getObjective(
          LEADERBOARD_ID
        );
    }
  }

  return objective;
}


function stripFormatting(text) {
  return String(text ?? "")
    .replace(/§./g, "");
}


function entryBelongsToPlayer(
  displayName,
  playerName
) {
  const plain =
    stripFormatting(displayName);

  return (
    plain.includes(
      `☠ ${playerName}`
    ) ||
    plain.includes(
      `✓ ${playerName}`
    )
  );
}


function removeOldEntry(
  objective,
  player
) {
  if (!objective || !player) {
    return;
  }

  const savedEntry =
    player.getDynamicProperty(
      ENTRY_PROPERTY
    );

  if (
    typeof savedEntry === "string" &&
    savedEntry.length > 0
  ) {
    try {
      objective.removeParticipant(
        savedEntry
      );
    } catch (_) {}
  }

  try {
    for (
      const participant of
      objective.getParticipants()
    ) {
      if (
        entryBelongsToPlayer(
          participant.displayName,
          player.name
        )
      ) {
        try {
          objective.removeParticipant(
            participant
          );
        } catch (_) {}
      }
    }
  } catch (_) {}
}


function showLeaderboard() {
  try {
    const dim =
      world.getDimension(
        "overworld"
      );

    dim.runCommand(
      `scoreboard objectives setdisplay sidebar ${LEADERBOARD_ID} descending`
    );
  } catch (_) {}
}


function getWorldRankingData() {
  try {
    const raw =
      world.getDynamicProperty(
        WORLD_RANKING_PROPERTY
      );

    if (
      typeof raw !== "string" ||
      raw.length === 0
    ) {
      return [];
    }

    const data =
      JSON.parse(raw);

    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(
      entry =>
        entry &&
        typeof entry.name === "string" &&
        entry.name.length > 0 &&
        typeof entry.score === "number"
    );

  } catch (_) {
    return [];
  }
}


function saveWorldRankingData(
  ranking
) {
  try {
    world.setDynamicProperty(
      WORLD_RANKING_PROPERTY,
      JSON.stringify(ranking)
    );

    return true;

  } catch (_) {
    return false;
  }
}


function getPlayerRankingData(
  player
) {
  if (!player) {
    return undefined;
  }

  try {
    const raw =
      player.getDynamicProperty(
        `${DATA_PROPERTY_PREFIX}data`
      );

    if (
      typeof raw !== "string" ||
      raw.length === 0
    ) {
      return undefined;
    }

    const data =
      JSON.parse(raw);

    if (
      !data ||
      typeof data.score !== "number"
    ) {
      return undefined;
    }

    return {
      name:
        typeof data.name === "string" &&
        data.name.length > 0
          ? data.name
          : player.name,

      score:
        clampScore(data.score),

      won:
        data.won === true,

      stars:
        typeof data.stars === "string"
          ? data.stars
          : "",
    };

  } catch (_) {
    return undefined;
  }
}


function savePlayerRankingData(
  player,
  data
) {
  if (!player || !data) {
    return;
  }

  try {
    player.setDynamicProperty(
      `${DATA_PROPERTY_PREFIX}data`,
      JSON.stringify(data)
    );
  } catch (_) {}
}


function addOrUpdateWorldRanking(
  data
) {
  if (
    !data ||
    typeof data.name !== "string" ||
    data.name.length === 0
  ) {
    return;
  }

  const ranking =
    getWorldRankingData();

  const playerName =
    data.name.toLowerCase();

  const index =
    ranking.findIndex(
      entry =>
        typeof entry.name === "string" &&
        entry.name.toLowerCase() ===
          playerName
    );

  const storedData = {
    name:
      data.name,

    score:
      clampScore(data.score),

    won:
      data.won === true,

    stars:
      data.won === true &&
      typeof data.stars === "string"
        ? data.stars
        : "",
  };

  if (index >= 0) {
    ranking[index] =
      storedData;
  } else {
    ranking.push(
      storedData
    );
  }

  saveWorldRankingData(
    ranking
  );
}


function syncOnlinePlayersToWorldRanking() {
  for (
    const player of
    world.getPlayers()
  ) {
    const data =
      getPlayerRankingData(
        player
      );

    if (!data) {
      continue;
    }

    addOrUpdateWorldRanking(
      data
    );
  }
}


function getRankingData() {
  const ranking =
    getWorldRankingData();

  ranking.sort(
    (a, b) => {
      if (
        b.score !== a.score
      ) {
        return (
          b.score - a.score
        );
      }

      return a.name.localeCompare(
        b.name
      );
    }
  );

  return ranking;
}


function rebuildLeaderboard() {
  const objective =
    getLeaderboardObjective();

  if (!objective) {
    return;
  }

  try {
    for (
      const participant of
      objective.getParticipants()
    ) {
      try {
        objective.removeParticipant(
          participant
        );
      } catch (_) {}
    }
  } catch (_) {}


  const ranking =
    getRankingData();


  if (
    ranking.length === 0
  ) {
    try {
      const dim =
        world.getDimension(
          "overworld"
        );

      dim.runCommand(
        "scoreboard objectives setdisplay sidebar"
      );
    } catch (_) {}

    return;
  }


  const onlinePlayers =
    new Map();

  for (
    const player of
    world.getPlayers()
  ) {
    onlinePlayers.set(
      player.name.toLowerCase(),
      player
    );
  }


  for (
    let i = 0;
    i < ranking.length;
    i++
  ) {
    const data =
      ranking[i];

    const place =
      i + 1;

    let label;

    if (data.won) {
      label =
        `§7${place}. ` +
        `§a✓ ` +
        `§f${data.name}` +
        (
          data.stars
            ? ` §r${data.stars}`
            : ""
        );
    } else {
      label =
        `§7${place}. ` +
        `§c☠ ` +
        `§f${data.name}`;
    }

    try {
      objective.setScore(
        label,
        data.score
      );
    } catch (_) {}

    const onlinePlayer =
      onlinePlayers.get(
        data.name.toLowerCase()
      );

    if (onlinePlayer) {
      try {
        onlinePlayer.setDynamicProperty(
          ENTRY_PROPERTY,
          label
        );
      } catch (_) {}
    }
  }

  showLeaderboard();
}


function recordResult(
  player,
  score,
  won,
  scoreStars = ""
) {
  if (!player) {
    return;
  }

  const objective =
    getLeaderboardObjective();

  if (!objective) {
    return;
  }

  removeOldEntry(
    objective,
    player
  );

  const data = {
    name:
      player.name,

    score:
      clampScore(score),

    won:
      won === true,

    stars:
      won
        ? scoreStars
        : "",
  };

  savePlayerRankingData(
    player,
    data
  );

  addOrUpdateWorldRanking(
    data
  );

  rebuildLeaderboard();
}


export function recordDeathResult(
  player,
  score
) {
  recordResult(
    player,
    score,
    false,
    ""
  );
}


export function recordWinnerResult(
  player,
  score,
  scoreStars
) {
  recordResult(
    player,
    score,
    true,
    scoreStars
  );
}


export function registerRanklist() {
  world.afterEvents.playerSpawn.subscribe(
    event => {
      if (!event.player) {
        return;
      }

      system.runTimeout(
        () => {
          const data =
            getPlayerRankingData(
              event.player
            );

          if (data) {
            addOrUpdateWorldRanking(
              data
            );
          }

          rebuildLeaderboard();
        },
        20
      );
    }
  );

  system.runTimeout(() => {
    const dim =
      world.getDimension(
        "overworld"
      );

    try {
      dim.runCommand(
        "scoreboard objectives remove rules"
      );
    } catch (_) {}

    getLeaderboardObjective();

    syncOnlinePlayersToWorldRanking();

    rebuildLeaderboard();

  }, 60);
}
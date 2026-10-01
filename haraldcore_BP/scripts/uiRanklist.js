import { world, system } from "@minecraft/server";

const LEADERBOARD_ID = "harald_rank";
const LEADERBOARD_NAME = "Score Ranking";

const ENTRY_PROPERTY =
  "haraldcore:leaderboardEntry";

const DATA_PROPERTY_PREFIX =
  "haraldcore:ranking:";


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


function getRankingData() {
  const ranking = [];

  for (
    const player of
    world.getPlayers()
  ) {
    try {
      const raw =
        player.getDynamicProperty(
          `${DATA_PROPERTY_PREFIX}data`
        );

      if (
        typeof raw !== "string" ||
        raw.length === 0
      ) {
        continue;
      }

      const data =
        JSON.parse(raw);

      if (
        !data ||
        typeof data.score !== "number"
      ) {
        continue;
      }

      ranking.push({
        player,
        name:
          typeof data.name === "string"
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
      });

    } catch (_) {}
  }

  ranking.sort(
    (a, b) =>
      b.score - a.score
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


  for (
    let i = 0;
    i < ranking.length;
    i++
  ) {
    const data =
      ranking[i];

   const place = i + 1;

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

      data.player.setDynamicProperty(
        ENTRY_PROPERTY,
        label
      );
    } catch (_) {}
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

  try {
    player.setDynamicProperty(
      `${DATA_PROPERTY_PREFIX}data`,
      JSON.stringify(data)
    );
  } catch (_) {
    return;
  }

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
    rebuildLeaderboard();

  }, 60);
}
import {
  world,
} from "@minecraft/server";


const WON_KEY =
  "haraldcore:challengeWon";

const DAMAGE_KEY =
  "haraldcore:damageTaken";


export function registerStats() {

  world.afterEvents.entityHurt.subscribe(
    event => {

      const player =
        event.hurtEntity;

      if (
        !player ||
        player.typeId !==
          "minecraft:player"
      ) {
        return;
      }

      if (
        world.getDynamicProperty(
          WON_KEY
        ) === true
      ) {
        return;
      }


      const damage =
        event.damage;

      if (
        typeof damage !== "number" ||
        damage <= 0
      ) {
        return;
      }

      const oldDamage =
        player.getDynamicProperty(
          DAMAGE_KEY
        );

      const totalDamage =
        (
          typeof oldDamage ===
          "number"
            ? oldDamage
            : 0
        ) + damage;

      player.setDynamicProperty(
        DAMAGE_KEY,
        totalDamage
      );

    }
  );
}
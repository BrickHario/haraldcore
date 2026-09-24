import { registerAfkBurn } from "./afkBurn.js";
import { registerDailyHeal } from "./heal.js";
import { registerRules } from "./uiRules.js";
import { registerUITasks } from "./uiTasks.js";
import { registerChecklistUI } from "./uiChecklist.js";
import { registerTaskBook } from "./taskBook.js";

import { registerFindWood } from "./tasks/getWood.js";
import { registerKillZombie } from "./tasks/killZombie.js";
import { registerGetBoat } from "./tasks/getBoat.js";
import { registerGetIronBars } from "./tasks/getIronBars.js";
import { registerKillSpieder } from "./tasks/killSpider.js";
import { registerGetSword } from "./tasks/getSword.js";
import { registerKillCow } from "./tasks/killCow.js";
import { registerGetEmeralds } from "./tasks/getEmeralds.js";
import { registerHeal } from "./tasks/getGoldenApple.js";
import { registerGoNether } from "./tasks/goNether.js";
import { registerFirework} from "./firework.js";
import { registerWelcome } from "./welcome.js";
import { registerDeath } from "./death.js";
import {
  registerImmortality
} from "./immortality.js";
import {
  registerStats
} from "./stats.js";
import {
  registerFinalStorm
} from "./finalStorm.js";
import { registerNoProgressPunishment } from "./noProgressPunishment.js";
import { registerNightScares } from "./nightScares.js";

registerWelcome();

registerAfkBurn();
registerDailyHeal();
registerRules();
registerUITasks();
registerChecklistUI();
registerTaskBook();
registerImmortality();
registerStats();
registerFinalStorm();
registerNoProgressPunishment();
registerNightScares();

registerGetBoat();
registerGetIronBars();
registerFindWood();
registerKillZombie();
registerKillSpieder();
registerGetSword();
registerKillCow();
registerGetEmeralds();
registerHeal();
registerGoNether();

registerDeath();
registerFirework();
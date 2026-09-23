import {
  world,
  system,
  ItemStack,
  ItemLockMode,
} from "@minecraft/server";
import { showHaraldChecklist } from "./uiChecklist.js";

const BOOK_SLOT = 8;
const BOOK_TYPE = "minecraft:book";
const BOOK_NAME = "§6§lHaraldCore Tasks";

const selectedBookPlayers = new Set();

function createTaskBook() {
  const book = new ItemStack(BOOK_TYPE, 1);

  book.nameTag = BOOK_NAME;

  book.setLore([
    "§7Select this book to open",
    "§7the HaraldCore task list.",
    "",
    "§eTip: Finding chests might help..",
  ]);

  book.keepOnDeath = true;
  book.lockMode = ItemLockMode.slot;

  return book;
}

function isTaskBook(item) {
  return !!item &&
    item.typeId === BOOK_TYPE &&
    item.nameTag === BOOK_NAME;
}

function getInventory(player) {
  try {
    return player.getComponent("minecraft:inventory")?.container;
  } catch (_) {
    return undefined;
  }
}

function findEmptyBackupSlot(container) {
  for (let slot = 9; slot < container.size; slot++) {
    if (!container.getItem(slot)) return slot;
  }

  for (let slot = 0; slot < 8; slot++) {
    if (!container.getItem(slot)) return slot;
  }

  return -1;
}

function ensureTaskBook(player) {
  const inventory = getInventory(player);
  if (!inventory) return false;

  try {
    const current = inventory.getItem(BOOK_SLOT);

    if (isTaskBook(current)) return true;

    if (current) {
      const backupSlot = findEmptyBackupSlot(inventory);
      if (backupSlot === -1) return false;
      inventory.setItem(backupSlot, current);
    }

    inventory.setItem(BOOK_SLOT, createTaskBook());
    return true;
  } catch (_) {
    return false;
  }
}

function checkSelectedBook(player) {
  const id = player.id;
  const inventory = getInventory(player);

  if (!inventory) {
    selectedBookPlayers.delete(id);
    return;
  }

  let selectedIsBook = false;

  try {
    const selectedSlot = player.selectedSlotIndex;
    const selectedItem = inventory.getItem(selectedSlot);

    selectedIsBook = selectedSlot === BOOK_SLOT && isTaskBook(selectedItem);
  } catch (_) {
    selectedBookPlayers.delete(id);
    return;
  }

  if (!selectedIsBook) {
    selectedBookPlayers.delete(id);
    return;
  }

  if (selectedBookPlayers.has(id)) return;

  selectedBookPlayers.add(id);
  system.run(() => showHaraldChecklist(player));
}

export function registerTaskBook() {
  world.afterEvents.playerSpawn.subscribe((event) => {
    selectedBookPlayers.delete(event.player.id);

    system.runTimeout(() => {
      ensureTaskBook(event.player);
    }, 10);
  });

  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      ensureTaskBook(player);
      checkSelectedBook(player);
    }
  }, 5);
}

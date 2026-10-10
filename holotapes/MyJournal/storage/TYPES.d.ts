/** One saved journal entry, stored in USER/MYQUESTS.JSON. */
interface JournalEntry {
  /** Unique id, one more than the highest existing id. */
  id: number;
  /** Tab the entry belongs to: 0 quest, 1 note. */
  cat: number;
  /** Title typed on the T9 keyboard. */
  title: string;
  /** Optional body text typed on the T9 keyboard. */
  body: string;
  /** Quests only: 0 active, 1 done. */
  status: number;
  /** Creation time, in seconds since the epoch. */
  created: number;
}

/**
 * Entry being written, shared between the journal and the T9 keyboard
 * through USER/QUEST_DRAFT.JSON while they hand off to each other.
 */
interface JournalDraft {
  /** Tab the new entry will go in: 0 quest, 1 note. */
  cat: number;
  /** Title, empty until the keyboard has collected it. */
  title: string;
  /** Body text, possibly empty. */
  body: string;
  /** True once the keyboard has finished the body step. */
  bodyDone: boolean;
}

/** A row on the journal list screen. */
interface JournalListLabel {
  /** Text drawn for the row. */
  text: string;
  /** True for the "+ NEW" row, drawn dimmer than real entries. */
  special: boolean;
}

/** One key on the T9 keypad grid. */
interface T9KeyItem {
  /** What the key does: group, backspace, delword, left, right, done, spell or space. */
  type: string;
  /** Digit a group key adds to the key sequence. */
  digit?: number;
  /** Large digit drawn on a group key. */
  digitLabel?: string;
  /** Small letters drawn on a group key. */
  sub?: string;
  /** Text drawn on a non-digit key. */
  label?: string;
  /** Grid row, 0 at the top. */
  row: number;
  /** Grid column, 0 at the left. */
  col: number;
}

/** A word already placed in the text being typed. */
interface T9Word {
  /** The word as shown. */
  text: string;
  /** Digit sequence it came from, or null for a spelled word. */
  key: string | null;
}

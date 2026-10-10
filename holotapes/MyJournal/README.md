# My Journal

A personal quest log and notebook for the Pip-Boy 3000. Track your own quests,
mark them done, jot down notes, and type it all with a built-in T9 predictive
keyboard that knows the wasteland's vocabulary.

### Info

**Author(s):**

- [@Radiomaru7](https://github.com/Radiomaru7)

### Controls

**Journal**

| Input                | Action                                          |
| -------------------- | ----------------------------------------------- |
| Left wheel (rotate)  | Scroll the list / choose an action              |
| Left wheel (press)   | Open an entry / start a new one / do the action |
| Left wheel (hold)    | Pick up an entry to reorder it (press to drop)  |
| Right wheel (rotate) | Switch between the QUESTS and NOTES tabs        |
| STATS, ITEMS or DATA | Leave the holotape                              |

**Keyboard**

| Input                | Action                                                     |
| -------------------- | ---------------------------------------------------------- |
| Left wheel (rotate)  | Move between keypad rows                                   |
| Right wheel (rotate) | Move between keypad columns                                |
| Left wheel (press)   | Press the highlighted key                                  |
| Left wheel (hold)    | Accept the current word, or cycle the last word's spelling |

### How to Use

Pick **+ NEW QUEST** or **+ NEW NOTE** and the keyboard opens for the title,
then again for the body (the body is optional, so you can press DONE straight
away). Back in the journal you can save, edit either part, or discard.

The keyboard works like an old phone: press the digit for each letter once and
the dictionary suggests the word. When a word has more than one match (GO and IN
are both 4-6), hold the left wheel to cycle between them. SPACE starts the next
word, BKSP removes a digit, DEL removes the whole word, and the arrow keys move
the cursor between words.

For a word the dictionary does not know, press **SPELL** to pick letters,
numbers and punctuation one at a time, then choose FINISH (or hold the wheel).

Open an entry to read it, mark a quest done or active again, or delete it.

### Notes

The dictionary is a 178-word, Fallout-flavored list (factions, companions,
creatures, chems and everyday words). It includes some swear words, because
wastelanders talk that way. Its size is deliberately capped: larger dictionaries
ran the Pip-Boy out of memory after a few entries, so new words should replace
old ones rather than be added on top.

The keyboard is a second file, `T9.JS`, that the journal hands off to with
`Pip.loadHolotape`. The two pass the entry in progress through
`USER/QUEST_DRAFT.JSON`, and saved entries live in `USER/MYQUESTS.JSON`.

The left wheel press is read with `setWatch` rather than the knob event, so a
hold can be timed reliably. The right wheel is only ever turned, never pressed.

### License(s)

This app is licensed under the MIT License. See
[MIT](https://opensource.org/license/mit/) for more information.

`SPDX-License-Identifier: MIT`

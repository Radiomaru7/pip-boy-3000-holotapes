(function (): HolotapeApp {
  const W = h.getWidth(),
    H = h.getHeight();
  const DRAFT_FILE = 'USER/QUEST_DRAFT.JSON';

  function loadDraft(): JournalDraft {
    try {
      return JSON.parse(fs.readFileSync(DRAFT_FILE)) as JournalDraft;
    } catch (e) {
      return { cat: 0, title: '', body: '', bodyDone: false };
    }
  }
  function saveDraft(d: JournalDraft): void {
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(d));
  }

  const draft = loadDraft();
  const target = !draft.title ? 'title' : !draft.bodyDone ? 'body' : null;

  // Nothing left to type: hand straight back to the journal.
  if (!target) {
    Pip.loadHolotape('/HOLO/MY_JOURNAL/APP.JS');
    return {
      id: 'T9KEYBOARD',
      notDefault: true,
      fullscreen: true,
      remove: function (): void {
        // Nothing was set up.
      },
    };
  }

  // Flat "\nKEYS:WORD,WORD\n" lines use far less memory than an object.
  const T9_DICT_STR =
    '\n2:A\n23837:AFTER\n255:ALL\n26:AN\n263:AND\n264352:ANGELA\n273:ARE\n27667:ARMOR\n27:AS\n277:ASS\n2774653:ASSHOLE\n28:AT\n288225:ATTACK\n2225:BACK\n223:BAD\n2273:BASE\n2278273:BASTARD\n23:BE\n244:BIG\n24824:BITCH\n2665:BOOK\n27464:BRING\n28453:BUILD\n28557448:BULLSHIT\n288:BUT\n289:BUY\n2248:CAIT\n2267:CAMP\n226:CAN\n227:CAP\n2277:CAPS\n24325:CHECK\n2447:CHIP\n254642:CLINIC\n2633:CODE\n2652:COLA\n2727:CRAP\n28743:CURIE\n3266:DAMN\n32673:DANSE\n329:DAY\n332842529:DEATHCLAW\n333363:DEFEND\n33735:DEREK\n3378769:DESTROY\n3425:DICK\n34346:DIEGO\n36:DO\n3667:DOOR\n3862277:DUMBASS\n3278:EAST\n36369:ENEMY\n372678:ESCORT\n34448:FIGHT\n3463:FIND\n367:FOR\n36863:FOUND\n374363:FRIEND\n3766:FROM\n3825:FUCK\n427839:GARVEY\n438:GET\n44685:GHOUL\n4483:GIVE\n46:GO,IN\n4633266:GODDAMN\n4663:GOOD,HOME\n48273:GUARD\n486:GUN\n4262625:HANCOCK\n4283:HAVE\n43:HE,IF\n4355:HELL\n43556:HELLO\n4357:HELP\n446:HIM\n469:HOW\n4:I\n4686:INTO\n47:IS\n48:IT\n5865:JUNK\n5878:JUST\n539:KEY\n5455:KILL\n5669:KNOW\n5678:LOST\n622273239:MACCREADY\n6253:MAKE\n63:ME,OF\n6338:MEET\n69:MY\n6327:NEAR\n639:NEW\n6425:NICK\n66:NO,ON\n66784:NORTH\n668:NOT\n6683:NOTE\n669:NOW\n6852:NUKA\n6529:OKAY\n653:OLD\n67:OR\n68437:OTHER\n687:OUR\n688:OUT\n74737:PIPER\n7477:PISS\n747733:PISSED\n753273:PLEASE\n7737866:PRESTON\n7768328:PROTECT\n78378:QUEST\n723:RAD\n7232929:RADAWAY\n723428466:RADIATION\n724337:RAIDER\n737247:REPAIR\n737283:RESCUE\n738876:RETURN\n786:RUN\n7233:SAFE\n7283:SAVE\n72727:SCRAP\n72739:SCREW\n732724:SEARCH\n733:SEE\n7355:SELL\n7388537:SETTLER\n7448:SHIT\n76:SO\n7663:SOME\n76779:SORRY\n76884:SOUTH\n7828466:STATION\n7846725:STIMPAK\n78673:STORE\n8253:TAKE\n8255:TALK\n8426:THAN\n842657:THANKS\n8428:THAT\n843:THE\n8436:THEM\n84373:THERE\n8439:THEY\n8447:THIS\n8463:TIME\n86:TO\n866:TOM\n87233:TRADE\n872337:TRADER\n87:UP\n873:USE\n82858:VAULT\n9255:WALK\n9268:WANT\n927:WAS\n927835263:WASTELAND\n929:WAY\n93:WE\n9378:WEST\n9428:WHAT\n9436:WHEN\n946:WHO\n9455:WILL\n9484:WITH\n9675:WORK\n96853:WOULD\n937:YES\n968:YOU\n9687:YOUR\n';

  function lookupCandidates(key: string): string[] | null {
    if (!key) return null;
    const needle = '\n' + key + ':';
    const idx = T9_DICT_STR.indexOf(needle);
    if (idx === -1) return null;
    const start = idx + needle.length;
    let end = T9_DICT_STR.indexOf('\n', start);
    if (end === -1) end = T9_DICT_STR.length;
    return T9_DICT_STR.substring(start, end).split(',');
  }

  const SPELL_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,'!?";
  const LONG_PRESS_MS = 450;

  const KEY_W = 105,
    KEY_H = 34,
    COL_GAP = 12,
    ROW_GAP = 7;
  const KEYPAD_X0 = 20,
    KEYPAD_Y0 = 110;
  const ITEMS: T9KeyItem[] = [
    { type: 'group', digit: 1, digitLabel: '1', sub: '', row: 0, col: 0 },
    { type: 'group', digit: 2, digitLabel: '2', sub: 'A B C', row: 0, col: 1 },
    { type: 'group', digit: 3, digitLabel: '3', sub: 'D E F', row: 0, col: 2 },
    { type: 'group', digit: 4, digitLabel: '4', sub: 'G H I', row: 0, col: 3 },
    { type: 'group', digit: 5, digitLabel: '5', sub: 'J K L', row: 1, col: 0 },
    { type: 'group', digit: 6, digitLabel: '6', sub: 'M N O', row: 1, col: 1 },
    {
      type: 'group',
      digit: 7,
      digitLabel: '7',
      sub: 'P Q R S',
      row: 1,
      col: 2,
    },
    { type: 'group', digit: 8, digitLabel: '8', sub: 'T U V', row: 1, col: 3 },
    {
      type: 'group',
      digit: 9,
      digitLabel: '9',
      sub: 'W X Y Z',
      row: 2,
      col: 0,
    },
    { type: 'backspace', label: 'BKSP', row: 2, col: 1 },
    { type: 'group', digit: 0, digitLabel: '0', sub: '', row: 2, col: 2 },
    { type: 'delword', label: 'DEL', row: 2, col: 3 },
    { type: 'left', label: '<', row: 3, col: 0 },
    { type: 'done', label: 'DONE', row: 3, col: 1 },
    { type: 'right', label: '>', row: 3, col: 2 },
    { type: 'spell', label: 'SPELL', row: 3, col: 3 },
    { type: 'space', label: 'SPACE', row: 4, col: 0 },
  ];

  let selRow = 0,
    selCol = 0;
  let entryKeys = '',
    candidateIdx = 0;
  let currentWord = '';
  const words: T9Word[] = [];
  let cursor = 0;
  let cleanedUp = false;
  let pressTimer: number | null = null,
    longFired = false;
  let spelling = false,
    spellIdx = 0,
    spellBuffer = '';

  function currentCandidates(): string[] | null {
    return lookupCandidates(entryKeys);
  }
  // Espruino's indexOf can yield [""] for a missing key, so treat an empty
  // first candidate as no match.
  function validCurrentCandidates(): string[] | null {
    const cands = currentCandidates();
    return cands && cands.length && cands[0] ? cands : null;
  }
  function refreshCurrentWord(): void {
    const validCands = validCurrentCandidates();
    currentWord = validCands ? validCands[candidateIdx] : entryKeys;
  }
  function commitCurrentWord(): void {
    // Commits exactly what is displayed, with no separate recomputation.
    words.splice(cursor, 0, { text: currentWord, key: entryKeys });
    cursor++;
    entryKeys = '';
    candidateIdx = 0;
    currentWord = '';
  }
  function moveCursor(dir: number): void {
    cursor = E.clip(cursor + dir, 0, words.length);
  }

  // Sparse rows (like row 4, which only has col 0) pick the closest item in
  // the target row instead of falling back to an unrelated key.
  function findItemIndex(row: number, col: number): number {
    for (let i = 0; i < ITEMS.length; i++)
      if (ITEMS[i].row === row && ITEMS[i].col === col) return i;
    let best = -1,
      bestDist = 999;
    for (let i = 0; i < ITEMS.length; i++) {
      if (ITEMS[i].row === row) {
        const dist = Math.abs(ITEMS[i].col - col);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
    }
    return best !== -1 ? best : 0;
  }
  function currentItemIndex(): number {
    return findItemIndex(selRow, selCol);
  }

  // Guarded so it is safe to run both before a hand-off and again when the
  // OS calls remove().
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (pressWatch) clearWatch(pressWatch);
    if (pressTimer) clearTimeout(pressTimer);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    h.clear();
  }

  function finishEntry(): void {
    const text = words
      .map(function (w: T9Word): string {
        return w.text;
      })
      .join(' ');
    if (target === 'title') {
      draft.title = text || '(UNTITLED)';
    } else {
      draft.body = text;
      draft.bodyDone = true;
    }
    saveDraft(draft);
    cleanup();
    Pip.loadHolotape(
      target === 'title' ? '/HOLO/MY_JOURNAL/T9.JS' : '/HOLO/MY_JOURNAL/APP.JS',
    );
  }

  function spellLabel(idx: number): string {
    if (idx < 41) return SPELL_CHARS.charAt(idx);
    if (idx === 41) return 'BKSP';
    return 'FINISH';
  }
  function finishSpelling(): void {
    if (spellBuffer) {
      words.splice(cursor, 0, { text: spellBuffer, key: null });
      cursor++;
    }
    spelling = false;
    spellBuffer = '';
    spellIdx = 0;
    Pip.playSound('SELECT');
    draw();
  }
  function spellActivate(): void {
    if (spellIdx < 41) {
      spellBuffer += SPELL_CHARS.charAt(spellIdx);
    } else if (spellIdx === 41) {
      if (spellBuffer) spellBuffer = spellBuffer.slice(0, -1);
    } else {
      finishSpelling();
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function onShortClick(): void {
    if (spelling) {
      spellActivate();
      return;
    }
    const item = ITEMS[currentItemIndex()];
    if (item.type === 'left') moveCursor(-1);
    else if (item.type === 'right') moveCursor(1);
    else if (item.type === 'group') {
      entryKeys += item.digit;
      candidateIdx = 0;
      refreshCurrentWord();
    } else if (item.type === 'backspace') {
      if (entryKeys) {
        entryKeys = entryKeys.slice(0, -1);
        candidateIdx = 0;
        refreshCurrentWord();
      }
    } else if (item.type === 'delword') {
      if (entryKeys) {
        entryKeys = '';
        candidateIdx = 0;
        currentWord = '';
      } else if (cursor > 0) {
        words.splice(cursor - 1, 1);
        cursor--;
      }
    } else if (item.type === 'spell') {
      entryKeys = '';
      candidateIdx = 0;
      currentWord = '';
      spelling = true;
      spellIdx = 0;
      spellBuffer = '';
    } else if (item.type === 'space') {
      if (currentWord) commitCurrentWord();
    } else if (item.type === 'done') {
      if (currentWord) commitCurrentWord();
      finishEntry();
      return;
    }
    Pip.playSound('SCROLL');
    draw();
  }
  function onLongPress(): void {
    if (spelling) {
      if (spellBuffer) finishSpelling();
      return;
    }
    if (currentWord) {
      commitCurrentWord();
      Pip.playSound('SELECT');
      draw();
    } else if (cursor > 0) {
      const t = words[cursor - 1];
      if (t.key) {
        const cands = lookupCandidates(t.key);
        if (cands && cands.length > 1) {
          t.text =
            cands[(cands.indexOf(t.text) + 1 + cands.length) % cands.length];
          Pip.playSound('SELECT');
          draw();
        }
      }
    }
  }
  function onKnob1(dir: KnobDirection): void {
    if (!dir) return;
    if (spelling) {
      spellIdx = (spellIdx + dir + 43) % 43;
      draw();
      return;
    }
    selRow = E.clip(selRow + dir, 0, 4);
    draw();
  }
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    if (spelling) {
      spellIdx = (spellIdx + dir + 43) % 43;
      draw();
      return;
    }
    selCol = E.clip(selCol + dir, 0, 3);
    draw();
  }
  // The left wheel press is watched directly so a hold can be timed.
  function onWatch(e: WatchEvent): void {
    if (e.state) {
      if (!pressTimer) {
        longFired = false;
        pressTimer = setTimeout(function (): void {
          longFired = true;
          pressTimer = null;
          onLongPress();
        }, LONG_PRESS_MS);
      }
    } else {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      if (!longFired) onShortClick();
    }
  }

  function drawCaret(x: number, y: number): void {
    h.setColor(3).fillRect(x - 1, y - 2, x + 1, y + 16);
  }
  function drawWords(x0: number, y0: number, maxWidth: number): void {
    let x = x0,
      y = y0;
    for (let i = 0; i < words.length; i++) {
      if (i === cursor) drawCaret(x, y);
      const w = words[i].text,
        wpx = h.stringWidth(w);
      if (x - x0 + wpx > maxWidth) {
        x = x0;
        y += 20;
      }
      if (i === cursor - 1) {
        h.setColor(3).fillRect(x - 2, y - 2, x + wpx + 2, y + 14);
        h.setColor(0);
      } else h.setColor(1);
      h.setFontMonofonto16().setFontAlign(-1, -1).drawString(w, x, y);
      x += wpx + 10;
    }
    if (cursor === words.length) drawCaret(x, y);
    if (entryKeys) {
      h.setColor(2)
        .setFontMonofonto16()
        .setFontAlign(-1, -1)
        .drawString(currentWord, x + 4, y);
    }
  }
  function keyX(col: number): number {
    return KEYPAD_X0 + col * (KEY_W + COL_GAP);
  }
  function keyY(row: number): number {
    return KEYPAD_Y0 + row * (KEY_H + ROW_GAP);
  }
  function drawKey(item: T9KeyItem, i: number): void {
    const selected = i === currentItemIndex();
    const x = keyX(item.col),
      y = keyY(item.row),
      w = KEY_W,
      h2 = KEY_H;
    h.setColor(selected ? 3 : 1).drawRect(x, y, x + w, y + h2);
    if (selected) h.setColor(3).fillRect(x + 1, y + 1, x + w - 1, y + h2 - 1);
    h.setColor(selected ? 0 : 1);
    if (item.digitLabel) {
      h.setFontMonofonto28()
        .setFontAlign(-1, -1)
        .drawString(item.digitLabel, x + 6, y + 2);
      h.setFontMonofonto14()
        .setFontAlign(1, 1)
        .drawString(item.sub as string, x + w - 4, y + h2 - 3);
    } else {
      h.setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString(item.label as string, x + w / 2, y + h2 / 2);
    }
  }
  function drawSpelling(): void {
    h.setColor(1)
      .setFontMonofonto16()
      .setFontAlign(0, -1)
      .drawString('SPELLING: ' + spellBuffer, W / 2, 50);
    h.setColor(3)
      .setFontMonofonto36()
      .setFontAlign(0, 0)
      .drawString(spellLabel(spellIdx), W / 2, 150);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('L/R KNOB: LETTER  TAP: PICK  HOLD: FINISH', W / 2, H - 8);
  }
  function draw(): void {
    h.reset().clear(0);
    const heading =
      target === 'title' ? 'ENTER TITLE' : 'ENTER BODY (optional)';
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(0, -1)
      .drawString(heading, W / 2, 4);
    h.setColor(1).drawLine(20, 26, W - 20, 26);

    if (spelling) {
      drawSpelling();
      h.flip();
      Pip.lastFlip = getTime();
      return;
    }

    drawWords(30, 34, W - 60);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString('SUGGESTIONS:', W / 2, 62);
    const cands = validCurrentCandidates();
    if (cands) {
      let cx = 40;
      for (let i = 0; i < cands.length && i < 4; i++) {
        const label = cands[i],
          wpx = h.stringWidth(label) + 12;
        if (i === candidateIdx) {
          h.setColor(3).fillRect(cx, 80, cx + wpx, 94);
          h.setColor(0);
        } else h.setColor(1);
        h.setFontMonofonto16()
          .setFontAlign(-1, -1)
          .drawString(label, cx + 6, 82);
        cx += wpx + 8;
      }
    } else if (entryKeys) {
      h.setColor(1)
        .setFontMonofonto14()
        .setFontAlign(0, -1)
        .drawString('(NO MATCH - TRY SPELL KEY)', W / 2, 82);
    } else if (
      cursor > 0 &&
      words[cursor - 1].key &&
      lookupCandidates(words[cursor - 1].key as string) &&
      (lookupCandidates(words[cursor - 1].key as string) as string[]).length > 1
    ) {
      const alts = lookupCandidates(
          words[cursor - 1].key as string,
        ) as string[],
        cur = words[cursor - 1].text;
      let cx = 40;
      for (let i = 0; i < alts.length; i++) {
        const label = alts[i],
          wpx = h.stringWidth(label) + 12;
        if (label === cur) {
          h.setColor(3).fillRect(cx, 80, cx + wpx, 94);
          h.setColor(0);
        } else h.setColor(1);
        h.setFontMonofonto16()
          .setFontAlign(-1, -1)
          .drawString(label, cx + 6, 82);
        cx += wpx + 8;
      }
      h.setColor(1)
        .setFontMonofonto14()
        .setFontAlign(0, -1)
        .drawString('HOLD TO CYCLE', W - 90, 62);
    }
    for (let i = 0; i < ITEMS.length; i++) drawKey(ITEMS[i], i);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('SPACE KEY: NEXT WORD', W / 2, H - 8);
    h.flip();
    Pip.lastFlip = getTime();
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  const pressWatch = setWatch(onWatch, ENC1_PRESS, {
    repeat: true,
    edge: 'both',
    debounce: 60,
  });
  draw();

  return {
    id: 'T9KEYBOARD',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
});

(function (): HolotapeApp {
  const W = h.getWidth(),
    H = h.getHeight();
  const QUEST_FILE = 'USER/MYQUESTS.JSON';
  const DRAFT_FILE = 'USER/QUEST_DRAFT.JSON';
  const KEYBOARD = '/HOLO/MY_JOURNAL/T9.JS';
  const ROW_H = 22,
    VISIBLE_ROWS = 9;
  const LONG_PRESS_MS = 450;
  const TABS = ['QUESTS', 'NOTES'];

  function loadQuests(): JournalEntry[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(QUEST_FILE)) as JournalEntry[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  function saveQuests(list: JournalEntry[]): boolean {
    try {
      fs.writeFileSync(QUEST_FILE, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }
  function nextId(list: JournalEntry[]): number {
    let max = 0;
    for (let i = 0; i < list.length; i++)
      if (list[i].id > max) max = list[i].id;
    return max + 1;
  }
  function addEntry(
    list: JournalEntry[],
    cat: number,
    title: string,
    body: string,
  ): JournalEntry[] {
    list.push({
      id: nextId(list),
      cat: cat,
      title: title,
      body: body,
      status: 0,
      created: Math.floor(Date.now() / 1000),
    });
    saveQuests(list);
    return list;
  }
  function loadDraft(): JournalDraft | null {
    try {
      return JSON.parse(fs.readFileSync(DRAFT_FILE)) as JournalDraft;
    } catch (e) {
      return null;
    }
  }
  function saveDraft(d: JournalDraft): void {
    fs.writeFileSync(DRAFT_FILE, JSON.stringify(d));
  }
  function clearDraft(): void {
    try {
      fs.unlink(DRAFT_FILE);
    } catch (e) {
      // No draft to remove.
    }
  }

  let quests = loadQuests();
  let mode = 'list';
  let activeTab = 0;
  let listIdx = 0,
    scrollOff = 0,
    moving = false;
  let viewIdx = 0,
    viewActionIdx = 0;
  let catChoice = 0,
    newTitleText = '',
    newBodyText = '';
  let confirmIdx = 0;
  let cleanedUp = false;
  let pressTimer: number | null = null,
    longFired = false;

  // Resume a completed draft into the confirm screen, if one exists.
  const existingDraft = loadDraft();
  if (existingDraft && existingDraft.title && existingDraft.bodyDone) {
    catChoice = existingDraft.cat;
    newTitleText = existingDraft.title;
    newBodyText = existingDraft.body;
    mode = 'confirm';
  }

  function catLabel(c: number): string {
    return c === 1 ? 'NOTE' : 'QUEST';
  }
  function statusLabel(q: JournalEntry): string {
    return q.cat === 0 ? (q.status ? ' [DONE]' : ' [ACTIVE]') : '';
  }

  // Indices into `quests` belonging to the active tab, in display order.
  function visibleIndices(): number[] {
    const arr: number[] = [];
    for (let i = 0; i < quests.length; i++)
      if (quests[i].cat === activeTab) arr.push(i);
    return arr;
  }
  function listItemCount(): number {
    return visibleIndices().length + 1;
  }
  function listItemLabel(idx: number): JournalListLabel {
    if (idx === 0)
      return {
        text: '+ NEW ' + (activeTab === 1 ? 'NOTE' : 'QUEST'),
        special: true,
      };
    const q = quests[visibleIndices()[idx - 1]];
    return { text: q.title + statusLabel(q), special: false };
  }
  function moveList(dir: number): void {
    const count = listItemCount();
    listIdx = E.clip(listIdx + dir, 0, count - 1);
    if (listIdx < scrollOff) scrollOff = listIdx;
    if (listIdx >= scrollOff + VISIBLE_ROWS)
      scrollOff = listIdx - VISIBLE_ROWS + 1;
    Pip.playSound('SCROLL');
    draw();
  }
  function swapAdjacent(dir: number): void {
    const vis = visibleIndices();
    const curPos = listIdx - 1,
      newPos = curPos + dir;
    if (newPos < 0 || newPos >= vis.length) return;
    const a = vis[curPos],
      b = vis[newPos];
    const tmp = quests[a];
    quests[a] = quests[b];
    quests[b] = tmp;
    saveQuests(quests);
    listIdx += dir;
    if (listIdx < scrollOff) scrollOff = listIdx;
    if (listIdx >= scrollOff + VISIBLE_ROWS)
      scrollOff = listIdx - VISIBLE_ROWS + 1;
    Pip.playSound('SCROLL');
    draw();
  }
  function launchEntry(cat: number): void {
    saveDraft({ cat: cat, title: '', body: '', bodyDone: false });
    cleanup();
    Pip.loadHolotape(KEYBOARD);
  }
  function selectListItem(): void {
    if (listIdx === 0) {
      launchEntry(activeTab);
      return;
    }
    viewIdx = visibleIndices()[listIdx - 1];
    viewActionIdx = 0;
    mode = 'view';
    Pip.playSound('SELECT');
    draw();
  }

  function viewActions(): string[] {
    const q = quests[viewIdx];
    const actions = ['BACK'];
    if (q.cat === 0) actions.push(q.status ? 'MARK ACTIVE' : 'MARK DONE');
    actions.push('DELETE');
    return actions;
  }
  function viewActivate(): void {
    const label = viewActions()[viewActionIdx];
    if (label === 'BACK') {
      mode = 'list';
    } else if (label === 'MARK DONE' || label === 'MARK ACTIVE') {
      quests[viewIdx].status = quests[viewIdx].status ? 0 : 1;
      saveQuests(quests);
    } else if (label === 'DELETE') {
      quests.splice(viewIdx, 1);
      saveQuests(quests);
      listIdx = E.clip(listIdx, 0, listItemCount() - 1);
      mode = 'list';
    }
    Pip.playSound('SCROLL');
    draw();
  }

  const CONFIRM_ACTIONS = ['SAVE', 'EDIT TITLE', 'EDIT BODY', 'DISCARD'];
  function confirmActivate(): void {
    const label = CONFIRM_ACTIONS[confirmIdx];
    if (label === 'SAVE') {
      quests = addEntry(quests, catChoice, newTitleText, newBodyText);
      clearDraft();
      mode = 'list';
      activeTab = catChoice;
      listIdx = 0;
      scrollOff = 0;
    } else if (label === 'EDIT TITLE') {
      saveDraft({ cat: catChoice, title: '', body: '', bodyDone: false });
      cleanup();
      Pip.loadHolotape(KEYBOARD);
      return;
    } else if (label === 'EDIT BODY') {
      saveDraft({
        cat: catChoice,
        title: newTitleText,
        body: '',
        bodyDone: false,
      });
      cleanup();
      Pip.loadHolotape(KEYBOARD);
      return;
    } else if (label === 'DISCARD') {
      clearDraft();
      mode = 'list';
    }
    Pip.playSound('SCROLL');
    draw();
  }

  function onShortClick(): void {
    if (mode === 'list') {
      if (moving) {
        moving = false;
        Pip.playSound('SELECT');
        draw();
        return;
      }
      selectListItem();
    } else if (mode === 'view') viewActivate();
    else if (mode === 'confirm') confirmActivate();
  }
  function onLongPress(): void {
    if (mode === 'list' && listIdx > 0) {
      moving = !moving;
      Pip.playSound('SELECT');
      draw();
    }
  }
  function onKnob1(dir: KnobDirection): void {
    if (!dir) return;
    if (mode === 'list') {
      if (moving) swapAdjacent(dir);
      else moveList(dir);
    } else if (mode === 'view') {
      const n = viewActions().length;
      viewActionIdx = (viewActionIdx + dir + n) % n;
      Pip.playSound('SCROLL');
      draw();
    } else if (mode === 'confirm') {
      confirmIdx =
        (confirmIdx + dir + CONFIRM_ACTIONS.length) % CONFIRM_ACTIONS.length;
      Pip.playSound('SCROLL');
      draw();
    }
  }
  function onKnob2(dir: KnobDirection): void {
    if (!dir) return;
    if (mode === 'list') {
      if (moving) return;
      activeTab = (activeTab + dir + TABS.length) % TABS.length;
      listIdx = 0;
      scrollOff = 0;
      Pip.playSound('SCROLL');
      draw();
      return;
    }
    onKnob1(dir);
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

  function drawList(): void {
    h.reset().clear(0);
    h.setColor(3)
      .setFontMonofonto28()
      .setFontAlign(0, -1)
      .drawString('MY JOURNAL', W / 2, 6);
    let tx = W / 2 - 90;
    for (let i = 0; i < TABS.length; i++) {
      const wpx = h.stringWidth(TABS[i]) + 20;
      if (i === activeTab) {
        h.setColor(3).fillRect(tx, 38, tx + wpx, 58);
        h.setColor(0);
      } else h.setColor(1);
      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(TABS[i], tx + wpx / 2, 48);
      tx += wpx + 10;
    }
    h.setColor(1).drawLine(20, 64, W - 20, 64);
    const count = listItemCount();
    const visible = Math.min(VISIBLE_ROWS, count - scrollOff);
    h.setFontMonofonto16().setFontAlign(-1, -1);
    for (let row = 0; row < visible; row++) {
      const idx = scrollOff + row,
        item = listItemLabel(idx),
        y = 74 + row * ROW_H;
      if (idx === listIdx) {
        h.setColor(moving ? 2 : 3).fillRect(16, y - 2, W - 16, y + ROW_H - 6);
        h.setColor(0);
      } else h.setColor(item.special ? 2 : 1);
      h.drawString(item.text, 24, y);
    }
    const hint = moving
      ? 'L KNOB: MOVE ITEM   CLICK/HOLD: DROP'
      : 'CLICK: SELECT   L KNOB: SCROLL   R KNOB: TABS   HOLD: REORDER';
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString(hint, W / 2, H - 8);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function drawView(): void {
    h.reset().clear(0);
    const q = quests[viewIdx];
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString(q.title, W / 2, 8);
    h.setColor(1).drawLine(20, 38, W - 20, 38);
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, -1)
      .drawString('[' + catLabel(q.cat) + ']' + statusLabel(q), W / 2, 44);
    h.setFontMonofonto16().setFontAlign(-1, -1).setColor(1);
    const lines = h.wrapString(q.body || '(NO DETAILS)', W - 40);
    for (let i = 0; i < lines.length && i < 8; i++)
      h.drawString(lines[i], 20, 68 + i * 18);
    const actions = viewActions();
    let x = 30;
    const y = H - 60;
    for (let i = 0; i < actions.length; i++) {
      const label = actions[i],
        wpx = h.stringWidth(label) + 16;
      if (i === viewActionIdx) {
        h.setColor(3).fillRect(x, y, x + wpx, y + 26);
        h.setColor(0);
      } else h.setColor(1);
      h.setFontMonofonto16()
        .setFontAlign(0, 0)
        .drawString(label, x + wpx / 2, y + 13);
      x += wpx + 12;
    }
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('L KNOB: CHOOSE   CLICK: DO', W / 2, H - 8);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function drawConfirm(): void {
    h.reset().clear(0);
    h.setColor(3)
      .setFontMonofonto23()
      .setFontAlign(0, -1)
      .drawString('CONFIRM ' + catLabel(catChoice), W / 2, 6);
    h.setColor(1).drawLine(20, 32, W - 20, 32);
    h.setColor(3)
      .setFontMonofonto18()
      .setFontAlign(-1, -1)
      .drawString(newTitleText, 20, 40);
    h.setColor(1).setFontMonofonto14().setFontAlign(-1, -1);
    const lines = h.wrapString(newBodyText || '(no details)', W - 40);
    for (let i = 0; i < lines.length && i < 5; i++)
      h.drawString(lines[i], 20, 68 + i * 16);
    let x = 24;
    const y = H - 60;
    for (let i = 0; i < CONFIRM_ACTIONS.length; i++) {
      const label = CONFIRM_ACTIONS[i],
        wpx = h.stringWidth(label) + 14;
      if (i === confirmIdx) {
        h.setColor(3).fillRect(x, y, x + wpx, y + 24);
        h.setColor(0);
      } else h.setColor(1);
      h.setFontMonofonto14()
        .setFontAlign(0, 0)
        .drawString(label, x + wpx / 2, y + 12);
      x += wpx + 8;
    }
    h.setColor(1)
      .setFontMonofonto14()
      .setFontAlign(0, 1)
      .drawString('L KNOB: CHOOSE   CLICK: DO', W / 2, H - 8);
    h.flip();
    Pip.lastFlip = getTime();
  }
  function draw(): void {
    if (mode === 'list') drawList();
    else if (mode === 'view') drawView();
    else if (mode === 'confirm') drawConfirm();
  }

  Pip.onExclusive('knob1', onKnob1);
  Pip.onExclusive('knob2', onKnob2);
  const pressWatch = setWatch(onWatch, ENC1_PRESS, {
    repeat: true,
    edge: 'both',
    debounce: 60,
  });
  draw();

  // Guarded so it is safe to run both before a hand-off to the keyboard
  // and again when the OS calls remove().
  function cleanup(): void {
    if (cleanedUp) return;
    cleanedUp = true;
    if (pressWatch) clearWatch(pressWatch);
    if (pressTimer) clearTimeout(pressTimer);
    Pip.removeListener('knob1', onKnob1);
    Pip.removeListener('knob2', onKnob2);
    h.clear();
  }

  return {
    id: 'MYJOURNAL',
    notDefault: true,
    fullscreen: true,
    remove: cleanup,
  };
});

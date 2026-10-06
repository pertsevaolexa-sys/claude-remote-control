(function () {
  const S = PM.svg;
  PM.section({
    id: 'coretest', part: 'overview', order: 0.5, num: 'T', title: 'Core test',
    intro: 'Exercises every block type.', step: 'I3', slides: '1–2',
    blocks: [
      { type: 'guide', title: 'How it works', items: ['One', 'Two'], ordered: true },
      { type: 'step', step: 'I3' },
      { type: 'fields', title: 'Project', cols: 3, fields: [{ key: 'meta.name' }, { key: 'meta.kind' }, { key: 'meta.currency' }, { key: 'time.startDate' }, { key: 'time.endDate' }, { key: 'time.duration' }, { key: 'meta.summary' }] },
      { type: 'table', key: 'people' },
      { type: 'table', key: 'wbs' },
      { type: 'table', key: 'schedule' },
      { type: 'table', key: 'milestones' },
      {
        type: 'table', key: 'costtest', title: 'Cost test', numbered: true, addLabel: 'Add cost',
        columns: [
          { key: 'wbs', label: 'WBS', kind: 'wbs' },
          { key: 'who', label: 'Who', kind: 'person' },
          { key: 'qty', label: 'Qty', kind: 'number', total: true },
          { key: 'rate', label: 'Rate', kind: 'money' },
          { key: 'sum', label: 'Sum', kind: 'money', total: true, compute: (r) => (r.qty || 0) * (r.rate || 0) || null },
          { key: 'ok', label: 'OK', kind: 'check' },
          { key: 'r', label: 'Rating', kind: 'rating', options: ['low', 'mid', 'high'] },
          { key: 'team', label: 'Team', kind: 'people' },
        ],
        defaults: [{}, {}],
      },
      {
        type: 'graphic', title: 'Phase bars', caption: 'Bars from the schedule.',
        empty: (q) => (q.projectDates().start && q.projectDates().end ? null : 'Add start and end dates to see the bars.'),
        render(q, pal) {
          const { start, end } = q.projectDates();
          const rows = q.phases();
          const W = 860, top = 30, rh = 26;
          const sc = S.timeScale(start, end, 200, W - 20);
          let body = S.timeAxis(sc, 6, 22, top + rows.length * rh, pal);
          rows.forEach((r, i) => {
            const d = q.dates(r._id);
            const y = top + i * rh + 6;
            body += S.text(10, y + 7, r.code + ' ' + q.label(r, 'name'), { size: 12, fill: pal.ink, v: 'middle' });
            if (d.start && d.end) body += S.rect(sc.x(d.start), y, sc.xEnd(d.end) - sc.x(d.start), 14, { fill: pal.accent, rx: 3 });
          });
          return S.svg(W, top + rows.length * rh + 10, body, { pal, label: 'Phase bars' });
        },
      },
      { type: 'checks', title: 'Rules', run: (q) => [{ ok: q.phases().length >= 5, text: 'At least 4 content phases plus 1 PM phase' }, { ok: null, text: 'Info line' }] },
      { type: 'checklist', key: 'test.cl', title: 'Checklist', items: [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }] },
      { type: 'group', cols: 2, blocks: [{ type: 'note', text: 'Left note' }, { type: 'callout', kind: 'rule', title: 'Rule.', text: 'Right callout' }] },
      { type: 'table', key: 'steps' },
    ],
  });
})();

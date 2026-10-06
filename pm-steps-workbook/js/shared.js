/* PM Steps Workbook: data shared by every section.
 *
 * - PM.PARTS: the parts of the workbook, in the order of the framework.
 * - PM.PROCESS: the ten steps of the initiation and start processes (framework section 1).
 * - Shared tables and fields that several sections read or edit: people, wbs, schedule,
 *   milestones, steps, and the project / time fields.
 * - The backbone of the example project (people, WBS, dates, milestones, step records).
 *   Section files add example rows for their own tables with PM.example({...}).
 */
(function () {
  'use strict';
  const PM = (window.PM = window.PM || {});

  PM.PARTS = [
    { id: 'overview', label: 'Overview' },
    { id: 'initiation', label: 'Initiation process', num: '3' },
    { id: 'start', label: 'Project start process', num: '4' },
    { id: 'risk', label: 'Risk management', num: '5' },
    { id: 'formats', label: 'Communication formats', num: '6' },
    { id: 'external', label: 'External projects', num: '7' },
    { id: 'tailoring', label: 'Tailoring', num: '8' },
  ];

  PM.PROCESS = [
    {
      id: 'I1', process: 'initiation', title: 'Assess the idea', section: 'idea',
      activities: ['Describe the rough idea', 'Check strategy fit', 'Check technical feasibility', 'Create a business case'],
      roles: 'Accounting, sales, department, controlling',
      format: 'Individual planning, one-to-one talks',
      result: 'Decision to implement',
    },
    {
      id: 'I2', process: 'initiation', title: 'Categorise the project', section: 'category',
      activities: ['Check whether it is worth a project', 'Categorise its complexity', 'Appoint PO and PM'],
      roles: 'PO, PMO, PSC',
      format: 'Individual planning, one-to-one talks',
      result: 'Project category, first project roles',
    },
    {
      id: 'I3', process: 'initiation', title: 'Analyse boundaries and context', section: 'boundaries',
      activities: ['Prepare the six fields (possibly in variants)', 'Run the stakeholder analysis', 'Make a first risk assessment'],
      roles: 'PO and PM, possibly designated PMTMs',
      format: 'One-to-one talks, initial PO meeting',
      result: 'First draft of the charter, proposal for the planning process',
    },
    {
      id: 'I4', process: 'initiation', title: 'High-level planning', section: 'scope',
      activities: ['Verify the six fields and the stakeholder analysis', 'Make a first plan of scope, dates, resources and costs'],
      roles: 'PM, designated PMTMs, experts',
      format: 'Planning workshop',
      result: 'Initial Project Charter, first draft of the PM plan',
    },
    {
      id: 'I5', process: 'initiation', title: 'Project approval', section: 'approval',
      activities: ['Draft the charter and agree the PM plan with the PO', 'Verify the business case'],
      roles: 'PO, PM',
      format: 'PO meeting, face to face',
      result: '(Preliminarily) released Project Charter',
    },
    {
      id: 'S1', process: 'start', title: 'Establish the project organisation', section: 'organisation',
      activities: ['Present and validate the results so far', 'Clarify roles, communication and ground rules'],
      roles: 'PM, PMTMs, team members, possibly PO',
      format: 'Kick-off, start workshop',
      result: 'Working project organisation, common big picture',
    },
    {
      id: 'S2', process: 'start', title: 'Detailed planning', section: 'raci',
      activities: ['Write WP specifications', 'Assess detailed dates, resources and costs'],
      roles: 'PM, PMTMs',
      format: 'Individual planning, one-to-one talks, start workshop',
      result: 'Detailed work packages',
    },
    {
      id: 'S3', process: 'start', title: 'Consolidate and coordinate', section: 'consolidate',
      activities: ['Complete bar chart, staff deployment, cost plan and risk analysis', 'Set up project marketing'],
      roles: 'PM, PMTMs',
      format: 'Individual planning, one-to-one talks, follow-up workshop',
      result: 'Validated and amended plans',
    },
    {
      id: 'S4', process: 'start', title: 'Finalise the PM plan', section: 'pmplan',
      activities: ['Consolidate all plans in the PM plan and send it to all PMTMs', 'Hold a last internal meeting on open points'],
      roles: 'PM, project assistant, PMTMs',
      format: 'E-mail, one-to-one talks',
      result: 'Draft PM plan, version 1.0',
    },
    {
      id: 'S5', process: 'start', title: 'Approve the PM plan', section: 'pmapproval',
      activities: ['Present the planning to PO or PSC', 'Agree roles and communication structures'],
      roles: 'PO or PSC, PM',
      format: 'PO meeting, PSC meeting',
      result: 'Approved PM plan, version 1.0',
    },
  ];
  PM.step = (id) => PM.PROCESS.find((s) => s.id === id);

  PM.ROLES = ['Project owner', 'Project manager', 'PMTM', 'Team member', 'Project assistant', 'Project coach', 'PSC member', 'PMO', 'Expert', 'External partner'];
  PM.STEP_STATUS = ['Not started', 'In progress', 'Done', 'Skipped'];

  // ---------- shared fields ----------
  [
    { key: 'meta.name', label: 'Project name', kind: 'text', placeholder: 'e.g. Summer Festival 2026' },
    { key: 'meta.kind', label: 'Kind of project', kind: 'select', options: ['Internal project', 'External (customer) project', 'Event', 'Programme', 'Other'] },
    { key: 'meta.org', label: 'Organisation', kind: 'text', placeholder: 'Company, department or client' },
    { key: 'meta.summary', label: 'Short description', kind: 'textarea', placeholder: 'Two or three sentences: what the project is about and for whom' },
    { key: 'meta.status', label: 'Project status', kind: 'select', options: ['Idea', 'Initiation', 'Planning', 'Implementation', 'Closing', 'Closed'] },
    { key: 'meta.currency', label: 'Currency', kind: 'select', options: ['€', '$', '£', 'CHF'], default: '€' },
    { key: 'meta.version', label: 'PM plan version', kind: 'text', placeholder: 'e.g. 1.0' },
    { key: 'meta.author', label: 'Prepared by', kind: 'text', placeholder: 'Your name' },
    { key: 'meta.updated', label: 'Last updated', kind: 'date' },
    { key: 'time.startEvent', label: 'Start event', kind: 'text', placeholder: 'e.g. Feasibility study presented and authorised' },
    { key: 'time.startDate', label: 'Start date', kind: 'date' },
    { key: 'time.endEvent', label: 'End event', kind: 'text', placeholder: 'e.g. Product accepted by client' },
    { key: 'time.endDate', label: 'End date', kind: 'date' },
    {
      key: 'time.duration', label: 'Duration', kind: 'text',
      compute: (q) => {
        const a = q.f('time.startDate');
        const b = q.f('time.endDate');
        if (!a || !b) return '';
        const days = q.util.diffDays(a, b) + 1;
        if (days <= 0) return 'End date is before the start date';
        const weeks = Math.round((days / 7) * 10) / 10;
        const months = Math.round((days / 30.44) * 10) / 10;
        return days + ' days (' + weeks + ' weeks, about ' + months + ' months)';
      },
    },
  ].forEach((f) => PM.defineField(f));

  // ---------- shared tables ----------
  PM.defineTable({
    key: 'people',
    title: 'People in the project',
    hint: 'Everyone who holds a project role. Responsible persons, the organisation chart and the RACI chart all pick from this list.',
    numbered: true,
    addLabel: 'Add person',
    columns: [
      { key: 'name', label: 'Name', kind: 'text', w: 18, placeholder: 'Full name' },
      { key: 'initials', label: 'Short', kind: 'text', w: 5, placeholder: 'AB', sub: 'initials' },
      { key: 'roles', label: 'Project roles', kind: 'multi', options: PM.ROLES, w: 22 },
      { key: 'unit', label: 'Department / company', kind: 'text', w: 16, placeholder: 'Line unit' },
      { key: 'subteam', label: 'Sub-team', kind: 'text', w: 14, placeholder: 'e.g. Logistics' },
      { key: 'contact', label: 'Contact', kind: 'text', w: 18, placeholder: 'E-mail or phone' },
    ],
    defaults: [
      { _ph: { name: 'Project owner (sponsor)' }, roles: ['Project owner'] },
      { _ph: { name: 'Project manager' }, roles: ['Project manager'] },
      { _ph: { name: 'Core team member' }, roles: ['PMTM'] },
      { _ph: { name: 'Core team member' }, roles: ['PMTM'] },
    ],
  });

  PM.defineTable({
    key: 'wbs',
    title: 'Work breakdown structure',
    hint: 'Code 1 is the project, 1.x are the phases (1.1 is project management), 1.x.y are the work packages. Name work packages with a noun and a verb.',
    addLabel: 'Add line',
    sort: 'code',
    columns: [
      { key: 'code', label: 'WBS code', kind: 'text', w: 7, family: 'mono', placeholder: '1.2.1' },
      { key: 'name', label: 'Name', kind: 'text', w: 26, placeholder: 'e.g. Building the hull' },
      { key: 'responsible', label: 'Responsible', kind: 'person', w: 14 },
      { key: 'result', label: 'Result / deliverable', kind: 'textarea', w: 24, placeholder: 'What exists when it is done' },
      { key: 'level', label: 'Level', hidden: true, compute: (r) => PM.util.codeLevel(r.code) },
      { key: 'kind', label: 'Type', kind: 'text', w: 9, compute: (r, q) => PM.util.wbsKind(r, q) },
    ],
    defaults: [
      { code: '1', _ph: { name: 'Project name' } },
      { code: '1.1', name: 'Project management' },
      { code: '1.1.1', name: 'Starting the project' },
      { code: '1.1.2', name: 'Coordinating the project' },
      { code: '1.1.3', name: 'Controlling the project' },
      { code: '1.1.4', name: 'Closing the project' },
      { code: '1.2', _ph: { name: 'Phase A, worded as an activity' } },
      { code: '1.2.1', _ph: { name: 'Work package' } },
      { code: '1.2.2', _ph: { name: 'Work package' } },
      { code: '1.2.3', _ph: { name: 'Work package' } },
      { code: '1.3', _ph: { name: 'Phase B' } },
      { code: '1.3.1', _ph: { name: 'Work package' } },
      { code: '1.3.2', _ph: { name: 'Work package' } },
      { code: '1.3.3', _ph: { name: 'Work package' } },
      { code: '1.4', _ph: { name: 'Phase C' } },
      { code: '1.4.1', _ph: { name: 'Work package' } },
      { code: '1.4.2', _ph: { name: 'Work package' } },
      { code: '1.4.3', _ph: { name: 'Work package' } },
      { code: '1.5', _ph: { name: 'Phase D' } },
      { code: '1.5.1', _ph: { name: 'Work package' } },
      { code: '1.5.2', _ph: { name: 'Work package' } },
      { code: '1.5.3', _ph: { name: 'Work package' } },
    ],
  });

  // Dates per WBS line. Leave phases and the project empty: their dates come from their work packages.
  PM.defineTable({
    key: 'schedule',
    title: 'Dates per work package',
    hint: 'Planned (baseline) start and end, the actual dates, and predecessors such as "1.2.1", "1.3.2 SS" or "1.4.1 FS+5" (types FS, SS, FF, SF; lag in days).',
    from: 'wbs',
    columns: [
      { key: 'code', label: 'WBS', from: true, family: 'mono', w: 6 },
      { key: 'name', label: 'Name', from: true, w: 22 },
      { key: 'start', label: 'Start', kind: 'date', sub: 'baseline' },
      { key: 'end', label: 'End', kind: 'date', sub: 'baseline' },
      { key: 'days', label: 'Days', kind: 'number', w: 5, compute: (r, q) => q.util.spanDays(q.dates(r._id)) },
      { key: 'pred', label: 'Predecessors', kind: 'text', w: 12, family: 'mono', placeholder: 'e.g. 1.2.1' },
      { key: 'actualStart', label: 'Actual start', kind: 'date' },
      { key: 'actualEnd', label: 'Actual end', kind: 'date' },
      { key: 'progress', label: 'Done', kind: 'percent', w: 5 },
    ],
  });

  PM.defineTable({
    key: 'milestones',
    title: 'Milestone plan',
    hint: 'Word each milestone as an event ("… started", "… completed"). Freeze the baseline once the sponsor approves the project; fill in revised and actual dates while controlling.',
    numbered: true,
    addLabel: 'Add milestone',
    columns: [
      { key: 'wbs', label: 'WBS', kind: 'wbs', w: 16, sub: 'work package it closes' },
      { key: 'name', label: 'Milestone', kind: 'text', w: 24, placeholder: '… completed' },
      { key: 'type', label: 'Type', kind: 'select', options: ['Internal', 'External'], w: 9 },
      { key: 'baseline', label: 'Baseline', kind: 'date' },
      { key: 'revised', label: 'Revised', kind: 'date' },
      { key: 'actual', label: 'Actual', kind: 'date' },
      {
        key: 'slip', label: 'Shift', kind: 'number', w: 6, sub: 'days',
        compute: (r, q) => {
          const latest = r.actual || r.revised;
          return r.baseline && latest ? q.util.diffDays(r.baseline, latest) : null;
        },
      },
    ],
    defaults: [
      { name: 'Project started', type: 'Internal' },
      { _ph: { name: 'Phase A result completed' }, type: 'Internal' },
      { _ph: { name: 'Phase B result completed' }, type: 'Internal' },
      { _ph: { name: 'Phase C result completed' }, type: 'Internal' },
      { _ph: { name: 'Phase D result completed' }, type: 'Internal' },
      { name: 'Project completed', type: 'Internal' },
    ],
  });

  PM.defineTable({
    key: 'steps',
    title: 'The ten steps in your project',
    hint: 'One line per step of the initiation and start processes. The grey text shows what the framework expects; write what really happened.',
    fixed: PM.PROCESS.map((s) => ({ _id: s.id, step: s.id, title: s.title })),
    columns: [
      { key: 'step', label: 'Step', from: true, family: 'mono', w: 4 },
      { key: 'title', label: 'Step', from: true, w: 16 },
      { key: 'status', label: 'Status', kind: 'select', options: PM.STEP_STATUS, w: 10 },
      { key: 'when', label: 'When', kind: 'text', w: 12, placeholder: 'e.g. Feb 2026' },
      { key: 'format', label: 'Format used', kind: 'text', w: 16, placeholder: (r) => (PM.step(r._id) || {}).format },
      { key: 'who', label: 'Who took part', kind: 'text', w: 16, placeholder: (r) => (PM.step(r._id) || {}).roles },
      { key: 'did', label: 'What we did', kind: 'textarea', w: 24, placeholder: (r) => ((PM.step(r._id) || {}).activities || []).join('; ') },
      { key: 'result', label: 'Result', kind: 'textarea', w: 20, placeholder: (r) => (PM.step(r._id) || {}).result },
    ],
  });

  // ---------- example project backbone ----------
  const P = (id, name, initials, roles, unit, subteam) => ({ _id: id, name, initials, roles, unit, subteam, contact: initials.toLowerCase() + '@example.com' });
  const W = (id, code, name, responsible, result) => ({ _id: id, code, name, responsible, result: result || '' });
  const D = (start, end, pred, actualStart, actualEnd) => ({ start, end, pred: pred || '', actualStart: actualStart || start, actualEnd: actualEnd || end, progress: 100 });

  PM.example({
    f: {
      'meta.name': 'Summer Festival 2026',
      'meta.kind': 'Event',
      'meta.org': 'Example GmbH, Corporate Communications',
      'meta.summary': 'A summer festival for about 400 employees and their families on 27 June 2026, planned and run by an internal project team of six.',
      'meta.status': 'Closed',
      'meta.currency': '€',
      'meta.version': '1.0',
      'meta.author': 'Marc Huber',
      'meta.updated': '2026-07-31',
      'time.startEvent': 'Project assignment signed by the sponsor',
      'time.startDate': '2026-02-02',
      'time.endEvent': 'Evaluation report accepted by the sponsor',
      'time.endDate': '2026-07-31',
    },
    t: {
      people: [
        P('p1', 'Anna Berger', 'AB', ['Project owner'], 'Head of HR', ''),
        P('p2', 'Marc Huber', 'MH', ['Project manager'], 'Corporate Communications', ''),
        P('p3', 'Lea Novak', 'LN', ['PMTM'], 'Corporate Communications', 'Programme'),
        P('p4', 'Tom Schmid', 'TS', ['PMTM'], 'Facility Management', 'Venue and logistics'),
        P('p5', 'Sara Kovac', 'SK', ['PMTM'], 'Marketing', 'Communication'),
        P('p6', 'Jonas Weber', 'JW', ['PMTM'], 'Finance', 'Budget and sponsoring'),
        P('p7', 'Mia Fischer', 'MF', ['Team member'], 'Facility Management', 'Venue and logistics'),
        P('p8', 'Ben Wolf', 'BW', ['Team member'], 'Marketing', 'Communication'),
        P('p9', 'Eva Lang', 'EL', ['Project assistant'], 'Corporate Communications', ''),
        P('p10', 'Paul Gruber', 'PG', ['PSC member'], 'Management board', ''),
      ],
      wbs: [
        W('w1', '1', 'Summer Festival 2026', 'p2', 'Festival held, evaluated and closed'),
        W('w11', '1.1', 'Project management', 'p2'),
        W('w111', '1.1.1', 'Starting the project', 'p2', 'Charter and PM plan approved'),
        W('w112', '1.1.2', 'Coordinating the project', 'p2', 'Team meetings held, minutes filed'),
        W('w113', '1.1.3', 'Controlling the project', 'p2', 'Progress reports for the sponsor'),
        W('w114', '1.1.4', 'Closing the project', 'p2', 'Closure report accepted'),
        W('w12', '1.2', 'Concept', 'p3'),
        W('w121', '1.2.1', 'Surveying employee wishes', 'p3', 'Survey results'),
        W('w122', '1.2.2', 'Developing the festival concept', 'p3', 'Festival concept'),
        W('w123', '1.2.3', 'Getting the concept approved', 'p2', 'Approved concept'),
        W('w13', '1.3', 'Organisation and procurement', 'p4'),
        W('w131', '1.3.1', 'Booking the venue', 'p4', 'Signed venue contract'),
        W('w132', '1.3.2', 'Contracting the catering', 'p4', 'Catering contract and menu'),
        W('w133', '1.3.3', 'Booking artists and programme', 'p3', 'Programme with contracts'),
        W('w134', '1.3.4', 'Organising technology and safety', 'p4', 'Approved safety concept'),
        W('w135', '1.3.5', 'Securing sponsors', 'p6', 'Sponsor agreements'),
        W('w14', '1.4', 'Communication', 'p5'),
        W('w141', '1.4.1', 'Designing the invitation', 'p5', 'Invitation and festival logo'),
        W('w142', '1.4.2', 'Running the invitation campaign', 'p5', 'Invitations sent, reminders done'),
        W('w143', '1.4.3', 'Managing registrations', 'p5', 'Final guest list'),
        W('w15', '1.5', 'Festival implementation', 'p4'),
        W('w151', '1.5.1', 'Setting up the venue', 'p4', 'Venue ready and inspected'),
        W('w152', '1.5.2', 'Running the festival day', 'p2', 'Festival held'),
        W('w153', '1.5.3', 'Dismantling and cleaning up', 'p4', 'Venue handed back'),
        W('w16', '1.6', 'Evaluation', 'p3'),
        W('w161', '1.6.1', 'Surveying participants', 'p5', 'Feedback survey results'),
        W('w162', '1.6.2', 'Writing the evaluation report', 'p3', 'Evaluation report'),
        W('w163', '1.6.3', 'Settling all invoices', 'p6', 'Final cost statement'),
      ],
      milestones: [
        { _id: 'm1', wbs: 'w111', name: 'Project started', type: 'Internal', baseline: '2026-02-02', revised: '', actual: '2026-02-02' },
        { _id: 'm2', wbs: 'w123', name: 'Festival concept approved', type: 'Internal', baseline: '2026-03-27', revised: '', actual: '2026-03-27' },
        { _id: 'm3', wbs: 'w131', name: 'Venue contract signed', type: 'External', baseline: '2026-04-10', revised: '2026-04-14', actual: '2026-04-14' },
        { _id: 'm4', wbs: 'w142', name: 'Invitations sent', type: 'Internal', baseline: '2026-04-30', revised: '', actual: '2026-04-29' },
        { _id: 'm5', wbs: 'w134', name: 'Safety concept approved by the authority', type: 'External', baseline: '2026-06-05', revised: '2026-06-10', actual: '2026-06-09' },
        { _id: 'm6', wbs: 'w152', name: 'Festival held', type: 'External', baseline: '2026-06-27', revised: '', actual: '2026-06-27' },
        { _id: 'm7', wbs: 'w162', name: 'Evaluation report completed', type: 'Internal', baseline: '2026-07-17', revised: '', actual: '2026-07-17' },
        { _id: 'm8', wbs: 'w114', name: 'Project completed', type: 'Internal', baseline: '2026-07-31', revised: '', actual: '2026-07-31' },
      ],
    },
    x: {
      schedule: {
        w111: D('2026-02-02', '2026-02-13'),
        w112: D('2026-02-16', '2026-07-17', '1.1.1'),
        w113: D('2026-02-16', '2026-07-17', '1.1.1'),
        w114: D('2026-07-20', '2026-07-31', '1.6.2; 1.6.3'),
        w121: D('2026-02-16', '2026-02-27', '1.1.1'),
        w122: D('2026-03-02', '2026-03-20', '1.2.1'),
        w123: D('2026-03-23', '2026-03-27', '1.2.2'),
        w131: D('2026-03-30', '2026-04-10', '1.2.3', '2026-03-30', '2026-04-14'),
        w132: D('2026-04-13', '2026-05-08', '1.3.1', '2026-04-15', '2026-05-15'),
        w133: D('2026-03-30', '2026-05-15', '1.2.3'),
        w134: D('2026-04-13', '2026-06-05', '1.3.1', '2026-04-15', '2026-06-09'),
        w135: D('2026-03-02', '2026-04-30', '1.2.1'),
        w141: D('2026-04-13', '2026-04-24', '1.3.1', '2026-04-15', '2026-04-24'),
        w142: D('2026-04-27', '2026-06-12', '1.4.1'),
        w143: D('2026-04-27', '2026-06-19', '1.4.1 SS+10'),
        w151: D('2026-06-22', '2026-06-26', '1.3.2; 1.3.4; 1.4.3'),
        w152: D('2026-06-27', '2026-06-27', '1.5.1'),
        w153: D('2026-06-28', '2026-06-30', '1.5.2'),
        w161: D('2026-06-29', '2026-07-10', '1.5.2'),
        w162: D('2026-07-06', '2026-07-17', '1.6.1 SS+5'),
        w163: D('2026-07-01', '2026-07-17', '1.5.3'),
      },
      steps: {
        I1: { status: 'Done', when: 'Dec 2025', format: 'One-to-one talks', who: 'Head of HR, Corporate Communications, Controlling', did: 'Described the festival idea, checked it against the employer-branding strategy, made a first business case', result: 'Management decided to run the festival' },
        I2: { status: 'Done', when: 'Jan 2026', format: 'One-to-one talks', who: 'Anna Berger (PO), PMO', did: 'Checked the project criteria (4 divisions, 6 months, > 50 person-days, > €20,000 external spend); appointed PO and PM', result: 'Category: project; PO and PM appointed' },
        I3: { status: 'Done', when: 'Jan 2026', format: 'Initial PO meeting', who: 'Anna Berger, Marc Huber', did: 'Filled in the six fields, listed stakeholders, named the first risks', result: 'First draft of the charter' },
        I4: { status: 'Done', when: '26 Jan 2026', format: 'Planning workshop (half day)', who: 'PM and four designated core team members', did: 'Agreed objectives, phases, WBS, milestones and a rough budget', result: 'Initial charter and first draft of the PM plan' },
        I5: { status: 'Done', when: '30 Jan 2026', format: 'PO meeting', who: 'Anna Berger, Marc Huber', did: 'Went through the charter, checked the business case', result: 'Charter released on 2 Feb 2026' },
        S1: { status: 'Done', when: '4 Feb 2026', format: 'Kick-off (2 h) and start workshop (1 day)', who: 'PM, core team, team members, PO for the first hour', did: 'Presented the charter, agreed roles, meetings and ground rules', result: 'Working team with a shared picture of the festival' },
        S2: { status: 'Done', when: 'Feb 2026', format: 'Individual planning, one-to-one talks', who: 'PM, core team', did: 'Wrote WP specifications, estimated dates, staff and costs', result: 'Detailed work packages' },
        S3: { status: 'Done', when: '20 Feb 2026', format: 'Follow-up workshop', who: 'PM, core team', did: 'Completed the bar chart, staff plan, cost plan and risk table', result: 'Validated plans' },
        S4: { status: 'Done', when: '24 Feb 2026', format: 'E-mail, one-to-one talks', who: 'PM, project assistant', did: 'Put all plans into the PM plan and sent it round', result: 'PM plan 1.0 (draft)' },
        S5: { status: 'Done', when: '27 Feb 2026', format: 'PO meeting', who: 'Anna Berger, Paul Gruber, Marc Huber', did: 'Presented the PM plan; agreed reporting every four weeks', result: 'PM plan 1.0 approved, baseline saved' },
      },
    },
  });
})();

// The station screen: the premise the game has always had, finally drawn. One
// module per section, lit by the missions done inside it, with the achievements
// and the ranks that earned the power alongside.
import {createStage} from './stage.js';
import {stationScene} from './scenes.js';
import {sections, conduits, stationState, earnedAchievements, ranks, rankOrder} from './progress.js';

const kilowatts = value => `${value.toLocaleString('en-US')} kW`;

export function mountStation(container, {getRecords, getFeats, onPick}) {
  let stage = null;
  let chosen = null;

  const view = () => {
    const state = stationState(getRecords());
    return {...state, conduits, sections:state.sections};
  };

  function paint(state) {
    const canvas = container.querySelector('.station-canvas');
    if (!canvas) return;
    if (!stage || !canvas.contains(stage.canvas)) {
      stage?.destroy();
      stage = createStage(canvas, {
        aspect:stationScene.aspect,
        bounds:stationScene.bounds,
        build:(scene, context) => stationScene.build(scene, context),
        describe:stationScene.describe,
        onPick:id => {
          const [type, ...rest] = String(id).split('-');
          if (type === 'section') { chosen = chosen === rest.join('-') ? null : rest.join('-'); render(); }
        }
      });
    }
    stage.update(state);
  }

  function render() {
    const state = view();
    const records = getRecords();
    const badges = earnedAchievements(records, getFeats());
    const open = state.sections.find(section => section.id === chosen) ?? null;
    const percent = state.capacity ? Math.round((state.power / state.capacity) * 100) : 0;

    container.innerHTML = `
      <div class="station-head">
        <div>
          <div class="eyebrow">Station status · ${state.restored} of ${state.sections.length} sections online</div>
          <h2>${state.online ? 'The station is yours again.' : 'Bring it back online.'}</h2>
          <p>${state.online
            ? 'Every section is lit and every system is answering. What is left is the two build modes, and whatever you want to solve again without the hints.'
            : 'Each section runs on the missions inside it. Solving one restores power; solving it without help restores all of it.'}</p>
        </div>
        <div class="station-gauge">
          <strong>${kilowatts(state.power)}</strong>
          <span>of ${kilowatts(state.capacity)} restored</span>
          <div class="gauge-track"><i style="width:${percent}%"></i></div>
          <span>${state.complete} of ${state.total} missions · ${percent}%</span>
        </div>
      </div>

      <section class="panel-block station-stage">
        <div class="panel-bar"><span>STATION CUTAWAY</span><span class="map-label">CLICK A SECTION</span></div>
        <div class="station-canvas"></div>
        <div class="map-legend">
          <span class="legend-unit">Lit windows: missions completed</span>
          <span>A module rises as its power is restored</span>
          <span>Conduits carry light only between sections that are awake</span>
        </div>
      </section>

      <div class="station-columns">
        <section class="panel-block">
          <div class="eyebrow">Sections</div>
          <div class="section-list">
            ${state.sections.map(section => `
              <button class="section-row ${section.status} ${section.id === chosen ? 'chosen' : ''}" data-section="${section.id}" aria-expanded="${section.id === chosen}">
                <span class="section-name"><strong>${section.name}</strong><small>${section.deck} · ${section.complete} of ${section.total}</small></span>
                <span class="section-track"><i style="width:${Math.round(section.share * 100)}%"></i></span>
                <span class="section-power">${kilowatts(section.power)}</span>
              </button>`).join('')}
          </div>
          ${open ? `
            <div class="section-detail">
              <p>${open.blurb}</p>
              <div class="section-missions">
                ${open.missions.map(level => {
                  const record = records[level.id];
                  const rank = record?.rank ? ranks[record.rank] : null;
                  return `<button class="section-mission ${rank ? 'done' : ''}" data-mission="${level.id}">
                    <span class="rank-chip ${rank ? rank.id : 'none'}" title="${rank ? rank.note : 'Not solved yet'}">${rank ? rank.mark : '·'}</span>
                    <span>${level.name}<small>${level.location}</small></span>
                    <span class="section-power">${rank ? kilowatts(rank.power) : '—'}</span>
                  </button>`;
                }).join('')}
              </div>
            </div>` : '<p class="section-hint">Pick a section on the map, or in the list, to see what is still dark inside it.</p>'}
        </section>

        <section class="panel-block">
          <div class="eyebrow">Achievements · ${badges.filter(badge => badge.done).length} of ${badges.length}</div>
          <div class="badge-list">
            ${badges.map(badge => `
              <div class="badge ${badge.done ? 'earned' : ''}">
                <span class="badge-mark">${badge.done ? '✓' : '·'}</span>
                <span><strong>${badge.name}</strong><small>${badge.hint}</small></span>
              </div>`).join('')}
          </div>
          <div class="rank-key">
            ${rankOrder.slice().reverse().map(id => `<span><i class="rank-chip ${id}">${ranks[id].mark}</i>${ranks[id].name} · ${ranks[id].power} kW</span>`).join('')}
          </div>
        </section>
      </div>`;

    container.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => {
      chosen = chosen === button.dataset.section ? null : button.dataset.section;
      render();
    }));
    container.querySelectorAll('[data-mission]').forEach(button => button.addEventListener('click', () => onPick(button.dataset.mission)));
    paint(view());
  }

  return {
    render,
    show(sectionId = null) { if (sectionId) chosen = sectionId; render(); },
    destroy() { stage?.destroy(); stage = null; }
  };
}

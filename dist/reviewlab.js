// The review screen. One question at a time, drawn from missions already solved,
// mixed across chapters. Nothing is timed and nothing is lost by getting one
// wrong — a wrong answer only means the question comes back sooner.
import {levels} from './levels.js';
import {reviewQueue, recallQuestion, scheduleAfter, dueItems, intervals, day} from './recall.js';

const soon = (due, now) => {
  const days = Math.ceil((due - now) / day);
  return days <= 0 ? 'now' : days === 1 ? 'tomorrow' : `in ${days} days`;
};

export function mountReview(container, {getReviews, onAnswer, onOpen}) {
  let queue = [];
  let position = 0;
  let chosen = null;
  let session = {asked:0, right:0};

  const start = () => {
    queue = reviewQueue(getReviews(), Date.now(), 8).map(item => ({...item, question:recallQuestion(item.level)})).filter(item => item.question);
    position = 0;
    chosen = null;
    session = {asked:0, right:0};
    render();
  };

  function answer(value) {
    if (chosen !== null) return;
    const item = queue[position];
    const right = JSON.stringify(value) === JSON.stringify(item.question.answer);
    chosen = {value, right};
    session.asked++;
    if (right) session.right++;
    onAnswer(item.level.id, right);
    render();
  }

  function render() {
    const now = Date.now();
    const reviews = getReviews();
    const waiting = Object.entries(reviews)
      .filter(([id]) => levels.some(level => level.id === id))
      .map(([id, entry]) => ({id, ...entry}))
      .sort((a, b) => (a.due ?? 0) - (b.due ?? 0));
    const due = dueItems(reviews, now);

    if (!waiting.length) {
      container.innerHTML = `
        <div class="review-head">
          <div class="eyebrow">Review</div>
          <h2>Nothing to review yet.</h2>
          <p>Missions come back here after you solve them — a day later, then three, then a week, then a fortnight. Retrieving something is what makes it stick; solving it once is not.</p>
        </div>`;
      return;
    }

    const item = queue[position] ?? null;
    const finished = queue.length > 0 && position >= queue.length;

    container.innerHTML = `
      <div class="review-head">
        <div>
          <div class="eyebrow">Review · ${due.length} due of ${waiting.length} scheduled</div>
          <h2>${due.length ? 'What have you kept?' : 'All caught up.'}</h2>
          <p>${due.length
            ? 'Questions are drawn from missions you have already solved, mixed across chapters. Getting one wrong only means it comes back sooner.'
            : 'Nothing is due right now. The schedule below says when each one comes round again.'}</p>
        </div>
        ${session.asked ? `<div class="review-score"><strong>${session.right} / ${session.asked}</strong><span>this session</span></div>` : ''}
      </div>

      ${item ? `
        <section class="panel-block review-card">
          <div class="panel-bar"><span>${item.level.chapter.toUpperCase()} · ${item.level.concept.toUpperCase()}</span><span class="map-label">${position + 1} of ${queue.length}</span></div>
          <p class="review-prompt">${item.question.prompt.split('\n')[0]}</p>
          ${item.question.prompt.includes('\n') ? `<pre class="polyglot-code">${item.question.prompt.split('\n').slice(1).join('\n').replace(/^\n+/, '')}</pre>` : ''}
          <div class="review-options">
            ${item.question.options.map((option, index) => {
              const picked = chosen && JSON.stringify(chosen.value) === JSON.stringify(option.value);
              const correct = chosen && JSON.stringify(option.value) === JSON.stringify(item.question.answer);
              return `<button class="review-option ${correct ? 'right' : ''} ${picked && !chosen.right ? 'wrong' : ''}" data-option="${index}" ${chosen ? 'disabled' : ''}>${option.label}</button>`;
            }).join('')}
          </div>
          ${chosen ? `
            <div class="review-verdict ${chosen.right ? 'right' : 'wrong'}">
              <strong>${chosen.right ? 'Right.' : 'Not this time.'}</strong>
              <p>${item.question.why}</p>
              <div class="review-actions">
                <button class="primary" data-next>${position + 1 >= queue.length ? 'Finish' : 'Next question'}</button>
                <button class="quiet" data-open="${item.level.id}">Open ${item.level.name}</button>
                <span class="review-when">Back ${soon(scheduleAfter(item.box ?? 1, chosen.right, now).due, now)}</span>
              </div>
            </div>` : ''}
        </section>`
      : finished ? `
        <section class="panel-block review-card">
          <div class="eyebrow">Session complete</div>
          <h3>${session.right} of ${session.asked} recalled.</h3>
          <p>${session.right === session.asked
            ? 'Everything came back. Those questions move further out; the ones you missed come round sooner.'
            : 'The ones you missed are scheduled again for tomorrow. Being wrong here is cheaper than being wrong later.'}</p>
          <button class="primary" data-restart>Check for more</button>
        </section>`
      : `
        <section class="panel-block review-card">
          <div class="eyebrow">Nothing due</div>
          <h3>Come back when something is.</h3>
          <button class="primary" data-restart>Check again</button>
        </section>`}

      <section class="panel-block">
        <div class="eyebrow">Schedule</div>
        <div class="review-list">
          ${waiting.slice(0, 14).map(entry => {
            const level = levels.find(item => item.id === entry.id);
            const ready = (entry.due ?? 0) <= now;
            return `<button class="review-row ${ready ? 'due' : ''}" data-open="${level.id}">
              <span><strong>${level.name}</strong><small>${level.chapter} · ${level.concept}</small></span>
              <span class="review-box">box ${entry.box ?? 1} of ${intervals.length}</span>
              <span class="review-when">${ready ? 'due now' : soon(entry.due, now)}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`;

    container.querySelectorAll('[data-option]').forEach(button =>
      button.addEventListener('click', () => answer(item.question.options[Number(button.dataset.option)].value)));
    container.querySelector('[data-next]')?.addEventListener('click', () => { position++; chosen = null; render(); });
    container.querySelector('[data-restart]')?.addEventListener('click', start);
    container.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => onOpen(button.dataset.open)));
  }

  return {render, start, destroy() {}};
}

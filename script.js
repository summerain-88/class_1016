const dateDay = document.querySelector('#date-day');
const dateWeekday = document.querySelector('#date-weekday');
const dateMonth = document.querySelector('#date-month');

function renderToday() {
  const now = new Date();
  dateDay.textContent = String(now.getDate()).padStart(2, '0');
  dateWeekday.textContent = new Intl.DateTimeFormat('zh-TW', { weekday: 'long' }).format(now);
  dateMonth.textContent = new Intl.DateTimeFormat('zh-TW', { year: 'numeric', month: 'long' }).format(now);
}
renderToday();

const todoList = document.querySelector('#todo-list');
const todoSummary = document.querySelector('#todo-summary');
const todoHeadingCount = document.querySelector('#todo-heading .heading-count');
const todoFeedback = document.querySelector('#todo-feedback');
const deleteCompletedButton = document.querySelector('#delete-completed');
const TODO_STORAGE_KEY = 'everyday-planner-todos-v1';

function updateTodoSummary() {
  const items = [...todoList.querySelectorAll('.todo-item')];
  const completed = items.filter((item) => item.querySelector('.todo-checkbox').checked).length;
  todoSummary.replaceChildren(document.createTextNode(String(completed).padStart(2, '0')));
  const detail = document.createElement('span');
  detail.textContent = ` / ${String(items.length).padStart(2, '0')} 已完成`;
  todoSummary.append(detail);
  todoHeadingCount.textContent = String(items.length).padStart(2, '0');
  deleteCompletedButton.disabled = completed === 0;
}

function getTodoData(item) {
  return {
    text: item.querySelector('.todo-text').textContent,
    category: item.querySelector('.todo-tag').dataset.category || 'life',
    deadline: item.querySelector('.todo-deadline').dateTime,
    completed: item.querySelector('.todo-checkbox').checked,
    reminded: item.dataset.reminded === 'true',
  };
}

function saveTodos() {
  try {
    localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify([...todoList.querySelectorAll('.todo-item')].map(getTodoData)));
  } catch (error) {
    console.warn('無法儲存待辦事項至此瀏覽器。', error);
  }
}

function renderTodo(todo) {
  const categories = {
    life: { label: '生活', className: 'tag-life' },
    work: { label: '工作', className: 'tag-work' },
    self: { label: '自己', className: 'tag-self' },
  };
  const selectedCategory = categories[todo.category] || categories.life;
  const item = document.createElement('li');
  item.className = `todo-item${todo.completed ? ' is-complete' : ''}`;
  item.dataset.reminded = String(Boolean(todo.reminded));
  const label = document.createElement('label');
  label.className = 'todo-label';
  const checkbox = document.createElement('input');
  checkbox.className = 'todo-checkbox';
  checkbox.type = 'checkbox';
  checkbox.checked = Boolean(todo.completed);
  const visualCheckbox = document.createElement('span');
  visualCheckbox.className = 'custom-checkbox';
  visualCheckbox.setAttribute('aria-hidden', 'true');
  const todoText = document.createElement('span');
  todoText.className = 'todo-text';
  todoText.textContent = todo.text;
  const deadline = document.createElement('time');
  deadline.className = 'todo-deadline';
  deadline.dateTime = todo.deadline;
  deadline.textContent = `${todo.deadline.slice(5).replace('-', '/')} 到期`;
  label.append(checkbox, visualCheckbox, todoText, deadline);
  const tag = document.createElement('span');
  tag.className = `todo-tag ${selectedCategory.className}`;
  tag.dataset.category = todo.category;
  tag.textContent = selectedCategory.label;
  const removeButton = document.createElement('button');
  removeButton.className = 'delete-todo-button';
  removeButton.type = 'button';
  removeButton.setAttribute('aria-label', `刪除待辦事項：${todo.text}`);
  removeButton.title = '刪除此待辦事項';
  removeButton.textContent = '×';
  item.append(label, tag, removeButton);
  return item;
}

function loadTodos() {
  try {
    const saved = localStorage.getItem(TODO_STORAGE_KEY);
    if (saved) {
      const todos = JSON.parse(saved);
      if (Array.isArray(todos)) todoList.replaceChildren(...todos.filter((todo) => todo && typeof todo.text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(todo.deadline)).map(renderTodo));
    }
  } catch (error) {
    console.warn('無法讀取已儲存的待辦事項，將使用預設清單。', error);
  }
  for (const item of todoList.querySelectorAll('.todo-item')) {
    item.dataset.reminded = item.dataset.reminded || 'false';
    const tag = item.querySelector('.todo-tag');
    if (tag && !tag.dataset.category) tag.dataset.category = tag.classList.contains('tag-work') ? 'work' : tag.classList.contains('tag-self') ? 'self' : 'life';
    if (!item.querySelector('.todo-deadline')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const deadline = document.createElement('time');
      deadline.className = 'todo-deadline';
      deadline.dateTime = value;
      deadline.textContent = `${value.slice(5).replace('-', '/')} 到期`;
      item.querySelector('.todo-label').append(deadline);
    }
    if (!item.querySelector('.delete-todo-button')) {
      const button = document.createElement('button');
      button.className = 'delete-todo-button';
      button.type = 'button';
      button.setAttribute('aria-label', `刪除待辦事項：${item.querySelector('.todo-text').textContent}`);
      button.title = '刪除此待辦事項';
      button.textContent = '×';
      item.append(button);
    }
  }
}

function checkTodoDeadlines() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let changed = false;
  for (const item of [...todoList.querySelectorAll('.todo-item')]) {
    const deadline = item.querySelector('.todo-deadline').dateTime;
    if (deadline < todayKey) {
      item.remove();
      changed = true;
      continue;
    }
    const days = Math.round((new Date(`${deadline}T00:00:00`) - today) / 86400000);
    item.classList.toggle('is-due-soon', days <= 1);
    if (days <= 1 && !item.querySelector('.todo-checkbox').checked && item.dataset.reminded !== 'true') {
      const title = item.querySelector('.todo-text').textContent;
      window.alert(days === 0 ? `「${title}」今天到期，記得留點時間完成喔！` : `「${title}」明天到期，別忘了安排時間喔！`);
      item.dataset.reminded = 'true';
      changed = true;
    }
  }
  if (changed) saveTodos();
  updateTodoSummary();
}

loadTodos();
if (!localStorage.getItem(TODO_STORAGE_KEY)) saveTodos();
updateTodoSummary();
checkTodoDeadlines();
window.setInterval(checkTodoDeadlines, 60 * 1000);
todoList.addEventListener('change', (event) => {
  if (!event.target.matches('.todo-checkbox')) return;
  event.target.closest('.todo-item').classList.toggle('is-complete', event.target.checked);
  saveTodos();
  updateTodoSummary();
});
todoList.addEventListener('click', (event) => {
  const button = event.target.closest('.delete-todo-button');
  if (!button) return;
  const item = button.closest('.todo-item');
  if (!window.confirm(`確定要刪除待辦事項「${item.querySelector('.todo-text').textContent}」嗎？`)) return;
  item.remove();
  saveTodos();
  updateTodoSummary();
  todoFeedback.textContent = '已刪除這項待辦，整理清單也是很好的進度。';
});
deleteCompletedButton.addEventListener('click', () => {
  const completed = [...todoList.querySelectorAll('.todo-item')].filter((item) => item.querySelector('.todo-checkbox').checked);
  if (!completed.length || !window.confirm(`確定要一次刪除 ${completed.length} 項已完成的待辦事項嗎？`)) return;
  completed.forEach((item) => item.remove());
  saveTodos();
  updateTodoSummary();
  todoFeedback.textContent = `已清除 ${completed.length} 項完成事項，辛苦了，做得很棒！`;
});
document.querySelector('#todo-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const input = document.querySelector('#todo-input');
  const category = document.querySelector('#todo-category');
  const deadline = document.querySelector('#todo-deadline-input');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minimum = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  deadline.min = minimum;
  if (!input.value.trim() || !deadline.value || deadline.value < minimum) {
    deadline.setCustomValidity(deadline.value ? '最後期限不能早於今天。' : '請設定今天或未來的最後期限。');
    form.reportValidity();
    deadline.addEventListener('change', () => deadline.setCustomValidity(''), { once: true });
    return;
  }
  deadline.setCustomValidity('');
  todoList.append(renderTodo({ text: input.value.trim(), category: category.value, deadline: deadline.value, completed: false, reminded: false }));
  input.value = '';
  category.value = 'life';
  deadline.value = '';
  saveTodos();
  updateTodoSummary();
  todoFeedback.textContent = '新增成功！每完成一件小事，都是很棒的進度。';
});
const eventForm = document.querySelector('#event-form');
const timeline = document.querySelector('#timeline');
const scheduleSummary = document.querySelector('#schedule-summary');
const scheduleCount = document.querySelector('#schedule-count');
const scheduleFeedback = document.querySelector('#schedule-feedback');
const categoryStyles = {
  工作: { card: 'event-violet', dot: 'dot-violet' },
  用餐: { card: 'event-orange', dot: 'dot-orange' },
  '自我照顧': { card: 'event-green', dot: 'dot-green' },
  個人: { card: 'event-violet', dot: 'dot-violet' },
};
const EVENT_STORAGE_KEY = 'everyday-planner-events-v1';
function getEventData(item) {
  return {
    title: item.querySelector('h3').textContent,
    time: item.querySelector('.time').textContent,
    category: item.querySelector('.event-category').textContent.trim(),
    location: item.querySelector('.event-detail')?.textContent.replace(/^⌖\s*/, '') || '',
  };
}
function saveEvents() {
  try {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify([...timeline.querySelectorAll('.schedule-item')].map(getEventData)));
  } catch (error) {
    console.warn('無法儲存行程至此瀏覽器。', error);
  }
}
function updateScheduleSummary() {
  const count = timeline.querySelectorAll('.schedule-item').length;
  const formattedCount = String(count).padStart(2, '0');
  scheduleCount.textContent = formattedCount;
  scheduleSummary.replaceChildren(document.createTextNode(formattedCount));
  const detail = document.createElement('span');
  detail.textContent = ' 個安排';
  scheduleSummary.append(detail);
}

document.querySelector('#jump-to-form').addEventListener('click', () => {
  document.querySelector('#add-event').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#event-title').focus({ preventScroll: true });
});


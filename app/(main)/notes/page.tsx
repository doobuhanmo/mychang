'use client';

import { useEffect, useState } from 'react';

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export default function NotesPage() {
  const [tab, setTab] = useState<'notes' | 'todos'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [todoInput, setTodoInput] = useState('');

  useEffect(() => {
    setNotes(JSON.parse(localStorage.getItem('mc_notes') || '[]'));
    setTodos(JSON.parse(localStorage.getItem('mc_todos') || '[]'));
  }, []);

  const saveNotes = (updated: Note[]) => {
    setNotes(updated);
    localStorage.setItem('mc_notes', JSON.stringify(updated));
  };

  const saveTodos = (updated: Todo[]) => {
    setTodos(updated);
    localStorage.setItem('mc_todos', JSON.stringify(updated));
  };

  const addNote = () => {
    if (!noteForm.title.trim() && !noteForm.content.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      title: noteForm.title.trim() || '제목 없음',
      content: noteForm.content.trim(),
      createdAt: new Date().toISOString(),
    };
    saveNotes([note, ...notes]);
    setNoteForm({ title: '', content: '' });
    setIsModalOpen(false);
  };

  const deleteNote = (id: string) => saveNotes(notes.filter((n) => n.id !== id));

  const addTodo = () => {
    if (!todoInput.trim()) return;
    const todo: Todo = {
      id: Date.now().toString(),
      text: todoInput.trim(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    saveTodos([todo, ...todos]);
    setTodoInput('');
  };

  const toggleTodo = (id: string) => {
    saveTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = (id: string) => saveTodos(todos.filter((t) => t.id !== id));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const pending = todos.filter((t) => !t.done).length;
  const done = todos.filter((t) => t.done).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📝 메모 & 할일</h1>
        <p className="page-subtitle">생각과 할 것들을 기록해요</p>
      </div>

      <div className="tabs">
        <button
          id="tab-notes"
          className={`tab-btn ${tab === 'notes' ? 'active' : ''}`}
          onClick={() => setTab('notes')}
        >
          📝 메모 ({notes.length})
        </button>
        <button
          id="tab-todos"
          className={`tab-btn ${tab === 'todos' ? 'active' : ''}`}
          onClick={() => setTab('todos')}
        >
          ✅ 할일 ({pending} 남음)
        </button>
      </div>

      {/* ── NOTES ── */}
      {tab === 'notes' && (
        <>
          <div className="section-header">
            <span className="section-title">{notes.length}개의 메모</span>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              + 메모 추가
            </button>
          </div>

          {notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <div className="empty-state-title">메모가 없어요</div>
              <div className="empty-state-desc">생각나는 것들을 적어봐요!</div>
            </div>
          ) : (
            <div className="card-grid">
              {notes.map((note) => (
                <div key={note.id} className="card note-card">
                  <button
                    className="card-delete-btn"
                    onClick={() => deleteNote(note.id)}
                    title="삭제"
                  >
                    ✕
                  </button>
                  <div className="card-title">{note.title}</div>
                  {note.content && (
                    <div className="note-content">{note.content}</div>
                  )}
                  <div className="note-meta">{formatDate(note.createdAt)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Modal */}
          {isModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">새 메모</h2>
                  <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
                </div>
                <div className="form-group">
                  <label className="form-label">제목</label>
                  <input
                    className="input"
                    placeholder="메모 제목"
                    value={noteForm.title}
                    onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">내용</label>
                  <textarea
                    className="textarea"
                    placeholder="여기에 자유롭게 써봐요..."
                    value={noteForm.content}
                    onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
                    style={{ minHeight: 140 }}
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
                  <button className="btn btn-primary" onClick={addNote}>저장</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TODOS ── */}
      {tab === 'todos' && (
        <>
          <div className="section-header">
            <span className="section-title">
              {pending > 0 ? `${pending}개 남음` : done > 0 ? '모두 완료! 🎉' : '할일 없음'}
            </span>
          </div>

          {/* Quick add */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input
              className="input"
              placeholder="할일을 입력하고 Enter"
              value={todoInput}
              onChange={(e) => setTodoInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTodo()}
            />
            <button className="btn btn-primary" onClick={addTodo} style={{ whiteSpace: 'nowrap' }}>
              추가
            </button>
          </div>

          {todos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-title">할일이 없어요</div>
              <div className="empty-state-desc">위에서 할일을 추가해봐요!</div>
            </div>
          ) : (
            <div className="todo-list">
              {todos.map((todo) => (
                <div key={todo.id} className={`todo-item ${todo.done ? 'done' : ''}`}>
                  <input
                    type="checkbox"
                    className="todo-checkbox"
                    checked={todo.done}
                    onChange={() => toggleTodo(todo.id)}
                  />
                  <span className="todo-text">{todo.text}</span>
                  <button
                    className="btn btn-danger"
                    onClick={() => deleteTodo(todo.id)}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

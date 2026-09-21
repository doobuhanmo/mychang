'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Todo {
  id: string;
  text: string;
  done: boolean;
  created_at: string;
}

type ModalMode = 'add' | 'edit';

export default function NotesPage() {
  const [tab, setTab] = useState<'notes' | 'todos'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', content: '' });
  const [todoInput, setTodoInput] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: n }, { data: t }] = await Promise.all([
        supabase.from('notes').select('*').order('created_at', { ascending: false }),
        supabase.from('todos').select('*').order('created_at', { ascending: false }),
      ]);
      setNotes(n ?? []);
      setTodos(t ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setNoteForm({ title: '', content: '' });
    setEditingNote(null);
    setIsModalOpen(true);
  };

  const openEditModal = (note: Note) => {
    setModalMode('edit');
    setNoteForm({ title: note.title, content: note.content });
    setEditingNote(note);
    setIsModalOpen(true);
  };

  const saveNote = async () => {
    if (!noteForm.title.trim() && !noteForm.content.trim()) return;
    if (modalMode === 'add') {
      const newNote = {
        id: Date.now().toString(),
        title: noteForm.title.trim() || '제목 없음',
        content: noteForm.content.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('notes').insert(newNote);
      if (!error) setNotes([newNote, ...notes]);
    } else if (editingNote) {
      const updated = {
        title: noteForm.title.trim() || '제목 없음',
        content: noteForm.content.trim(),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from('notes').update(updated).eq('id', editingNote.id);
      if (!error) setNotes(notes.map((n) => (n.id === editingNote.id ? { ...n, ...updated } : n)));
    }
    setIsModalOpen(false);
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (!error) setNotes(notes.filter((n) => n.id !== id));
  };

  const addTodo = async () => {
    if (!todoInput.trim()) return;
    const newTodo = {
      id: Date.now().toString(),
      text: todoInput.trim(),
      done: false,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('todos').insert(newTodo);
    if (!error) { setTodos([newTodo, ...todos]); setTodoInput(''); }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const { error } = await supabase.from('todos').update({ done: !todo.done }).eq('id', id);
    if (!error) setTodos(todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  const deleteTodo = async (id: string) => {
    const { error } = await supabase.from('todos').delete().eq('id', id);
    if (!error) setTodos(todos.filter((t) => t.id !== id));
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const pending = todos.filter((t) => !t.done).length;
  const done = todos.filter((t) => t.done).length;

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📝 메모 &amp; 할일</h1>
        <p className="page-subtitle">생각과 할 것들을 기록해요</p>
      </div>
      <div className="tabs">
        <button className={`tab-btn ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>📝 메모 ({notes.length})</button>
        <button className={`tab-btn ${tab === 'todos' ? 'active' : ''}`} onClick={() => setTab('todos')}>✅ 할일 ({pending} 남음)</button>
      </div>
      {loading && <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>불러오는 중...</div>}
      {!loading && tab === 'notes' && (
        <>
          <div className="section-header">
            <span className="section-title">{notes.length}개의 메모</span>
            <button className="btn btn-primary" onClick={openAddModal}>+ 메모 추가</button>
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
                  <div className="card-actions">
                    <button className="card-edit-btn" onClick={() => openEditModal(note)} title="수정">✏️</button>
                    <button className="card-delete-btn" onClick={() => deleteNote(note.id)} title="삭제">✕</button>
                  </div>
                  <div className="card-title">{note.title}</div>
                  {note.content && <div className="note-content">{note.content}</div>}
                  <div className="note-meta">{fmt(note.updated_at || note.created_at)}</div>
                </div>
              ))}
            </div>
          )}
          {isModalOpen && (
            <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
              <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2 className="modal-title">{modalMode === 'add' ? '새 메모' : '메모 수정'}</h2>
                  <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
                </div>
                <div className="form-group">
                  <label className="form-label">제목</label>
                  <input className="input" placeholder="메모 제목" value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} autoFocus />
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label className="form-label">내용</label>
                  <textarea className="textarea" placeholder="여기에 자유롭게 써봐요..." value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} style={{ minHeight: 140 }} />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
                  <button className="btn btn-primary" onClick={saveNote}>저장</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {!loading && tab === 'todos' && (
        <>
          <div className="section-header">
            <span className="section-title">{pending > 0 ? `${pending}개 남음` : done > 0 ? '모두 완료! 🎉' : '할일 없음'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
            <input className="input" placeholder="할일을 입력하고 Enter" value={todoInput} onChange={(e) => setTodoInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTodo()} />
            <button className="btn btn-primary" onClick={addTodo} style={{ whiteSpace: 'nowrap' }}>추가</button>
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
                  <input type="checkbox" className="todo-checkbox" checked={todo.done} onChange={() => toggleTodo(todo.id)} />
                  <span className="todo-text">{todo.text}</span>
                  <button className="btn btn-danger" onClick={() => deleteTodo(todo.id)} style={{ padding: '4px 10px', fontSize: 12 }}>삭제</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

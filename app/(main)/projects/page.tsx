'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  description: string;
  tech: string[];
  github?: string;
  demo?: string;
  internalLink?: string;
  emoji: string;
}

const EMOJIS = ['🚀', '⚡', '🎨', '🛠️', '🤖', '🌐', '📱', '🎯', '🔥', '💡'];

const DEFAULT_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'mychang',
    description: '나만의 이것저것 담는 개인 페이지. Next.js로 만든 첫 프로젝트!',
    tech: ['Next.js', 'TypeScript', 'CSS'],
    github: 'https://github.com/doobuhanmo/mychang',
    emoji: '✦',
  },
  {
    id: '2',
    name: '홍대 맛집 지도',
    description: '친구들과 홍대에서 만날 때를 위한 추천 맛집 모음. Leaflet 지도 위에 음식점 정보를 핀으로 표시.',
    tech: ['Next.js', 'Leaflet', 'TypeScript'],
    internalLink: '/hongdae',
    emoji: '🍜',
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    techInput: '',
    github: '',
    demo: '',
    emoji: '🚀',
  });

  useEffect(() => {
    const saved = localStorage.getItem('mc_projects');
    setProjects(saved ? JSON.parse(saved) : DEFAULT_PROJECTS);
  }, []);

  const save = (updated: Project[]) => {
    setProjects(updated);
    localStorage.setItem('mc_projects', JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!form.name.trim()) return;
    const project: Project = {
      id: Date.now().toString(),
      name: form.name.trim(),
      description: form.description.trim(),
      tech: form.techInput.split(',').map((t) => t.trim()).filter(Boolean),
      github: form.github.trim() || undefined,
      demo: form.demo.trim() || undefined,
      emoji: form.emoji,
    };
    save([...projects, project]);
    setForm({ name: '', description: '', techInput: '', github: '', demo: '', emoji: '🚀' });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    save(projects.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">🚀 프로젝트</h1>
        <p className="page-subtitle">내가 만든 것들을 여기에 모아둬요</p>
      </div>

      <div className="section-header">
        <span className="section-title">{projects.length}개의 프로젝트</span>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + 추가
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <div className="empty-state-title">아직 프로젝트가 없어요</div>
          <div className="empty-state-desc">첫 번째 프로젝트를 추가해봐요!</div>
        </div>
      ) : (
        <div className="card-grid">
          {projects.map((project) => (
            <div key={project.id} className="card project-card">
              <button
                className="card-delete-btn"
                onClick={() => handleDelete(project.id)}
                title="삭제"
              >
                ✕
              </button>
              <div className="card-title">
                <span>{project.emoji}</span>
                {project.name}
              </div>
              {project.description && (
                <div className="card-desc">{project.description}</div>
              )}
              {project.tech.length > 0 && (
                <div className="tags">
                  {project.tech.map((t) => (
                    <span key={t} className="tag">{t}</span>
                  ))}
                </div>
              )}
              {(project.github || project.demo || project.internalLink) && (
                <div className="project-card-links">
                  {project.internalLink && (
                    <a href={project.internalLink} target="_blank" rel="noopener noreferrer" className="link-btn" style={{ color: 'var(--accent-3)', borderColor: 'var(--border-active)' }}>
                      <span>↗</span> 열어보기
                    </a>
                  )}
                  {project.github && (
                    <a href={project.github} target="_blank" rel="noopener noreferrer" className="link-btn">
                      <span>⌥</span> GitHub
                    </a>
                  )}
                  {project.demo && (
                    <a href={project.demo} target="_blank" rel="noopener noreferrer" className="link-btn">
                      <span>↗</span> Demo
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">새 프로젝트 추가</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="form-group">
                <label className="form-label">프로젝트 이름 *</label>
                <input
                  className="input"
                  placeholder="멋진 프로젝트"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">이모지</label>
                <select
                  className="select"
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                  style={{ width: 60 }}
                >
                  {EMOJIS.map((e) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">설명</label>
              <textarea
                className="textarea"
                placeholder="프로젝트 설명을 써주세요"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ minHeight: 80 }}
              />
            </div>

            <div className="form-group" style={{ marginTop: 12 }}>
              <label className="form-label">기술 스택 (쉼표로 구분)</label>
              <input
                className="input"
                placeholder="React, TypeScript, Node.js"
                value={form.techInput}
                onChange={(e) => setForm({ ...form, techInput: e.target.value })}
              />
            </div>

            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input
                  className="input"
                  placeholder="https://github.com/..."
                  value={form.github}
                  onChange={(e) => setForm({ ...form, github: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Demo URL</label>
                <input
                  className="input"
                  placeholder="https://..."
                  value={form.demo}
                  onChange={(e) => setForm({ ...form, demo: e.target.value })}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>취소</button>
              <button className="btn btn-primary" onClick={handleAdd}>추가하기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

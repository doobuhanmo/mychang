export interface Post {
  id: string;
  num: number;
  title: string;
  date: string;
  images: string[];
  excerpt?: string;
  chapter?: number;
}

export type PlayScope = 'single' | 'group' | 'all';

export function getGroup(post: Post): { key: string; title: string } {
  const { title } = post;
  const titleWithoutPostNumber = title.replace(/^\d+\.\s*/, '');
  if (titleWithoutPostNumber.startsWith('차트 분석') || /^\(지지와 저항 \d+\)/.test(titleWithoutPostNumber)) {
    return { key: 'chart-analysis', title: '7. 차트 분석' };
  }
  if (titleWithoutPostNumber.startsWith('THEKERR NOTE')) {
    return { key: 'thekerr-note', title: 'THEKERR NOTE' };
  }

  const chapterMatch = title.match(/\s+(\d{1,2})-\d+\s*$/);
  const normalizedTitle = titleWithoutPostNumber
    .replace(/\s*\(\d+\)\s*$/, '')
    .replace(/\s*[①-⑳]\s*$/, '')
    .replace(/\s+\d{1,2}-\d+\s*$/, '')
    .trim();

  if (post.chapter) {
    return { key: `chapter-${post.chapter}`, title: `${post.chapter}. ${normalizedTitle}` };
  }

  if (chapterMatch) {
    return { key: `chapter-${chapterMatch[1]}`, title: `${chapterMatch[1]}. ${normalizedTitle}` };
  }

  return { key: normalizedTitle, title: normalizedTitle };
}

export function getGroupPosts(allPosts: Post[], currentPost: Post): Post[] {
  const group = getGroup(currentPost);
  return allPosts.filter((p) => getGroup(p).key === group.key);
}

export function getNextPost(allPosts: Post[], currentPost: Post, scope: PlayScope): Post | null {
  if (scope === 'single') return null;
  if (scope === 'group') {
    const groupPosts = getGroupPosts(allPosts, currentPost);
    const idx = groupPosts.findIndex((p) => p.id === currentPost.id);
    return idx >= 0 && idx < groupPosts.length - 1 ? groupPosts[idx + 1] : null;
  }
  if (scope === 'all') {
    const idx = allPosts.findIndex((p) => p.id === currentPost.id);
    return idx >= 0 && idx < allPosts.length - 1 ? allPosts[idx + 1] : null;
  }
  return null;
}

export function getPrevPost(allPosts: Post[], currentPost: Post, scope: PlayScope): Post | null {
  if (scope === 'single') return null;
  if (scope === 'group') {
    const groupPosts = getGroupPosts(allPosts, currentPost);
    const idx = groupPosts.findIndex((p) => p.id === currentPost.id);
    return idx > 0 ? groupPosts[idx - 1] : null;
  }
  if (scope === 'all') {
    const idx = allPosts.findIndex((p) => p.id === currentPost.id);
    return idx > 0 ? allPosts[idx - 1] : null;
  }
  return null;
}

import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/env';
import { useAuth } from '../context/AuthContext';
import { BottomSheet, Button, TextField } from '../components/tds';

interface Comment {
  id: string;
  content: string;
  author: { name: string; role: string; username: string };
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  author: { name: string; username: string; role: string };
  createdAt: string;
  _count: { comments: number };
  comments?: Comment[];
}

export function Board() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('전체');

  // 모달 상태
  const [showDetail, setShowDetail] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 글쓰기 폼
  const [writeCategory, setWriteCategory] = useState('일반');
  const [writeTitle, setWriteTitle] = useState('');
  const [writeContent, setWriteContent] = useState('');
  const [saving, setSaving] = useState(false);

  // 댓글 쓰기 폼
  const [commentContent, setCommentContent] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const qs = category !== '전체' ? `?category=${category}` : '';
      const res = await apiFetch('/api/community-board' + qs);
      if (res.ok) {
        setPosts(await res.json());
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const fetchDetail = async (id: string) => {
    try {
      const res = await apiFetch(`/api/community-board/${id}`);
      if (res.ok) {
        setSelectedPost(await res.json());
      }
    } catch { /* ignore */ }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    setShowDetail(true);
    fetchDetail(post.id);
  };

  const submitPost = async () => {
    if (!writeTitle || !writeContent) return alert('제목과 내용을 입력해주세요.');
    setSaving(true);
    try {
      const res = await apiFetch('/api/community-board', {
        method: 'POST',
        body: JSON.stringify({ title: writeTitle, content: writeContent, category: writeCategory })
      });
      if (res.ok) {
        setShowWrite(false);
        setWriteTitle('');
        setWriteContent('');
        fetchPosts();
      } else {
        const err = await res.json();
        alert(err.error || '등록 실패');
      }
    } catch { alert('오류 발생'); }
    setSaving(false);
  };

  const submitComment = async () => {
    if (!selectedPost || !commentContent) return alert('내용을 입력해주세요.');
    setCommenting(true);
    try {
      const res = await apiFetch(`/api/community-board/${selectedPost.id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentContent })
      });
      if (res.ok) {
        setCommentContent('');
        fetchDetail(selectedPost.id); // 내용 갱신
        fetchPosts(); // 리스트의 댓글 수 갱신
      } else {
        alert('등록 실패');
      }
    } catch { alert('오류 발생'); }
    setCommenting(false);
  };

  const getBadgeColor = (cat: string) => {
    if (cat === '공지사항') return { bg: '#ffeeee', color: '#f04452' };
    if (cat === '민원접수') return { bg: '#fff9e7', color: '#fe9800' };
    return { bg: '#f2f4f6', color: '#6b7684' };
  };

  const availableCategories = user?.role === 'TENANT' 
    ? ['민원접수', '일반'] 
    : ['공지사항', '민원접수', '일반'];

  return (
    <div style={{ padding: '24px 20px', minHeight: '100vh', background: '#f9fafb', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#191f28', margin: 0 }}>💬 소통 게시판</h2>
        <Button variant="primary" style={{ padding: '8px 16px', borderRadius: '20px', width: 'auto' }} onClick={() => setShowWrite(true)}>
          + 글쓰기
        </Button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
        {['전체', '공지사항', '민원접수', '일반'].map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '8px 16px', borderRadius: '24px', border: 'none', cursor: 'pointer',
              whiteSpace: 'nowrap', fontWeight: '600', fontSize: '14px', transition: 'all 0.2s',
              background: category === cat ? '#3182f6' : '#ffffff',
              color: category === cat ? '#ffffff' : '#6b7684',
              boxShadow: category === cat ? '0 4px 6px rgba(49, 130, 246, 0.2)' : '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#8b95a1' }}>불러오는 중...</div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', marginTop: '16px' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
          <div style={{ color: '#4e5968', fontWeight: 'bold' }}>아직 등록된 글이 없습니다.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
          {posts.map(p => {
            const badge = getBadgeColor(p.category);
            return (
              <div 
                key={p.id} 
                onClick={() => handlePostClick(p)}
                style={{ 
                  background: '#ffffff', borderRadius: '16px', padding: '16px', 
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)', cursor: 'pointer', transition: 'transform 0.1s' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ 
                    fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', 
                    background: badge.bg, color: badge.color 
                  }}>
                    {p.category}
                  </span>
                  <span style={{ fontSize: '12px', color: '#8b95a1' }}>
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#191f28', marginBottom: '4px' }}>
                  {p.title}
                </div>
                <div style={{ fontSize: '13px', color: '#4e5968', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '12px' }}>
                  {p.content}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#8b95a1', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '16px', background: '#e5e8eb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                      👤
                    </div>
                    {p.author.name || p.author.username}
                  </div>
                  <div style={{ fontSize: '13px', color: '#3182f6', fontWeight: '600' }}>
                    💬 {p._count.comments}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- 글쓰기 모달 --- */}
      <BottomSheet isOpen={showWrite} onClose={() => setShowWrite(false)} title="새 글 쓰기">
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '120px', maxHeight: '75vh' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>카테고리</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setWriteCategory(cat)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                    fontSize: '14px', fontWeight: '600', transition: 'all 0.15s',
                    background: writeCategory === cat ? '#3182f6' : '#f2f4f6',
                    color: writeCategory === cat ? '#fff' : '#4e5968',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <TextField label="제목 *" value={writeTitle} onChange={e => setWriteTitle(e.target.value)} placeholder="제목을 입력하세요" />
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#4e5968', marginBottom: '8px' }}>내용 *</label>
            <textarea 
              value={writeContent} onChange={e => setWriteContent(e.target.value)} placeholder="내용을 자세히 입력해주세요."
              style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid transparent', backgroundColor: '#f2f4f6', fontSize: '16px', minHeight: '150px', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <Button variant="primary" onClick={submitPost} disabled={saving}>
            {saving ? '등록하는 중...' : '등록하기'}
          </Button>
        </div>
      </BottomSheet>

      {/* --- 상세 내용 및 댓글 모달 --- */}
      <BottomSheet isOpen={showDetail} onClose={() => setShowDetail(false)} title="게시글 상세">
        {selectedPost ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '60vh' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ 
                  fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '8px', 
                  ...getBadgeColor(selectedPost.category)
                }}>
                  {selectedPost.category}
                </span>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#191f28', margin: '0 0 12px 0' }}>{selectedPost.title}</h3>
              <div style={{ display: 'flex', gap: '8px', fontSize: '13px', color: '#8b95a1', marginBottom: '24px', alignItems: 'center' }}>
                👤 {selectedPost.author.name || selectedPost.author.username} 
                <span>·</span> {new Date(selectedPost.createdAt).toLocaleString('ko-KR')}
              </div>
              <div style={{ fontSize: '15px', color: '#333d4b', lineHeight: '1.6', whiteSpace: 'pre-wrap', marginBottom: '32px' }}>
                {selectedPost.content}
              </div>

              {/* 댓글 리스트 */}
              <div style={{ borderTop: '1px solid #f2f4f6', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#191f28', marginBottom: '16px' }}>
                  댓글 {selectedPost.comments?.length || 0}
                </h4>
                {selectedPost.comments?.map(c => (
                  <div key={c.id} style={{ marginBottom: '16px', background: '#f9fafb', padding: '12px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#191f28' }}>
                        {c.author.name || c.author.username}
                        {c.author.role === 'ADMIN' && <span style={{ marginLeft: '4px', color: '#3182f6' }}>(관리자)</span>}
                      </span>
                      <span style={{ fontSize: '11px', color: '#8b95a1' }}>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ fontSize: '14px', color: '#4e5968', lineHeight: '1.4' }}>{c.content}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 댓글 입력창 (고정) */}
            <div style={{ background: '#fff', paddingTop: '12px', borderTop: '1px solid #f2f4f6', display: 'flex', gap: '8px' }}>
              <input 
                type="text" value={commentContent} onChange={e => setCommentContent(e.target.value)}
                placeholder="댓글을 남겨보세요." 
                onKeyDown={e => e.key === 'Enter' && submitComment()}
                style={{ flex: 1, background: '#f2f4f6', border: 'none', borderRadius: '24px', padding: '12px 16px', outline: 'none', fontSize: '14px' }}
              />
              <button 
                onClick={submitComment} disabled={commenting || !commentContent}
                style={{ background: commentContent ? '#3182f6' : '#e5e8eb', color: '#fff', border: 'none', borderRadius: '24px', padding: '0 20px', fontWeight: 'bold', cursor: commentContent ? 'pointer' : 'not-allowed' }}
              >
                전송
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#8b95a1' }}>로딩 중...</div>
        )}
      </BottomSheet>
    </div>
  );
}

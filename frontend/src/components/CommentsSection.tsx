import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Trash2, Edit2, Check, X, AlertCircle } from 'lucide-react';

interface CommentUser {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface Comment {
  id: number;
  referenceId: string;
  referenceType: string;
  content: string;
  userId: number;
  user: CommentUser;
  createdAt: string;
  updatedAt: string;
}

interface CommentsSectionProps {
  referenceId: string;
  referenceType: 'service' | 'route' | 'consumer' | 'upstream' | 'certificate';
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ referenceId, referenceType }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchComments();
  }, [referenceId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/comments?referenceId=${referenceId}&referenceType=${referenceType}`);
      setComments(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setError('');

    try {
      await axios.post('/api/comments', {
        referenceId,
        referenceType,
        content: newComment
      });
      setNewComment('');
      fetchComments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment');
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (id: number) => {
    if (!editContent.trim()) return;
    setError('');
    try {
      await axios.put(`/api/comments/${id}`, {
        content: editContent
      });
      setEditingCommentId(null);
      fetchComments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setError('');
    try {
      await axios.delete(`/api/comments/${id}`);
      fetchComments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete comment');
    }
  };

  const isOwner = (comment: Comment) => user?.id === comment.userId;
  const isAdmin = user?.admin || user?.role === 'admin';
  const canWrite = user?.role !== 'viewer';

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-bold uppercase tracking-wider text-text-primary">Comments</h4>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded border border-red-200 bg-red-50 text-red-700 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </div>
      )}

      {/* List Comments */}
      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 divide-y divide-border-light">
        {loading ? (
          <div className="text-center text-text-muted text-xs font-semibold py-4">Loading comments...</div>
        ) : comments.length > 0 ? (
          comments.map((comment, index) => (
            <div key={comment.id} className={`pt-4 flex gap-3 items-start ${index === 0 ? 'pt-0' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary flex items-center justify-center font-bold text-xs uppercase overflow-hidden">
                {comment.user?.firstName ? comment.user.firstName[0] : (comment.user?.username ? comment.user.username[0] : 'U')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-xs text-text-primary capitalize">
                      {comment.user?.firstName || comment.user?.username || 'User'}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                    {comment.updatedAt !== comment.createdAt && (
                      <span className="text-[9px] text-amber-600 font-bold">(edited)</span>
                    )}
                  </div>

                  {/* Actions */}
                  {editingCommentId !== comment.id && (isOwner(comment) || isAdmin) && (
                    <div className="flex gap-1.5 opacity-50 hover:opacity-100 transition-opacity">
                      {isOwner(comment) && (
                        <button
                          onClick={() => handleStartEdit(comment)}
                          className="p-1 rounded hover:bg-slate-100 text-text-secondary"
                          title="Edit Comment"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="p-1 rounded hover:bg-red-50 text-red-600"
                        title="Delete Comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editingCommentId === comment.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full p-2 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium"
                    />
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setEditingCommentId(null)}
                        className="p-1.5 rounded border border-border-light hover:bg-slate-100 text-text-secondary text-[10px] font-bold flex items-center"
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Cancel
                      </button>
                      <button
                        onClick={() => handleSaveEdit(comment.id)}
                        className="p-1.5 rounded bg-brand-primary text-white text-[10px] font-bold flex items-center"
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-secondary mt-1 whitespace-pre-wrap leading-relaxed">
                    {comment.content}
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-text-muted text-xs italic py-2">No comments posted yet.</div>
        )}
      </div>

      {/* Add Comment Input */}
      {canWrite ? (
        <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-border-light">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            required
            className="w-full p-2.5 rounded border border-border-light bg-slate-50 text-xs outline-none focus:border-brand-primary font-medium placeholder:text-text-muted transition-colors"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-brand-primary hover:bg-brand-primary-hover text-white font-bold text-xs uppercase"
            >
              Add Comment
            </button>
          </div>
        </form>
      ) : (
        <div className="text-text-muted text-xs italic bg-slate-50 p-2.5 rounded border border-border-light">
          You do not have permission to write audit comments.
        </div>
      )}
    </div>
  );
};

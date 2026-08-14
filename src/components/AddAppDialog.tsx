import { useState, useEffect } from 'preact/hooks';
import TechSelector from './TechSelector';
import { APP_CATEGORIES, APP_STATUSES, type AppCategory, type AppStatus } from '../lib/catalog';
import { normalizeYouTubeUrl } from '../lib/video';

interface TechStack {
  id: number;
  name: string;
  slug: string;
  category: string;
  color: string | null;
}

interface TechEntry {
  id: number;
  usage_role?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editApp?: {
    id: number;
    title: string;
    description: string;
    site_url: string;
    github_url: string;
    video_url: string;
    thumbnail_url: string;
    is_private: boolean;
    thumbnail_type: string;
    category: AppCategory;
    status: AppStatus;
    tech_ids: number[];
  };
}

type ThumbnailType = 'auto' | 'manual' | 'none';

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

export default function AddAppDialog({ isOpen, onClose, onSaved, editApp }: Props) {
  const [title, setTitle] = useState(editApp?.title || '');
  const [description, setDescription] = useState(editApp?.description || '');
  const [siteUrl, setSiteUrl] = useState(editApp?.site_url || '');
  const [githubUrl, setGithubUrl] = useState(editApp?.github_url || '');
  const [videoUrl, setVideoUrl] = useState(editApp?.video_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(editApp?.thumbnail_url || '');
  const [isPrivate, setIsPrivate] = useState(editApp?.is_private || false);
  const [category, setCategory] = useState<AppCategory>(editApp?.category || 'other');
  const [status, setStatus] = useState<AppStatus>(editApp?.status || 'live');
  const [thumbnailType, setThumbnailType] = useState<ThumbnailType>(
    editApp?.thumbnail_url
      ? 'manual'
      : editApp?.thumbnail_type === 'none'
        ? 'none'
        : 'auto'
  );
  const [localPreviewUrl, setLocalPreviewUrl] = useState('');
  const [selectedTech, setSelectedTech] = useState<TechEntry[]>(
    editApp?.tech_ids?.map((id) => ({ id })) || []
  );
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/tech')
        .then((r) => r.json())
        .then((data) => setTechStacks(data as TechStack[]))
        .catch(() => {});
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  // Auto-generate thumbnail preview from site URL
  const previewThumbnail = thumbnailType === 'manual'
    ? localPreviewUrl || thumbnailUrl
    : thumbnailType === 'auto' && siteUrl
      ? `https://image.thum.io/get/${siteUrl}`
      : '';

  const selectedIds = selectedTech.map((t) => t.id);

  function handleTechChange(ids: number[]) {
    setSelectedTech((prev) => {
      const existing = new Map(prev.map((e) => [e.id, e]));
      return ids.map((id) => existing.get(id) || { id });
    });
  }

  async function handleDetectTech() {
    if (!githubUrl) return;
    setDetecting(true);
    try {
      const res = await fetch('/api/detect-tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: githubUrl }),
      });
      const data = await res.json() as { detected: (TechStack & { usage_role?: string })[] };
      if (data.detected?.length) {
        setSelectedTech((prev) => {
          const existing = new Map(prev.map((e) => [e.id, e]));
          for (const t of data.detected) {
            if (!existing.has(t.id)) {
              existing.set(t.id, { id: t.id, usage_role: t.usage_role });
            }
          }
          return Array.from(existing.values());
        });
      }
    } catch {
      // silently ignore
    }
    setDetecting(false);
  }

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setError('');
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      input.value = '';
      return;
    }
    if (file.size > MAX_THUMBNAIL_SIZE) {
      setError('画像は10MB以下のものを選択してください');
      input.value = '';
      return;
    }

    const previousThumbnailType = thumbnailType;
    const previewUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(previewUrl);
    setThumbnailType('manual');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'アップロードに失敗しました');
      }
      if (data.url) {
        setThumbnailUrl(data.url);
      }
    } catch (err: any) {
      setLocalPreviewUrl('');
      setThumbnailType(previousThumbnailType);
      setError(err.message || 'アップロードに失敗しました');
    } finally {
      setUploading(false);
      input.value = '';
    }
  }

  function handleClearThumbnail() {
    setThumbnailUrl('');
    setLocalPreviewUrl('');
    setThumbnailType('none');
    setError('');
  }

  function handleUseAutoThumbnail() {
    setThumbnailUrl('');
    setLocalPreviewUrl('');
    setThumbnailType('auto');
    setError('');
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください');
      return;
    }
    if (videoUrl.trim() && !normalizeYouTubeUrl(videoUrl)) {
      setError('紹介動画には有効なYouTube URLを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body = {
        ...(editApp ? { id: editApp.id } : {}),
        title: title.trim(),
        description: description.trim(),
        site_url: siteUrl.trim(),
        github_url: githubUrl.trim(),
        video_url: videoUrl.trim(),
        thumbnail_url: thumbnailUrl.trim(),
        thumbnail_type: thumbnailType,
        is_private: isPrivate,
        category,
        status,
        tech_entries: selectedTech,
      };

      const res = await fetch('/api/apps', {
        method: editApp ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || 'Failed to save');
      }

      onSaved();
    } catch (err: any) {
      setError(err.message || '保存に失敗しました');
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="fixed inset-0 bg-black/50" />
      <div class="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <h2 class="text-lg font-semibold text-gray-900">
            {editApp ? 'アプリを編集' : 'アプリを追加'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            class="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} class="p-6 space-y-5">
          {error && (
            <div class="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
          )}

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">タイトル *</label>
            <input
              type="text"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="My Awesome App"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">説明</label>
            <textarea
              value={description}
              onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
              rows={3}
              placeholder="アプリの説明..."
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">カテゴリー</label>
              <select
                value={category}
                onChange={(e) => setCategory((e.target as HTMLSelectElement).value as AppCategory)}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                {Object.entries(APP_CATEGORIES).map(([value, item]) => (
                  <option value={value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus((e.target as HTMLSelectElement).value as AppStatus)}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                {Object.entries(APP_STATUSES).map(([value, item]) => (
                  <option value={value}>{item.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">サイトURL</label>
            <input
              type="url"
              value={siteUrl}
              onInput={(e) => setSiteUrl((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="https://myapp.example.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
            <div class="flex gap-2">
              <input
                type="url"
                value={githubUrl}
                onInput={(e) => setGithubUrl((e.target as HTMLInputElement).value)}
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="https://github.com/user/repo"
              />
              <button
                type="button"
                onClick={handleDetectTech}
                disabled={!githubUrl || detecting}
                class="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {detecting ? '検出中...' : '技術検出'}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">紹介動画URL（YouTube）</label>
            <input
              type="url"
              value={videoUrl}
              onInput={(e) => setVideoUrl((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="https://youtu.be/xxxxxxxxxxx"
            />
            <p class="mt-2 text-xs leading-5 text-gray-500">
              YouTubeの公開・限定公開URLに対応しています。限定公開でも、この詳細ページを見た人は再生できるため、非公開情報を含めないでください。
            </p>
          </div>

          <label class="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate((e.target as HTMLInputElement).checked)}
              class="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span>
              <span class="block text-sm font-medium text-gray-800">Privateアプリとして登録</span>
              <span class="mt-0.5 block text-xs text-gray-500">概要・サムネイル・紹介動画・技術構成は公開し、サイトURLとGitHub URLはログイン中の自分だけに表示します。GitHub が private の場合は自動で有効になります。</span>
            </span>
          </label>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">サムネイル</label>
            {previewThumbnail && (
              <div class="mb-2 aspect-video bg-gray-100 rounded-lg overflow-hidden max-w-xs relative">
                <img src={previewThumbnail} alt="Preview" class="w-full h-full object-cover" />
                {uploading && (
                  <div class="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-sm font-medium">
                    アップロード中...
                  </div>
                )}
              </div>
            )}
            <div class="flex items-center gap-3">
              <label class={`px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 cursor-pointer'}`}>
                {uploading ? 'アップロード中...' : '画像をアップロード'}
                <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} class="hidden" />
              </label>
              {previewThumbnail && !uploading && (
                <button
                  type="button"
                  onClick={handleClearThumbnail}
                  class="px-3 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
                >
                  クリア
                </button>
              )}
              {thumbnailType === 'none' && siteUrl && (
                <button
                  type="button"
                  onClick={handleUseAutoThumbnail}
                  class="px-3 py-2 text-indigo-600 text-sm font-medium rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  自動取得に戻す
                </button>
              )}
            </div>
            <p class="mt-2 text-xs text-gray-500">
              {thumbnailType === 'auto'
                ? 'サイトURLから自動取得します'
                : thumbnailType === 'none'
                  ? 'サムネイルは表示されません'
                  : '10MB以下の画像をアップロードできます'}
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">技術スタック</label>
            <TechSelector
              selected={selectedIds}
              onChange={handleTechChange}
              techStacks={techStacks}
            />
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '保存中...' : editApp ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

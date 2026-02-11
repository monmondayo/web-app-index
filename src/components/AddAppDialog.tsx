import { useState, useEffect } from 'preact/hooks';
import TechSelector from './TechSelector';

interface TechStack {
  id: number;
  name: string;
  slug: string;
  category: string;
  color: string | null;
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
    thumbnail_url: string;
    tech_ids: number[];
  };
}

export default function AddAppDialog({ isOpen, onClose, onSaved, editApp }: Props) {
  const [title, setTitle] = useState(editApp?.title || '');
  const [description, setDescription] = useState(editApp?.description || '');
  const [siteUrl, setSiteUrl] = useState(editApp?.site_url || '');
  const [githubUrl, setGithubUrl] = useState(editApp?.github_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(editApp?.thumbnail_url || '');
  const [selectedTech, setSelectedTech] = useState<number[]>(editApp?.tech_ids || []);
  const [techStacks, setTechStacks] = useState<TechStack[]>([]);
  const [loading, setLoading] = useState(false);
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

  // Auto-generate thumbnail preview from site URL
  const previewThumbnail = thumbnailUrl || (siteUrl ? `https://image.thum.io/get/${siteUrl}` : '');

  async function handleDetectTech() {
    if (!githubUrl) return;
    setDetecting(true);
    try {
      const res = await fetch('/api/detect-tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ github_url: githubUrl }),
      });
      const data = await res.json() as { detected: TechStack[] };
      if (data.detected?.length) {
        const newIds = data.detected.map((t) => t.id);
        setSelectedTech((prev) => [...new Set([...prev, ...newIds])]);
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

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json() as { url: string };
      if (data.url) {
        setThumbnailUrl(data.url);
      }
    } catch {
      setError('アップロードに失敗しました');
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) {
      setError('タイトルを入力してください');
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
        thumbnail_url: thumbnailUrl.trim(),
        thumbnail_type: thumbnailUrl ? 'manual' : 'auto',
        tech_ids: selectedTech,
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
            <label class="block text-sm font-medium text-gray-700 mb-1">サムネイル</label>
            {previewThumbnail && (
              <div class="mb-2 aspect-video bg-gray-100 rounded-lg overflow-hidden max-w-xs">
                <img src={previewThumbnail} alt="Preview" class="w-full h-full object-cover" />
              </div>
            )}
            <div class="flex items-center gap-3">
              <label class="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
                画像をアップロード
                <input type="file" accept="image/*" onChange={handleFileUpload} class="hidden" />
              </label>
              <span class="text-xs text-gray-500">
                またはサイトURLから自動取得
              </span>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">技術スタック</label>
            <TechSelector
              selected={selectedTech}
              onChange={setSelectedTech}
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
              disabled={loading}
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

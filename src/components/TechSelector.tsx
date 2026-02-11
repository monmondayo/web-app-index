import { useState, useEffect } from 'preact/hooks';

interface TechStack {
  id: number;
  name: string;
  slug: string;
  category: string;
  color: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'フロントエンド',
  backend: 'バックエンド',
  database: 'データベース',
  infrastructure: 'インフラ',
  library: 'ライブラリ',
  other: 'その他',
};

const CATEGORY_BADGE: Record<string, string> = {
  frontend: 'bg-blue-100 text-blue-800',
  backend: 'bg-green-100 text-green-800',
  database: 'bg-purple-100 text-purple-800',
  infrastructure: 'bg-orange-100 text-orange-800',
  library: 'bg-pink-100 text-pink-800',
  other: 'bg-gray-100 text-gray-800',
};

interface Props {
  selected: number[];
  onChange: (ids: number[]) => void;
  techStacks: TechStack[];
}

export default function TechSelector({ selected, onChange, techStacks }: Props) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');

  const categories = [...new Set(techStacks.map((t) => t.category))];

  const filtered = techStacks.filter((t) => {
    if (filterCategory && t.category !== filterCategory) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div>
      <div class="flex gap-2 mb-3">
        <input
          type="text"
          placeholder="技術を検索..."
          value={search}
          onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          class="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      <div class="flex flex-wrap gap-1.5 mb-3">
        <button
          type="button"
          onClick={() => setFilterCategory('')}
          class={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
            !filterCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
            class={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${
              filterCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      <div class="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
        {filtered.map((tech) => (
          <label
            key={tech.id}
            class={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
              selected.includes(tech.id) ? 'bg-indigo-50' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(tech.id)}
              onChange={() => toggle(tech.id)}
              class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <img
              src={`https://cdn.simpleicons.org/${tech.slug}/${tech.color || '000000'}`}
              alt=""
              class="w-4 h-4"
              loading="lazy"
            />
            <span class="text-sm text-gray-900">{tech.name}</span>
            <span class={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_BADGE[tech.category] || ''}`}>
              {CATEGORY_LABELS[tech.category] || tech.category}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <p class="text-sm text-gray-500 text-center py-4">該当する技術がありません</p>
        )}
      </div>

      {selected.length > 0 && (
        <div class="mt-2 flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const tech = techStacks.find((t) => t.id === id);
            if (!tech) return null;
            return (
              <span
                key={id}
                class={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[tech.category] || ''}`}
              >
                <img
                  src={`https://cdn.simpleicons.org/${tech.slug}/${tech.color || '000000'}`}
                  alt=""
                  class="w-3 h-3"
                />
                {tech.name}
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  class="ml-0.5 hover:text-red-600"
                >
                  &times;
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

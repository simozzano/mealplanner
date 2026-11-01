import { useState, useEffect } from 'preact/hooks';
import { useApp } from '../context.jsx';
import { getRecipeList } from '../lib/recipes.js';
import { RecipeList } from './recipes/RecipeList.jsx';
import { RecipeDetail } from './recipes/RecipeDetail.jsx';
import { RecipeForm } from './recipes/RecipeForm.jsx';
import '../styles/recipes.css';

// Navigazione interna (il router globale non supporta sotto-route):
// { mode: 'list' } | { mode: 'detail', id } | { mode: 'edit', id|null }
export function Recipes() {
  const { source, settings } = useApp();
  const [view, setView] = useState({ mode: 'list' });
  const [recipes, setRecipes] = useState(null);
  const [error, setError] = useState('');

  const reload = () =>
    getRecipeList(source).then(setRecipes).catch((e) => setError(e.message));

  useEffect(() => { reload(); }, []);

  const go = (v) => { window.scrollTo(0, 0); setView(v); };
  const done = async (next) => { await reload(); go(next); };

  return (
    <section class="rc">
      {error && <p class="error">{error}</p>}
      {view.mode === 'list' && (
        <RecipeList
          recipes={recipes}
          tipiPasto={settings.tipiPasto}
          onOpen={(id) => go({ mode: 'detail', id })}
          onNew={() => go({ mode: 'edit', id: null })}
        />
      )}
      {view.mode === 'detail' && (
        <RecipeDetail
          id={view.id}
          tipiPasto={settings.tipiPasto}
          onBack={() => go({ mode: 'list' })}
          onEdit={() => go({ mode: 'edit', id: view.id })}
          onDeleted={() => done({ mode: 'list' })}
        />
      )}
      {view.mode === 'edit' && (
        <RecipeForm
          id={view.id}
          onCancel={() => go(view.id ? { mode: 'detail', id: view.id } : { mode: 'list' })}
          onSaved={(saved) => done({ mode: 'detail', id: saved.id })}
        />
      )}
    </section>
  );
}

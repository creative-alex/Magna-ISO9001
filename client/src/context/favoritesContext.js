import { createContext, useContext, useState, useEffect } from "react";
import { UserContext } from "./userContext";
import { fixEncoding } from "../utils/fixEncoding";
import { apiFetch } from "../utils/apiFetch";

export const FavoritesContext = createContext();

const normalizeFavorites = (data) => {
  const arr = Array.isArray(data) ? data : (data.favorites || []);
  return arr.map(fav =>
    typeof fav === 'string'
      ? { path: fav, name: fixEncoding(fav.split('/').pop().replace('.pdf', '')) }
      : {
          path: fav.path || fav.filePath,
          name: fixEncoding(fav.name || fav.fileName || (fav.path || fav.filePath || '').split('/').pop().replace('.pdf', ''))
        }
  );
};

export const FavoritesProvider = ({ children }) => {
  const { username } = useContext(UserContext);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!username) { setFavorites([]); return; }
    apiFetch(`/users/favorites/${username}`)
      .then(r => r.json())
      .then(data => setFavorites(normalizeFavorites(data)))
      .catch(() => setFavorites([]));
  }, [username]);

  const toggleFavorite = async (filePath, fileName) => {
    const exists = favorites.find(f => f.path === filePath);
    try {
      const r = await apiFetch(`/users/favorites`, {
        method: "POST",
        body: JSON.stringify({ username, filePath, fileName, action: exists ? 'remove' : 'add' })
      });
      if (r.ok) {
        setFavorites(prev =>
          exists
            ? prev.filter(f => f.path !== filePath)
            : [...prev, { path: filePath, name: fixEncoding(fileName) }]
        );
      }
    } catch (e) { console.error(e); }
  };

  const isFavorite = (filePath) => favorites.some(f => f.path === filePath);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../../utils/LocaleContext';
import './PropertySearch.css';

export default function PropertySearch() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/properties?search=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/properties');
    }
  };

  return (
    <form
      className="hero-search-pill"
      onSubmit={handleSubmit}
      role="search"
      aria-label={t.search_button}
    >
      <div className="hero-search-leading" aria-hidden="true">
        <svg
          className="hero-search-icon"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      <input
        type="text"
        className="hero-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.hero_search_placeholder}
        aria-label={t.hero_search_placeholder}
      />

      <button type="submit" className="hero-search-btn" aria-label={t.search_button}>
        <svg
          className="hero-search-btn-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>{t.search_button}</span>
      </button>
    </form>
  );
}

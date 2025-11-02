import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Home() {
  const [meme, setMeme] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [genre, setGenre] = useState('memes');
  const [allowNsfw, setAllowNsfw] = useState(false);

  const genres = [
    { value: 'memes', label: 'Classic Memes' },
    { value: 'dankmemes', label: 'Dank Memes' },
    { value: 'me_irl', label: 'Me IRL' },
    { value: 'wholesomememes', label: 'Wholesome' },
    { value: 'ProgrammerHumor', label: 'Programmer Humor' },
    { value: 'AdviceAnimals', label: 'Advice Animals' },
  ];

  const fetchMeme = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/meme?genre=${genre}&nsfw=${allowNsfw}`);
      const data = await res.json();
      
      if (data.error || data.fallback) {
        setError(data.error);
        setMeme({ url: '/fallback.svg', title: data.error, fallback: true });
      } else {
        setMeme(data);
      }
    } catch (err) {
      setError('Network error! Are you even connected? 📡');
      setMeme({ url: '/fallback.svg', title: 'Error loading meme', fallback: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeme();
  }, [genre, allowNsfw]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <Head>
        <title>Memeception - Infinite Meme Generator</title>
        <meta name="description" content="Your daily dose of fresh memes" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
            🧠 Memeception
          </h1>
          <button
            onClick={toggleTheme}
            className={`px-4 py-2 rounded-lg transition-all ${
              theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 shadow'
            }`}
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </header>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <select
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                theme === 'dark' 
                  ? 'bg-gray-800 border-gray-700 focus:border-purple-500' 
                  : 'bg-white border-gray-300 focus:border-purple-500'
              } focus:outline-none`}
            >
              {genres.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
            
            <label className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
              theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={allowNsfw}
                onChange={(e) => setAllowNsfw(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="whitespace-nowrap">🔞 NSFW</span>
            </label>
          </div>
        </div>

        {/* Meme Display */}
        <div className={`rounded-xl overflow-hidden shadow-2xl mb-6 ${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        }`}>
          {loading ? (
            <div className="aspect-square flex items-center justify-center">
              <div className="animate-spin text-6xl">🌀</div>
            </div>
          ) : meme ? (
            <>
              <div className="relative">
                <img
                  src={meme.url}
                  alt={meme.title}
                  className="w-full h-auto max-h-[70vh] object-contain"
                  onError={(e) => {
                    e.target.src = '/fallback.svg';
                  }}
                />
                {meme.nsfw && (
                  <span className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                    🔞 NSFW
                  </span>
                )}
              </div>
              
              {!meme.fallback && (
                <div className="p-6 space-y-3">
                  <h2 className="text-xl font-semibold">{meme.title}</h2>
                  <div className="flex flex-wrap gap-4 text-sm opacity-75">
                    <span>👤 u/{meme.author}</span>
                    <span>📍 r/{meme.subreddit}</span>
                    <span>⬆️ {meme.ups?.toLocaleString()} upvotes</span>
                  </div>
                  {meme.permalink && (
                    <a
                      href={meme.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-purple-500 hover:text-purple-400 transition-colors"
                    >
                      View on Reddit →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Error Message */}
        {error && (
          <div className={`p-4 rounded-lg mb-6 text-center ${
            theme === 'dark' ? 'bg-red-900/30 border border-red-700' : 'bg-red-100 border border-red-300'
          }`}>
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={fetchMeme}
          disabled={loading}
          className="w-full py-4 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold rounded-lg transition-all transform hover:scale-105 disabled:scale-100 shadow-lg"
        >
          {loading ? '🔄 Loading...' : '🎲 Gimme Another Meme!'}
        </button>

        {/* Footer */}
        <footer className="mt-12 text-center opacity-50 text-sm">
          <p>Powered by Reddit & caffeine ☕ | Made with 😂 for meme lovers</p>
        </footer>
      </main>
    </div>
  );
}

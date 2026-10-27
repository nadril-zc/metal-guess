import { useState, useEffect, useMemo } from 'react'
import './App.css'

interface Band {
  band_id: string;
  name: string;
  url: string;
  country: string;
  genres: string[];
}

const NUM_SHARDS = 60;

interface UseRandomBandShardResult {
  bands: Band[] | null;
  error: Error | null;
}

function useRandomBandShard(): UseRandomBandShardResult {
  const [bands, setBands] = useState<Band[] | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const shardIndex = Math.floor(Math.random() * NUM_SHARDS);
    const shardId = String(shardIndex).padStart(2, '0');

    fetch(`${import.meta.env.BASE_URL}shards/bands_shard_${shardId}.json`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load shard ${shardId}`);
        return res.json() as Promise<Band[]>;
      })
      .then(setBands)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      });

    return () => controller.abort();
  }, []);

  return { bands, error };
}

// shuffle function
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Game({ onGameOver }: { onGameOver: (score: number) => void }) {
  const { bands, error } = useRandomBandShard();
  const [currentBand, setCurrentBand]  = useState<Band | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isRight, setIsRight] = useState<boolean>(false);
  const [count, setCount] = useState(0);
  const [life, setLife] = useState(100);

  // bands is now an array of ~3,100 bands from one random shard —
  useEffect(() => {
    if (bands && bands.length > 0) {
      const randomBand = bands[Math.floor(Math.random() * bands.length)];
      setCurrentBand(randomBand);
    }
  }, [bands]);

  const sortedGenres = useMemo<string[]>(() => {
    if (!bands) return [];
    const set = new Set<string>();
    for (const band of bands) {
      for (const genre of band.genres) set.add(genre);
    }
    return Array.from(set).sort();
  }, [bands]);

  const guesses = useMemo<string[]>(() => {
    if (!currentBand) return [];
    const correct = currentBand.genres[0];
    const distractors = shuffle(
      sortedGenres.filter((g) => !currentBand.genres.includes(g))
    ).slice(0, 3);
    return shuffle([correct, ...distractors]);
  }, [currentBand, sortedGenres]);

  if (error) return <div>Couldn't load bands.</div>;
  if (!bands) return <div>Loading…</div>;
  if (!currentBand) return <div>Loading…</div>;

  // Loop through all of the genres of a band and add them into one string to display
  let genreString: string = '';

  for(let i = 0; i < currentBand.genres.length; i++ ) {
    if ( i == 0 ) {
      genreString += currentBand.genres[i];
    } else {
      genreString += ' / '+currentBand.genres[i];
    }
  }

  function handleClick(genre:string) {
    if (!currentBand) return;
    if (!bands) return;
    if (isAnswered) return;

    if ( currentBand.genres.includes(genre)) {
      setIsRight(true);
      setCount(prevCount => prevCount + 1);
    } else {
      setIsRight(false);

       setLife(prevLife => prevLife - 10);
    }

    setIsAnswered(true);
  }

  function handleNext() {
    if (!bands) return;

    const randomBand = bands[Math.floor(Math.random() * bands.length)];
    setCurrentBand(randomBand);
    setIsAnswered(false);
  }

  return (
    <>
      <header className="scores">
        <span className="count">🔪: <strong>{count}</strong></span> 
        <div className="life">
          <span>{life} / 100</span>
          <div className="life__bar" style={{ width: `${Math.max(0, Math.min(100, life))}%` }}></div>
          </div>
        </header>
      <section className="game">
        <h1 className="bandName"><span className="small">Band:</span> <strong>{currentBand.name}</strong></h1>
        <p className={isAnswered ? 'active genre' : 'genre'}>Band Genre: <br className="bandBreak" /><strong>{genreString}</strong></p>

        <div className="answerWrap">
          <p className={isAnswered && isRight ? 'active correct' : 'correct'}>Correct!</p>
          <p className={isAnswered && !isRight ? 'active false' : 'false'}>Wrong!</p>
        </div>

        <div className="answerBoard">
          {guesses.map((guess) => (
            <button key={guess} className="answerButton" onClick={() => handleClick(guess)}>{guess}</button>
          ))}
        </div>

        <div className="nextButtons">
          {life === 0 && (
             <button className="reset" onClick={() => onGameOver(count)}>See Results</button>
          )}
          {life > 0 && isAnswered && (
            <button className="next" onClick={handleNext}>NEXT BAND</button>
          )}
        </div>
      </section>
    </>
  )
}

function Intro({ onPlay }: { onPlay: () => void }) {
  return (
    <section className="intro">
      <h1 className="introHeading">Genrecide</h1>
      <p>The rules are simple. Correctly guess the metal band's sub-genre or take damage. 10 hits and you're out. Think you can handle it?</p>

      <button onClick={onPlay}>Start Game</button>
    </section>
  )
}

interface GameOverProps {
  score: number;
  onPlayAgain: () => void;
}

function GameOver({ score, onPlayAgain }: GameOverProps) {
  return (
    <section className="gameOver">
      <h1 className="introHeading">Game Over</h1>
      <p>You correctly guessed <strong>{score}</strong> {score === 1 ? 'band' : 'bands'}.</p>
      <button onClick={onPlayAgain}>Play Again</button>
    </section>
  );
}

type Screen = 'intro' | 'playing' | 'gameover';

function App() {
  const [screen, setScreen] = useState<Screen>('intro');
  const [finalScore, setFinalScore] = useState<number>(0);

  function handleGameOver(score: number) {
    setFinalScore(score);
    setScreen('gameover');
  }

  return (
    <>
      {screen === 'intro' && <Intro onPlay={() => setScreen('playing')} />}
      {screen === 'playing' && <Game onGameOver={handleGameOver} />}
      {screen === 'gameover' && (
        <GameOver score={finalScore} onPlayAgain={() => setScreen('playing')} />
      )}
    </>
  );
}

export default App

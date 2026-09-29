import { useState, useEffect } from 'react'
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
function shuffle(array:string[]): string[] {
  for (let i = array.length - 1; i > 0; i--) {
    // Pick a random index from 0 to i
    const j = Math.floor(Math.random() * (i + 1));
    
    // Swap elements array[i] and array[j]
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function App() {
  const { bands, error } = useRandomBandShard();
  const  [currentBand, setCurrentBand]  = useState<Band | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [isRight, setIsRight] = useState<boolean>(false);
  const [count, setCount] = useState(0);

  // bands is now an array of ~3,100 bands from one random shard —
  useEffect(() => {
    if (bands && bands.length > 0) {
      const randomBand = bands[Math.floor(Math.random() * bands.length)];
      setCurrentBand(randomBand);
    }
  }, [bands]);

  if (error) return <div>Couldn't load bands.</div>;
  if (!bands) return <div>Loading…</div>;
  if (!currentBand) return <div>Loading…</div>;
  
  const genreCounts: Record<string, number> = {};

  for (const band of bands) {
    for (const genre of band.genres) {
      genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
    }
  }

  const sortedGenres: string[] = Object.keys(genreCounts).sort();

  // Loop through all of the genres of a band and add them into one string to display
  let genreString: string = '';

  for(let i = 0; i < currentBand.genres.length; i++ ) {
    if ( i == 0 ) {
      genreString += currentBand.genres[i];
    } else {
      genreString += ' / '+currentBand.genres[i];
    }
  }

  // Add correct answer to guess array
  let guesses: string[] = [currentBand.genres[0]];

  for (let a = 0; a < 3; a++) {
    guesses.push(sortedGenres[Math.floor(Math.random() * sortedGenres.length)]);
  }

  shuffle(guesses);

  function handleClick(genre:string) {
    if (!currentBand) return;
    if (!bands) return;

    if ( currentBand.genres.includes(genre)) {
      setIsRight(true);
      setCount(prevCount => prevCount + 1);
    } else {
      setIsRight(false);
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
      <section className="game">
        <h1 className="bandName">Band Name: <strong>{currentBand.name}</strong></h1>
        <span className="count">Correct Guesses: <strong>{count}</strong></span>
        <p className={isAnswered ? 'active genre' : 'genre'}>Band Genre: <strong>{genreString}</strong></p>

        <p className={isAnswered && isRight ? 'active correct' : 'correct'}>Correct!</p>
        <p className={isAnswered && !isRight ? 'active false' : 'false'}>Wrong!</p>

        <div className="answerBoard">
          {guesses.map((guess) => (
            <button key={guess} className="answerButton" onClick={() => handleClick(guess)}>{guess}</button>
          ))}
        </div>

        <button className="next" onClick={handleNext}>NEXT BAND</button>
      </section>
    </>
  )
}

export default App

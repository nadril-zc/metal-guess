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

function App() {
  const { bands, error } = useRandomBandShard();

  if (error) return <div>Couldn't load bands.</div>;
  if (!bands) return <div>Loading…</div>;
  
  const genreCounts: Record<string, number> = {};

  for (const band of bands) {
    for (const genre of band.genres) {
      genreCounts[genre] = (genreCounts[genre] ?? 0) + 1;
    }
  }

  const sortedGenres: string[] = Object.keys(genreCounts).sort();

  console.log(sortedGenres);

  // bands is now an array of ~3,100 bands from one random shard —
  const randomBand: Band = bands[Math.floor(Math.random() * bands.length)];

  // Loop through all of the genres of a band and add them into one string to display
  let genreString: string = '';

  for(let i = 0; i < randomBand.genres.length; i++ ) {
    if ( i == 0 ) {
      genreString += randomBand.genres[i];
    } else {
      genreString += ' / '+randomBand.genres[i];
    }
  }

  return (
    <>
      <section className="game">
        <h1 className="bandName">Band Name: <strong>{randomBand.name}</strong></h1>
        <p className="genre">Band Genre: <strong>{genreString}</strong></p>
      </section>
    </>
  )
}

export default App

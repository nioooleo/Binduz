import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { CloudSun, ExternalLink, MapPin } from 'lucide-react';
import { useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { Article, BureauLocation } from '../types/newspaper';

function BureauMarker({
  bureau,
  isSelected,
  onSelect,
  onOpenStory,
  story,
}: {
  bureau: BureauLocation;
  isSelected: boolean;
  onSelect: () => void;
  onOpenStory?: (article: Article) => void;
  story?: Article;
}) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: bureau.lat, lng: bureau.lng }}
        onClick={onSelect}
        title={`${bureau.city} — ${bureau.deskFocus}`}
      >
        <Pin
          background={isSelected ? '#0D47FF' : '#E1262D'}
          borderColor="#ffffff"
          glyphColor="#ffffff"
          scale={isSelected ? 1.2 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} onCloseClick={onSelect}>
          <div className="p-1 max-w-[240px] text-neutral-900">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#E1262D] font-bold">
              {bureau.city}, {bureau.country}
            </div>
            <p className="text-xs font-semibold text-neutral-800 mt-1 leading-snug">
              {bureau.deskFocus}
            </p>
            {bureau.weatherTempC && (
              <div className="mt-1.5 text-[11px] text-neutral-500">
                Live Desk Temp: {bureau.weatherTempC} / {bureau.weatherTempF}
              </div>
            )}
            {story && onOpenStory && (
              <button
                type="button"
                onClick={() => onOpenStory(story)}
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#0D47FF] hover:underline cursor-pointer"
              >
                <span className="line-clamp-1">{story.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function BureauWorldMap() {
  const { bureaus, publishedArticles, openArticle, selectedBureauId, setSelectedBureauId } = useNewspaper();
  const [infoOpenId, setInfoOpenId] = useState<string | null>(selectedBureauId || bureaus[0]?.id || null);

  const selectedBureau = bureaus.find((b) => b.id === selectedBureauId) || bureaus[0];
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#E1262D] font-bold">
            Live Correspondent Network
          </span>
          <h2 className="font-display text-3xl font-bold text-neutral-900 dark:text-white mt-1">
            Global Newsroom Bureau Map
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
          Inspect active Binduz international bureaus, real-time Open-Meteo local weather, and dispatch filings across Europe, North America, and Asia-Pacific.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-4 space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
          {bureaus.map((bureau) => {
            const active = bureau.id === selectedBureau.id;
            const matchedStory = publishedArticles.find((a) =>
              (a.locationName || '').toLowerCase().includes(bureau.city.toLowerCase())
            );
            return (
              <div
                key={bureau.id}
                className={`p-3.5 rounded-md border transition-colors ${
                  active
                    ? 'bg-white dark:bg-neutral-900 border-[#E1262D] shadow-sm'
                    : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBureauId(bureau.id);
                    setInfoOpenId(bureau.id);
                  }}
                  className="w-full text-left cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-display text-base font-bold text-neutral-900 dark:text-white">
                      <MapPin className={`w-4 h-4 ${active ? 'text-[#E1262D]' : 'text-neutral-400'}`} />
                      {bureau.city}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                      <CloudSun className="w-3.5 h-3.5 text-sky-500" />
                      {bureau.weatherTempC || 'Live'}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {bureau.deskFocus}
                  </p>
                </button>

                {matchedStory && (
                  <button
                    type="button"
                    onClick={() => openArticle(matchedStory)}
                    className="mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 w-full text-left text-[11px] font-semibold text-[#0D47FF] dark:text-sky-400 hover:underline flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <span className="truncate">{matchedStory.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </button>
                )}
              </div>
            );
          })}
        </aside>

        <div className="lg:col-span-8 h-[540px] rounded-md overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          <APIProvider apiKey={apiKey}>
            <GoogleMap
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              center={{ lat: selectedBureau.lat, lng: selectedBureau.lng }}
              defaultZoom={3}
              zoom={4}
              gestureHandling="greedy"
              style={{ width: '100%', height: '100%' }}
            >
              {bureaus.map((bureau) => {
                const matchedStory = publishedArticles.find((a) =>
                  (a.locationName || '').toLowerCase().includes(bureau.city.toLowerCase())
                );
                return (
                  <BureauMarker
                    key={bureau.id}
                    bureau={bureau}
                    isSelected={infoOpenId === bureau.id}
                    story={matchedStory}
                    onOpenStory={openArticle}
                    onSelect={() => {
                      setSelectedBureauId(bureau.id);
                      setInfoOpenId((prev) => (prev === bureau.id ? null : bureau.id));
                    }}
                  />
                );
              })}
            </GoogleMap>
          </APIProvider>
        </div>
      </div>
    </section>
  );
}

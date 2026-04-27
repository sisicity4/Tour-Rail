import { useEffect, useMemo, useState } from "react";
import MapBoard from "./components/MapBoard";
import { fetchConfig, fetchRoute } from "./api";
import type {
  AppConfig,
  CategoryColorMap,
  RoutePath,
  TravelerCounts,
  VehicleAnimationState,
  Waypoint,
} from "./types";

const fallbackColors: CategoryColorMap = {
  male: "#2f7af8",
  female: "#ff5c8a",
  other: "#ffb703",
};

const fallbackConfig: AppConfig = {
  app_name: "Tour-Rail",
  default_animation_seconds: 8,
  category_colors: fallbackColors,
  route_color: "#26547c",
  board_color: "#f4d35e",
  map_center: { lat: 35.6812, lng: 139.7671 },
  map_zoom: 12,
};

const initialTravelers: TravelerCounts = {
  male: 2,
  female: 2,
  other: 1,
};

function formatDistance(distance: number): string {
  if (distance < 1000) {
    return `${Math.round(distance)} m`;
  }

  return `${(distance / 1000).toFixed(1)} km`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

function getClosestStopIndex(route: RoutePath | null, progress: number): number {
  if (!route || route.waypoints.length === 0) {
    return -1;
  }

  if (route.waypoints.length === 1) {
    return 0;
  }

  return Math.min(
    route.waypoints.length - 1,
    Math.round(progress * (route.waypoints.length - 1)),
  );
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(fallbackConfig);
  const [travelers, setTravelers] = useState<TravelerCounts>(initialTravelers);
  const [route, setRoute] = useState<RoutePath | null>(null);
  const [routeStops, setRouteStops] = useState<Waypoint[]>([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isRouting, setIsRouting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animation, setAnimation] = useState<VehicleAnimationState>({
    isAnimating: false,
    progress: 0,
    duration: fallbackConfig.default_animation_seconds,
  });

  const totalTravelers = travelers.male + travelers.female + travelers.other;
  const activeStopIndex = getClosestStopIndex(route, animation.progress);

  useEffect(() => {
    let cancelled = false;

    async function loadConfig() {
      try {
        const payload = await fetchConfig();
        if (cancelled) {
          return;
        }
        setConfig(payload);
        setAnimation((current) => ({
          ...current,
          duration: payload.default_animation_seconds,
        }));
      } catch {
        if (!cancelled) {
          setError("設定の取得に失敗したため、ローカル既定値で表示しています。");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConfig(false);
        }
      }
    }

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!animation.isAnimating) {
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const nextProgress = Math.min((now - startedAt) / (animation.duration * 1000), 1);
      setAnimation((current) => ({
        ...current,
        progress: nextProgress,
        isAnimating: nextProgress < 1,
      }));

      if (nextProgress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [animation.duration, animation.isAnimating]);

  const vibe = useMemo(() => {
    if (routeStops.length === 0) {
      return "準備中";
    }
    if (routeStops.length < 3) {
      return "街歩き";
    }
    if (routeStops.length < 5) {
      return "寄り道たっぷり";
    }
    return "ロングツアー";
  }, [routeStops.length]);

  async function handleAddWaypoint(point: Waypoint) {
    if (isRouting) {
      return;
    }

    const nextStops = [...routeStops, point];
    setRouteStops(nextStops);
    setError(null);
    setAnimation((current) => ({ ...current, isAnimating: false, progress: 0 }));

    if (nextStops.length === 1) {
      setRoute({
        waypoints: nextStops,
        path: nextStops,
        distance_m: 0,
        duration_s: 0,
        segment_count: 0,
      });
      return;
    }

    setIsRouting(true);

    try {
      const builtRoute = await fetchRoute(nextStops);
      setRoute(builtRoute);
    } catch {
      setError("経路の取得に失敗しました。数秒後に再度試してください。");
      setRoute({
        waypoints: nextStops,
        path: nextStops,
        distance_m: 0,
        duration_s: 0,
        segment_count: nextStops.length - 1,
      });
    } finally {
      setIsRouting(false);
    }
  }

  function updateTravelers(group: keyof TravelerCounts, delta: number) {
    setTravelers((current) => ({
      ...current,
      [group]: Math.max(0, current[group] + delta),
    }));
  }

  function clearRoute() {
    setRoute(null);
    setRouteStops([]);
    setError(null);
    setAnimation((current) => ({ ...current, isAnimating: false, progress: 0 }));
  }

  function startAnimation() {
    if (!route || route.path.length < 2) {
      return;
    }

    setAnimation((current) => ({
      ...current,
      progress: 0,
      isAnimating: true,
    }));
  }

  const statCards = [
    { label: "Travelers", value: `${totalTravelers} riders` },
    { label: "Stops", value: `${routeStops.length} squares` },
    { label: "Mood", value: vibe },
    { label: "Track", value: route ? formatDistance(route.distance_m) : "-" },
  ];

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero__copy">
          <p className="eyebrow">Render-ready travel animation</p>
          <h1>Tour-Rail</h1>
          <p className="hero__lede">
            人生ゲームの盤面みたいな旅の導線に、3カテゴリの旅行者を乗せた車を走らせる。
            地図上の経路とボード風の進行演出を一つの画面で見せるためのショーケースです。
          </p>
        </div>
        <div className="hero__meta">
          <div className="hero__pill">Hybrid Map + Board</div>
          <div className="hero__pill">Male / Female / Other</div>
          <div className="hero__pill">Render Static + API</div>
        </div>
        <div className="hero__stickers" aria-hidden="true">
          <span className="sticker sticker--ticket">BOARD TRIP</span>
          <span className="sticker sticker--star">PLAYFUL ROUTE</span>
          <span className="sticker sticker--car">VROOM!</span>
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--controls">
          <div className="panel__header">
            <div>
              <p className="panel__kicker">Traveler Input</p>
              <h2>乗客の編成</h2>
            </div>
            <button className="ghost-button" onClick={clearRoute}>
              Clear Route
            </button>
          </div>

          <div className="traveler-grid">
            {(
              [
                ["male", "男性"],
                ["female", "女性"],
                ["other", "その他"],
              ] as const
            ).map(([key, label]) => (
              <article key={key} className="traveler-card">
                <div
                  className="traveler-card__badge"
                  style={{ backgroundColor: config.category_colors[key] }}
                />
                <div className="traveler-card__body">
                  <p>{label}</p>
                  <strong>{travelers[key]}</strong>
                  <small className="traveler-card__caption">
                    {key === "male" ? "blue riders" : key === "female" ? "pink riders" : "gold riders"}
                  </small>
                </div>
                <div className="counter">
                  <button onClick={() => updateTravelers(key, -1)}>-</button>
                  <button onClick={() => updateTravelers(key, 1)}>+</button>
                </div>
              </article>
            ))}
          </div>

          <div className="slider-block">
            <div className="slider-block__header">
              <span>Animation Tempo</span>
              <strong>{animation.duration.toFixed(1)}s</strong>
            </div>
            <input
              type="range"
              min="3"
              max="18"
              step="0.5"
              value={animation.duration}
              onChange={(event) =>
                setAnimation((current) => ({
                  ...current,
                  duration: Number(event.target.value),
                }))
              }
            />
          </div>

          <div className="panel__actions">
            <button
              className="primary-button"
              onClick={startAnimation}
              disabled={!route || route.path.length < 2 || isRouting}
            >
              {animation.isAnimating ? "Rolling..." : "Start Toy Ride"}
            </button>
            <div className="status-note">
              {isLoadingConfig
                ? "設定を読み込み中..."
                : isRouting
                  ? "経路を計算中..."
                  : "地図クリックで停車駅を追加"}
            </div>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <div className="stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="stat-card">
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="panel panel--map">
          <div className="panel__header">
            <div>
              <p className="panel__kicker">Route Builder</p>
              <h2>旅の盤面</h2>
            </div>
            <div className="summary-chip">
              {route ? `ETA ${formatDuration(route.duration_s)}` : "Select stops"}
            </div>
          </div>

          <MapBoard
            routePath={route?.path ?? []}
            userWaypoints={routeStops}
            onAddWaypoint={handleAddWaypoint}
            animationProgress={animation.progress}
            isAnimating={animation.isAnimating}
            mapCenter={config.map_center}
            mapZoom={config.map_zoom}
            routeColor={config.route_color}
            categoryColors={config.category_colors}
            travelerCounts={travelers}
          />

          <div className="board-rail" style={{ ["--board-color" as string]: config.board_color }}>
            {routeStops.length === 0 ? (
              <div className="board-rail__empty">
                Start と Goal の間に寄り道を追加して、旅のマス目を作ってください。
              </div>
            ) : (
              routeStops.map((_, index) => {
                const isActive = index <= activeStopIndex;
                const isCurrent = index === activeStopIndex;
                return (
                  <div
                    key={`${index}-${routeStops[index].lat}-${routeStops[index].lng}`}
                    className={`board-stop ${isActive ? "board-stop--active" : ""} ${
                      isCurrent ? "board-stop--current" : ""
                    }`}
                  >
                    <span className="board-stop__step">STOP {index + 1}</span>
                    <strong>{index === 0 ? "Start" : index === routeStops.length - 1 ? "Goal" : "Via"}</strong>
                    <small>
                      {routeStops[index].lat.toFixed(3)}, {routeStops[index].lng.toFixed(3)}
                    </small>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

import { useEffect, useState } from "react";
import MapBoard from "./components/MapBoard";
import { fetchConfig, fetchRoute } from "./api";
import type {
  AppConfig,
  RoutePath,
  VehicleAnimationState,
  VehicleType,
  Waypoint,
} from "./types";

const fallbackConfig: AppConfig = {
  app_name: "Tour-Rail",
  default_animation_seconds: 8,
  route_color: "#26547c",
  board_color: "#f4d35e",
  map_center: { lat: 35.6812, lng: 139.7671 },
  map_zoom: 12,
};

const initialTravelerCount = 5;

const vehicleOptions: Array<{
  key: VehicleType;
  icon: string;
  label: string;
  caption: string;
}> = [
  { key: "car", icon: "🚗", label: "車", caption: "遠くまで" },
  { key: "walk", icon: "🚶", label: "徒歩", caption: "ゆっくり歩く" },
  { key: "bike", icon: "🚲", label: "自転車", caption: "風を切る" },
];

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

function getRouteFlavor(stopCount: number): string {
  if (stopCount === 0) {
    return "地図からはじめる";
  }
  if (stopCount === 1) {
    return "次はゴール";
  }
  if (stopCount < 4) {
    return "小さな旅";
  }
  if (stopCount < 6) {
    return "寄り道あり";
  }
  return "たっぷり旅";
}

export default function App() {
  const [config, setConfig] = useState<AppConfig>(fallbackConfig);
  const [travelerCount, setTravelerCount] = useState(initialTravelerCount);
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
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

  const activeStopIndex = getClosestStopIndex(route, animation.progress);
  const selectedVehicle = vehicleOptions.find((option) => option.key === vehicleType) ?? vehicleOptions[0];
  const routeFlavor = getRouteFlavor(routeStops.length);
  const canRunRoute = Boolean(route && route.path.length >= 2 && !isRouting);

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
          setError("設定を読み込めませんでした。今は仮の設定で表示しています。");
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

  async function handleAddWaypoint(point: Waypoint) {
    if (isRouting || animation.isAnimating) {
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
      setError("道をうまく引けませんでした。デモのバックエンドは起動に最大30秒ほどかかる場合があります。少し待ってもう一度どうぞ。");
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

  function updateTravelerCount(delta: number) {
    setTravelerCount((current) => Math.max(1, current + delta));
  }

  function clearRoute() {
    setRoute(null);
    setRouteStops([]);
    setError(null);
    setAnimation((current) => ({ ...current, isAnimating: false, progress: 0 }));
  }

  function startAnimation() {
    if (!canRunRoute) {
      return;
    }

    setAnimation((current) => ({
      ...current,
      progress: 0,
      isAnimating: true,
    }));
  }

  function addNearbyGoal() {
    const lastStop = routeStops[routeStops.length - 1] ?? config.map_center;
    void handleAddWaypoint({
      lat: lastStop.lat + 0.018,
      lng: lastStop.lng + 0.018,
    });
  }

  const mapHint = isRouting
    ? "ルートを探しています"
    : animation.isAnimating
      ? "いま移動中"
      : routeStops.length < 2
        ? "地図にスタートとゴールを置く"
        : "寄り道するか、このまま出発";

  return (
    <div className="app-shell quest-app">
      <header className="hero quest-hero">
        <div className="hero__copy">
          <p className="eyebrow">旅のルートを作る</p>
          <h1>Tour-Rail</h1>
          <p className="hero__lede">
            行きたい場所を地図に置くと、{selectedVehicle.icon} {selectedVehicle.label}がその道をたどります。
            旅の流れが、すごろくみたいに見えてきます。
          </p>
        </div>
        <div className="hero__meta quest-hero__hud">
          <div className="hero__pill">{routeFlavor}</div>
          <div className="hero__pill">{selectedVehicle.icon} {selectedVehicle.label}</div>
          <div className="hero__pill">{travelerCount}人で行く</div>
        </div>
      </header>

      <main className="quest-shell">
        <section className="panel quest-control-panel" aria-label="旅の設定">
          <div className="panel__header">
            <div>
              <p className="panel__kicker">準備</p>
              <h2>だれと行く？</h2>
            </div>
            <button className="ghost-button" onClick={clearRoute}>
              やり直す
            </button>
          </div>

          <div className="vehicle-switcher" role="radiogroup" aria-label="移動手段">
            {vehicleOptions.map((option) => (
              <button
                key={option.key}
                className={`vehicle-tab ${vehicleType === option.key ? "vehicle-tab--active" : ""}`}
                onClick={() => setVehicleType(option.key)}
                role="radio"
                aria-checked={vehicleType === option.key}
              >
                <span>{option.icon}</span>
                <strong>{option.label}</strong>
                <small>{option.caption}</small>
              </button>
            ))}
          </div>

          <article className="party-counter" aria-label="旅行者数">
            <div>
              <p>旅行者</p>
              <strong>{travelerCount}人</strong>
              <small>一緒に旅する人数</small>
            </div>
            <div className="counter">
              <button aria-label="旅行者を減らす" onClick={() => updateTravelerCount(-1)}>-</button>
              <button aria-label="旅行者を増やす" onClick={() => updateTravelerCount(1)}>+</button>
            </div>
          </article>

          <div className="slider-block">
            <div className="slider-block__header">
              <span>速さ</span>
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
        </section>

        <section className="panel quest-map-panel" aria-label="ルート作成">
          <div className="quest-map-header">
            <div>
              <p className="panel__kicker">地図</p>
              <h2>行き先を置く</h2>
            </div>
            <div className="quest-stats">
              <div>
                <span>スポット</span>
                <strong>{routeStops.length}</strong>
              </div>
              <div>
                <span>距離</span>
                <strong>{route ? formatDistance(route.distance_m) : "-"}</strong>
              </div>
              <div>
                <span>時間</span>
                <strong>{route ? formatDuration(route.duration_s) : "-"}</strong>
              </div>
            </div>
          </div>

          <div className="quest-action-bar">
            <button className="primary-button" onClick={startAnimation} disabled={!canRunRoute}>
              {animation.isAnimating ? "移動中" : routeStops.length < 2 ? "2か所で出発" : "出発する"}
            </button>
            {routeStops.length === 1 ? (
              <button className="map-jump-button" onClick={addNearbyGoal} disabled={isRouting}>
                ゴールを追加
              </button>
            ) : null}
            <p>{isLoadingConfig ? "準備しています" : mapHint}</p>
          </div>

          {error ? <p className="error-banner">{error}</p> : null}

          <MapBoard
            routePath={route?.path ?? []}
            userWaypoints={routeStops}
            onAddWaypoint={handleAddWaypoint}
            animationProgress={animation.progress}
            isAnimating={animation.isAnimating}
            mapCenter={config.map_center}
            mapZoom={config.map_zoom}
            routeColor={config.route_color}
            travelerCount={travelerCount}
            vehicleType={vehicleType}
            canAddWaypoint={!animation.isAnimating}
            hintText={mapHint}
          />

          <div className="route-story">
            {routeStops.length === 0 ? (
              <strong>まずは地図にスタートを置きます。</strong>
            ) : routeStops.length === 1 ? (
              <strong>次にゴールを置くと、道がつながります。</strong>
            ) : (
              <strong>
                {routeFlavor}: {travelerCount}人で
                {route ? ` ${formatDistance(route.distance_m)} ` : " "}の道をたどります。
              </strong>
            )}
          </div>

          <div className="board-rail" style={{ ["--board-color" as string]: config.board_color }}>
            {routeStops.length === 0 ? (
              <div className="board-rail__empty">置いた場所が、ここに順番に並びます。</div>
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
                    <span className="board-stop__step">スポット {index + 1}</span>
                    <strong>{index === 0 ? "出発" : index === routeStops.length - 1 ? "ゴール" : "寄り道"}</strong>
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

      <div className="mobile-runner-bar">
        <span>{routeFlavor}</span>
        <button className="primary-button" onClick={startAnimation} disabled={!canRunRoute}>
          {animation.isAnimating ? "移動中" : "出発"}
        </button>
      </div>
    </div>
  );
}

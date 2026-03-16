import { useMemo, useState, useEffect, useCallback } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { FeatureCollection, Geometry } from 'geojson'

import MapBreadcrumb from '../atoms/MapBreadcrumb'
import { MiniMapTooltip } from '../atoms/MiniMapTooltip'

export type AtlasMiniMapProps = {
  countyBoundaries: FeatureCollection
  activeCountyId: string | null
  onSelectCounty: (countyId: string) => void
  isVisible: boolean
  scopePath?: string[]
  onNavigateScope?: (depth: number) => void
}

// Projection Constants
const PROJ_BOUNDS = { lonMin: 117.5, lonMax: 122.5, latMin: 21.0, latMax: 27.0 };
const VIEWBOX_W = 100;
const VIEWBOX_H = 120;

// --- Atomic Components ---

export const MiniMapHeader: React.FC<{ scopePath: string[], onNavigate: (d: number) => void }> = ({ scopePath, onNavigate }) => (
  <div className="atlas-mini-map-card__header">
    <MapBreadcrumb scopePath={scopePath} onNavigate={onNavigate} />
  </div>
);

export const MiniMapBody: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="atlas-mini-map-card__body">
    {children}
  </div>
);

export function AtlasMiniMap({
  countyBoundaries,
  activeCountyId,
  onSelectCounty,
  isVisible,
  scopePath = [],
  onNavigateScope = () => {},
}: AtlasMiniMapProps) {
  const map = useMap();
  const [viewportBounds, setViewportBounds] = useState(() => map.getBounds());
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Listen to map changes to update the red box
  useMapEvents({
    moveend: () => setViewportBounds(map.getBounds()),
    zoomend: () => setViewportBounds(map.getBounds()),
  });

  useEffect(() => {
    if (isVisible) {
      setViewportBounds(map.getBounds());
    }
  }, [isVisible, map]);

  const project = useCallback((lon: number, lat: number) => {
    const x = ((lon - PROJ_BOUNDS.lonMin) / (PROJ_BOUNDS.lonMax - PROJ_BOUNDS.lonMin)) * VIEWBOX_W;
    const y = (1 - (lat - PROJ_BOUNDS.latMin) / (PROJ_BOUNDS.latMax - PROJ_BOUNDS.latMin)) * VIEWBOX_H;
    return { x, y };
  }, []);

  const unproject = useCallback((x: number, y: number) => {
    const lon = (x / VIEWBOX_W) * (PROJ_BOUNDS.lonMax - PROJ_BOUNDS.lonMin) + PROJ_BOUNDS.lonMin;
    const lat = (1 - y / VIEWBOX_H) * (PROJ_BOUNDS.latMax - PROJ_BOUNDS.latMin) + PROJ_BOUNDS.latMin;
    return { lat, lon };
  }, []);

  const { mainIslandPaths } = useMemo(() => {
    const processFeatures = () => {
      return countyBoundaries.features.map((feature) => {
        const id = feature.properties?.countyId;
        const name = feature.properties?.countyName;
        const geometry = feature.geometry as Geometry;
        let d = "";
        const p = (lo: number, la: number) => {
          const { x, y } = project(lo, la);
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        };
        
        if (geometry.type === "Polygon") {
          d = geometry.coordinates.map(ring => "M" + ring.map(c => p(c[0], c[1])).join("L") + "Z").join(" ");
        } else if (geometry.type === "MultiPolygon") {
          d = geometry.coordinates.map(poly => poly.map(ring => "M" + ring.map(c => p(c[0], c[1])).join("L") + "Z").join(" ")).join(" ");
        }
        return { id, name, d };
      });
    };

    return { mainIslandPaths: processFeatures() };
  }, [countyBoundaries, project]);

  const redBox = useMemo(() => {
    if (!viewportBounds) return null;
    const nw = viewportBounds.getNorthWest();
    const se = viewportBounds.getSouthEast();
    const p1 = project(nw.lng, nw.lat);
    const p2 = project(se.lng, se.lat);
    
    let width = Math.abs(p2.x - p1.x);
    let height = Math.abs(p2.y - p1.y);
    let x = Math.min(p1.x, p2.x);
    let y = Math.min(p1.y, p2.y);

    const MIN_SIZE = 6; 
    if (width < MIN_SIZE) {
      const centerX = x + width / 2; width = MIN_SIZE; x = centerX - width / 2;
    }
    if (height < MIN_SIZE) {
      const centerY = y + height / 2; height = MIN_SIZE; y = centerY - height / 2;
    }
    return { x, y, width, height };
  }, [viewportBounds, project]);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName === 'path' || (e.target as Element).tagName === 'circle') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_H;
    const { lat, lon } = unproject(x, y);
    map.flyTo([lat, lon], map.getZoom(), { duration: 1 });
  };

  const captureMouse = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  if (!isVisible) return null;

  return (
    <div className="atlas-mini-map-card" onMouseMove={captureMouse}>
      <MiniMapHeader scopePath={scopePath} onNavigate={onNavigateScope} />
      
      <MiniMapBody>
        <div className="atlas-mini-map-card__main">
          <svg 
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} 
            className="atlas-mini-map-card__svg"
            onClick={handleSvgClick}
            onMouseMove={captureMouse}
          >
            <rect 
              x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} 
              className="atlas-mini-map-card__sea"
            />
            
            {mainIslandPaths.map((p) => {
              const isActive = p.id === activeCountyId;
              const isIsland = ['10016', '09020', '10007'].includes(p.id ?? '');
              return (
                <path
                  key={p.id}
                  d={p.d}
                  className={`atlas-mini-map-card__path ${isActive ? 'is-active' : ''} ${isIsland ? 'is-island' : ''}`}
                  onMouseEnter={() => setHoveredName(p.name)}
                  onMouseLeave={() => setHoveredName(null)}
                  onClick={(e) => { e.stopPropagation(); onSelectCounty(p.id!); }}
                />
              );
            })}

            {countyBoundaries.features
              .filter(f => ['10016', '09020', '10007'].includes(f.properties?.countyId))
              .map(f => {
                const p = f.properties;
                if (!p) return null;
                const { x, y } = project(p.centerLongitude, p.centerLatitude);
                return (
                  <circle
                    key={`hit-${p.countyId}`}
                    cx={x} cy={y} r="8"
                    className={`atlas-mini-map-card__island-hit ${activeCountyId === p.countyId ? 'is-active' : ''}`}
                    onMouseEnter={() => setHoveredName(p.countyName)}
                    onMouseLeave={() => setHoveredName(null)}
                    onClick={(e) => { e.stopPropagation(); onSelectCounty(p.countyId); }}
                  />
                );
              })}
            
            {redBox && (
              <rect
                x={redBox.x} y={redBox.y} width={redBox.width} height={redBox.height}
                className="atlas-mini-map-card__viewport-box"
              />
            )}
          </svg>
        </div>
      </MiniMapBody>

      {hoveredName && <MiniMapTooltip label={hoveredName} x={tooltipPos.x} y={tooltipPos.y} />}
    </div>
  )
}

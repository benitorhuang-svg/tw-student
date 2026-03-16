import { useMemo, useState, useEffect, useCallback } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import type { FeatureCollection, Geometry } from 'geojson'

import { MiniMapTooltip } from '../atoms/MiniMapTooltip'
import { MiniMapBody } from '../atoms/MiniMapBody'
import { MiniMapCounty } from '../atoms/MiniMapCounty'

export type AtlasMiniMapProps = {
  countyBoundaries: FeatureCollection
  activeCountyId: string | null
  onSelectCounty: (countyId: string) => void
  isVisible: boolean
  className?: string
  style?: React.CSSProperties
}

// Projection Constants (Magnified view for better detail)
const PROJ_BOUNDS = { lonMin: 118.2, lonMax: 122.2, latMin: 21.9, latMax: 26.6 };
const VIEWBOX_W = 100;
const VIEWBOX_H = 120;

export function AtlasMiniMap({
  countyBoundaries,
  activeCountyId,
  onSelectCounty,
  isVisible,
  className,
  style,
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

  // Add a simple panning logic: if user drags on the SVG, we pan the main map
  const [isPanning, setIsPanning] = useState(false);
  const [hasMoved, setHasMoved] = useState(false);

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    // If we were dragging (panning), don't trigger the click pan
    if (hasMoved) {
      setHasMoved(false);
      return;
    }

    if ((e.target as Element).tagName === 'path' || (e.target as Element).tagName === 'circle') return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_H;
    const { lat, lon } = unproject(x, y);
    // Snappier panTo
    map.panTo([lat, lon], { animate: true, duration: 0.3 });
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_W;
    const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_H;
    const { lat, lon } = unproject(x, y);
    map.setView([lat, lon], Math.min(map.getZoom() + 2, map.getMaxZoom()), { 
      animate: true, 
      duration: 0.4 
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    // Only zoom if not scrolling the page
    if (e.deltaY < 0) {
      map.zoomIn();
    } else {
      map.zoomOut();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('.map-zoom-controls') || (e.target as Element).closest('.map-floating-tools')) return;
    if (e.button !== 0) return; // Only handle left click
    
    setIsPanning(true);
    setHasMoved(false);
  };

  useEffect(() => {
    if (!isPanning) return;

    let startX = 0;
    let startY = 0;
    const threshold = 4; // pixels

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      const svg = document.querySelector('.atlas-mini-map-card__svg');
      if (!svg) return;
      
      if (startX === 0) {
        startX = e.clientX;
        startY = e.clientY;
      }
      
      const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
      if (dist > threshold) {
        setHasMoved(true);
      }

      const rect = svg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * VIEWBOX_W;
      const y = ((e.clientY - rect.top) / rect.height) * VIEWBOX_H;
      
      // Clamp x, y to viewbox
      const clampedX = Math.max(0, Math.min(VIEWBOX_W, x));
      const clampedY = Math.max(0, Math.min(VIEWBOX_H, y));
      
      const { lat, lon } = unproject(clampedX, clampedY);
      map.setView([lat, lon], map.getZoom(), { animate: false });
    };

    const handleMouseUpGlobal = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleMouseMoveGlobal);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => {
      window.removeEventListener('mousemove', handleMouseMoveGlobal);
      window.removeEventListener('mouseup', handleMouseUpGlobal);
    };
  }, [isPanning, map, unproject]);

  const captureMouse = (e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`atlas-mini-map-card ${isPanning ? 'is-panning' : ''} ${className || ''}`} 
      style={style}
      onMouseMove={captureMouse}
      onWheel={handleWheel}
    >
      <MiniMapBody>
        <div 
          className="atlas-mini-map-card__main"
          onMouseDown={handleMouseDown}
        >
          <svg 
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`} 
            className="atlas-mini-map-card__svg"
            onClick={handleSvgClick}
            onDoubleClick={handleDoubleClick}
          >
            <rect 
              x="0" y="0" width={VIEWBOX_W} height={VIEWBOX_H} 
              className="atlas-mini-map-card__sea"
            />
            
            {/* 1. Atomic Island Groups */}
            {(() => {
              const seen = new Set<string>();
              const islandIds = ['10016', '09020', '10007'];
              return countyBoundaries.features
                .filter(f => {
                  const id = f.properties?.countyId;
                  if (!id || !islandIds.includes(id)) return false;
                  if (seen.has(id)) return false;
                  seen.add(id);
                  return true;
                })
                .map(f => {
                  const p = f.properties;
                  if (!p) return null;
                  const id = p.countyId;
                  const pathData = mainIslandPaths.find(path => path.id === id)?.d ?? '';
                  const center = project(p.centerLongitude, p.centerLatitude);
                  
                  return (
                    <MiniMapCounty
                      key={`island-${id}`}
                      id={id}
                      name={p.countyName}
                      pathData={pathData}
                      isIsland={true}
                      center={center}
                      isActive={id === activeCountyId}
                      onSelect={onSelectCounty}
                      onHover={setHoveredName}
                    />
                  );
                });
            })()}

            {/* 2. Main Island Counties */}
            {mainIslandPaths
              .filter(p => !['10016', '09020', '10007'].includes(p.id ?? ''))
              .map((p) => (
                <MiniMapCounty
                  key={`main-${p.id}`}
                  id={p.id!}
                  name={p.name!}
                  pathData={p.d}
                  isIsland={false}
                  isActive={p.id === activeCountyId}
                  onSelect={onSelectCounty}
                  onHover={setHoveredName}
                />
              ))}
            
            {redBox && (
              <rect
                x={redBox.x} y={redBox.y} width={redBox.width} height={redBox.height}
                className="atlas-mini-map-card__viewport-box"
              />
            )}
          </svg>
        </div>
      </MiniMapBody>

      <div className="atlas-mini-map-card__zoom-indicator">
        Zoom {Math.round(map.getZoom() * 10) / 10}
      </div>

      {hoveredName && <MiniMapTooltip label={hoveredName} x={tooltipPos.x} y={tooltipPos.y} />}
    </div>
  )
}


import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Route,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Input } from '@/components/ui'
import {
  getSavedOrigin,
  haversineKm,
  resolveCepOrAddress,
  reverseGeocode,
  saveLastOrigin,
  type GeoPoint,
} from '@/lib/geocoding'
import { formatNumber, getMapsLinkProps } from '@/lib/utils'

export type { GeoPoint }

interface SimuladorMapaProps {
  origemInicial?: string
  destinoInicial?: string
  onDistanceCalculated: (kmIda: number, durationMin?: number) => void
  onDestinoAddressChange?: (address: string) => void
}

function createPinIcon(color: string, kind: 'car' | 'house') {
  const svg =
    kind === 'car'
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="background:${color};color:#fff;width:36px;height:36px;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.28);border:2.5px solid #fff;">
          ${svg}
        </div>
        <div style="width:10px;height:10px;background:${color};transform:rotate(45deg);margin-top:-6px;border-right:2.5px solid #fff;border-bottom:2.5px solid #fff;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export function SimuladorMapa({
  origemInicial = '',
  destinoInicial = '',
  onDistanceCalculated,
  onDestinoAddressChange,
}: SimuladorMapaProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const origemMarkerRef = useRef<L.Marker | null>(null)
  const destinoMarkerRef = useRef<L.Marker | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)

  const [origemInput, setOrigemInput] = useState('')
  const [destinoInput, setDestinoInput] = useState(destinoInicial)
  const [origemPoint, setOrigemPoint] = useState<GeoPoint | null>(null)
  const [destinoPoint, setDestinoPoint] = useState<GeoPoint | null>(null)
  const autoLocatedRef = useRef(false)

  const [pinMode, setPinMode] = useState<'none' | 'origem' | 'destino'>('none')
  const pinModeRef = useRef<'none' | 'origem' | 'destino'>('none')
  pinModeRef.current = pinMode

  const [loadingOrigem, setLoadingOrigem] = useState(false)
  const [loadingDestino, setLoadingDestino] = useState(false)
  const [loadingRoute, setLoadingRoute] = useState(false)
  const [routeSummary, setRouteSummary] = useState<{
    km: number
    minutes: number
    exact: boolean
  } | null>(null)

  // Ao abrir o Simulador:
  // - Se já houver uma origem salva (definida pelo usuário ou GPS anterior), abre SEMPRE nela (zero pulos no F5).
  // - Apenas no primeiro acesso (sem origem salva), busca a localização atual pelo GPS e salva.
  useEffect(() => {
    if (autoLocatedRef.current) return
    autoLocatedRef.current = true

    const saved = getSavedOrigin()
    if (saved) {
      setOrigemPoint(saved)
      setOrigemInput(saved.label)
      return
    }

    const fallbackToBase = () => {
      if (origemInicial) {
        setOrigemInput(origemInicial)
        void handleSearch('origem', origemInicial, true)
      }
    }

    if (!navigator.geolocation) {
      fallbackToBase()
      return
    }

    setLoadingOrigem(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const label = await reverseGeocode(latitude, longitude)
        const pt: GeoPoint = { lat: latitude, lng: longitude, label }
        setOrigemPoint(pt)
        setOrigemInput(label)
        saveLastOrigin(pt)
        setLoadingOrigem(false)
      },
      () => {
        setLoadingOrigem(false)
        fallbackToBase()
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (destinoInicial && destinoInicial !== destinoInput) {
      setDestinoInput(destinoInicial)
      // Geocodifica automaticamente o endereço da clínica selecionada
      void handleSearch('destino', destinoInicial, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinoInicial])

  // Inicializa o mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: [-23.5505, -46.6333], // São Paulo default
      zoom: 12,
      zoomControl: true,
    })

    const primaryTiles = L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }
    )

    let switchedToFallback = false
    primaryTiles.on('tileerror', () => {
      if (switchedToFallback || !mapRef.current) return
      switchedToFallback = true
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri',
          maxZoom: 19,
        }
      ).addTo(mapRef.current)
    })

    primaryTiles.addTo(map)
    setTimeout(() => map.invalidateSize(), 200)

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const mode = pinModeRef.current
      if (mode === 'none') return

      const { lat, lng } = e.latlng
      const label = await reverseGeocode(lat, lng)
      const pt: GeoPoint = { lat, lng, label }

      if (mode === 'origem') {
        setOrigemPoint(pt)
        setOrigemInput(label)
        saveLastOrigin(pt)
        toast.success('Ponto de origem marcado no mapa!')
      } else {
        setDestinoPoint(pt)
        setDestinoInput(label)
        onDestinoAddressChange?.(label)
        toast.success('Destino da clínica marcado no mapa!')
      }
      setPinMode('none')
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Atualiza marcadores e calcula rota real via OSRM quando origem/destino mudam
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // Marcador de Origem
    if (origemMarkerRef.current) {
      origemMarkerRef.current.remove()
      origemMarkerRef.current = null
    }
    if (origemPoint) {
      const marker = L.marker([origemPoint.lat, origemPoint.lng], {
        icon: createPinIcon('#9B7BC7', 'car'),
        draggable: true,
      }).addTo(map)

      marker.on('dragend', async () => {
        const pos = marker.getLatLng()
        const label = await reverseGeocode(pos.lat, pos.lng)
        const pt: GeoPoint = { lat: pos.lat, lng: pos.lng, label }
        setOrigemPoint(pt)
        setOrigemInput(label)
        saveLastOrigin(pt)
      })
      origemMarkerRef.current = marker
    }

    // Marcador de Destino
    if (destinoMarkerRef.current) {
      destinoMarkerRef.current.remove()
      destinoMarkerRef.current = null
    }
    if (destinoPoint) {
      const marker = L.marker([destinoPoint.lat, destinoPoint.lng], {
        icon: createPinIcon('#4EA87E', 'house'),
        draggable: true,
      }).addTo(map)

      marker.on('dragend', async () => {
        const pos = marker.getLatLng()
        const label = await reverseGeocode(pos.lat, pos.lng)
        setDestinoPoint({ lat: pos.lat, lng: pos.lng, label })
        setDestinoInput(label)
        onDestinoAddressChange?.(label)
      })
      destinoMarkerRef.current = marker
    }

    // Limpa rota anterior
    if (routeLayerRef.current) {
      routeLayerRef.current.remove()
      routeLayerRef.current = null
    }

    // Centraliza no zoom da rua (17) se só um ponto estiver marcado
    if (origemPoint && !destinoPoint) {
      map.setView([origemPoint.lat, origemPoint.lng], 17)
      setRouteSummary(null)
      return
    }
    if (destinoPoint && !origemPoint) {
      map.setView([destinoPoint.lat, destinoPoint.lng], 17)
      setRouteSummary(null)
      return
    }
    if (!origemPoint || !destinoPoint) {
      setRouteSummary(null)
      return
    }

    // Calcula rota real pelas ruas via OSRM
    let cancelled = false
    setLoadingRoute(true)

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${origemPoint.lng},${origemPoint.lat};${destinoPoint.lng},${destinoPoint.lat}?overview=full&geometries=geojson`
    )
      .then((res) => res.json())
      .then(
        (data: {
          routes?: Array<{
            distance: number
            duration: number
            geometry: { coordinates: Array<[number, number]> }
          }>
        }) => {
          if (cancelled || !mapRef.current) return
          const route = data.routes?.[0]
          if (route) {
            const latlngs = route.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number])
            const polyline = L.polyline(latlngs, {
              color: '#9B7BC7',
              weight: 5,
              opacity: 0.9,
            }).addTo(mapRef.current)
            routeLayerRef.current = polyline
            mapRef.current.fitBounds(polyline.getBounds(), { padding: [45, 45] })

            const km = Number((route.distance / 1000).toFixed(1))
            const minutes = Math.max(1, Math.round(route.duration / 60))
            setRouteSummary({ km, minutes, exact: true })
            onDistanceCalculated(km, minutes)
            return
          }
          throw new Error('Rota não retornada')
        }
      )
      .catch(() => {
        if (cancelled || !mapRef.current) return
        // Fallback seguro: linha reta × 1.28
        const latlngs: [number, number][] = [
          [origemPoint.lat, origemPoint.lng],
          [destinoPoint.lat, destinoPoint.lng],
        ]
        const polyline = L.polyline(latlngs, {
          color: '#9B7BC7',
          weight: 4,
          dashArray: '8 8',
        }).addTo(mapRef.current)
        routeLayerRef.current = polyline
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [45, 45] })

        const km = Number(
          Math.max(0.5, haversineKm(origemPoint.lat, origemPoint.lng, destinoPoint.lat, destinoPoint.lng) * 1.28).toFixed(1)
        )
        const minutes = Math.max(1, Math.round((km / 30) * 60))
        setRouteSummary({ km, minutes, exact: false })
        onDistanceCalculated(km, minutes)
      })
      .finally(() => {
        if (!cancelled) setLoadingRoute(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origemPoint, destinoPoint])

  const handleSearch = async (
    target: 'origem' | 'destino',
    customValue?: string,
    silent = false
  ) => {
    const query = (customValue ?? (target === 'origem' ? origemInput : destinoInput)).trim()
    if (!query) {
      if (!silent) toast.error('Digite um CEP ou endereço para buscar.')
      return
    }
    if (target === 'origem') setLoadingOrigem(true)
    else setLoadingDestino(true)

    try {
      const point = await resolveCepOrAddress(query)
      if (!point) {
        if (!silent) {
          toast.warning('Endereço ou CEP não encontrado. Tente incluir a cidade ou marque direto no mapa.')
        }
        return
      }
      if (target === 'origem') {
        setOrigemPoint(point)
        setOrigemInput(point.label)
        saveLastOrigin(point)
      } else {
        setDestinoPoint(point)
        setDestinoInput(point.label)
        onDestinoAddressChange?.(point.label)
      }
      if (!silent) toast.success('Localização encontrada no mapa!')
    } catch {
      if (!silent) toast.warning('Não foi possível consultar o mapa agora. Você pode digitar os km manualmente.')
    } finally {
      if (target === 'origem') setLoadingOrigem(false)
      else setLoadingDestino(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização.')
      return
    }
    setLoadingOrigem(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        const label = await reverseGeocode(latitude, longitude)
        const pt: GeoPoint = { lat: latitude, lng: longitude, label }
        setOrigemPoint(pt)
        setOrigemInput(label)
        setLoadingOrigem(false)
        if (accuracy > 1000) {
          toast.info(
            'No computador, a localização é estimada pelo provedor de internet. Para precisão exata, digite seu endereço ou CEP (no celular o GPS é exato).'
          )
        } else {
          saveLastOrigin(pt)
          toast.success('Sua localização atual foi definida como origem!')
        }
      },
      () => {
        setLoadingOrigem(false)
        toast.warning('Permissão de localização negada. Digite o CEP/endereço ou marque no mapa.')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  return (
    <Card className="p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-base flex items-center gap-2">
            <MapPin className="w-4.5 h-4.5 text-[#9B7BC7]" />
            Mapa
          </h2>
          <p className="text-xs text-gray-500">
            Busque por <strong>CEP</strong>, <strong>endereço</strong> ou clique nos ícones para marcar direto no mapa (os pinos podem ser arrastados).
          </p>
        </div>

        {routeSummary && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#EDE7F6] dark:bg-[#2E2447] text-[#5B3E8C] dark:text-[#DECFF7] text-xs font-extrabold">
            <Route className="w-4 h-4" />
            <span>{formatNumber(routeSummary.km, 1)} km (ida)</span>
            <span className="opacity-50">•</span>
            <Clock className="w-3.5 h-3.5" />
            <span>~{routeSummary.minutes} min</span>
          </div>
        )}
      </div>

      {/* Campos Origem (Base) e Destino (Clínica) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Origem */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#7F5DB0] dark:text-[#D5C2F5] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#9B7BC7]" />
              Origem
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title="Usar minha localização atual (GPS)"
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#F6F4FB] dark:bg-[#282438] hover:bg-[#EDE7F6] text-[#7F5DB0] dark:text-[#D5C2F5] inline-flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className="w-3 h-3" />
                GPS
              </button>
              <button
                type="button"
                onClick={() => setPinMode(pinMode === 'origem' ? 'none' : 'origem')}
                title="Clicar no mapa para marcar a origem"
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition ${
                  pinMode === 'origem'
                    ? 'bg-[#9B7BC7] text-white'
                    : 'bg-[#F6F4FB] dark:bg-[#282438] hover:bg-[#EDE7F6] text-[#7F5DB0] dark:text-[#D5C2F5]'
                }`}
              >
                <MapPin className="w-3 h-3" />
                {pinMode === 'origem' ? 'Clique no mapa...' : 'Marcar no mapa'}
              </button>
            </div>
          </div>

          <div className="flex gap-1.5">
            <Input
              placeholder="CEP (ex: 04101-000) ou endereço de saída"
              value={origemInput}
              onChange={(e) => setOrigemInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSearch('origem')
                }
              }}
            />
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => void handleSearch('origem')}
              disabled={loadingOrigem}
              aria-label="Buscar origem"
            >
              {loadingOrigem ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Destino */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#358E64] dark:text-[#7AD5AA] flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#6CC59A]" />
              Destino
            </span>
            <button
              type="button"
              onClick={() => setPinMode(pinMode === 'destino' ? 'none' : 'destino')}
              title="Clicar no mapa para marcar o destino"
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition ${
                pinMode === 'destino'
                  ? 'bg-[#6CC59A] text-white'
                  : 'bg-[#E6F7EF] dark:bg-[#1C3B2D] hover:bg-[#D2F0E2] text-[#2E855B] dark:text-[#7AD5AA]'
              }`}
            >
              <MapPin className="w-3 h-3" />
              {pinMode === 'destino' ? 'Clique no mapa...' : 'Marcar no mapa'}
            </button>
          </div>

          <div className="flex gap-1.5">
            <Input
              placeholder="CEP ou endereço completo da clínica"
              value={destinoInput}
              onChange={(e) => setDestinoInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void handleSearch('destino')
                }
              }}
            />
            <Button
              variant="success"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => void handleSearch('destino')}
              disabled={loadingDestino}
              aria-label="Buscar destino"
            >
              {loadingDestino ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Aviso quando está no modo de clicar no mapa */}
      {pinMode !== 'none' && (
        <div className="px-3.5 py-2 rounded-xl bg-[#EDE7F6] dark:bg-[#2E2447] text-xs font-semibold text-[#5B3E8C] dark:text-[#DECFF7] flex items-center justify-between">
          <span>
            Toque ou clique no local exato no mapa para definir{' '}
            <strong>{pinMode === 'origem' ? 'sua origem (base)' : 'o destino (clínica)'}</strong>.
          </span>
          <button
            type="button"
            onClick={() => setPinMode('none')}
            className="underline ml-2 cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Container do Mapa */}
      <div className="relative rounded-[18px] overflow-hidden border border-[#E4DFF0] dark:border-[#322C45]">
        <div
          ref={mapContainerRef}
          className={`w-full h-64 sm:h-72 z-0 ${pinMode !== 'none' ? 'cursor-crosshair' : ''}`}
        />

        {loadingRoute && (
          <div className="absolute top-3 right-3 z-[400] bg-white/95 dark:bg-[#1E1B29]/95 px-3 py-1.5 rounded-xl shadow text-xs font-bold flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9B7BC7]" />
            Traçando rota...
          </div>
        )}

        {destinoInput && (
          <a
            {...getMapsLinkProps(destinoInput)}
            className="absolute bottom-3 right-3 z-[400] bg-white/95 dark:bg-[#1E1B29]/95 hover:bg-[#9B7BC7] hover:text-white text-[#4B4D50] dark:text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            Abrir no Maps
          </a>
        )}
      </div>
    </Card>
  )
}

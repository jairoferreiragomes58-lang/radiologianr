import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Check, Crosshair, Loader2, MapPin, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Input } from '@/components/ui'
import {
  getSavedOrigin,
  reverseGeocode,
  searchAddresses,
  type GeoPoint,
} from '@/lib/geocoding'

interface MapaEnderecoModalProps {
  open: boolean
  initialQuery?: string
  onClose: () => void
  onConfirm: (point: GeoPoint) => void
}

function createClinicPinIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`
  const color = '#4EA87E'

  return L.divIcon({
    className: 'custom-map-pin',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
        <div style="background:${color};color:#fff;width:38px;height:38px;border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.28);border:2.5px solid #fff;">
          ${svg}
        </div>
        <div style="width:10px;height:10px;background:${color};transform:rotate(45deg);margin-top:-6px;border-right:2.5px solid #fff;border-bottom:2.5px solid #fff;"></div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  })
}

export function MapaEnderecoModal({
  open,
  initialQuery = '',
  onClose,
  onConfirm,
}: MapaEnderecoModalProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [resolvingPin, setResolvingPin] = useState(false)
  const [locatingGps, setLocatingGps] = useState(false)
  const [results, setResults] = useState<GeoPoint[]>([])
  const [selectedPoint, setSelectedPoint] = useState<GeoPoint | null>(null)

  // Reseta estado e dispara busca inicial ao abrir
  useEffect(() => {
    if (!open) return
    const trimmed = initialQuery.trim()
    setQuery(trimmed)
    setResults([])
    setSelectedPoint(null)

    if (trimmed) {
      void runSearch(trimmed, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialQuery])

  // Inicializa o mapa Leaflet quando o modal abre
  useEffect(() => {
    if (!open || !mapContainerRef.current) return

    const savedOrigin = getSavedOrigin()
    const defaultCenter: [number, number] = savedOrigin
      ? [savedOrigin.lat, savedOrigin.lng]
      : [-23.5505, -46.6333]

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: savedOrigin ? 13 : 12,
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
      const { lat, lng } = e.latlng
      setResults([])
      setResolvingPin(true)
      setSelectedPoint({ lat, lng, label: 'Buscando endereço...' })
      const label = await reverseGeocode(lat, lng)
      setSelectedPoint({ lat, lng, label })
      setQuery(label)
      setResolvingPin(false)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [open])

  // Atualiza marcador e centraliza quando o ponto selecionado muda
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    if (!selectedPoint) return

    const marker = L.marker([selectedPoint.lat, selectedPoint.lng], {
      icon: createClinicPinIcon(),
      draggable: true,
    }).addTo(map)

    marker.on('dragend', async () => {
      const pos = marker.getLatLng()
      setResolvingPin(true)
      const label = await reverseGeocode(pos.lat, pos.lng)
      setSelectedPoint({ lat: pos.lat, lng: pos.lng, label })
      setQuery(label)
      setResolvingPin(false)
    })

    markerRef.current = marker
    map.setView([selectedPoint.lat, selectedPoint.lng], Math.max(map.getZoom(), 16))
  }, [selectedPoint])

  const runSearch = async (customQuery?: string, silent = false) => {
    const q = (customQuery ?? query).trim()
    if (!q) {
      if (!silent) toast.error('Digite um CEP, rua ou nome do local para pesquisar.')
      return
    }

    setSearching(true)
    try {
      const found = await searchAddresses(q, 5)
      if (found.length === 0) {
        setResults([])
        if (!silent) {
          toast.warning('Local não encontrado. Tente incluir a cidade ou clique direto no mapa.')
        }
        return
      }

      if (found.length === 1) {
        setResults([])
        setSelectedPoint(found[0])
        setQuery(found[0].label)
      } else {
        setResults(found)
        setSelectedPoint(found[0])
      }
    } catch {
      if (!silent) {
        toast.warning('Não foi possível consultar o mapa agora. Tente novamente ou clique no mapa.')
      }
    } finally {
      setSearching(false)
    }
  }

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      toast.error('Seu navegador não suporta geolocalização.')
      return
    }
    setLocatingGps(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const label = await reverseGeocode(latitude, longitude)
        setResults([])
        setSelectedPoint({ lat: latitude, lng: longitude, label })
        setQuery(label)
        setLocatingGps(false)
      },
      () => {
        setLocatingGps(false)
        toast.warning('Permissão de localização negada. Pesquise pelo endereço ou clique no mapa.')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  }

  const handleConfirm = () => {
    if (!selectedPoint || resolvingPin) return
    onConfirm(selectedPoint)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] p-0 sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#1E1B29] rounded-t-[24px] sm:rounded-[24px] shadow-2xl border border-[#ECE8F6] dark:border-[#2E2940] max-h-[92dvh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[#F0ECF8] dark:border-[#2E2940]">
          <div>
            <h2 className="text-lg font-bold text-[#3A3C3F] dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#9B7BC7]" />
              Pesquisar localização no mapa
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Busque por CEP ou endereço, ou clique/arraste o pino no mapa para definir o local exato.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar mapa"
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2B263C] text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {/* Barra de busca */}
          <div className="flex gap-2">
            <Input
              placeholder="CEP, rua, número, bairro, cidade..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void runSearch()
                }
              }}
            />
            <Button
              variant="primary"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => void runSearch()}
              disabled={searching}
              aria-label="Pesquisar endereço"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={handleUseGps}
              disabled={locatingGps}
              title="Usar minha localização atual (GPS)"
              aria-label="Usar localização atual"
            >
              {locatingGps ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crosshair className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Lista de sugestões quando houver mais de 1 resultado */}
          {results.length > 1 && (
            <div className="rounded-2xl border border-[#E4DFF0] dark:border-[#342E49] bg-[#FAF8FE] dark:bg-[#161320] divide-y divide-[#ECE8F6] dark:divide-[#2A253B] overflow-hidden">
              <p className="px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-[#7F5DB0] dark:text-[#D5C2F5]">
                Selecione o endereço correto:
              </p>
              {results.map((item, idx) => {
                const isSelected =
                  selectedPoint?.lat === item.lat && selectedPoint?.lng === item.lng
                return (
                  <button
                    key={`${item.lat}-${item.lng}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSelectedPoint(item)
                      setQuery(item.label)
                      setResults([])
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs flex items-start gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#EDE7F6] dark:bg-[#2E2447] font-semibold text-[#5B3E8C] dark:text-white'
                        : 'hover:bg-[#F3EFFA] dark:hover:bg-[#221D33] text-[#4B4D50] dark:text-gray-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#9B7BC7] shrink-0 mt-0.5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Mapa Interativo */}
          <div className="relative rounded-[18px] overflow-hidden border border-[#E4DFF0] dark:border-[#322C45]">
            <div
              ref={mapContainerRef}
              className="w-full h-72 sm:h-80 z-0 cursor-crosshair"
            />
            {!selectedPoint && (
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] bg-white/95 dark:bg-[#1E1B29]/95 px-3.5 py-1.5 rounded-full shadow text-xs font-semibold text-[#4B4D50] dark:text-gray-200 whitespace-nowrap">
                Pesquise acima ou clique no mapa para marcar a clínica
              </div>
            )}
          </div>

          {/* Endereço selecionado */}
          {selectedPoint && (
            <div className="p-3.5 rounded-2xl bg-[#E6F7EF] dark:bg-[#193528] border border-[#6CC59A]/50 flex items-start gap-2.5">
              {resolvingPin ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#2E855B] dark:text-[#84E1B3] shrink-0 mt-0.5" />
              ) : (
                <MapPin className="w-4 h-4 text-[#2E855B] dark:text-[#84E1B3] shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-wide text-[#2E855B] dark:text-[#84E1B3]">
                  Endereço encontrado no mapa
                </p>
                <p className="text-sm font-semibold text-[#1E563B] dark:text-white break-words">
                  {selectedPoint.label}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F0ECF8] dark:border-[#2E2940]">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleConfirm}
            disabled={!selectedPoint || resolvingPin}
          >
            <Check className="w-4 h-4" />
            Confirmar endereço
          </Button>
        </div>
      </div>
    </div>
  )
}

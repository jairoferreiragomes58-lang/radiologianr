export interface GeoPoint {
  lat: number
  lng: number
  label: string
}

const UF_BY_STATE: Record<string, string> = {
  acre: 'AC',
  alagoas: 'AL',
  amapa: 'AP',
  'amapá': 'AP',
  amazonas: 'AM',
  bahia: 'BA',
  ceara: 'CE',
  'ceará': 'CE',
  'distrito federal': 'DF',
  'espirito santo': 'ES',
  'espírito santo': 'ES',
  goias: 'GO',
  'goiás': 'GO',
  maranhao: 'MA',
  'maranhão': 'MA',
  'mato grosso': 'MT',
  'mato grosso do sul': 'MS',
  'minas gerais': 'MG',
  para: 'PA',
  'pará': 'PA',
  paraiba: 'PB',
  'paraíba': 'PB',
  parana: 'PR',
  'paraná': 'PR',
  pernambuco: 'PE',
  piaui: 'PI',
  'piauí': 'PI',
  'rio de janeiro': 'RJ',
  'rio grande do norte': 'RN',
  'rio grande do sul': 'RS',
  rondonia: 'RO',
  'rondônia': 'RO',
  roraima: 'RR',
  'santa catarina': 'SC',
  'sao paulo': 'SP',
  'são paulo': 'SP',
  sergipe: 'SE',
  tocantins: 'TO',
}

interface NominatimAddress {
  road?: string
  pedestrian?: string
  house_number?: string
  suburb?: string
  neighbourhood?: string
  quarter?: string
  city?: string
  town?: string
  municipality?: string
  village?: string
  state?: string
  postcode?: string
}

export function formatNominatimAddress(
  address?: NominatimAddress,
  fallbackDisplayName?: string
): string {
  if (address) {
    const road = address.road || address.pedestrian
    const rua = [road, address.house_number].filter(Boolean).join(', ')
    const bairro = address.suburb || address.neighbourhood || address.quarter
    const cidade = address.city || address.town || address.municipality || address.village
    const uf = address.state
      ? UF_BY_STATE[address.state.toLowerCase()] || address.state
      : undefined
    const cidadeUf = cidade && uf ? `${cidade} - ${uf}` : cidade || uf

    const formatted = [rua, bairro, cidadeUf].filter(Boolean).join(', ')
    if (formatted) return formatted
  }

  if (fallbackDisplayName) {
    return fallbackDisplayName.split(',').slice(0, 4).join(',').trim()
  }

  return ''
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function searchAddresses(query: string, limit = 5): Promise<GeoPoint[]> {
  const clean = query.trim()
  if (!clean) return []

  let searchQuery = clean
  let prettyLabel: string | null = null

  // Se for CEP (8 dígitos, com ou sem hífen), resolve via ViaCEP primeiro
  const digits = clean.replace(/\D/g, '')
  if (digits.length === 8 && /^[\d\s.-]+$/.test(clean)) {
    try {
      const viaRes = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const via = (await viaRes.json()) as {
        erro?: boolean
        logradouro?: string
        bairro?: string
        localidade?: string
        uf?: string
      }
      if (!via.erro && via.localidade) {
        const parts = [via.logradouro, via.bairro, via.localidade, via.uf, 'Brasil'].filter(Boolean)
        searchQuery = parts.join(', ')
        prettyLabel = [via.logradouro, via.bairro, `${via.localidade} - ${via.uf}`]
          .filter(Boolean)
          .join(', ')
      }
    } catch {
      // segue para Nominatim direto
    }
  }

  const nomRes = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&countrycodes=br&q=${encodeURIComponent(
      searchQuery
    )}`
  )
  const nom = (await nomRes.json()) as Array<{
    lat: string
    lon: string
    display_name: string
    address?: NominatimAddress
  }>

  if (!Array.isArray(nom) || nom.length === 0) return []

  const seen = new Set<string>()
  const results: GeoPoint[] = []

  for (const item of nom) {
    const label =
      prettyLabel && results.length === 0
        ? prettyLabel
        : formatNominatimAddress(item.address, item.display_name) || item.display_name
    const key = `${Number(item.lat).toFixed(4)},${Number(item.lon).toFixed(4)}`
    if (seen.has(key)) continue
    seen.add(key)
    results.push({
      lat: Number(item.lat),
      lng: Number(item.lon),
      label,
    })
  }

  return results
}

export async function resolveCepOrAddress(query: string): Promise<GeoPoint | null> {
  const results = await searchAddresses(query, 1)
  return results[0] ?? null
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&lat=${lat}&lon=${lng}&zoom=18`
    )
    const json = (await res.json()) as {
      address?: NominatimAddress
      display_name?: string
    }
    const formatted = formatNominatimAddress(json.address, json.display_name)
    return formatted || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

export const LAST_ORIGIN_KEY = 'radiologia_nr_last_origin'

export function getSavedOrigin(): GeoPoint | null {
  try {
    const raw = localStorage.getItem(LAST_ORIGIN_KEY)
    return raw ? (JSON.parse(raw) as GeoPoint) : null
  } catch {
    return null
  }
}

export function saveLastOrigin(pt: GeoPoint) {
  try {
    localStorage.setItem(LAST_ORIGIN_KEY, JSON.stringify(pt))
  } catch {
    // ignore storage errors
  }
}

export async function calculateRouteDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`
    )
    const data = (await res.json()) as {
      routes?: Array<{ distance: number }>
    }
    const route = data.routes?.[0]
    if (route) {
      return Number((route.distance / 1000).toFixed(1))
    }
  } catch {
    // fallback below
  }
  return Number(Math.max(0.5, haversineKm(from.lat, from.lng, to.lat, to.lng) * 1.28).toFixed(1))
}

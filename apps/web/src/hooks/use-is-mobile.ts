import { useMediaQuery } from '@/hooks/use-media-query'

/** true sous 760px, le point de rupture des maquettes */
export function useIsMobile() {
  return useMediaQuery('(max-width: 759px)')
}

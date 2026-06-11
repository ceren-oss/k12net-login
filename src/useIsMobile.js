import { useEffect, useState } from 'react'

const getIsMobile = (breakpoint) => {
  if (typeof window === 'undefined') return false
  return window.innerWidth <= breakpoint
}

export default function useIsMobile(breakpoint = 900) {
  const [isMobile, setIsMobile] = useState(() => getIsMobile(breakpoint))

  useEffect(() => {
    const handleResize = () => setIsMobile(getIsMobile(breakpoint))
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}

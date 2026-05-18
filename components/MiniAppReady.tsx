'use client'

import { useEffect } from 'react'
import { callReady } from '@/lib/miniapp'

export function MiniAppReady() {
  useEffect(() => {
    callReady()
  }, [])
  return null
}

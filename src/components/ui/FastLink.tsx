'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ReactNode, useTransition } from 'react'

interface FastLinkProps {
  href: string
  children: ReactNode
  className?: string
  prefetch?: boolean
}

export function FastLink({ href, children, className = '', prefetch = true }: FastLinkProps) {
  return (
    <Link 
      href={href} 
      className={className}
      prefetch={prefetch}
    >
      {children}
    </Link>
  )
}

export function useNavigate() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const navigate = (path: string) => {
    startTransition(() => {
      router.push(path)
    })
  }
  
  return { navigate, isPending }
}

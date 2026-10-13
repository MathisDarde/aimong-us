import { Hero } from '@/components/landing/hero'
import { HowItWorks } from '@/components/landing/how-it-works'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { SpotTheAI } from '@/components/landing/spot-the-ai'

export function LandingPage() {
  return (
    <div className="min-h-svh overflow-hidden bg-nuit">
      <SiteHeader />
      <Hero />
      <HowItWorks />
      <SpotTheAI />
      <SiteFooter />
    </div>
  )
}

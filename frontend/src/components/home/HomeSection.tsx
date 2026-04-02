import { Link } from 'react-router-dom'

interface HomeSectionProps {
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  /** Se true, immagine placeholder a sinistra; se false (default), a destra */
  imageLeft?: boolean
}

export default function HomeSection({
  title,
  description,
  ctaLabel,
  ctaHref,
  imageLeft = false,
}: HomeSectionProps) {
  const textCol = (
    <div className="flex flex-col gap-6 justify-center">
      <h2
        className="font-['Newsreader'] font-bold leading-tight"
        style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#FFFFFF' }}
      >
        {title}
      </h2>
      <p
        className="font-['Inter'] font-light text-base leading-relaxed max-w-md"
        style={{ color: '#8A9BB5' }}
      >
        {description}
      </p>
      <Link
        to={ctaHref}
        className="font-['Inter'] font-medium text-sm uppercase tracking-widest self-start px-8 py-4 transition-all"
        style={{
          border: '1.5px solid #C9A96E',
          color: '#C9A96E',
          backgroundColor: 'transparent',
          borderRadius: 0,
        }}
      >
        {ctaLabel}
      </Link>
    </div>
  )

  const imageCol = (
    <div
      className="hidden md:block w-full h-[400px]"
      style={{ backgroundColor: '#0D1E35' }}
      aria-hidden="true"
    />
  )

  return (
    <section
      className="w-full py-24 border-t"
      style={{ backgroundColor: '#071325', borderColor: '#1E2D45' }}
    >
      <div className="max-w-screen-2xl mx-auto px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {imageLeft ? (
          <>
            {imageCol}
            {textCol}
          </>
        ) : (
          <>
            {textCol}
            {imageCol}
          </>
        )}
      </div>
    </section>
  )
}

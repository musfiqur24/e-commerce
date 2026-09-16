interface ImageCardProps {
  src?: string
  alt?: string
  className?: string
  aspectRatio?: string
  height?: string
  padding?: string
  imageContainerClassName?: string
  children?: React.ReactNode
  statusBadge?: React.ReactNode
  overlays?: React.ReactNode
  onClick?: () => void
}

export default function ImageCard({
  src,
  alt = '',
  className = '',
  aspectRatio = 'aspect-video',
  height,
  padding = 'p-3 pb-0',
  imageContainerClassName = '',
  children,
  statusBadge,
  overlays,
  onClick,
}: ImageCardProps) {
  const hasPadding = padding !== 'p-0'
  const isAutoHeight = height === 'h-auto' || height === 'auto'

  return (
    <div className={`flex flex-col bg-white border border-neutral-200 shadow-sm overflow-hidden ${className}`} onClick={onClick}>
      <div className={`relative w-full ${height ? height : aspectRatio} ${padding}`}>
        <div
          className={`relative w-full h-full overflow-hidden bg-neutral-100 ${hasPadding ? 'rounded-xl' : 'rounded-t-xl'} ${imageContainerClassName}`}
        >
          {src ? (
            <img
              src={src}
              alt={alt}
              className={`w-full ${isAutoHeight ? 'h-auto aspect-video' : 'h-full'} object-cover transition-transform duration-500`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-neutral-100 to-neutral-200" />
          )}
          
          {/* Overlays on image */}
          {overlays && (
            <div className="absolute inset-0 flex flex-col items-end justify-start p-4 gap-2 z-10">
              {overlays}
            </div>
          )}
        </div>
      </div>
      {children && (
        <div className="flex flex-col flex-1">
          {children}
        </div>
      )}
    </div>
  )
}

import { Button as MedusaButton } from '@medusajs/ui'
import Link from 'next/link'
import { forwardRef, ComponentPropsWithoutRef } from 'react'

interface ButtonProps extends ComponentPropsWithoutRef<typeof MedusaButton> {
  href?: string
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, href, fullWidth, className = '', ...props }, ref) => {
    const buttonElement = (
      <MedusaButton
        ref={ref}
        className={`${fullWidth ? 'w-full' : ''} ${className} `}
        {...props}
      >
        {children}
      </MedusaButton>
    )

    if (href) {
      return (
        <Link href={href} className={fullWidth ? 'w-full' : ''}>
          {buttonElement}
        </Link>
      )
    }

    return buttonElement
  }
)

Button.displayName = 'Button'

export default Button
export { Button }

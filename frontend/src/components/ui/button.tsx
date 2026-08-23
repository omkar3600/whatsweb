"use client"

import React, { useState, useEffect } from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, Check, X } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingText?: string
  success?: boolean
  successText?: string
  error?: boolean
  errorText?: string
  longLoadingText?: string
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading: controlledLoading,
  loadingText,
  success: controlledSuccess,
  successText,
  error: controlledError,
  errorText,
  longLoadingText,
  onClick,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const [localLoading, setLocalLoading] = useState(false)
  const [localSuccess, setLocalSuccess] = useState(false)
  const [localError, setLocalError] = useState(false)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [timerMessage, setTimerMessage] = useState<string | null>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const isLoading = controlledLoading ?? localLoading
  const isSuccess = controlledSuccess ?? localSuccess
  const isError = controlledError ?? localError

  // Lock dimensions when entering loading state to prevent layout shift
  useEffect(() => {
    if (isLoading && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDimensions({ width: rect.width, height: rect.height })
    } else if (!isLoading) {
      setDimensions(null)
    }
  }, [isLoading])

  // Long operation fallback messaging (>3 seconds)
  useEffect(() => {
    if (!isLoading) {
      setTimerMessage(null)
      return
    }

    const timer = setTimeout(() => {
      setTimerMessage(longLoadingText || "Still processing, please wait...")
    }, 3000)

    return () => clearTimeout(timer)
  }, [isLoading, longLoadingText])

  // Reset success/error visual indicators after a timeout
  useEffect(() => {
    if (localSuccess) {
      const timer = setTimeout(() => setLocalSuccess(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [localSuccess])

  useEffect(() => {
    if (localError) {
      const timer = setTimeout(() => setLocalError(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [localError])

  const handlePress = async (
    e: React.MouseEvent<HTMLButtonElement> & { preventBaseUIHandler?: () => void }
  ) => {
    if (isLoading || isSuccess || isError || disabled) {
      e.preventDefault()
      e.stopPropagation()
      return
    }

    if (onClick) {
      const result = onClick(e as Parameters<NonNullable<ButtonPrimitive.Props["onClick"]>>[0]) as unknown
      if (result && result instanceof Promise) {
        setLocalLoading(true)
        setLocalSuccess(false)
        setLocalError(false)
        try {
          await result
          setLocalSuccess(true)
        } catch {
          setLocalError(true)
          // Rethrow so parents can catch if needed, but let's prevent crash
        } finally {
          setLocalLoading(false)
        }
      }
    }
  }

  // Prevent double submits on keydown (Enter/Space) while loading
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === "Enter" || e.key === " ") && (isLoading || isSuccess || isError)) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  const renderContent = () => {
    if (isSuccess) {
      return (
        <span className="flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
          <Check className="h-4 w-4 text-emerald-500 stroke-[3]" />
          <span>{successText || "Done"}</span>
        </span>
      )
    }

    if (isError) {
      return (
        <span className="flex items-center justify-center gap-1.5 animate-in fade-in duration-200 text-rose-500">
          <X className="h-4 w-4 stroke-[3]" />
          <span>{errorText || "Failed"}</span>
        </span>
      )
    }

    if (isLoading) {
      return (
        <span className="flex items-center justify-center gap-1.5 animate-in fade-in duration-200">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>{timerMessage || loadingText || "Processing..."}</span>
        </span>
      )
    }

    return children
  }

  return (
    <ButtonPrimitive
      ref={buttonRef}
      data-slot="button"
      disabled={isLoading || isSuccess || isError || disabled}
      className={cn(
        buttonVariants({ variant, size, className }),
        isLoading && "cursor-wait pointer-events-none opacity-80",
        isError && "animate-shake border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20",
        isSuccess && "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
      )}
      onClick={handlePress}
      onKeyDown={handleKeyDown}
      style={
        dimensions
          ? {
              width: `${dimensions.width}px`,
              height: `${dimensions.height}px`,
            }
          : undefined
      }
      {...props}
    >
      {renderContent()}
    </ButtonPrimitive>
  )
}

const LoadingButton = Button

export { Button, LoadingButton, buttonVariants }

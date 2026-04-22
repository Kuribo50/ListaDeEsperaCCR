export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_8%,#CEE7D8_0%,rgba(206,231,216,0)_28%),radial-gradient(circle_at_90%_18%,#E9F5ED_0%,rgba(233,245,237,0)_30%),linear-gradient(180deg,#F4FAF6_0%,#EAF2EC_100%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        {children}
      </div>
    </div>
  )
}

import Link from "next/link";
import ConnectButton from "@/components/ConnectButton";

export default function SiteHeader() {
  return (
    <header className="flex items-baseline justify-between gap-4 border-b border-paper/15 pb-4 mb-10">
      <h1 className="text-label font-medium uppercase tracking-[0.34em] text-paper">
        <Link href="/" className="rounded hover:text-white transition-colors">
          273 Sleeves : Sound
        </Link>
      </h1>
      <div className="flex items-baseline gap-5">
        <p className="hidden text-caption uppercase tracking-[0.2em] text-paper/60 sm:block">
          4′33″ · Base
        </p>
        <ConnectButton />
      </div>
    </header>
  );
}

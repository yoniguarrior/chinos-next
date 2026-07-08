import Link from "next/link";

interface LogoProps {
  src: string;
  alt?: string;
}

export function Logo({ src, alt = "Chinos Game" }: LogoProps) {
  return (
    <Link href="/" className="!opacity-100">
      <span className="sr-only">{alt}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="h-9 w-auto sm:h-14 md:h-20" src={src} alt={alt} />
    </Link>
  );
}

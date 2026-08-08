/**
 * The handful of places a shop is also findable.
 *
 * The icon set the rest of the app uses dropped its brand marks, and a shop's
 * Instagram link with a generic chain-link beside it reads as a broken page. So
 * these are drawn here: simple, single-colour, on the same 24-unit grid as
 * every other icon, and recognisable at 16px, which is the only size that
 * matters in a footer.
 *
 * The list is closed on purpose. An admin picks a platform and pastes a link;
 * they don't get to invent one, because an unknown platform has no icon and a
 * row of unlabelled question marks helps nobody.
 */

export type SocialPlatform =
  | "instagram"
  | "tiktok"
  | "x"
  | "facebook"
  | "linkedin"
  | "youtube"
  | "whatsapp";

type IconProps = { className?: string };

function Instagram({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

function TikTok({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      {/* The note: a stem, its head, and the flag reaching over the top. */}
      <path
        d="M13.5 3v11.4a3.6 3.6 0 1 1-3-3.55"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 3c.3 2.4 2 4.1 4.5 4.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function X({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 4l16 16M20 4L4 20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Facebook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M14.5 8h-1.3c-.9 0-1.4.5-1.4 1.4V11h2.6l-.4 2.4h-2.2V21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9.6 11h2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LinkedIn({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.5 10.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="7.5" cy="7.4" r="1.1" fill="currentColor" />
      <path
        d="M11.5 17v-3.6a2.4 2.4 0 0 1 4.8 0V17M11.5 10.8V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function YouTube({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect
        x="2.5"
        y="5.5"
        width="19"
        height="13"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.4 9.3l4.6 2.7-4.6 2.7V9.3z"
        fill="currentColor"
      />
    </svg>
  );
}

function WhatsApp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3.8 20.2l1.2-3.6A8 8 0 1 1 8 19.2l-4.2 1z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 8.6c.3 1 .8 1.9 1.5 2.6.7.7 1.6 1.2 2.6 1.5l.9-1.1 1.7.8-.4 1.4c-1.9.3-3.9-.5-5.4-2-1.5-1.5-2.3-3.5-2-5.4l1.4-.4.8 1.7-1.1.9z"
        fill="currentColor"
      />
    </svg>
  );
}

export const SOCIAL_PLATFORMS: Record<
  SocialPlatform,
  { label: string; placeholder: string; Icon: (props: IconProps) => React.ReactElement }
> = {
  instagram: {
    label: "Instagram",
    placeholder: "https://instagram.com/yourshop",
    Icon: Instagram,
  },
  tiktok: {
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourshop",
    Icon: TikTok,
  },
  x: { label: "X", placeholder: "https://x.com/yourshop", Icon: X },
  facebook: {
    label: "Facebook",
    placeholder: "https://facebook.com/yourshop",
    Icon: Facebook,
  },
  linkedin: {
    label: "LinkedIn",
    placeholder: "https://linkedin.com/company/yourshop",
    Icon: LinkedIn,
  },
  youtube: {
    label: "YouTube",
    placeholder: "https://youtube.com/@yourshop",
    Icon: YouTube,
  },
  whatsapp: {
    label: "WhatsApp",
    placeholder: "https://wa.me/2348012345678",
    Icon: WhatsApp,
  },
};

export const SOCIAL_KEYS = Object.keys(SOCIAL_PLATFORMS) as SocialPlatform[];

export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && value in SOCIAL_PLATFORMS;
}

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const { Icon } = SOCIAL_PLATFORMS[platform];
  return <Icon className={className} />;
}

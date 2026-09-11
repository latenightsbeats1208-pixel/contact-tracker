import { NextRequest, NextResponse } from "next/server";
import { artistIdFromUrl, getArtistOverview } from "@/lib/spotify";
import { getInstagramProfile } from "@/lib/instagram";

export const dynamic = "force-dynamic";

// Actualité d'un artiste pour la génération de message d'accroche :
// dernière sortie (récente = moins de 2 mois), concerts, audience.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const url = String(body.url ?? "");
  const id = artistIdFromUrl(url);
  if (!id) {
    return NextResponse.json(
      { error: "Lien Spotify artiste manquant ou illisible" },
      { status: 400 }
    );
  }
  try {
    const a = await getArtistOverview(id);

    // bio Instagram (si accessible) : donne parfois une annonce en clair
    // — « new EP out now », « on tour », un lien de préco…
    let igBio: string | null = null;
    let igFollowers: number | null = null;
    const handle = String(body.instagram ?? "")
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//, "")
      .replace(/\/.*$/, "");
    if (handle) {
      const res = await getInstagramProfile(handle);
      if (res.ok) {
        igBio = res.profile.biography ?? null;
        igFollowers = res.profile.followers ?? null;
      }
    }

    return NextResponse.json({
      name: a.name,
      latestRelease: a.latestRelease ?? null,
      previousRelease: a.previousRelease ?? null,
      releasesLast12Months: a.releasesLast12Months,
      isRecent: (a.latestRelease?.daysAgo ?? Infinity) <= 60,
      concerts: a.concerts,
      monthlyListeners: a.monthlyListeners ?? null,
      followers: a.followers ?? null,
      topCity: a.topCity ?? null,
      instagramBio: igBio,
      instagramFollowers: igFollowers,
    });
  } catch {
    return NextResponse.json(
      { error: "Actualité Spotify inaccessible pour le moment" },
      { status: 502 }
    );
  }
}

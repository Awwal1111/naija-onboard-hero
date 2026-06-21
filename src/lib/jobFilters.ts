// Shared heuristic to hide freelancer self-promo (gigs posted as jobs)
// from job listings & job-matching surfaces. Pure function; zero egress.
export function looksLikeGigOffer(job: { title?: string | null; description?: string | null }): boolean {
  const text = `${job?.title || ''} ${job?.description || ''}`.toLowerCase().trim();
  if (!text) return false;
  const offerPhrases = [
    'i can ', 'i will ', "i'll ", 'i make ', 'i build ', 'i design ',
    'i develop ', 'i create ', 'i offer ', 'i am a ', "i'm a ",
    'hire me', 'contact me', 'dm me', 'message me for', 'whatsapp me',
    'my portfolio', 'my services', 'my skills include',
  ];
  return offerPhrases.some(p => text.includes(p));
}
